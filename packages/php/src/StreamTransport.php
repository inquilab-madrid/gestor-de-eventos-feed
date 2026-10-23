<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

/** HTTP with PHP's own streams: no curl or extra packages needed. */
final class StreamTransport implements HttpTransport
{
    public function __construct(private readonly float $timeoutSeconds = 15.0)
    {
    }

    public function get(string $url, array $headers): HttpResponse
    {
        $lines = [];
        foreach ($headers as $name => $value) {
            $lines[] = $name . ': ' . $value;
        }
        $context = stream_context_create(['http' => [
            'method' => 'GET',
            'header' => implode("\r\n", $lines),
            'timeout' => $this->timeoutSeconds,
            // Read 4xx and 5xx bodies too: they explain the error.
            'ignore_errors' => true,
        ]]);
        $body = @file_get_contents($url, false, $context);
        $raw = function_exists('http_get_last_response_headers') ? (http_get_last_response_headers() ?? []) : ($http_response_header ?? []);
        if ($body === false || $raw === []) {
            $error = error_get_last();
            throw new FeedException(0, $error['message'] ?? 'Network error');
        }

        // After redirects there are several responses: keep the last one.
        $status = 0;
        $parsed = [];
        foreach ($raw as $line) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $match) === 1) {
                $status = (int) $match[1];
                $parsed = [];
            } elseif (str_contains($line, ':')) {
                [$name, $value] = explode(':', $line, 2);
                $parsed[strtolower(trim($name))] = trim($value);
            }
        }
        return new HttpResponse($status, $parsed, $body);
    }
}
