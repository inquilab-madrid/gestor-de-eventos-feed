<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed\Tests;

use InquilabMadrid\ActivityFeed\Activity;
use InquilabMadrid\ActivityFeed\ActivityParser;
use InquilabMadrid\ActivityFeed\Format;
use InquilabMadrid\ActivityFeed\Series;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

final class ParserTest extends TestCase
{
    public function testTheSharedFixtureNormalizesExactlyAsTheContractSays(): void
    {
        $activities = ActivityParser::fromFeed(Fixtures::json('datafeed.json'));
        $expected = Fixtures::json('normalized.json');
        // JSON numbers like 40.4155 decode as float in both; compare through the same JSON encoding.
        self::assertSame(
            json_encode($expected['activities']),
            json_encode(array_map(static fn (Activity $activity) => $activity->toArray(), $activities)),
        );
        self::assertSame(['anything' => true], $activities[4]->raw['aFieldFromTheFuture'], 'unknown fields stay in raw');
    }

    public function testLabelsLocalTimesAndSeriesMatchTheContract(): void
    {
        $activities = ActivityParser::fromFeed(Fixtures::json('datafeed.json'));
        $expected = Fixtures::json('normalized.json');
        self::assertSame($expected['statusLabels'], array_map([Format::class, 'statusLabel'], $activities));
        self::assertSame($expected['localStartTimes'], array_map([Format::class, 'localTime'], $activities));
        $grouped = Series::group($activities, strtotime('2026-10-23T12:00:00Z'));
        self::assertSame($expected['groupedSeries'], array_map(static fn (array $entry) => ['id' => $entry['activity']->id, 'otherDates' => $entry['otherDates']], $grouped));
    }

    public function testASingleEventReadsTheSame(): void
    {
        self::assertSame(
            json_encode(Fixtures::json('normalized.json')['activities'][0]),
            json_encode(ActivityParser::fromEvent(Fixtures::json('event.json'))->toArray()),
        );
    }

    public function testCanaryActivitiesSaySo(): void
    {
        [$madrid, $tenerife] = ActivityParser::fromFeed(Fixtures::json('datafeed.json'));
        self::assertStringEndsWith('18:00 (hora canaria)', Format::when($tenerife));
        self::assertStringNotContainsString('canaria', Format::when($madrid));
        self::assertStringContainsString('19:00', Format::when($madrid));
        self::assertStringContainsString('sábado', Format::when($madrid));
    }

    public function testSeriesSkipPastDatesAndFallBackToTheFirstWhenAllAreCancelled(): void
    {
        $series = array_values(array_filter(ActivityParser::fromFeed(Fixtures::json('datafeed.json')), static fn (Activity $a) => $a->seriesId !== null));
        $grouped = Series::group($series, strtotime('2026-10-25T00:00:00Z'));
        self::assertSame([['a4444444-4444-4444-8444-444444444444', 0]], array_map(static fn (array $e) => [$e['activity']->id, $e['otherDates']], $grouped));
    }

    public function testUnreadableElementsAreSkipped(): void
    {
        $feed = Fixtures::json('datafeed.json');
        $feed['dataFeedElement'] = [null, ['@type' => 'Event'], $feed['dataFeedElement'][0]];
        self::assertCount(1, ActivityParser::fromFeed($feed));
        self::assertSame([], ActivityParser::fromFeed(null));
        self::assertSame([], ActivityParser::fromFeed(['dataFeedElement' => 'nope']));
        $this->expectException(InvalidArgumentException::class);
        ActivityParser::fromEvent(['@type' => 'Event', 'name' => 'Sin fechas']);
    }

    public function testFeedTextStaysText(): void
    {
        self::assertSame("<script>alert('x')</script> Charla", ActivityParser::fromFeed(Fixtures::json('datafeed.json'))[4]->name);
    }
}
