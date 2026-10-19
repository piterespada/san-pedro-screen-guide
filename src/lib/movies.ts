export const CINEMAS = [
  { id: "citymall", name: "Cinemark Citymall", url: "https://api.cinemarkca.com/api/vista/data/billboard?cinema_id=774" },
  { id: "galerias", name: "Cinemark Galerías", url: "https://api.cinemarkca.com/api/vista/data/billboard?cinema_id=2200" },
  { id: "altara", name: "Cinépolis Altara", url: "https://cinepolis.com.hn/cinema/cinepolis-altara/?cinema_selected=1" },
  { id: "megamall", name: "Metrocinema Megamall", url: "https://www.metrocinemas.hn/cartelera/cartelera" },
] as const;

export type CinemaId = (typeof CINEMAS)[number]["id"];
/** Screen technology. A single session can carry several (e.g. 2D + XD + D-BOX). */
export type Format = "2D" | "3D" | "XD" | "D-BOX" | "IV" | "VIP";
export type Audio = "SUB" | "DOB";
/** Sessions of one cinema on one date sharing the same formats and audio. `date` is YYYY-MM-DD. */
export type Showtime = { cinema: CinemaId; date: string; formats: Format[]; audio?: Audio | undefined; times: string[] };
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
};

/** What a single cinema reports about one movie, before the cinemas are merged. */
export type Listing = {
  title: string; poster?: string | undefined; synopsis?: string | undefined; runtime?: number | undefined;
  director?: string | undefined; cast?: string[] | undefined; certification?: string | undefined;
  trailer?: string | undefined; presale?: boolean | undefined; showtimes: Showtime[];
};

export type SessionRow = { date: string; formats: Format[]; audio?: Audio | undefined; time: string };

/** Group raw sessions into Showtime entries per (date, formats, audio). */
export function group(cinema: CinemaId, rows: SessionRow[]): Showtime[] {
  const map = new Map<string, Showtime>();
  for (const r of rows) {
    const k = `${r.date}|${r.formats.join("+")}|${r.audio ?? ""}`;
    if (!map.has(k)) map.set(k, { cinema, date: r.date, formats: r.formats, audio: r.audio, times: [] });
    map.get(k)!.times.push(r.time);
  }
  return [...map.values()]
    .map((s) => ({ ...s, times: [...new Set(s.times)].sort() }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const todayHN = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Tegucigalpa" });

/** Sorted, unique dates (today onwards) on which at least one of the movies has a session. */
export function availableDates(movies: Movie[], today: string): string[] {
  const dates = new Set<string>();
  for (const m of movies) for (const s of m.showtimes) if (s.date >= today) dates.add(s.date);
  return [...dates].sort();
}

/** "Hoy", "Mañana", then "mié, 21 oct". */
export function dayLabel(date: string, today: string) {
  const diff = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("es-HN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export type Filters = { cinema: CinemaId | "all"; format: Format | "all"; audio: Audio | "all" };
/** Which slice of the board is on screen: regular listings of one day, or all pre-sales. */
export type View = { presale: boolean; date?: string | undefined };

export function matches(s: Showtime, f: Filters) {
  return (f.cinema === "all" || s.cinema === f.cinema) && (f.format === "all" || s.formats.includes(f.format)) && (f.audio === "all" || s.audio === f.audio);
}

/** Showtimes of a movie that pass the filters and belong to the current view. */
export function visibleShowtimes(m: Movie, f: Filters, v: View) {
  return m.showtimes.filter((s) => matches(s, f) && (!v.date || s.date === v.date));
}

export function filterMovies(movies: Movie[], f: Filters, v: View) {
  return movies.filter((m) => !!m.presale === v.presale && visibleShowtimes(m, f, v).length > 0);
}
