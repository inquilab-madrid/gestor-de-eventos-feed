<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed\Tests;

use InquilabMadrid\ActivityFeed\FeedClient;
use InquilabMadrid\ActivityFeed\FeedException;
use InquilabMadrid\ActivityFeed\HttpResponse;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

final class ClientTest extends TestCase
{
    private const CLIENT = 'fc_TU_IDENTIFICADOR';

    public function testListSendsTheClientFiltersAndAcceptAndReadsTheFeed(): void
    {
        $transport = new FakeTransport([Fixtures::ok()]);
        $result = (new FeedClient(self::CLIENT, $transport))->list(['province' => '28', 'from' => '2026-11-01', 'municipality' => '', 'unknown' => 'x']);
        $url = parse_url($transport->requests[0]['url']);
        parse_str($url['query'], $query);
        self::assertSame('https://participa.huelgaporlavivienda.org/api/public/v1/activities', $url['scheme'] . '://' . $url['host'] . $url['path']);
        self::assertSame(['client' => self::CLIENT, 'province' => '28', 'from' => '2026-11-01'], $query);
        self::assertSame('application/ld+json', $transport->requests[0]['headers']['Accept']);
        self::assertFalse($result->notModified);
        self::assertCount(5, $result->activities);
        self::assertSame('"v1"', $result->etag);
        self::assertNull($result->age);
        self::assertSame('2026-10-20T10:00:00+00:00', $result->dateModified);
    }

    public function testWithTheEtagAnUnchangedFeedIsNotModifiedAndAgeIsReported(): void
    {
        $transport = new FakeTransport([new HttpResponse(304, ['etag' => 'W/"v1"'], ''), Fixtures::ok(headers: ['age' => '3600'])]);
        $feed = new FeedClient(self::CLIENT, $transport);
        $unchanged = $feed->list([], '"v1"');
        self::assertTrue($unchanged->notModified);
        self::assertSame('W/"v1"', $unchanged->etag);
        self::assertSame('"v1"', $transport->requests[0]['headers']['If-None-Match']);
        self::assertSame(3600, $feed->list()->age);
    }

    public function testGetReadsOneEventAndEncodesTheId(): void
    {
        $transport = new FakeTransport([Fixtures::ok('event.json'), Fixtures::ok('event.json')]);
        $feed = new FeedClient(self::CLIENT, $transport);
        self::assertSame('Asamblea de barrio', $feed->get('a1111111-1111-4111-8111-111111111111')->activity()?->name);
        $feed->get('../x?y');
        self::assertStringContainsString('/activities/..%2Fx%3Fy?client=', $transport->requests[1]['url']);
    }

    public function testErrorsBecomeFeedExceptionsWithTitleAndRetryAfter(): void
    {
        $transport = new FakeTransport([
            new HttpResponse(401, ['content-type' => 'application/problem+json'], Fixtures::text('problem-401.json')),
            new HttpResponse(429, ['retry-after' => '60'], Fixtures::text('problem-429.json')),
            new HttpResponse(500, [], '<html>oops</html>'),
            new FeedException(0, 'Network error'),
        ]);
        $feed = new FeedClient(self::CLIENT, $transport);
        $caught = [];
        for ($i = 0; $i < 4; $i++) {
            try {
                $feed->list();
            } catch (FeedException $error) {
                $caught[] = [$error->status, $error->retryAfter, $error->title];
            }
        }
        self::assertSame(401, $caught[0][0]);
        self::assertStringContainsString('identificador', $caught[0][2]);
        self::assertSame([429, 60], [$caught[1][0], $caught[1][1]]);
        self::assertSame([500, null, 'The feed answered 500'], $caught[2]);
        self::assertSame(0, $caught[3][0]);
    }

    public function testUserAgentBaseUrlAndClientIdRequired(): void
    {
        $transport = new FakeTransport([Fixtures::ok()]);
        (new FeedClient(self::CLIENT, $transport, 'https://example.org/v1/', 'Colectivo/1.0 (+https://example.org)'))->list();
        self::assertSame('Colectivo/1.0 (+https://example.org)', $transport->requests[0]['headers']['User-Agent']);
        self::assertStringStartsWith('https://example.org/v1/activities?', $transport->requests[0]['url']);
        $this->expectException(InvalidArgumentException::class);
        new FeedClient('');
    }
}
