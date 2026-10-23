<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

final class Capacity
{
    public function __construct(
        public readonly int $max,
        public readonly int $remaining,
    ) {
    }

    /** @return array{max: int, remaining: int} */
    public function toArray(): array
    {
        return ['max' => $this->max, 'remaining' => $this->remaining];
    }
}
