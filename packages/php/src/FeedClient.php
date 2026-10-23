<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

use InvalidArgumentException;

final class FeedClient
{
    public const DEFAULT_BASE_URL = 'https://participa.huelgaporlavivienda.org/api/public/v1';
    private const FILTERS = ['province', 'municipality', 'type', 'from', 'to'];

    private readonly HttpTransport $transport;
    private readonly string $baseUrl;

    /**
     * @param string $client Your client id (fc_…).
     * @param ?string $userAgent Identify your site, for example "MyCollective/1.0 (+https://example.org/contact)".
     */
    public function __construct(
        private readonly string $client,
        ?HttpTransport $transport = null,
        string $baseUrl = self::DEFAULT_BASE_URL,
        private readonly ?string $userAgent = null,
    ) {
        if ($client === '') {
            throw new InvalidArgumentException('A client id (fc_…) is required');
        }
        $this->transport = $transport ?? new StreamTransport();
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    /**
     * Upcoming activities, cancelled ones included until their date.
     *
     * @param array{province?: string, municipality?: string, type?: string, from?: string, to?: string} $filters
     * @param ?string $etag The ETag of the copy you have: if nothing changed, the result is notModified.
     */
    public function list(array $filters = [], ?string $etag = null): FeedResult
    {
        $params = array_filter(
            array_intersect_key($filters, array_flip(self::FILTERS)),
            static fn ($value) => is_string($value) && $value !== '',
        );
        $response = $this->request('/activities', $params, $etag);
        if ($response->status === 304) {
            return new FeedResult(true, [], $response->header('etag') ?? $etag);
        }
        $feed = $this->decode($response);
        $dateModified = is_array($feed) && is_string($feed['dateModified'] ?? null) ? $feed['dateModified'] : null;
        return new FeedResult(false, ActivityParser::fromFeed($feed), $response->header('etag'), self::seconds($response->header('age')), $dateModified);
    }

    /** One upcoming activity by its id; a FeedException with status 404 when there is none. */
    public function get(string $id, ?string $etag = null): FeedResult
    {
        $response = $this->request('/activities/' . rawurlencode($id), [], $etag);
        if ($response->status === 304) {
            return new FeedResult(true, [], $response->header('etag') ?? $etag);
        }
        return new FeedResult(false, [ActivityParser::fromEvent($this->decode($response))], $response->header('etag'), self::seconds($response->header('age')));
    }

    /** @param array<string, string> $params */
    private function request(string $path, array $params, ?string $etag): HttpResponse
    {
        $url = $this->baseUrl . $path . '?' . http_build_query(['client' => $this->client] + $params, '', '&', PHP_QUERY_RFC3986);
        $headers = ['Accept' => 'application/ld+json'];
        if ($etag !== null && $etag !== '') {
            $headers['If-None-Match'] = $etag;
        }
        if ($this->userAgent !== null) {
            $headers['User-Agent'] = $this->userAgent;
        }
        $response = $this->transport->get($url, $headers);
        if ($response->status === 200 || $response->status === 304) {
            return $response;
        }
        $problem = json_decode($response->body, true);
        $title = is_array($problem) && is_string($problem['title'] ?? null) ? $problem['title'] : 'The feed answered ' . $response->status;
        throw new FeedException($response->status, $title, self::seconds($response->header('retry-after')));
    }

    private function decode(HttpResponse $response): mixed
    {
        $value = json_decode($response->body, true);
        if (!is_array($value)) {
            throw new FeedException($response->status, 'The feed answered something that is not JSON');
        }
        return $value;
    }

    private static function seconds(?string $value): ?int
    {
        return $value !== null && preg_match('/^\d+$/', trim($value)) === 1 ? (int) trim($value) : null;
    }
}
