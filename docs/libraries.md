# Librerías

Para no tener que leer el JSON-LD a mano, hay librerías que hacen el trabajo repetitivo: añadir tu identificador y los filtros, convertir cada actividad en un objeto sencillo, dar el estado con las palabras de la campaña, mostrar la hora del lugar y, desde tu servidor, guardar la última copia buena y esperar cuando el feed lo pide.

Los ejemplos muestran las actividades de una provincia (por su código INE, `28` es Madrid) o de un municipio (por su nombre): el feed admite uno de cada por petición.

Las librerías devuelven texto, nunca HTML. Muéstralo como texto: lee [Seguridad](good-practices.md#seguridad-muestra-los-textos-como-texto).

Todavía no están publicadas en npm ni en Packagist. Mientras tanto, cópialas de este repositorio.

## JavaScript y TypeScript

En [`packages/js`](../packages/js). Sin dependencias. Funciona en el navegador y en Node.js 22 o posterior, y trae sus tipos de TypeScript.

### Instalarla

Hasta que esté en npm, compílala desde este repositorio:

```bash
git clone https://github.com/inquilab-madrid/gestor-de-eventos-feed.git
cd gestor-de-eventos-feed/packages/js
npm install && npm run build
```

Y añádela a tu proyecto desde esa carpeta (`npm install ../ruta/a/packages/js`), o copia `dist/` a tu web.

### En el navegador

```js
import { createFeedClient, formatWhen, statusLabel } from "@inquilab-madrid/activity-feed";

const feed = createFeedClient({ client: "fc_TU_IDENTIFICADOR" });
const { activities } = await feed.list({ province: "28" }); // o { municipality: "Getafe" }

const list = document.querySelector("#actividades");
for (const activity of activities) {
  const item = document.createElement("li");
  const link = document.createElement("a");
  link.href = activity.url;
  link.textContent = activity.name;                                      // texto, nunca innerHTML
  item.append(link, ` · ${formatWhen(activity)} · ${statusLabel(activity)}`); // append con texto también es seguro
  list.append(item);
}
```

Desde el navegador, la petición sólo funciona en las direcciones de tu web que registraste con tu identificador.

### En tu servidor (Node.js)

El *poller* guarda la última copia buena y la refresca como piden las [buenas prácticas](good-practices.md#desde-tu-servidor): como mucho una vez por minuto, sólo los cambios, y esperando lo que diga el feed cuando falla.

```js
import { createFeedClient } from "@inquilab-madrid/activity-feed";
import { createPoller } from "@inquilab-madrid/activity-feed/poller";
import { fileStorage } from "@inquilab-madrid/activity-feed/node";

const feed = createFeedClient({
  client: process.env.FEED_CLIENT,
  userAgent: "NombreDeTuColectivo/1.0 (+https://tu-web.org/contacto)",
});
const poller = createPoller({
  feed,
  filters: { province: "28" }, // o { municipality: "Getafe" }
  storage: fileStorage("actividades.json"),
});

// En un servidor que está siempre en marcha: refresca ahora y cada minuto.
poller.start((result) => { if (result.error) console.error(result.error.title); });

// Al pintar la página, usa la copia: no llames al feed en cada visita.
const snapshot = await poller.current();
const activities = snapshot?.activities ?? [];
```

Si lo ejecutas desde cron, llama a `poller.refresh()` una vez por ejecución y pasa `jitterMs: 20_000` a `createPoller`, para no preguntar justo en el segundo `:00`.

### Qué devuelve

`feed.list(filtros, { etag })` devuelve `{ activities, etag, age, dateModified }`, o `{ notModified: true }` si le pasas el `etag` de tu copia y nada ha cambiado. `feed.get(id)` devuelve `{ activity, etag, age }`.

Cada actividad es un objeto así:

| Campo | Qué es |
| --- | --- |
| `id`, `url` | El identificador y la página de la actividad. |
| `name`, `description` | Título y texto (`description` puede ser `null`). |
| `start`, `end` | Fecha y hora ISO 8601 con el desfase del lugar. |
| `timeZone` | `Europe/Madrid` o `Atlantic/Canary`. |
| `status` | `pending` (Falta gente), `confirmed` (Confirmada) o `cancelled` (Cancelada). |
| `type` | El tipo de actividad, por ejemplo «Asamblea de huelga». |
| `place` | `name`, `municipality`, `province`, `latitude`, `longitude`; cualquiera puede ser `null`. |
| `capacity` | `{ max, remaining }`, o `null` si no tiene plazas limitadas. |
| `seriesId` | El identificador de la serie si se repite, o `null`. |
| `organizers` | Los nombres de los comités que la convocan. |
| `joinUrl` | Dónde apuntarse. |
| `raw` | El `Event` tal como llegó del feed, por si necesitas algo más. |

### Ayudas

| Función | Qué hace |
| --- | --- |
| `statusLabel(activity)` | «Falta gente», «Confirmada» o «Cancelada». |
| `formatWhen(activity, "es")` | Día y hora en la hora del lugar, con «(hora canaria)» si toca. |
| `localTime(activity)` | Sólo la hora de inicio, `HH:MM`, en la hora del lugar. |
| `groupSeries(activities)` | Una entrada por serie (la próxima fecha que no esté cancelada), con `otherDates`: cuántas fechas más tiene. Como hace la web de la campaña. |

### Errores

Cualquier respuesta que no sea `200` o `304` lanza un `FeedError` con `status`, `title` (el mensaje del feed, en castellano) y `retryAfter` (los segundos que pide esperar, si los pide). Si el feed no responde, `status` es `0`. Qué hacer con cada código está en la [referencia de la API](api.md#códigos).

## PHP

En [`packages/php`](../packages/php). PHP 8.2 o posterior, sin dependencias: no necesita curl ni otros paquetes. Con la extensión `intl`, `Format::when()` escribe las fechas en cualquier idioma; sin ella, en castellano.

¿Usas WordPress? Hay un [plugin de ejemplo](../examples/wordpress/activity-feed-shortcode) con un shortcode listo para usar.

### Instalarla

Hasta que esté en Packagist, copia `packages/php/src` a tu proyecto y regístrala en tu autoload de Composer:

```json
{ "autoload": { "psr-4": { "InquilabMadrid\\ActivityFeed\\": "lib/activity-feed/" } } }
```

### Uso

Desde cron, refresca la copia; en tus páginas, muestra la copia. Así las visitas nunca llaman al feed.

```php
use InquilabMadrid\ActivityFeed\{FeedClient, FileCache, Format, Poller};

$feed = new FeedClient('fc_TU_IDENTIFICADOR', userAgent: 'NombreDeTuColectivo/1.0 (+https://tu-web.org/contacto)');
$poller = new Poller($feed, new FileCache(__DIR__ . '/actividades.json'), ['province' => '28']);

// En el script de cron (cada minuto o cada pocos minutos):
$result = $poller->refresh();
if ($result->error !== null) {
    error_log($result->error->title);
}

// Al pintar la página:
foreach ($poller->current()?->activities ?? [] as $activity) {
    printf(
        '<li><a href="%s">%s</a> · %s · %s</li>',
        htmlspecialchars($activity->url, ENT_QUOTES),
        htmlspecialchars($activity->name, ENT_QUOTES),   // texto, nunca HTML sin escapar
        htmlspecialchars(Format::when($activity), ENT_QUOTES),
        htmlspecialchars(Format::statusLabel($activity), ENT_QUOTES),
    );
}
```

Si muchas webs ejecutan cron en el mismo minuto, pasa `jitterSeconds: 20` a `Poller` para no preguntar justo en el segundo `:00`.

Para consultas sueltas, sin copia: `$feed->list(['province' => '28'])` y `$feed->get($id)` devuelven un `FeedResult` con `activities`, `etag`, `age` y `dateModified` (o `notModified` si le pasas el `etag` de tu copia).

### Qué devuelve y ayudas

Cada actividad es un objeto `Activity` con los mismos campos que en JavaScript (ver la tabla de arriba): `$activity->place->municipality`, `$activity->capacity?->remaining`, `$activity->raw`…

| Método | Qué hace |
| --- | --- |
| `Format::statusLabel($activity)` | «Falta gente», «Confirmada» o «Cancelada». |
| `Format::when($activity, 'es')` | Día y hora en la hora del lugar, con «(hora canaria)» si toca. |
| `Format::localTime($activity)` | Sólo la hora de inicio, `HH:MM`. |
| `Series::group($activities)` | Una entrada por serie: `['activity' => …, 'otherDates' => n]`. |

### Dónde guardar la copia

| Clase | Para |
| --- | --- |
| `FileCache($ruta)` | Un archivo JSON, con escritura atómica. |
| `WordPressOptionCache()` | Una opción de WordPress (no un *transient*, que puede desaparecer). |
| `MemoryCache()` | Pruebas, o procesos que están siempre en marcha. |

O implementa `Cache` (`read()` y `write()`) para guardarla en tu base de datos.

### Tu propio cliente HTTP

Por defecto usa los *streams* de PHP. Para usar Guzzle, Symfony HttpClient o `wp_remote_get`, implementa `HttpTransport` (un método `get()`) y pásalo a `FeedClient`. El plugin de WordPress tiene un ejemplo.

### Errores

Cualquier respuesta que no sea `200` o `304` lanza un `FeedException` con `status`, `title` y `retryAfter`, igual que en JavaScript. `Poller::refresh()` no lanza: devuelve el error en `$result->error` y conserva la copia.
