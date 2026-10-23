<?php
/**
 * Plugin Name: Actividades de la huelga
 * Description: Muestra las actividades de la campaña por la Huelga General por la Vivienda con el shortcode [actividades_huelga].
 * Version: 0.1.0
 * Requires PHP: 8.1
 * License: MIT
 */

declare(strict_types=1);

use InquilabMadrid\ActivityFeed\Activity;
use InquilabMadrid\ActivityFeed\FeedClient;
use InquilabMadrid\ActivityFeed\FeedException;
use InquilabMadrid\ActivityFeed\Format;
use InquilabMadrid\ActivityFeed\HttpResponse;
use InquilabMadrid\ActivityFeed\HttpTransport;
use InquilabMadrid\ActivityFeed\Poller;
use InquilabMadrid\ActivityFeed\Series;
use InquilabMadrid\ActivityFeed\WordPressOptionCache;

if (!defined('ABSPATH')) {
    exit;
}

// The library: from Composer if the site uses it, otherwise from lib/ (a copy of packages/php/src).
if (!class_exists(FeedClient::class)) {
    if (is_readable(__DIR__ . '/vendor/autoload.php')) {
        require __DIR__ . '/vendor/autoload.php';
    } else {
        spl_autoload_register(static function (string $class): void {
            $prefix = 'InquilabMadrid\\ActivityFeed\\';
            if (str_starts_with($class, $prefix)) {
                $file = __DIR__ . '/lib/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
                if (is_readable($file)) {
                    require $file;
                }
            }
        });
    }
}

const ACTIVITY_FEED_SETTINGS = 'activity_feed_settings';
const ACTIVITY_FEED_STATE = 'activity_feed_state';
const ACTIVITY_FEED_HOOK = 'activity_feed_refresh';

/** Requests through WordPress, so the site's proxy and SSL settings apply. */
final class Activity_Feed_WordPress_Transport implements HttpTransport
{
    public function get(string $url, array $headers): HttpResponse
    {
        $response = wp_remote_get($url, [
            'headers' => $headers,
            'timeout' => 15,
            'user-agent' => $headers['User-Agent'] ?? 'WordPress',
        ]);
        if (is_wp_error($response)) {
            throw new FeedException(0, $response->get_error_message());
        }
        $parsed = [];
        foreach (wp_remote_retrieve_headers($response) as $name => $value) {
            $parsed[strtolower((string) $name)] = is_array($value) ? (string) end($value) : (string) $value;
        }
        return new HttpResponse((int) wp_remote_retrieve_response_code($response), $parsed, (string) wp_remote_retrieve_body($response));
    }
}

/** @return array{client: string, province: string} */
function activity_feed_settings(): array
{
    $settings = get_option(ACTIVITY_FEED_SETTINGS, []);
    return [
        'client' => is_array($settings) && is_string($settings['client'] ?? null) ? $settings['client'] : '',
        'province' => is_array($settings) && is_string($settings['province'] ?? null) ? $settings['province'] : '',
    ];
}

function activity_feed_poller(): ?Poller
{
    $settings = activity_feed_settings();
    if ($settings['client'] === '') {
        return null;
    }
    // Identify the site, so the campaign can reach it if something goes wrong.
    $userAgent = sprintf('%s/1.0 (+%s)', sanitize_title(get_bloginfo('name')) ?: 'wordpress', home_url('/'));
    $feed = new FeedClient($settings['client'], new Activity_Feed_WordPress_Transport(), userAgent: $userAgent);
    return new Poller($feed, new WordPressOptionCache(ACTIVITY_FEED_STATE), array_filter(['province' => $settings['province']]));
}

// Refresh every five minutes with WP-Cron. Pages only read the kept copy: visits never call the feed.
add_filter('cron_schedules', static function (array $schedules): array {
    $schedules['activity_feed_five_minutes'] = ['interval' => 300, 'display' => 'Cada cinco minutos'];
    return $schedules;
});
add_action(ACTIVITY_FEED_HOOK, static function (): void {
    activity_feed_poller()?->refresh();
});
register_activation_hook(__FILE__, static function (): void {
    if (!wp_next_scheduled(ACTIVITY_FEED_HOOK)) {
        wp_schedule_event(time() + 60, 'activity_feed_five_minutes', ACTIVITY_FEED_HOOK);
    }
});
register_deactivation_hook(__FILE__, static function (): void {
    wp_clear_scheduled_hook(ACTIVITY_FEED_HOOK);
});

