# Feed público de actividades

Las actividades de la campaña por la Huelga General por la Vivienda, listas para que tu sindicato, colectivo o asociación las publique en su propia web, siempre al día.

El feed da en un formato estándar ([JSON-LD](https://json-ld.org/) con el vocabulario [schema.org `Event`](https://schema.org/Event)) lo mismo que cualquiera ve sin cuenta en [participa.huelgaporlavivienda.org/activities](https://participa.huelgaporlavivienda.org/activities): actividades próximas, dónde, cuándo, si falta gente o están confirmadas, y el enlace para apuntarse. Cuando una actividad cambia o se cancela, el feed lo refleja en un minuto como mucho.

Este repositorio es la documentación para quien lleva la web, el código de los ejemplos y librerías para usarlo. El widget para pegar en una web llegará aquí también.

## Empieza en cinco minutos

1. **Prueba el feed** desde tu terminal:

   ```bash
   curl 'https://participa.huelgaporlavivienda.org/api/public/v1/activities?client=fc_TU_IDENTIFICADOR&province=28'
   ```

   Recibes un `DataFeed` con las actividades próximas de Madrid. Sin identificador, la respuesta es `401`.
2. **Elige cómo publicarlo:**
   - **Desde tu servidor** (WordPress u otro gestor de contenidos, o una web con mucho tráfico): tu servidor consulta el feed como mucho una vez por minuto, guarda una copia y la muestra. Ejemplo en [`examples/server.mjs`](examples/server.mjs).
   - **Desde el navegador** (una web sencilla sin servidor propio): un poco de JavaScript en tu página pide el feed y pinta la lista. Ejemplo en [`examples/browser.html`](examples/browser.html).

   Antes de publicarlo, lee las [buenas prácticas](docs/good-practices.md): hay dos o tres cosas que, si se olvidan, dejan tu web expuesta o te cortan el acceso.

## Documentación

- [Referencia de la API](docs/api.md): rutas, filtros, identificación, cabeceras, errores y límites.
- [Formato de los datos](docs/data-format.md): qué trae cada actividad y cómo leerla.
- [Buenas prácticas](docs/good-practices.md): consultar sin sobrecargar, mostrar sin abrir agujeros de seguridad, qué hacer cuando algo falla.
- [Librerías](docs/libraries.md): JavaScript/TypeScript (navegador y Node.js), para no leer el JSON-LD a mano.

## Licencia

- **Los datos del feed** se publican con licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.es). Puedes reutilizarlos citando la fuente, por ejemplo: «Actividades: [Huelga General por la Vivienda](https://participa.huelgaporlavivienda.org/activities), CC BY 4.0».
- **El código de este repositorio** (ejemplos y widget) tiene licencia [MIT](LICENSE).

## ¿Algo no funciona?

- Dudas y errores en la documentación o en los ejemplos: abre una [issue](https://github.com/inquilab-madrid/gestor-de-eventos-feed/issues).
- **Nunca publiques tu identificador ni datos de contacto en una issue.** Para pedir o cambiar un identificador, escribe a Coordinación.
- Si encuentras un fallo de seguridad, no abras una issue: sigue [SECURITY.md](SECURITY.md).
