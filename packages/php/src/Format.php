<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

use DateTimeImmutable;
use DateTimeZone;
use IntlDateFormatter;

/** Text to show activities the way the campaign does. Plain text, never HTML: escape it when printing. */
final class Format
{
    private const LABELS = ['pending' => 'Falta gente', 'confirmed' => 'Confirmada', 'cancelled' => 'Cancelada'];
    private const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    private const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    /** «Falta gente», «Confirmada» or «Cancelada». */
    public static function statusLabel(Activity $activity): string
    {
        return self::LABELS[$activity->status];
    }

    /** The start time in the place's local time, as HH:MM. */
    public static function localTime(Activity $activity): string
    {
        return self::start($activity)->format('H:i');
    }

    /**
     * Day and time in the place's local time, saying «(hora canaria)» when it applies.
     * With the intl extension, in any locale; without it, in Spanish.
     */
    public static function when(Activity $activity, string $locale = 'es'): string
    {
        $start = self::start($activity);
        if (class_exists(IntlDateFormatter::class)) {
            $formatter = new IntlDateFormatter($locale, IntlDateFormatter::NONE, IntlDateFormatter::NONE, $activity->timeZone, null, "EEEE, d 'de' MMMM, HH:mm");
            $when = (string) $formatter->format($start);
        } else {
            $when = sprintf('%s, %d de %s, %s', self::WEEKDAYS[(int) $start->format('w')], (int) $start->format('j'), self::MONTHS[(int) $start->format('n') - 1], $start->format('H:i'));
        }
        return $activity->timeZone === 'Atlantic/Canary' ? $when . ' (hora canaria)' : $when;
    }

    private static function start(Activity $activity): DateTimeImmutable
    {
        return (new DateTimeImmutable($activity->start))->setTimezone(new DateTimeZone($activity->timeZone));
    }
}
