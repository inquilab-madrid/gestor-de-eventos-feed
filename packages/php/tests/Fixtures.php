<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed\Tests;

use InquilabMadrid\ActivityFeed\HttpResponse;

final class Fixtures
{
    public static function text(string $name): string
    {
        return (string) file_get_contents(__DIR__ . '/../../../spec/fixtures/' . $name);
    }

    public static function json(string $name): array
    {
        return json_decode(self::text($name), true, 512, JSON_THROW_ON_ERROR);
    }

    /** @param array<string, string> $headers */
    public static function ok(string $fixture = 'datafeed.json', array $headers = []): HttpResponse
    {
        return new HttpResponse(200, $headers + ['content-type' => 'application/ld+json', 'etag' => '"v1"'], self::text($fixture));
    }
}