// Settings → Actividades de la huelga.
add_action('admin_init', static function (): void {
    register_setting('activity_feed', ACTIVITY_FEED_SETTINGS, [
        'type' => 'array',
        'sanitize_callback' => static function ($input): array {
            $previous = activity_feed_settings();
            $client = is_array($input) ? trim((string) ($input['client'] ?? '')) : '';
            $province = is_array($input) ? trim((string) ($input['province'] ?? '')) : '';
            if ($client !== '' && preg_match('/^fc_[0-9A-Za-z]{22}$/', $client) !== 1) {
                add_settings_error(ACTIVITY_FEED_SETTINGS, 'client', 'El identificador de cliente tiene la forma fc_ seguido de 22 letras y números.');
                $client = $previous['client'];
            }
            if ($province !== '' && preg_match('/^\d{2}$/', $province) !== 1) {
                add_settings_error(ACTIVITY_FEED_SETTINGS, 'province', 'La provincia es su código INE de dos cifras, por ejemplo 28 para Madrid.');
                $province = $previous['province'];
            }
            return ['client' => $client, 'province' => $province];
        },
    ]);
});
// New settings, new list: forget the old copy and refresh as soon as possible.
add_action('update_option_' . ACTIVITY_FEED_SETTINGS, static function (): void {
    delete_option(ACTIVITY_FEED_STATE);
    wp_schedule_single_event(time(), ACTIVITY_FEED_HOOK);
});
add_action('admin_menu', static function (): void {
    add_options_page('Actividades de la huelga', 'Actividades de la huelga', 'manage_options', 'activity-feed', static function (): void {
        $settings = activity_feed_settings();
        $snapshot = activity_feed_poller()?->current();
        ?>
        <div class="wrap">
            <h1>Actividades de la huelga</h1>
            <p>Muestra las actividades en cualquier página con el shortcode <code>[actividades_huelga]</code>. Opciones: <code>limit="10"</code>, <code>municipality="Getafe"</code>.</p>
            <form method="post" action="options.php">
                <?php settings_fields('activity_feed'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="activity-feed-client">Identificador de cliente</label></th>
                        <td><input id="activity-feed-client" class="regular-text" name="<?php echo esc_attr(ACTIVITY_FEED_SETTINGS); ?>[client]" value="<?php echo esc_attr($settings['client']); ?>" placeholder="fc_…"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="activity-feed-province">Provincia</label></th>
                        <td><input id="activity-feed-province" class="small-text" name="<?php echo esc_attr(ACTIVITY_FEED_SETTINGS); ?>[province]" value="<?php echo esc_attr($settings['province']); ?>" placeholder="28">
                            <p class="description">Código INE de dos cifras. Vacío: toda España.</p></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            <p><?php echo esc_html($snapshot
                ? sprintf('Última actualización: %s, %d actividades.', wp_date('j M Y H:i', $snapshot->savedAt), count($snapshot->activities))
                : 'Todavía no se ha descargado ninguna lista.'); ?></p>
        </div>
        <?php
    });
});

/** Lower case and without accents, as the feed compares municipalities. */
function activity_feed_plain(string $text): string
{
    return strtolower(remove_accents(trim($text)));
}

add_shortcode('actividades_huelga', static function ($atts): string {
    $atts = shortcode_atts(['limit' => '10', 'municipality' => ''], is_array($atts) ? $atts : [], 'actividades_huelga');
    $poller = activity_feed_poller();
    if ($poller === null) {
        return current_user_can('manage_options') ? '<p>' . esc_html('Configura el identificador de cliente en Ajustes → Actividades de la huelga.') . '</p>' : '';
    }
    // The first time there is no copy yet: fetch it once; from then on, WP-Cron keeps it fresh.
    $snapshot = $poller->current() ?? $poller->refresh()->snapshot;
    if ($snapshot === null) {
        return '<p>' . esc_html('No se han podido cargar las actividades.') . '</p>';
    }

    $activities = $snapshot->activities;
    if ($atts['municipality'] !== '') {
        $wanted = activity_feed_plain((string) $atts['municipality']);
        $activities = array_values(array_filter($activities, static fn (Activity $a) => activity_feed_plain($a->place->municipality ?? '') === $wanted));
    }
    $entries = array_slice(Series::group($activities), 0, max(1, (int) $atts['limit']));

    // Every text from the feed is escaped: it is written by campaign volunteers, never trusted as HTML.
    $html = '<div class="actividades-huelga">';
    if ($entries === []) {
        $html .= '<p>' . esc_html('No hay actividades próximas.') . '</p>';
    } else {
        $html .= '<ul>';
        foreach ($entries as ['activity' => $activity, 'otherDates' => $otherDates]) {
            $place = implode(', ', array_filter([$activity->place->name, $activity->place->municipality]));
            $title = '<a href="' . esc_url($activity->url) . '">' . esc_html($activity->name) . '</a>';
            $html .= '<li>' . ($activity->status === 'cancelled' ? '<del>' . $title . '</del>' : $title)
                . ' · ' . esc_html(Format::when($activity))
                . ($place !== '' ? ' · ' . esc_html($place) : '')
                . ' · <strong>' . esc_html(Format::statusLabel($activity)) . '</strong>'
                . ($otherDates > 0 ? ' · ' . esc_html(sprintf('y %d fechas más', $otherDates)) : '')
                . '</li>';
        }
        $html .= '</ul>';
    }
    // An old copy may still announce activities that were cancelled since: say how old it is.
    if (time() - $snapshot->savedAt > 6 * HOUR_IN_SECONDS) {
        $html .= '<p><small>' . esc_html(sprintf('Actualizado por última vez el %s.', wp_date('j M Y H:i', $snapshot->savedAt))) . '</small></p>';
    }
    $html .= '<p><small>Actividades: <a href="https://participa.huelgaporlavivienda.org/activities">Huelga General por la Vivienda</a>, <a href="https://creativecommons.org/licenses/by/4.0/deed.es">CC BY 4.0</a>.</small></p>';
    return $html . '</div>';
});
