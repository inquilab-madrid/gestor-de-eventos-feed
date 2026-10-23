# Formato de los datos

El feed es [JSON-LD](https://json-ld.org/) con el vocabulario de [schema.org](https://schema.org/). No necesitas saber nada de JSON-LD: es JSON normal, y puedes leerlo como tal. Si ya trabajas con schema.org (buscadores, plugins de eventos), los tipos te sonarán.

Todos los datos de los ejemplos son inventados.

## DataFeed

`GET /activities` devuelve un [`DataFeed`](https://schema.org/DataFeed):

```json
{
  "@context": "https://schema.org",
  "@type": "DataFeed",
  "url": "https://participa.huelgaporlavivienda.org/activities",
  "inLanguage": "es",
  "license": "https://creativecommons.org/licenses/by/4.0/",
  "dateModified": "2026-10-20T10:00:00+00:00",
  "dataFeedElement": [ { "@type": "Event", "…": "…" } ]
}
```

| Campo | Qué es |
| --- | --- |
| `dataFeedElement` | Las actividades, de la más cercana a la más lejana. Puede estar vacío. |
| `license` | La licencia de los datos: cítala si los reutilizas. |
| `dateModified` | La última vez que se editó alguna de las actividades de la lista. No aparece si la lista está vacía. Ojo: apuntarse a una actividad no la cambia, así que para saber si hay novedades usa el [`ETag`](api.md#cabeceras), no esta fecha. |

## Event

Cada actividad es un [`Event`](https://schema.org/Event). `GET /activities/{id}` devuelve uno solo, con su propio `@context`.

```json
{
  "@type": "Event",
  "@id": "https://participa.huelgaporlavivienda.org/activities/11111111-1111-4111-8111-111111111111",
  "url": "https://participa.huelgaporlavivienda.org/activities/11111111-1111-4111-8111-111111111111",
  "name": "Asamblea de barrio",
  "description": "Nos vemos en la plaza para preparar la huelga.",
  "startDate": "2026-11-11T18:00:00+01:00",
  "endDate": "2026-11-11T20:00:00+01:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "additionalProperty": { "@type": "PropertyValue", "propertyID": "viability", "value": "confirmed" },
  "location": {
    "@type": "Place",
    "name": "Plaza Mayor",
    "address": { "@type": "PostalAddress", "addressCountry": "ES", "addressLocality": "Madrid", "addressRegion": "Madrid" },
    "geo": { "@type": "GeoCoordinates", "latitude": 40.4155, "longitude": -3.7074 }
  },
  "keywords": "Asamblea de huelga",
  "maximumAttendeeCapacity": 40,
  "remainingAttendeeCapacity": 28,
  "superEvent": { "@type": "EventSeries", "@id": "urn:uuid:44444444-4444-4444-8444-444444444444" },
  "organizer": [{ "@type": "Organization", "name": "Comité de Ejemplo" }],
  "potentialAction": { "@type": "JoinAction", "target": "https://participa.huelgaporlavivienda.org/activities/11111111-1111-4111-8111-111111111111" }
}
```

| Campo | Siempre | Qué es |
| --- | --- | --- |
| `@id`, `url` | Sí | La página de la actividad. Úsala como identificador estable en tu web. |
| `name` | Sí | El título. |
| `description` | No | El texto de la actividad. Puede tener varias líneas. |
| `startDate`, `endDate` | Sí | Inicio y fin, en la [hora del lugar](#fechas-y-horas). |
| `eventStatus` | Sí | `EventScheduled` (sigue en pie) o `EventCancelled` (cancelada). |
| `additionalProperty` | Si no está cancelada | Si ya tiene la gente mínima: [`viability`](#falta-gente-o-confirmada). |
| `eventAttendanceMode` | Sí | Siempre presencial (`OfflineEventAttendanceMode`). |
| `location.name` | No | El lugar: una plaza, un local, una dirección. |
| `location.address` | Sí | `addressLocality` (municipio), `addressRegion` (provincia) y `addressCountry` (`ES`). Los dos primeros pueden faltar. |
| `location.geo` | No | Latitud y longitud, para ponerla en un mapa. |
| `keywords` | Sí | El tipo de actividad: «Reunión de comité», «Formación», «Difusión», «Encuesta», «Asamblea de huelga», «Movilización», «Huelga» u «Otros». |
| `maximumAttendeeCapacity`, `remainingAttendeeCapacity` | Si tiene plazas limitadas | Plazas en total y plazas libres. Con `remainingAttendeeCapacity: 0` está completa. |
| `superEvent` | Si se repite | La [serie](#actividades-que-se-repiten) a la que pertenece. |
| `organizer` | Si se sabe | Los comités que la convocan, por su nombre. |
| `potentialAction` | Sí | Dónde apuntarse: la página de la actividad. |

Puede haber campos que no aparezcan en esta tabla: ignóralos. En `/v1` sólo se añaden campos, nunca se quitan.

## Cómo leerlos

### Falta gente o confirmada

Cada actividad necesita un mínimo de gente para hacerse. Mientras no llega, la campaña dice «Falta gente»; cuando llega, «Confirmada». schema.org no tiene esa idea, así que va en `additionalProperty`:

| `eventStatus` | `viability` | En la campaña se dice |
| --- | --- | --- |
| `EventScheduled` | `pending` | Falta gente |
| `EventScheduled` | `confirmed` | Confirmada |
| `EventCancelled` | — | Cancelada |

Si muestras el estado, usa esas palabras: es como lo dice la campaña en su web y en sus correos.

### Canceladas

Una actividad cancelada sigue en el feed hasta su fecha, con `eventStatus: EventCancelled`, para que tu web se entere aunque ya la mostrara. Táchala o quítala, pero no la dejes como si siguiera en pie.

### Fechas y horas

Las fechas vienen en ISO 8601 con el desfase de la hora oficial del lugar: `+01:00` o `+02:00` en la Península, Baleares, Ceuta y Melilla, y una hora menos (`+00:00` o `+01:00`) en Canarias.

- Para mostrar la hora tal como la verá quien vaya, usa la hora local que trae la fecha (`18:00` en `2026-11-11T18:00:00+01:00`) y, si es en Canarias, dilo («hora canaria»), como hace la campaña.
- Si conviertes la fecha a la zona de tu servidor o del navegador, la hora cambiará: `new Date(…)` en JavaScript lo hace sin avisar. Con `Intl.DateTimeFormat` y `timeZone: "Europe/Madrid"` (o `"Atlantic/Canary"` si `addressRegion` es «Las Palmas» o «Santa Cruz de Tenerife») la mostrarás bien.

### Actividades que se repiten

Algunas actividades se repiten cada día o cada semana. Cada fecha es un `Event` propio, con su `@id`, su estado y sus plazas, y todas las fechas de una misma serie comparten el `@id` de `superEvent`. Si quieres mostrar la serie una sola vez, como hace la web de la campaña, agrupa por ese `@id` y enseña la fecha más próxima.

## Lo que el feed no trae

El feed sólo trae lo que cualquiera ve sin cuenta en la web de la campaña. Nunca trae quién se ha apuntado, contactos, códigos postales ni enlaces a grupos de mensajería. Para apuntarse, la gente va a la página de la actividad (`potentialAction.target`) y se apunta allí.
