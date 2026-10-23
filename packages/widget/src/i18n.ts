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

/** The locale for dates: the chosen language if this browser can format it, Spanish otherwise. */
export function dateLocale(lang: Lang): string {
  return Intl.DateTimeFormat.supportedLocalesOf([lang]).length ? lang : "es";
}
