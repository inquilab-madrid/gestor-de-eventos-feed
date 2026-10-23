<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

final class HttpResponse
{
    /** @param array<string, string> $headers Lower-case names. */
    public function __construct(
        public readonly int $status,
        public readonly array $headers,
        public readonly string $body,
    ) {
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }
}
