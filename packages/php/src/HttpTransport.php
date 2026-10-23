<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

/**
 * Sends a GET request. Implement it to use your own HTTP client (Guzzle, Symfony, WordPress's wp_remote_get…);
 * StreamTransport works with plain PHP.
 */
interface HttpTransport
{
    /**
     * @param array<string, string> $headers
     * @throws FeedException with status 0 when the feed cannot be reached.
     */
    public function get(string $url, array $headers): HttpResponse;
}
