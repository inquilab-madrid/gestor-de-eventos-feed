import { createFeedClient, defaultBaseUrl, FeedError, type FeedFilters } from "../../js/src/client.js";
import { groupSeries } from "../../js/src/format.js";
import { chooseLang, texts } from "./i18n.js";
import { renderCredit, renderList } from "./render.js";
import { styles } from "./styles.js";

// <actividades-toka client="fc_…" province="28"> or municipality="Getafe": the upcoming activities of one area,
// for any website. One request when it appears; again only if its attributes change.

const observed = ["client", "province", "municipality", "limit", "lang", "base-url"] as const;

export class ActividadesToka extends HTMLElement {
  static observedAttributes = [...observed];

  readonly #root: ShadowRoot;
  #controller: AbortController | null = null;
  #scheduled = false;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = styles;
    this.#root.append(style);
  }

  connectedCallback() {
    this.#schedule();
  }

  disconnectedCallback() {
    this.#controller?.abort();
  }

  attributeChangedCallback(_name: string, before: string | null, after: string | null) {
    if (before !== after && this.isConnected) this.#schedule();
  }

  // Several attributes set in a row cause a single request.
  #schedule() {
    if (this.#scheduled) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      void this.#load();
    });
  }

  #area(): FeedFilters | null {
    const province = this.getAttribute("province")?.trim();
    const municipality = this.getAttribute("municipality")?.trim();
    if (province && municipality) console.warn("<actividades-toka>: use province or municipality, not both. Showing the province.");
    return province ? { province } : municipality ? { municipality } : null;
  }

  #show(...nodes: Node[]) {
    const style = this.#root.querySelector("style")!;
    this.#root.replaceChildren(style, ...nodes);
  }

  #status(text: string) {
    const status = document.createElement("p");
    status.className = "status";
    status.setAttribute("role", "status");
    status.textContent = text;
    return status;
  }

  async #load() {
    this.#controller?.abort();
    const lang = chooseLang(this);
    const t = texts[lang];
    const client = this.getAttribute("client")?.trim();
    const area = this.#area();
    if (!client || !area) {
      console.error("<actividades-toka>: set client=\"fc_…\" and province=\"28\" or municipality=\"…\".");
      this.#show();
      return;
    }

    const controller = new AbortController();
    this.#controller = controller;
    this.setAttribute("aria-busy", "true");
    this.#show(this.#status(t.loading));
    try {
      const feed = createFeedClient({ client, baseUrl: this.getAttribute("base-url") ?? defaultBaseUrl });
      const result = await feed.list(area, { signal: controller.signal });
      if (result.notModified) return;
      const limit = Math.max(1, Number.parseInt(this.getAttribute("limit") ?? "10", 10) || 10);
      const entries = groupSeries(result.activities).slice(0, limit);
      this.#show(entries.length ? renderList(entries, lang) : this.#status(t.empty), renderCredit(lang));
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof FeedError && (error.status === 401 || error.status === 403)) {
        console.error(`<actividades-toka>: the feed refused this site (${error.status}): ${error.title} Check the client id and that this page's address is registered for it.`);
      }
      const busy = error instanceof FeedError && (error.status === 429 || error.status === 503);
      this.#show(this.#status(busy ? t.tooMany : t.unavailable));
    } finally {
      if (this.#controller === controller) this.removeAttribute("aria-busy");
    }
  }
}

if (!customElements.get("actividades-toka")) customElements.define("actividades-toka", ActividadesToka);
