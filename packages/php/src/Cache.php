<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

/** Where the Poller keeps its state and the last good copy. Plain arrays, JSON-encodable. */
interface Cache
{
    /** @return ?array<string, mixed> */
    public function read(): ?array;

    /** @param array<string, mixed> $state */
    public function write(array $state): void;
}
