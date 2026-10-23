<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

final class RefreshResult
{
    /**
     * @param bool $updated True when this call brought a new copy.
     * @param bool $skipped True when it did not ask because the feed asked to wait.
     */
    public function __construct(
        public readonly ?Snapshot $snapshot,
        public readonly bool $updated,
        public readonly bool $skipped,
        public readonly ?FeedException $error,
    ) {
    }
}
