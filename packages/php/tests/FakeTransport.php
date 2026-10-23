<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed\Tests;

use InquilabMadrid\ActivityFeed\FeedException;
use InquilabMadrid\ActivityFeed\HttpResponse;
use InquilabMadrid\ActivityFeed\HttpTransport;

/** Records requests and answers from a queue. */
final class FakeTransport implements HttpTransport
{
    /** @var list<array{url: string, headers: array<string, string>}> */
    public array $requests = [];

    /** @param list<HttpResponse|FeedException> $answers */
    public function __construct(private array $answers)
    {
    }

    public function get(string $url, array $headers): HttpResponse
    {
        $this->requests[] = ['url' => $url, 'headers' => $headers];
        $next = array_shift($this->answers);
        if ($next instanceof FeedException) {
            throw $next;
        }
        return $next;
    }
}
