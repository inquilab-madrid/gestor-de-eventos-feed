<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

final class Snapshot
{
    /**
     * @param list<Activity> $activities
     * @param int $savedAt When this copy was received (Unix time).
     * @param ?int $age How old the feed said it was when received, if it could not refresh.
     */
    public function __construct(
        public readonly array $activities,
        public readonly ?string $etag,
        public readonly int $savedAt,
        public readonly ?int $age,
    ) {
    }

    /** @return array{events: list<array<string, mixed>>, etag: ?string, savedAt: int, age: ?int} */
    public function toArray(): array
    {
        return ['events' => array_map(static fn (Activity $activity) => $activity->raw, $this->activities), 'etag' => $this->etag, 'savedAt' => $this->savedAt, 'age' => $this->age];
    }

    public static function fromArray(mixed $data): ?self
    {
        if (!is_array($data) || !is_array($data['events'] ?? null)) {
            return null;
        }
        return new self(
            ActivityParser::fromFeed(['dataFeedElement' => $data['events']]),
            is_string($data['etag'] ?? null) ? $data['etag'] : null,
            is_int($data['savedAt'] ?? null) ? $data['savedAt'] : 0,
            is_int($data['age'] ?? null) ? $data['age'] : null,
        );
    }
}
