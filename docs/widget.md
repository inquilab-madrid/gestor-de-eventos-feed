# Widget para tu web

La forma más sencilla de mostrar las actividades de tu provincia o de tu municipio en tu web: pegas dos líneas y ya está. Funciona en cualquier web que te deje añadir HTML (WordPress, Wix, Squarespace, una web hecha a mano…), sin servidor propio.

El widget se adapta a tu web: usa su tipo de letra y sus colores. Habla castellano, català, euskara y galego. Míralo funcionando en la [demostración](https://inquilab-madrid.github.io/gestor-de-eventos-feed/demo/).

## Pegarlo

1. Ten a mano tu **identificador de cliente** (`fc_…`) y comprueba que la dirección de tu web está registrada para él: el widget sólo funciona desde esas direcciones.
2. Pega esto donde quieras que aparezca la lista:

```html
<script src="https://cdn.jsdelivr.net/gh/inquilab-madrid/gestor-de-eventos-feed@widget-v0.1.0/packages/widget/dist/actividades-toka.js"
        integrity="sha384-jIE66Aqi0uNo3HaZsiTrWigElI3pyfklNqnprO+Gy8LWfhXm+YHHRnCVX2/SEHPM"
        crossorigin="anonymous" defer></script>
<actividades-toka client="fc_TU_IDENTIFICADOR" province="28"></actividades-toka>
```

El `integrity` comprueba que el archivo que llega es exactamente el de esta versión: si alguien lo cambiara por el camino, el navegador no lo ejecutaría. Usa siempre la pareja de versión e `integrity` de esta página.

En WordPress, pégalo en un bloque «HTML personalizado».

## Opciones

| Atributo | Ejemplo | Qué hace |
| --- | --- | --- |
| `client` | `fc_…` | **Obligatorio.** Tu identificador de cliente. |
| `province` | `28` | Las actividades de una provincia, por su [código INE](https://www.ine.es/daco/daco42/codmun/cod_provincia.htm) de dos cifras. |
| `municipality` | `Getafe` | O las de un municipio, por su nombre. Da igual con o sin tildes. |
| `limit` | `5` | Cuántas actividades enseñar como mucho. Por defecto, 10. |
| `lang` | `ca` | `es`, `ca`, `eu` o `gl`. Si no lo pones, usa el idioma de tu página (`<html lang="…">`), y si no es ninguno de los cuatro, castellano. |

Usa `province` **o** `municipality`, uno de los dos. Puedes poner varios widgets en la misma página, cada uno con su zona.

```html
<actividades-toka client="fc_TU_IDENTIFICADOR" municipality="Barcelona" lang="ca" limit="5"></actividades-toka>
```

## Qué enseña

La próxima fecha de cada actividad, con su enlace para apuntarse (se abre en otra pestaña), el día y la hora del lugar («hora canaria» cuando toca), el sitio, el tipo y su estado: «Falta gente», «Confirmada» o «Cancelada» (tachada). Si una actividad se repite, sale una vez con «y N fechas más». Al final, la cita de la fuente que pide la licencia.

Si no hay actividades, lo dice. Si el feed no responde, enseña un aviso corto; los detalles para quien lleva la web salen en la consola del navegador.

## Adaptarlo a tu web

El widget hereda el tipo de letra y el color del texto de donde lo pongas. Para ajustarlo:

```html
<style>
  actividades-toka {
    --toka-accent: #b3261e;  /* enlaces y estado «Confirmada» */
    --toka-muted: #555;      /* fecha, lugar y avisos */
    --toka-gap: 1rem;        /* espacio entre actividades */
    --toka-radius: 4px;      /* esquinas de las etiquetas de estado */
  }
  actividades-toka::part(link) { font-size: 1.1em; }
</style>
```

Partes que puedes estilar con `::part(…)`: `item` (cada actividad), `link` (el título), `meta` (fecha, lugar y tipo), `state` (las etiquetas de estado) y `credit` (la cita final).

## Si tu web tiene Content-Security-Policy

Añade el CDN y el feed:

```
script-src 'self' https://cdn.jsdelivr.net;
connect-src 'self' https://participa.huelgaporlavivienda.org;
```

## Alojarlo tú

Si prefieres no cargarlo desde jsDelivr, descarga `packages/widget/dist/actividades-toka.js` de la etiqueta `widget-v0.1.0` de este repositorio, súbelo a tu web y cambia el `src`. El archivo no tiene dependencias.

## Privacidad y seguridad

- Al ver la lista, el navegador de cada visita se conecta a `participa.huelgaporlavivienda.org` (y a `cdn.jsdelivr.net` si lo cargas de ahí). Menciónalo en tu política de privacidad.
- El widget sólo pinta texto: lo que escribe la gente de la campaña nunca se interpreta como HTML ni como código en tu web.
- No usa cookies ni guarda nada en el navegador.

## Versiones

| Versión | `integrity` |
| --- | --- |
| `widget-v0.1.0` | `sha384-jIE66Aqi0uNo3HaZsiTrWigElI3pyfklNqnprO+Gy8LWfhXm+YHHRnCVX2/SEHPM` |
