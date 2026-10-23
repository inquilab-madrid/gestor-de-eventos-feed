import { expect, test, type Page, type Request } from "@playwright/test";
import { readFileSync } from "node:fs";

const widget = readFileSync(new URL("../dist/actividades-toka.js", import.meta.url), "utf8");
const fixture = (name: string) => readFileSync(new URL(`../../../spec/fixtures/${name}`, import.meta.url), "utf8");
const site = "https://colectivo.example/";
const feed = "https://participa.huelgaporlavivienda.org/api/public/v1/activities**";

type Answer = { status?: number; body?: string; headers?: Record<string, string> };

// A collective's page (made up) with the built widget, and a fake feed.
async function mount(page: Page, html: string, answers: Answer[] = [{ body: fixture("datafeed.json") }], lang = "es") {
  const requests: Request[] = [];
  await page.route(`${site}actividades-toka.js`, (route) => route.fulfill({ body: widget, contentType: "text/javascript" }));
  await page.route(site, (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"></head><body>${html}<script src="/actividades-toka.js"></script></body></html>`,
  }));
  await page.route(feed, (route, request) => {
    requests.push(request);
    const answer = answers.length > 1 ? answers.shift()! : answers[0];
    return route.fulfill({
      status: answer.status ?? 200,
      body: answer.body ?? "",
      headers: { "content-type": "application/ld+json", "access-control-allow-origin": "https://colectivo.example", ...answer.headers },
    });
  });
  await page.goto(site);
  return requests;
}

const items = (page: Page) => page.locator("actividades-toka li");

test("shows one entry per series, with links, dates, places and states", async ({ page }) => {
  const requests = await mount(page, `<actividades-toka client="fc_TU_IDENTIFICADOR" province="28"></actividades-toka>`);
  await expect(items(page)).toHaveCount(3);
  const [first, second, third] = await items(page).all();
  await expect(first.locator("a")).toHaveText("Asamblea de barrio");
  await expect(first.locator("a")).toHaveAttribute("href", "https://participa.huelgaporlavivienda.org/activities/a1111111-1111-4111-8111-111111111111");
  await expect(first.locator("a")).toHaveAttribute("target", "_blank");
  await expect(first).toContainText("Plaza Mayor, Madrid");
  await expect(first).toContainText("19:00");
  await expect(first).toContainText("Confirmada");
  await expect(first).toContainText("y 1 fecha más");
  await expect(second).toContainText("18:00 (hora canaria)");
  await expect(second).toContainText("Falta gente");
  await expect(second).toContainText("Completa");
  await expect(third).toContainText("(hora canaria)");
  await expect(page.locator("actividades-toka .credit")).toHaveText("Actividades: Huelga General por la Vivienda, CC BY 4.0");
  const url = new URL(requests[0].url());
  expect(Object.fromEntries(url.searchParams)).toEqual({ client: "fc_TU_IDENTIFICADOR", province: "28" });
  expect(requests).toHaveLength(1);
});

test("feed text is shown as text: no script runs and no element is created", async ({ page }) => {
  let alerted = false;
  page.on("dialog", (dialog) => { alerted = true; return dialog.dismiss(); });
  await mount(page, `<actividades-toka client="fc_TU_IDENTIFICADOR" province="35"></actividades-toka>`);
  await expect(items(page).nth(2).locator("a")).toHaveText("<script>alert('x')</script> Charla");
  expect(await page.locator("actividades-toka").evaluate((el) => el.shadowRoot!.querySelectorAll("script").length)).toBe(0);
  expect(alerted).toBe(false);
});

test("cancelled activities are struck through", async ({ page }) => {
  const feedWithCancelled = JSON.parse(fixture("datafeed.json"));
  feedWithCancelled.dataFeedElement = [feedWithCancelled.dataFeedElement[2]]; // a lone cancelled date
  await mount(page, `<actividades-toka client="fc_TU_IDENTIFICADOR" province="28"></actividades-toka>`, [{ body: JSON.stringify(feedWithCancelled) }]);
  await expect(items(page)).toHaveCount(1);
  await expect(items(page).first()).toContainText("Cancelada");
  await expect(items(page).first().locator("a")).toHaveCSS("text-decoration-line", "line-through");
});

test("a municipality goes to the feed; limit cuts the list", async ({ page }) => {
  const requests = await mount(page, `<actividades-toka client="fc_TU_IDENTIFICADOR" municipality="Alcalá de Henares" limit="2"></actividades-toka>`);
  await expect(items(page)).toHaveCount(2);
  expect(new URL(requests[0].url()).searchParams.get("municipality")).toBe("Alcalá de Henares");
  expect(new URL(requests[0].url()).searchParams.has("province")).toBe(false);
});

test("without client or area nothing is requested and the site owner gets a console message", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  const requests = await mount(page, `<actividades-toka province="28"></actividades-toka><actividades-toka client="fc_TU_IDENTIFICADOR"></actividades-toka>`);
  await page.waitForTimeout(200);
  expect(requests).toHaveLength(0);
  expect(errors.filter((text) => text.includes("<actividades-toka>"))).toHaveLength(2);
});

