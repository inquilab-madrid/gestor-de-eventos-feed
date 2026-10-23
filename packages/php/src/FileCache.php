<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

use RuntimeException;

/** Keeps the state in a JSON file. Writes atomically: your pages never read half a file. */
final class FileCache implements Cache
{
    public function __construct(private readonly string $path)
    {
    }

    public function read(): ?array
    {
        $contents = @file_get_contents($this->path);
        $state = $contents === false ? null : json_decode($contents, true);
        return is_array($state) ? $state : null;
    }

    public function write(array $state): void
    {
        $temporary = $this->path . '.' . getmypid() . '.tmp';
        if (file_put_contents($temporary, json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)) === false || !rename($temporary, $this->path)) {
            throw new RuntimeException('Cannot write ' . $this->path);
        }
    }
}
