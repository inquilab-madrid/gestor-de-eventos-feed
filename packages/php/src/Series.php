<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

final class Series
{
    /**
     * One entry per series, like the campaign's own listing: the next date that has not ended and is not cancelled
     * (or the first one, if all are), with how many other open dates it has. Activities outside a series stay as they are.
     *
     * @param list<Activity> $activities
     * @return list<array{activity: Activity, otherDates: int}>
     */
    public static function group(array $activities, ?int $now = null): array
    {
        $now ??= time();
        $bySeries = [];
        foreach ($activities as $activity) {
            if ($activity->seriesId !== null) {
                $bySeries[$activity->seriesId][] = $activity;
            }
        }
        $shown = [];
        foreach ($bySeries as $series => $dates) {
            usort($dates, static fn (Activity $a, Activity $b) => strtotime($a->start) <=> strtotime($b->start));
            $ahead = array_values(array_filter($dates, static fn (Activity $date) => strtotime($date->end) > $now));
            $candidates = $ahead !== [] ? $ahead : $dates;
            $open = array_values(array_filter($candidates, static fn (Activity $date) => $date->status !== 'cancelled'));
            $first = $open[0] ?? $candidates[0];
            $shown[$series] = ['id' => $first->id, 'otherDates' => count($open !== [] ? $open : $candidates) - 1];
        }
        $grouped = [];
        foreach ($activities as $activity) {
            if ($activity->seriesId === null) {
                $grouped[] = ['activity' => $activity, 'otherDates' => 0];
            } elseif ($shown[$activity->seriesId]['id'] === $activity->id) {
                $grouped[] = ['activity' => $activity, 'otherDates' => $shown[$activity->seriesId]['otherDates']];
            }
        }
        return $grouped;
    }
}
