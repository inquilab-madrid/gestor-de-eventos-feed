# Plugin de WordPress: Actividades de la huelga

Muestra las actividades de la campaña en cualquier página con el shortcode `[actividades_huelga]`. Usa la [librería de PHP](../../../docs/libraries.md#php) y sigue las [buenas prácticas](../../../docs/good-practices.md):

- Las visitas nunca llaman al feed: el plugin guarda la última copia buena y la refresca con WP-Cron cada cinco minutos.
- Identifica tu web con su `User-Agent`, pide sólo los cambios y espera lo que diga el feed cuando falla.
- Escapa todos los textos (`esc_html`, `esc_url`) y tacha las actividades canceladas.
- Si la copia tiene más de seis horas, dice cuándo se actualizó por última vez.

## Instalarlo

1. Copia esta carpeta a `wp-content/plugins/activity-feed-shortcode/`.
2. Copia la librería dentro, en `lib/`:

   ```bash
   cp -r packages/php/src wp-content/plugins/activity-feed-shortcode/lib
   ```

   Si tu web usa Composer, en su lugar instala `inquilab-madrid/activity-feed` y el plugin la encontrará.
3. Actívalo en *Plugins*.
4. En *Ajustes → Actividades de la huelga*, pon tu identificador de cliente y, si quieres, el código INE de tu provincia.
5. Añade `[actividades_huelga]` a una página. Opciones: `limit="10"` y `municipality="Getafe"`.

WP-Cron se ejecuta con las visitas a tu web. Si tienes pocas, configura un cron de verdad que llame a `wp-cron.php`, como recomienda WordPress.
