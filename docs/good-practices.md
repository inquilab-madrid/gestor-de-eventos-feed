# Buenas prácticas

Tres cosas importan: no sobrecargar el feed, que tu web no quede expuesta y que no muestre información vieja como si fuera buena.

## ¿Desde tu servidor o desde el navegador?

| | Desde tu servidor | Desde el navegador |
| --- | --- | --- |
| Para quién | WordPress u otro gestor de contenidos; cualquier web con bastante tráfico | Webs sencillas, sin servidor propio |
| Cuántas peticiones | Una por minuto, como mucho, tenga tu web las visitas que tenga | Una por cada visita |
| Si el feed no responde | Sigues mostrando tu última copia | La lista no aparece |
| Buscadores | Indexan las actividades en tu web | Normalmente, no |
| Las visitas de tu web | No llegan a nuestro servidor | Su navegador llama a nuestro servidor (y ve su IP) |

Si puedes, hazlo desde tu servidor. El ejemplo [`examples/server.mjs`](../examples/server.mjs) hace todo lo de esta sección.

## Desde tu servidor

- **Identifícate** con un `User-Agent` propio: `NombreDeTuColectivo/1.0 (+https://tu-web.org/contacto)`. Si algo va mal, podremos avisarte antes de cortar nada.
- **Una vez por minuto, como mucho.** El feed no cambia más a menudo. Si usas cron, añade una espera aleatoria de unos segundos: si todas las webs preguntan en el segundo `:00`, se juntan.
- **Pide sólo los cambios.** Guarda el `ETag` de cada respuesta y mándalo en `If-None-Match`. Si nada ha cambiado, recibirás un `304` sin cuerpo.
- **Guarda la última copia buena** y muéstrala siempre desde ahí. Si el feed falla, tu web sigue funcionando.
- **Cuando algo falla, espera.** Con `429` o `503`, respeta `Retry-After`. Sin esa cabecera (un error de red, un `500`), espera un minuto, luego dos, luego cuatro…, hasta una hora. Nunca reintentes en bucle: si todas las webs lo hacen a la vez, el feed tarda más en volver.
- **No dejes que la copia envejezca sin avisar.** Si llevas horas sin poder actualizarla, puede haber actividades canceladas que tu web sigue anunciando. Considera ocultar la lista o indicar desde cuándo no se actualiza.
- **Un `401` o `403` no se arregla esperando.** Revisa tu identificador o escribe a Coordinación.

## Desde el navegador

- **Pide el feed una vez al cargar la página.** Nunca dentro de un bucle, un temporizador o, si usas React u otro framework, en un efecto que se repita en cada renderizado.
- **Sólo funciona en las direcciones que registraste.** Para probar en tu ordenador, sirve la página desde un servidor local (`npx serve`, `python3 -m http.server 8080`) y pide que añadan esa dirección (`http://localhost:8080`). Abrir el archivo con doble clic (`file://`) no funciona.
- **Si tu web tiene Content-Security-Policy,** añade el feed a `connect-src`: `connect-src 'self' https://participa.huelgaporlavivienda.org`.
- **Avisa en tu política de privacidad** de que, al ver la lista, el navegador de cada visita se conecta a `participa.huelgaporlavivienda.org`.
- El ejemplo [`examples/browser.html`](../examples/browser.html) hace todo lo anterior.

## Seguridad: muestra los textos como texto

Los títulos, descripciones, lugares y nombres de comités los escribe gente de la campaña. Son texto, nunca HTML. Si tu web los inserta como HTML, cualquiera que cree una actividad con `<img src=x onerror=…>` en el título ejecutaría código en tu web.

- **En el navegador:** usa `textContent` o `createTextNode`, nunca `innerHTML`, `outerHTML`, `insertAdjacentHTML` ni `document.write`. Con React, Vue o similares, pinta el texto con sus llaves normales (`{event.name}`), nunca con `dangerouslySetInnerHTML` o `v-html`.
- **En tu servidor:** escapa el HTML al pintar (`htmlspecialchars` en PHP, `esc_html` en WordPress, el escapado automático de tu sistema de plantillas).
- **Los únicos enlaces** son `url` y `potentialAction.target`, y siempre apuntan a `https://participa.huelgaporlavivienda.org/`. Si construyes otros enlaces con datos del feed, comprueba que empiezan por `https://`.
- **Si incrustas el JSON en tu página** dentro de `<script type="application/ld+json">`, para que los buscadores lo lean, escapa `</` (por ejemplo, como `<\/`): un título con `</script>` cerraría la etiqueta antes de tiempo.

## Lo que se ve en tu web

- **Usa las palabras de la campaña** para el estado: «Falta gente», «Confirmada», «Cancelada». Ver [Formato de los datos](data-format.md#falta-gente-o-confirmada).
- **Muestra la hora del lugar**, y di «hora canaria» cuando toque. Ver [Fechas y horas](data-format.md#fechas-y-horas).
- **Enlaza cada actividad a su página** (`url`): es donde la gente se apunta.
- **Cita la fuente**, como pide la licencia: «Actividades: Huelga General por la Vivienda, CC BY 4.0», con enlace a la web de la campaña.
