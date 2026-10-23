<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

use Closure;

/**
 * Server-side: keeps the last good copy of the feed and refreshes it politely. Asks at most once per call, only for
 * changes (ETag), waits what the feed asks (Retry-After) or backs off 1, 2, 4… minutes up to an hour.
 * Call refresh() from cron (or WP-Cron) and show current() on your pages.
 */
final class Poller
{
    private const MAX_BACKOFF_SECONDS = 3600;

    private readonly Closure $now;
    private readonly Closure $sleep;

    /**
     * @param array{province?: string, municipality?: string, type?: string, from?: string, to?: string} $filters
     * @param int $jitterSeconds Random wait before asking. Use some seconds when many sites run on the same cron minute.
     */
    public function __construct(
        private readonly FeedClient $feed,
        private readonly Cache $cache = new MemoryCache(),
        private readonly array $filters = [],
        private readonly int $jitterSeconds = 0,
        ?callable $now = null,
        ?callable $sleep = null,
    ) {
        $this->now = Closure::fromCallable($now ?? 'time');
        $this->sleep = Closure::fromCallable($sleep ?? static function (int $seconds): void { sleep($seconds); });
    }

    public function refresh(): RefreshResult
    {
        $state = $this->cache->read() ?? [];
        $snapshot = Snapshot::fromArray($state['snapshot'] ?? null);
        $failures = is_int($state['failures'] ?? null) ? $state['failures'] : 0;
        if (($this->now)() < (is_int($state['retryAt'] ?? null) ? $state['retryAt'] : 0)) {
            return new RefreshResult($snapshot, false, true, null);
        }
        if ($this->jitterSeconds > 0) {
            ($this->sleep)(random_int(0, $this->jitterSeconds));
        }
        try {
            $result = $this->feed->list($this->filters, $snapshot?->etag);
            if ($result->notModified) {
                $this->cache->write(['snapshot' => $snapshot?->toArray(), 'retryAt' => 0, 'failures' => 0]);
                return new RefreshResult($snapshot, false, false, null);
            }
            $fresh = new Snapshot($result->activities, $result->etag, ($this->now)(), $result->age);
            $this->cache->write(['snapshot' => $fresh->toArray(), 'retryAt' => 0, 'failures' => 0]);
            return new RefreshResult($fresh, true, false, null);
        } catch (FeedException $error) {
            $failures++;
            $wait = $error->retryAfter ?? min(self::MAX_BACKOFF_SECONDS, 60 * 2 ** ($failures - 1));
            // The copy stays: showing it is better than showing nothing.
            $this->cache->write(['snapshot' => $snapshot?->toArray(), 'retryAt' => ($this->now)() + $wait, 'failures' => $failures]);
            return new RefreshResult($snapshot, false, false, $error);
        }
    }

    /** The last good copy, without asking the feed. */
    public function current(): ?Snapshot
    {
        return Snapshot::fromArray(($this->cache->read() ?? [])['snapshot'] ?? null);
    }
}
