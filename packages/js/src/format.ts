import type { Activity } from "./model.js";

// Helpers to show activities the way the campaign does. They return text, never HTML: put it in the page
// with textContent (or your framework's normal text binding), never innerHTML.

const labels = { pending: "Falta gente", confirmed: "Confirmada", cancelled: "Cancelada" } as const;

/** «Falta gente», «Confirmada» or «Cancelada». */
export function statusLabel(activity: Pick<Activity, "status">): string {
  return labels[activity.status];
}

/** The start time in the place's local time, as HH:MM. */
export function localTime(activity: Pick<Activity, "start" | "timeZone">): string {
  return new Intl.DateTimeFormat("es", { timeZone: activity.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(activity.start));
}

/** Day and time in the place's local time, saying «(hora canaria)» when it applies. */
export function formatWhen(activity: Pick<Activity, "start" | "timeZone">, locale = "es"): string {
  const when = new Intl.DateTimeFormat(locale, {
    timeZone: activity.timeZone, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(activity.start));
  return activity.timeZone === "Atlantic/Canary" ? `${when} (hora canaria)` : when;
}

/**
 * One entry per series, like the campaign's own listing: the next date that has not ended and is not cancelled
 * (or the first one, if all are), with how many other open dates it has. Activities outside a series stay as they are.
 */
export function groupSeries<T extends Pick<Activity, "id" | "start" | "end" | "status" | "seriesId">>(activities: T[], now = Date.now()): (T & { otherDates: number })[] {
  const bySeries = new Map<string, T[]>();
  for (const activity of activities) {
    if (activity.seriesId) bySeries.set(activity.seriesId, [...(bySeries.get(activity.seriesId) ?? []), activity]);
  }
  const shown = new Map<string, { id: string; otherDates: number }>();
  for (const [series, dates] of bySeries) {
    const all = [...dates].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    const ahead = all.filter((date) => Date.parse(date.end) > now);
    const candidates = ahead.length ? ahead : all;
    const open = candidates.filter((date) => date.status !== "cancelled");
    const first = open[0] ?? candidates[0];
    shown.set(series, { id: first.id, otherDates: (open.length || candidates.length) - 1 });
  }
  return activities.flatMap((activity) => {
    if (!activity.seriesId) return [{ ...activity, otherDates: 0 }];
    const entry = shown.get(activity.seriesId)!;
    return entry.id === activity.id ? [{ ...activity, otherDates: entry.otherDates }] : [];
  });
}
