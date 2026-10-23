<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

use RuntimeException;

/** A response other than 200 or 304. `status` is 0 when the feed could not be reached. */
final class FeedException extends RuntimeException
{
    /** @param ?int $retryAfter Seconds to wait before asking again, when the feed says so (429, 503). */
    public function __construct(
        public readonly int $status,
        public readonly string $title,
        public readonly ?int $retryAfter = null,
    ) {
        parent::__construct($status . ': ' . $title, $status);
    }
}
