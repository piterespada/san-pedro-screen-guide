export const CINEMAS = [
  { id: "citymall", name: "Cinemark Citymall", url: "https://api.cinemarkca.com/api/vista/data/billboard?cinema_id=774" },
  { id: "galerias", name: "Cinemark Galerías", url: "https://api.cinemarkca.com/api/vista/data/billboard?cinema_id=2200" },
  { id: "altara", name: "Cinépolis Altara", url: "https://cinepolis.com.hn/cinema/cinepolis-altara/?cinema_selected=1" },
  { id: "megamall", name: "Metrocinema Megamall", url: "https://www.metrocinemas.hn/cartelera/cartelera" },
] as const;

export type CinemaId = (typeof CINEMAS)[number]["id"];
/** Screen technology. A single session can carry several (e.g. 2D + XD + D-BOX). */
export type Format = "2D" | "3D" | "XD" | "D-BOX" | "IV" | "PREMIER" | "VIP";
export type Audio = "SUB" | "DOB";
/** Seat type, only when the cinema reports enough to tell. */
export type Seating = "D-BOX" | "Tradicional";
/**
 * Sessions of one cinema on one date sharing the same formats, audio and seating.
 * Format, audio and seating belong to the session itself, not to the movie. `date` is YYYY-MM-DD.
 */
export type Showtime = { cinema: CinemaId; date: string; formats: Format[]; audio?: Audio | undefined; seating?: Seating | undefined; times: string[] };
export type Movie = {
  id: string; title: string; poster: string; synopsis: string; director: string;
  cast: string[]; rating: number; runtime: number; showtimes: Showtime[];
  year?: string | undefined; tmdbId?: number | undefined; posterAlt?: string | undefined;
  /** Age classification given by the cinema (e.g. "+13", "A", "+18"). */
  certification?: string | undefined;
  /** YouTube link to the trailer. */
  trailer?: string | undefined;
  /** True when every listing is a pre-sale / special event (not yet in regular release). */
  presale?: boolean | undefined;
  /** Official release date (YYYY-MM-DD), when the cinema reports it. */
  opening?: string | undefined;
  /** True when a cinema lists it as a re-release ("RE", "Reestreno"). */
  rerun?: boolean | undefined;
};

/** What a single cinema reports about one movie, before the cinemas are merged. */
export type Listing = {
  title: string; poster?: string | undefined; synopsis?: string | undefined; runtime?: number | undefined;
  director?: string | undefined; cast?: string[] | undefined; certification?: string | undefined;
  trailer?: string | undefined; presale?: boolean | undefined; opening?: string | undefined; rerun?: boolean | undefined; showtimes: Showtime[];
};

export type SessionRow = { date: string; formats: Format[]; audio?: Audio | undefined; seating?: Seating | undefined; time: string };

/** Group raw sessions into Showtime entries per (date, formats, audio, seating). */
export function group(cinema: CinemaId, rows: SessionRow[]): Showtime[] {
  const map = new Map<string, Showtime>();
  for (const r of rows) {
    const k = `${r.date}|${r.formats.join("+")}|${r.audio ?? ""}|${r.seating ?? ""}`;
    if (!map.has(k)) map.set(k, { cinema, date: r.date, formats: r.formats, audio: r.audio, seating: r.seating, times: [] });
    map.get(k)!.times.push(r.time);
  }
  return [...map.values()]
    .map((s) => ({ ...s, times: [...new Set(s.times)].sort() }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const TZ = "America/Tegucigalpa";
export const todayHN = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });

/** Current date (YYYY-MM-DD) and time (HH:MM, 24h) in Honduras. */
export function nowHN(now: Date = new Date()) {
  return {
    date: now.toLocaleDateString("en-CA", { timeZone: TZ }),
    time: now.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  };
}

/** True when a session (date YYYY-MM-DD, time HH:MM) already started, by Honduras time. */
export function isPast(date: string, time: string, now: Date = new Date()) {
  const n = nowHN(now);
  return date < n.date || (date === n.date && time < n.time);
}

/** Sorted, unique dates (today onwards) on which at least one of the movies has a session. */
export function availableDates(movies: Movie[], today: string): string[] {
  const dates = new Set<string>();
  for (const m of movies) for (const s of m.showtimes) if (s.date >= today) dates.add(s.date);
  return [...dates].sort();
}

const dateOf = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("es-HN", { ...opts, timeZone: "UTC" });

/** "mié, 21 oct". */
export const shortDate = (date: string) => dateOf(date, { weekday: "short", day: "numeric", month: "short" });
/** "miércoles, 21 de octubre". */
export const longDate = (date: string) => dateOf(date, { weekday: "long", day: "numeric", month: "long" });

/** "Hoy", "Mañana", then "mié, 21 oct". */
export function dayLabel(date: string, today: string) {
  const diff = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  return shortDate(date);
}

/** First and last date (YYYY-MM-DD) among showtimes, or null when there are none. */
export function dateSpan(showtimes: Showtime[]): [string, string] | null {
  const dates = showtimes.map((s) => s.date).sort();
  return dates.length ? [dates[0]!, dates[dates.length - 1]!] : null;
}

/** The only global filter left: format, audio and seating live on each showtime. */
export type Filters = { cinema: CinemaId | "all" };
/** Which slice of the board is on screen: regular listings of one day, or all pre-sales. */
export type View = { presale: boolean; date?: string | undefined };

export const matches = (s: Showtime, f: Filters) => f.cinema === "all" || s.cinema === f.cinema;

/** Showtimes of a movie that pass the filters and belong to the current view. */
export function visibleShowtimes(m: Movie, f: Filters, v: View) {
  return m.showtimes.filter((s) => matches(s, f) && (!v.date || s.date === v.date));
}

export function filterMovies(movies: Movie[], f: Filters, v: View) {
  return movies.filter((m) => !!m.presale === v.presale && visibleShowtimes(m, f, v).length > 0);
}

/**
 * Pre-sale calendar: for every date from `today` on, the movies that have a pre-sale screening that
 * day (passing the cinema filter) or that open that day. Dates come out in ascending order and
 * each day's movies are sorted by title. Only real sessions and real opening dates are used.
 */
export function presaleCalendar(movies: Movie[], today: string, f: Filters): Map<string, Movie[]> {
  const days = new Map<string, Movie[]>();
  const add = (date: string, m: Movie) => {
    if (date < today) return;
    const list = days.get(date) ?? [];
    if (!list.includes(m)) days.set(date, [...list, m]);
  };
  for (const m of movies) {
    if (!m.presale) continue;
    const mine = m.showtimes.filter((s) => matches(s, f));
    if (!mine.length) continue;
    for (const s of mine) add(s.date, m);
    if (m.opening) add(m.opening, m);
  }
  return new Map([...days].sort(([a], [b]) => a.localeCompare(b)).map(([d, l]) => [d, [...l].sort((a, b) => a.title.localeCompare(b.title))]));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Weeks (Sunday first) of a month as YYYY-MM-DD strings, with null for the blank cells around it. `month` is 1–12. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const lead = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** "octubre de 2026" for a "YYYY-MM" key. */
export const monthLabel = (ym: string) =>
  new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("es-HN", { month: "long", year: "numeric", timeZone: "UTC" });

/** Shifts a "YYYY-MM" key by whole months. */
export function addMonths(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}
