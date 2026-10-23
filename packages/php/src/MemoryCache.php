<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

final class MemoryCache implements Cache
{
    private ?array $state = null;

    public function read(): ?array
    {
        return $this->state;
    }

    public function write(array $state): void
    {
        $this->state = $state;
    }
}
