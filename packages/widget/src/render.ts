import type { Activity } from "../../js/src/model.js";
import { formatDate, type Lang, texts } from "./i18n.js";

// Builds the list with createElement and textContent only: titles, places and names come from campaign
// volunteers and are always text, never HTML.

const creditUrl = "https://participa.huelgaporlavivienda.org/activities";
const licenseUrl = "https://creativecommons.org/licenses/by/4.0/";

function element<K extends keyof HTMLElementTagNameMap>(tag: K, props: { className?: string; part?: string; text?: string } = {}): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.className) node.className = props.className;
  if (props.part) node.setAttribute("part", props.part);
  if (props.text !== undefined) node.textContent = props.text;
  return node;
}

/** Only absolute https links: anything else stays plain text. */
function safeLink(href: string, text: string, part?: string): HTMLElement {
  let url: URL | null = null;
  try {
    url = new URL(href);
  } catch {
    // Not a URL.
  }
  if (url?.protocol !== "https:") return element("span", { text, part });
  const link = element("a", { text, part });
  link.href = url.href;
  // Leaves the host site open in its tab.
  link.target = "_blank";
  link.rel = "noopener";
  return link;
}

function when(activity: Activity, lang: Lang): string {
  const formatted = formatDate(activity.start, activity.timeZone, lang);
  return activity.timeZone === "Atlantic/Canary" ? `${formatted} (${texts[lang].canaryTime.toLowerCase()})` : formatted;
}

export function renderItem(activity: Activity & { otherDates: number }, lang: Lang): HTMLLIElement {
  const t = texts[lang];
  const item = element("li", { part: "item", className: activity.status === "cancelled" ? "cancelled" : "" });
  item.append(safeLink(activity.url, activity.name, "link"));

  const place = [activity.place.name, activity.place.municipality].filter(Boolean).join(", ");
  const type = activity.type ? t.types[activity.type] ?? activity.type : null;
  item.append(element("div", { className: "meta", part: "meta", text: [when(activity, lang), place, type].filter(Boolean).join(" · ") }));

  const tags = element("div", { className: "tags" });
  tags.append(element("span", { className: `state ${activity.status}`, part: "state", text: t.states[activity.status] }));
  if (activity.status !== "cancelled" && activity.capacity?.remaining === 0) tags.append(element("span", { className: "state full", part: "state", text: t.full }));
  if (activity.otherDates > 0) tags.append(element("span", { className: "meta", part: "meta", text: t.moreDates(activity.otherDates) }));
  item.append(tags);
  return item;
}

export function renderList(activities: (Activity & { otherDates: number })[], lang: Lang): HTMLUListElement {
  const list = element("ul");
  list.append(...activities.map((activity) => renderItem(activity, lang)));
  return list;
}

/** «Actividades: Huelga General por la Vivienda, CC BY 4.0»: the licence asks to credit the source. */
export function renderCredit(lang: Lang): HTMLParagraphElement {
  const { label, campaign } = texts[lang].credit;
  const credit = element("p", { className: "credit", part: "credit" });
  credit.append(`${label}: `, safeLink(creditUrl, campaign), ", ", safeLink(licenseUrl, "CC BY 4.0"));
  return credit;
}
