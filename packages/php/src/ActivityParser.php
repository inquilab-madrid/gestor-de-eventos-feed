<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

use InvalidArgumentException;

/** Reads the feed's JSON-LD (schema.org Event) into Activity objects. Unknown fields are ignored: /v1 only grows. */
final class ActivityParser
{
    private const CANARY_PROVINCES = ['Las Palmas', 'Santa Cruz de Tenerife'];

    /**
     * The activities of a DataFeed. Elements that are not readable activities are skipped.
     *
     * @return list<Activity>
     */
    public static function fromFeed(mixed $feed): array
    {
        if (!self::isObject($feed)) {
            return [];
        }
        $activities = [];
        foreach (self::items($feed['dataFeedElement'] ?? null) as $element) {
            try {
                $activities[] = self::fromEvent($element);
            } catch (InvalidArgumentException) {
                // Not an activity we can read.
            }
        }
        return $activities;
    }

    /** One schema.org Event. Throws InvalidArgumentException if it lacks what every activity has. */
    public static function fromEvent(mixed $event): Activity
    {
        if (!self::isObject($event)) {
            throw new InvalidArgumentException('Not an Event object');
        }
        $url = self::text($event['url'] ?? null) ?? self::text($event['@id'] ?? null);
        $name = self::text($event['name'] ?? null);
        $start = self::text($event['startDate'] ?? null);
        $end = self::text($event['endDate'] ?? null);
        if ($url === null || $name === null || $start === null || $end === null) {
            throw new InvalidArgumentException('Event without url, name, startDate or endDate');
        }
        $location = self::object($event['location'] ?? null);
        $address = self::object($location['address'] ?? null);
        $geo = self::object($location['geo'] ?? null);
        $province = self::text($address['addressRegion'] ?? null);
        $max = self::integer($event['maximumAttendeeCapacity'] ?? null);
        $series = self::text(self::object($event['superEvent'] ?? null)['@id'] ?? null);
        $organizers = [];
        foreach (self::items($event['organizer'] ?? null) as $organizer) {
            $organizerName = self::isObject($organizer) ? self::text($organizer['name'] ?? null) : null;
            if ($organizerName !== null) {
                $organizers[] = $organizerName;
            }
        }

        return new Activity(
            id: self::idOf($url),
            url: $url,
            name: $name,
            description: self::text($event['description'] ?? null),
            start: $start,
            end: $end,
            timeZone: in_array($province, self::CANARY_PROVINCES, true) ? 'Atlantic/Canary' : 'Europe/Madrid',
            status: self::status($event),
            type: self::text($event['keywords'] ?? null),
            place: new Place(
                self::text($location['name'] ?? null),
                self::text($address['addressLocality'] ?? null),
                $province,
                self::float($geo['latitude'] ?? null),
                self::float($geo['longitude'] ?? null),
            ),
            capacity: $max === null ? null : new Capacity($max, self::integer($event['remainingAttendeeCapacity'] ?? null) ?? $max),
            seriesId: $series === null ? null : preg_replace('/^urn:uuid:/', '', $series),
            organizers: $organizers,
            joinUrl: self::text(self::object($event['potentialAction'] ?? null)['target'] ?? null) ?? $url,
            raw: $event,
        );
    }

    private static function status(array $event): string
    {
        if (str_ends_with((string) self::text($event['eventStatus'] ?? null), '/EventCancelled')) {
            return 'cancelled';
        }
        foreach (self::items($event['additionalProperty'] ?? null) as $property) {
            if (self::isObject($property) && ($property['propertyID'] ?? null) === 'viability') {
                return ($property['value'] ?? null) === 'confirmed' ? 'confirmed' : 'pending';
            }
        }
        return 'pending';
    }

    private static function idOf(string $url): string
    {
        $segments = array_values(array_filter(explode('/', (string) parse_url($url, PHP_URL_PATH)), 'strlen'));
        return $segments === [] ? $url : $segments[count($segments) - 1];
    }

    /** An associative array, as json_decode(..., true) gives for a JSON object. */
    private static function isObject(mixed $value): bool
    {
        return is_array($value) && ($value === [] || !array_is_list($value));
    }

    private static function object(mixed $value): array
    {
        return self::isObject($value) ? $value : [];
    }

    /** @return list<mixed> */
    private static function items(mixed $value): array
    {
        if ($value === null) {
            return [];
        }
        return is_array($value) && array_is_list($value) ? $value : [$value];
    }

    private static function text(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? $value : null;
    }

    private static function float(mixed $value): ?float
    {
        return is_int($value) || is_float($value) ? (float) $value : null;
    }

    private static function integer(mixed $value): ?int
    {
        return is_int($value) || (is_float($value) && floor($value) === $value) ? (int) $value : null;
    }
}
