// The widget's texts in the four languages of Toka, with the same words the app uses.

export type Lang = "es" | "ca" | "eu" | "gl";
export const langs: readonly Lang[] = ["es", "ca", "eu", "gl"];

export interface Texts {
  loading: string;
  empty: string;
  unavailable: string;
  tooMany: string;
  states: { pending: string; confirmed: string; cancelled: string };
  full: string;
  canaryTime: string;
  moreDates: (count: number) => string;
  credit: { label: string; campaign: string };
  /** The feed sends the type in Spanish: these are the known ones. Unknown types are shown as they come. */
  types: Record<string, string>;
}

const spanishTypes = ["Reunión de comité", "Formación", "Difusión", "Encuesta", "Asamblea de huelga", "Movilización", "Huelga", "Otros"] as const;
const typesFrom = (names: readonly string[]) => Object.fromEntries(spanishTypes.map((type, i) => [type, names[i]]));

export const texts: Record<Lang, Texts> = {
  es: {
    loading: "Cargando actividades…",
    empty: "No hay actividades próximas en tu zona.",
    unavailable: "Ahora no podemos cargar las actividades. Vuelve a intentarlo.",
    tooMany: "Ahora no podemos cargar las actividades. Prueba dentro de un rato.",
    states: { pending: "Falta gente", confirmed: "Confirmada", cancelled: "Cancelada" },
    full: "Completa",
    canaryTime: "Hora canaria",
    moreDates: (count) => (count === 1 ? "y 1 fecha más" : `y ${count} fechas más`),
    credit: { label: "Actividades", campaign: "Huelga General por la Vivienda" },
    types: typesFrom(spanishTypes),
  },
  ca: {
    loading: "Carregant les activitats…",
    empty: "No hi ha activitats properes a la teva zona.",
    unavailable: "Ara no podem carregar les activitats. Torna-ho a provar.",
    tooMany: "Ara no podem carregar les activitats. Prova-ho d’aquí a una estona.",
    states: { pending: "Falta gent", confirmed: "Confirmada", cancelled: "Cancel·lada" },
    full: "Completa",
    canaryTime: "Hora canària",
    moreDates: (count) => (count === 1 ? "i 1 data més" : `i ${count} dates més`),
    credit: { label: "Activitats", campaign: "Vaga General per l’Habitatge" },
    types: typesFrom(["Reunió de comitè", "Formació", "Difusió", "Enquesta", "Assemblea de vaga", "Mobilització", "Vaga", "Altres"]),
  },
  eu: {
    loading: "Jarduerak kargatzen…",
    empty: "Ez dago jarduerarik laster zure inguruan.",
    unavailable: "Orain ezin ditugu jarduerak kargatu. Saiatu berriro.",
    tooMany: "Orain ezin ditugu jarduerak kargatu. Saiatu berriro geroxeago.",
    states: { pending: "Jendea falta da", confirmed: "Baieztatuta", cancelled: "Bertan behera" },
    full: "Beteta",
    canaryTime: "Kanarietako ordua",
    moreDates: (count) => (count === 1 ? "eta data 1 gehiago" : `eta ${count} data gehiago`),
    credit: { label: "Jarduerak", campaign: "Etxebizitzaren aldeko Greba Orokorra" },
    types: typesFrom(["Batzordearen bilera", "Prestakuntza", "Zabalkundea", "Inkesta", "Greba batzarra", "Mobilizazioa", "Greba", "Besteak"]),
  },
  gl: {
    loading: "Cargando as actividades…",
    empty: "Non hai actividades próximas na túa zona.",
    unavailable: "Agora non podemos cargar as actividades. Téntao de novo.",
    tooMany: "Agora non podemos cargar as actividades. Proba dentro dun anaco.",
    states: { pending: "Falta xente", confirmed: "Confirmada", cancelled: "Cancelada" },
    full: "Completa",
    canaryTime: "Hora canaria",
    moreDates: (count) => (count === 1 ? "e 1 data máis" : `e ${count} datas máis`),
    credit: { label: "Actividades", campaign: "Folga Xeral pola Vivenda" },
    types: typesFrom(["Reunión de comité", "Formación", "Difusión", "Enquisa", "Asemblea de folga", "Mobilización", "Folga", "Outros"]),
  },
};

const isLang = (value: string | null | undefined): value is Lang => !!value && (langs as readonly string[]).includes(value);

/** The `lang` attribute, else the nearest `lang` around the element (the page's), else Spanish. Only the four languages. */
export function chooseLang(element: Element): Lang {
  const own = element.getAttribute("lang")?.toLowerCase().split("-")[0];
  if (isLang(own)) return own;
  const inherited = element.closest("[lang]")?.getAttribute("lang")?.toLowerCase().split("-")[0];
  return isLang(inherited) ? inherited : "es";
}

// Dates with our own names: many browsers cannot format Basque or Galician and would fall back to Spanish.
const weekdays: Record<Lang, string[]> = {
  es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
  ca: ["diumenge", "dilluns", "dimarts", "dimecres", "dijous", "divendres", "dissabte"],
  eu: ["igandea", "astelehena", "asteartea", "asteazkena", "osteguna", "ostirala", "larunbata"],
  gl: ["domingo", "luns", "martes", "mércores", "xoves", "venres", "sábado"],
};
const months: Record<Lang, string[]> = {
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  ca: ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"],
  eu: ["urtarrila", "otsaila", "martxoa", "apirila", "maiatza", "ekaina", "uztaila", "abuztua", "iraila", "urria", "azaroa", "abendua"],
  gl: ["xaneiro", "febreiro", "marzo", "abril", "maio", "xuño", "xullo", "agosto", "setembro", "outubro", "novembro", "decembro"],
};
const englishWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** «jueves, 29 de octubre, 19:00» in the given language, in the given time zone. */
export function formatDate(iso: string, timeZone: string, lang: Lang): string {
  // English is in every browser: use it only to read the parts of the date in that time zone.
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, weekday: "short", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));
  const weekday = weekdays[lang][englishWeekdays.indexOf(parts.weekday)];
  const month = months[lang][Number(parts.month) - 1];
  const day = Number(parts.day);
  const time = `${parts.hour}:${parts.minute}`;
  switch (lang) {
    case "ca": return `${weekday}, ${day} ${/^[aeiou]/.test(month) ? "d’" : "de "}${month}, a les ${time}`;
    case "eu": return `${weekday}, ${month.replace(/a$/, "aren")} ${day}a, ${time}`;
    default: return `${weekday}, ${day} de ${month}, ${time}`;
  }
}
