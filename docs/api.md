# Referencia de la API

Base: `https://participa.huelgaporlavivienda.org/api/public/v1`

Sólo lectura, sin cuentas ni sesión. Todas las peticiones llevan tu identificador de cliente en `?client=`.

## Rutas

### `GET /activities`

Las actividades próximas, de la más cercana a la más lejana, en un [`DataFeed`](data-format.md#datafeed). Incluye las **canceladas** hasta su fecha, marcadas como tales, para que tu web pueda retirarlas o tacharlas.

| Parámetro | Ejemplo | Qué hace |
| --- | --- | --- |
| `client` | `fc_…` | **Obligatorio.** Tu identificador de cliente. |
| `province` | `28` | Sólo las de una provincia, por su [código INE](https://www.ine.es/daco/daco42/codmun/cod_provincia.htm) de dos cifras (`08` Barcelona, `28` Madrid, `41` Sevilla…). |
| `municipality` | `Getafe` | Sólo las de un municipio. No distingue mayúsculas ni tildes: `alcala de henares` encuentra «Alcalá de Henares». |
| `type` | `uuid` | Sólo las de un tipo de actividad, por su identificador interno. Todavía no hay una lista pública de esos identificadores: mientras tanto, filtra en tu lado por [`keywords`](data-format.md#event), que trae el nombre del tipo. |
| `from` | `2026-11-01` | Desde ese día, incluido, en la hora del lugar de la actividad. |
| `to` | `2026-11-11` | Hasta ese día, incluido, en la hora del lugar de la actividad. |

Los filtros se combinan. **Un filtro mal escrito se ignora**, no da error: `province=Madrid` o `from=mañana` devuelven lo mismo que sin ese filtro. Si ves más actividades de las que esperabas, revisa el formato.

```bash
curl 'https://participa.huelgaporlavivienda.org/api/public/v1/activities?client=fc_TU_IDENTIFICADOR&province=28&from=2026-11-01&to=2026-11-11'
```

### `GET /activities/{id}`

Una actividad próxima, como [`Event`](data-format.md#event) con su `@context`. El `id` es el último tramo de la URL de la actividad (`…/activities/{id}`).

Un id que no existe, una actividad ya pasada o una que todavía no se ha publicado responden igual: `404`.

### `HEAD` y `OPTIONS`

Las dos rutas aceptan `HEAD` (las mismas cabeceras, sin cuerpo) y `OPTIONS`, la consulta previa que hace el navegador cuando tu JavaScript añade una cabecera como `If-None-Match`.

## Identificación

Cada colectivo tiene su identificador de cliente, `fc_` seguido de 22 letras y números. Lo da Coordinación de la campaña.

- **No es una contraseña.** Si lo usas desde el navegador, cualquiera puede verlo en el código de tu página, y no pasa nada: sólo funciona desde las direcciones de tu web que diste al pedirlo.
- **Aun así, no lo publiques sin necesidad** (por ejemplo, en un repositorio público): si otra persona lo usa desde su servidor, su consumo cuenta en tu límite.
- **Se puede cambiar y retirar.** Si se ha filtrado, pide uno nuevo; el viejo se retira cuando hayas cambiado tu web. Si se usa para algo que perjudica a la campaña, Coordinación puede retirarlo.

### Desde el navegador: las direcciones de tu web

El navegador manda a nuestro servidor la dirección de la página que hace la petición (la cabecera `Origin`), y no deja que una web la falsee. Por eso:

- Sólo funciona en las direcciones exactas que diste: esquema, dominio y puerto. `https://ejemplo.org` y `https://www.ejemplo.org` son dos direcciones distintas; `http://` tampoco vale por `https://`.
- Una página abierta como archivo (`file://`) o dentro de un `<iframe>` con `sandbox` manda `Origin: null` y se rechaza. Para probar en tu ordenador, sírvela desde un servidor local (`npx serve`, `python3 -m http.server`…) y pide que añadan esa dirección, por ejemplo `http://localhost:8080`.

### Desde tu servidor

Tu servidor no manda `Origin`: basta el identificador. Identifícate además con un `User-Agent` propio, para que podamos avisarte si algo va mal:

```
User-Agent: NombreDeTuColectivo/1.0 (+https://tu-web.org/contacto)
```

## Respuestas

### Cabeceras

| Cabecera | Qué significa |
| --- | --- |
| `Content-Type: application/ld+json` | JSON-LD. Cualquier lector de JSON lo entiende. |
| `Cache-Control: public, max-age=60` | Puedes reutilizar la respuesta un minuto: el feed no cambia más a menudo. |
| `ETag` | La huella de la respuesta. Mándala en `If-None-Match` y, si nada ha cambiado, recibirás un `304` sin cuerpo. |
| `Access-Control-Allow-Origin` | Desde el navegador, la dirección de tu web si está autorizada. Nunca `*`. |
| `Vary: Origin` | La respuesta depende de la web que la pide. |
| `Age` | Sólo si el feed no ha podido actualizarse: estás recibiendo la última versión buena, de hace esos segundos. Si es de hace horas, puede haber cambios o cancelaciones que todavía no ves. |
| `Retry-After` | En `429` y `503`: cuántos segundos esperar antes de volver a intentarlo. |

No hay `Last-Modified`: usa el `ETag`.

### Códigos

| Código | Cuándo | Qué hacer |
| --- | --- | --- |
| `200` | Todo bien. | |
| `304` | Mandaste un `If-None-Match` con el `ETag` vigente. | Sigue usando tu copia. |
| `400` | El id de `/activities/{id}` no tiene formato de identificador. | Revisa el enlace. |
| `401` | Falta `client` o no lo conocemos. | Revisa el identificador. |
| `403` | Identificador retirado, dirección de tu web no autorizada, `Origin: null` o acceso bloqueado. | Revisa desde qué dirección llamas; si no lo ves, escribe a Coordinación. |
| `404` | No hay una actividad próxima con ese id. | Quítala de tu web. |
| `429` | Has pasado tu límite de peticiones. | Espera lo que diga `Retry-After`. |
| `503` | El feed no puede responder y no tiene copia guardada. | Espera lo que diga `Retry-After` y sigue mostrando tu última copia. |

Los errores vienen en [`application/problem+json`](https://www.rfc-editor.org/rfc/rfc9457) con un mensaje en castellano:

```json
{ "type": "about:blank", "title": "Falta un identificador de cliente válido (?client=). Pídelo como explica la página de ayuda del feed.", "status": 401 }
```

Desde el navegador, los `401`, `400`, `404`, `429` y `503` llevan `Access-Control-Allow-Origin`, así que tu JavaScript puede leer el motivo. Los `403`, no: tu código verá un error de red.

## Límites

Hay un límite de peticiones por minuto por cada dirección IP y otro por cada identificador. Son generosos para un uso normal (una consulta por minuto desde tu servidor, o una por visita desde el navegador) y pueden cambiar. Si recibes `429`, espera lo que diga `Retry-After`; si tu web tiene mucho tráfico, consulta el feed [desde tu servidor](good-practices.md#desde-tu-servidor) en lugar de desde cada navegador.

## Versiones

La ruta lleva la versión (`/v1`). Mientras dure `/v1`, sólo añadiremos campos, nunca quitaremos ni cambiaremos los que hay: tu código debe ignorar los que no conozca. Un cambio incompatible será `/v2`, y lo anunciaremos al menos un mes antes con las cabeceras [`Deprecation`](https://www.rfc-editor.org/rfc/rfc9745) y [`Sunset`](https://www.rfc-editor.org/rfc/rfc8594) en las respuestas de `/v1`.

## Descubrimiento

La página [/activities](https://participa.huelgaporlavivienda.org/activities) enlaza el feed con `<link rel="alternate" type="application/ld+json">`.
