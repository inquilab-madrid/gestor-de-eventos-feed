<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed\Tests;

use InquilabMadrid\ActivityFeed\FeedClient;
use InquilabMadrid\ActivityFeed\FeedException;
use InquilabMadrid\ActivityFeed\FileCache;
use InquilabMadrid\ActivityFeed\HttpResponse;
use InquilabMadrid\ActivityFeed\MemoryCache;
use InquilabMadrid\ActivityFeed\Poller;
use PHPUnit\Framework\TestCase;

final class PollerTest extends TestCase
{
    public function testKeepsTheCopyUsesTheEtagWaitsRetryAfterAndBacksOff(): void
    {
        $clock = strtotime('2026-10-23T10:00:00Z');
        $transport = new FakeTransport([
            Fixtures::ok(),
            new HttpResponse(304, ['etag' => '"v1"'], ''),
            new HttpResponse(503, ['retry-after' => '30'], '{}'),
            new FeedException(0, 'down'),
            new FeedException(0, 'down'),
            Fixtures::ok(headers: ['etag' => '"v2"']),
        ]);
        $poller = new Poller(new FeedClient('fc_TU_IDENTIFICADOR', $transport), new MemoryCache(), ['province' => '28'], now: function () use (&$clock) { return $clock; });

        $result = $poller->refresh();
        self::assertTrue($result->updated);
        self::assertCount(5, $result->snapshot?->activities ?? []);

        self::assertFalse($poller->refresh()->updated);
        self::assertSame('"v1"', $transport->requests[1]['headers']['If-None-Match']);

        $result = $poller->refresh();
        self::assertSame(503, $result->error?->status);
        self::assertCount(5, $result->snapshot?->activities ?? [], 'the copy survives a failure');

        $clock += 29;
        self::assertTrue($poller->refresh()->skipped, 'waits what Retry-After said');
        self::assertCount(3, $transport->requests);

        $clock += 1;
        self::assertSame(0, $poller->refresh()->error?->status);
        $clock += 119;
        self::assertTrue($poller->refresh()->skipped, 'second failure without Retry-After: 2 minutes');
        $clock += 1;
        $poller->refresh();
        $clock += 240;
        $result = $poller->refresh();
        self::assertTrue($result->updated);
        self::assertSame('"v2"', $result->snapshot?->etag);
        foreach ($transport->requests as $request) {
            self::assertStringContainsString('province=28', $request['url']);
        }
    }

    public function testBackoffDoublesFromOneMinuteAndStopsAtOneHour(): void
    {
        $clock = 0;
        $cache = new MemoryCache();
        $poller = new Poller(new FeedClient('fc_TU_IDENTIFICADOR', new FakeTransport(array_fill(0, 9, new FeedException(0, 'down')))), $cache, now: function () use (&$clock) { return $clock; });
        $waits = [];
        for ($i = 0; $i < 9; $i++) {
            $poller->refresh();
            $waits[] = intdiv($cache->read()['retryAt'] - $clock, 60);
            $clock = $cache->read()['retryAt'];
        }
        self::assertSame([1, 2, 4, 8, 16, 32, 60, 60, 60], $waits);
    }

    public function testFileCacheSurvivesARestartAndJitterWaitsBeforeAsking(): void
    {
        $path = sys_get_temp_dir() . '/activity-feed-' . bin2hex(random_bytes(4)) . '.json';
        $slept = [];
        (new Poller(new FeedClient('fc_TU_IDENTIFICADOR', new FakeTransport([Fixtures::ok()])), new FileCache($path), jitterSeconds: 20, sleep: function (int $seconds) use (&$slept) { $slept[] = $seconds; }))->refresh();
        self::assertCount(1, $slept);
        self::assertLessThanOrEqual(20, $slept[0]);

        $transport = new FakeTransport([new HttpResponse(304, ['etag' => '"v1"'], '')]);
        $again = new Poller(new FeedClient('fc_TU_IDENTIFICADOR', $transport), new FileCache($path));
        self::assertCount(5, $again->current()?->activities ?? []);
        self::assertSame('Asamblea de barrio', $again->current()?->activities[0]->name);
        $again->refresh();
        self::assertSame('"v1"', $transport->requests[0]['headers']['If-None-Match']);
        unlink($path);
    }
}
