import type { Movie } from "./movies";
import { topCast } from "./cast";
import { sameMovie, searchAttempts } from "./titles";

const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w780";
const LANG = "es-MX"; // Spanish for synopsis, title and cast characters

// Accepts either a v3 API key or a v4 read access token (JWT).
function req(path: string, key: string, lang = LANG) {
  const v4 = key.startsWith("eyJ");
  const url = `${API}${path}${path.includes("?") ? "&" : "?"}language=${lang}${v4 ? "" : `&api_key=${key}`}`;
  return fetch(url, { headers: v4 ? { Authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(6000) })
    .then((r) => (r.ok ? r.json() : null));
}

/** How TMDb is queried; injectable so the lookup can be tested without the network. */
export type TmdbRequest = (path: string, key: string, lang?: string) => Promise<any>;

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// A fallback search guess is only linked when the runtimes agree this closely (both must be known).
const RUNTIME_TOLERANCE = 20;
const runtimeAgrees = (cinema: number | undefined, tmdb: unknown) =>
  !!cinema && typeof tmdb === "number" && tmdb > 0 && Math.abs(cinema - tmdb) <= RUNTIME_TOLERANCE;

const directorOf = (credits: any): string => {
  const crew: any[] = Array.isArray(credits?.crew) ? credits.crew : [];
  return text(crew.find((c) => c?.job === "Director")?.name)
    || text(crew.find((c) => c?.department === "Directing" && /direct/i.test(String(c?.job)))?.name);
};

export async function lookup(m: Movie, key: string, request: TmdbRequest = req): Promise<Movie> {
  try {
    // Search with the sanitized title; on zero results try the next attempt (year, subtitle, main keyword).
    let hit: any;
    let loose = false;
    for (const a of searchAttempts(m.title)) {
      const s = await request(`/search/movie?query=${encodeURIComponent(a.query)}${a.year ? `&year=${a.year}` : ""}`, key, LANG);
      if (s?.results?.length) { hit = s.results[0]; loose = a.loose; break; }
    }
    if (!hit) return m;
    const [d, credits] = await Promise.all([
      request(`/movie/${hit.id}?append_to_response=release_dates`, key, LANG),
      request(`/movie/${hit.id}/credits`, key, LANG),
    ]);
    if (!d) return m;
    // A vague guess (subtitle / keyword search) must at least have the same length as the cinema's movie.
    if (loose && !runtimeAgrees(m.runtime, d.runtime)) return m;

    const rd = d.release_dates?.results ?? [];
    const cert = [ "HN", "MX", "US" ].map((c) => rd.find((r: any) => r.iso_3166_1 === c)?.release_dates?.find((x: any) => x.certification)?.certification).find(Boolean);
    // Show TMDb's Spanish name, but only when it is clearly the same film as the cinema's title
    // (matching its localized or original title), so a wrong search hit never renames a movie.
    const named = (x: unknown) => typeof x === "string" && x.trim() !== "" && sameMovie(m.title, x);
    // Synopsis in Spanish from TMDb: es-MX, then es-ES when es-MX has none.
    const overview = text(d.overview) || text((await request(`/movie/${hit.id}`, key, "es-ES"))?.overview);
    const stars = topCast(credits);
    return {
      ...m,
      title: named(d.title) || named(d.original_title) ? String(d.title || d.original_title).trim() : m.title,
      // TMDb's Spanish synopsis replaces the cinema's; the cinema's is kept only if TMDb has none in Spanish.
      synopsis: overview || m.synopsis || "",
      // Cast comes from TMDb; the cinema's list is kept only when TMDb has no cast for the movie.
      cast: stars.length ? stars.slice(0, 5).map((s) => s.name) : m.cast,
      // Main cast with photo and character, from the same credits response.
      topCast: stars.length ? stars : undefined,
      director: m.director || directorOf(credits),
      rating: Math.round((d.vote_average ?? 0) * 10) / 10,
      runtime: m.runtime || d.runtime || 0,
      year: d.release_date?.slice(0, 4),
      certification: m.certification ?? cert,
      tmdbId: d.id,
      // The cinema's own poster always wins; TMDb's only when the cinema gave no image URL (or a placeholder).
      poster: m.poster && !m.poster.includes("placehold.co") ? m.poster : d.poster_path ? IMG + d.poster_path : m.poster,
      posterAlt: d.poster_path ? IMG + d.poster_path : undefined,
    };
  } catch {
    return m;
  }
}

export async function enrich(movies: Movie[], key: string | undefined) {
  if (!key) return movies;
  const found = await Promise.all(movies.map((m) => lookup(m, key)));
  // Second pass: titles TMDb resolved to the same film become one card.
  const out: Movie[] = [];
  for (const m of found) {
    const dup = m.tmdbId ? out.find((x) => x.tmdbId === m.tmdbId) : undefined;
    if (dup) {
      dup.showtimes.push(...m.showtimes);
      dup.presale = !!dup.presale && !!m.presale;
      dup.rerun = !!dup.rerun || !!m.rerun;
      dup.trailer ||= m.trailer;
      if (m.opening && (!dup.opening || m.opening < dup.opening)) dup.opening = m.opening;
    } else out.push(m);
  }
  return out;
}

/** Fallback when no cinema responds: TMDb "now playing" in Honduras, without showtimes. */
export async function nowPlaying(key: string | undefined): Promise<Movie[]> {
  if (!key) return [];
  const r = await req(`/movie/now_playing?region=HN`, key);
  return (r?.results ?? []).slice(0, 18).map((d: any) => ({
    id: `tmdb-${d.id}`, title: d.title, synopsis: d.overview ?? "", director: "", cast: [],
    rating: Math.round((d.vote_average ?? 0) * 10) / 10, runtime: 0, year: d.release_date?.slice(0, 4),
    poster: d.poster_path ? IMG + d.poster_path : "", showtimes: [],
  }));
}
