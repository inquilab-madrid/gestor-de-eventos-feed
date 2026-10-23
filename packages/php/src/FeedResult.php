<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

final class FeedResult
{
    /**
     * @param list<Activity> $activities Empty when $notModified.
     * @param ?int $age Seconds old, when the feed could not refresh and served its last good version.
     */
    public function __construct(
        public readonly bool $notModified,
        public readonly array $activities,
        public readonly ?string $etag,
        public readonly ?int $age = null,
        public readonly ?string $dateModified = null,
    ) {
    }

    /** The activity of FeedClient::get(), or null when $notModified. */
    public function activity(): ?Activity
    {
        return $this->activities[0] ?? null;
    }
}
