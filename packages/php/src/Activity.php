<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

/** One activity of the feed, read from its schema.org Event. Text fields are plain text: escape them when printing. */
final class Activity
{
    /**
     * @param 'Europe/Madrid'|'Atlantic/Canary' $timeZone
     * @param 'pending'|'confirmed'|'cancelled' $status
     * @param list<string> $organizers
     * @param array<string, mixed> $raw The Event exactly as the feed sent it.
     */
    public function __construct(
        public readonly string $id,
        public readonly string $url,
        public readonly string $name,
        public readonly ?string $description,
        public readonly string $start,
        public readonly string $end,
        public readonly string $timeZone,
        public readonly string $status,
        public readonly ?string $type,
        public readonly Place $place,
        public readonly ?Capacity $capacity,
        public readonly ?string $seriesId,
        public readonly array $organizers,
        public readonly string $joinUrl,
        public readonly array $raw,
    ) {
    }

    /** Same shape as the JavaScript library, without `raw`. */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'url' => $this->url,
            'name' => $this->name,
            'description' => $this->description,
            'start' => $this->start,
            'end' => $this->end,
            'timeZone' => $this->timeZone,
            'status' => $this->status,
            'type' => $this->type,
            'place' => $this->place->toArray(),
            'capacity' => $this->capacity?->toArray(),
            'seriesId' => $this->seriesId,
            'organizers' => $this->organizers,
            'joinUrl' => $this->joinUrl,
        ];
    }
}