test("empty list, refused site and busy feed show short messages", async ({ page }) => {
  const empty = JSON.stringify({ "@type": "DataFeed", dataFeedElement: [] });
  await mount(page, `<actividades-toka client="fc_TU_IDENTIFICADOR" province="28"></actividades-toka>`, [{ body: empty }]);
  await expect(page.locator("actividades-toka [role=status]")).toHaveText("No hay actividades próximas en tu zona.");

  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.unrouteAll();
  await mount(page, `<actividades-toka client="fc_TU_IDENTIFICADOR" province="28"></actividades-toka>`, [{ status: 401, body: fixture("problem-401.json") }]);
  await expect(page.locator("actividades-toka [role=status]")).toHaveText("Ahora no podemos cargar las actividades. Vuelve a intentarlo.");
  expect(errors.some((text) => text.includes("refused this site (401)"))).toBe(true);

  await page.unrouteAll();
  await mount(page, `<actividades-toka client="fc_TU_IDENTIFICADOR" province="28"></actividades-toka>`, [{ status: 429, body: fixture("problem-429.json"), headers: { "retry-after": "60" } }]);
  await expect(page.locator("actividades-toka [role=status]")).toHaveText("Ahora no podemos cargar las actividades. Prueba dentro de un rato.");
});

test("changing the area asks again, once", async ({ page }) => {
  const requests = await mount(page, `<actividades-toka client="fc_TU_IDENTIFICADOR" province="28"></actividades-toka>`);
  await expect(items(page)).toHaveCount(3);
  await page.locator("actividades-toka").evaluate((el) => { el.removeAttribute("province"); el.setAttribute("municipality", "Getafe"); el.setAttribute("limit", "1"); });
  await expect(items(page)).toHaveCount(1);
  expect(requests).toHaveLength(2);
  expect(new URL(requests[1].url()).searchParams.get("municipality")).toBe("Getafe");
});

for (const [lang, state, canary, credit] of [
  ["ca", "Falta gent", "(hora canària)", "Activitats: Vaga General per l’Habitatge, CC BY 4.0"],
  ["eu", "Jendea falta da", "(kanarietako ordua)", "Jarduerak: Etxebizitzaren aldeko Greba Orokorra, CC BY 4.0"],
  ["gl", "Falta xente", "(hora canaria)", "Actividades: Folga Xeral pola Vivenda, CC BY 4.0"],
] as const) {
  test(`speaks ${lang} when the page does`, async ({ page }) => {
    await mount(page, `<actividades-toka client="fc_TU_IDENTIFICADOR" province="28"></actividades-toka>`, undefined, lang);
    await expect(items(page).nth(1)).toContainText(state);
    await expect(items(page).nth(1)).toContainText(canary);
    await expect(page.locator("actividades-toka .credit")).toHaveText(credit);
  });
}

test("the lang attribute wins; unknown languages fall back to Spanish", async ({ page }) => {
  await mount(page, `<actividades-toka lang="gl" client="fc_TU_IDENTIFICADOR" province="28"></actividades-toka><actividades-toka lang="fr" client="fc_TU_IDENTIFICADOR" province="28"></actividades-toka>`, undefined, "ca");
  await expect(page.locator("actividades-toka").first().locator("li").nth(1)).toContainText("Falta xente");
  await expect(page.locator("actividades-toka").first().locator("li").nth(1)).toContainText("Difusión");
  await expect(page.locator("actividades-toka").nth(1).locator("li").nth(1)).toContainText("Falta gente");
});

test("activity types are translated; unknown ones stay as the feed sends them", async ({ page }) => {
  await mount(page, `<actividades-toka client="fc_TU_IDENTIFICADOR" province="28"></actividades-toka>`, undefined, "eu");
  await expect(items(page).first()).toContainText("Greba batzarra");
  const custom = JSON.parse(fixture("datafeed.json"));
  custom.dataFeedElement[1].keywords = "Pegada de carteles";
  await page.unrouteAll();
  await mount(page, `<actividades-toka client="fc_TU_IDENTIFICADOR" province="28"></actividades-toka>`, [{ body: JSON.stringify(custom) }], "eu");
  await expect(items(page).nth(1)).toContainText("Pegada de carteles");
});

test("CSS variables and parts restyle it from the host page", async ({ page }) => {
  await mount(page, `<style>actividades-toka { --toka-accent: rgb(200, 0, 0); } actividades-toka::part(credit) { font-size: 20px; }</style><actividades-toka client="fc_TU_IDENTIFICADOR" province="28"></actividades-toka>`);
  await expect(items(page).first().locator("a")).toHaveCSS("color", "rgb(200, 0, 0)");
  await expect(page.locator("actividades-toka .credit")).toHaveCSS("font-size", "20px");
});
