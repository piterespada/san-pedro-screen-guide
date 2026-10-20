import type { Movie } from "./movies";
import { topCast } from "./cast";
import { cleanTitle, sameMovie } from "./titles";

const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w780";

// Accepts either a v3 API key or a v4 read access token (JWT).
function req(path: string, key: string, lang = "es-MX") {
  const v4 = key.startsWith("eyJ");
  const url = `${API}${path}${path.includes("?") ? "&" : "?"}language=${lang}${v4 ? "" : `&api_key=${key}`}`;
  return fetch(url, { headers: v4 ? { Authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(6000) })
    .then((r) => (r.ok ? r.json() : null));
}

/** Strip cinema noise ("4K", "PREVENTA", "RE:", subtitles after ":") for a better search. */
const clean = (t: string) => cleanTitle(t).replace(/\b(4k|preventa|3d|2d|vip)\b/gi, "").replace(/\s+/g, " ").trim();

async function lookup(m: Movie, key: string): Promise<Movie> {
  try {
    let s = await req(`/search/movie?query=${encodeURIComponent(clean(m.title))}`, key);
    if (!s?.results?.length && m.title.includes(":")) s = await req(`/search/movie?query=${encodeURIComponent(clean(m.title.split(":")[0]!))}`, key);
    const hit = s?.results?.[0];
    if (!hit) return m;
    const [d, credits] = await Promise.all([req(`/movie/${hit.id}?append_to_response=release_dates`, key), req(`/movie/${hit.id}/credits`, key, "en-US")]);
    if (!d) return m;
    const rd = d.release_dates?.results ?? [];
    const cert = [ "HN", "MX", "US" ].map((c) => rd.find((r: any) => r.iso_3166_1 === c)?.release_dates?.find((x: any) => x.certification)?.certification).find(Boolean);
    // Show TMDb's Spanish name, but only when it is clearly the same film as the cinema's title
    // (matching its localized or original title), so a wrong search hit never renames a movie.
    const named = (x: unknown) => typeof x === "string" && x.trim() !== "" && sameMovie(m.title, x);
    const stars = topCast(credits);
    return {
      ...m,
      title: named(d.title) || named(d.original_title) ? String(d.title || d.original_title).trim() : m.title,
      // The cinemas' own data wins; TMDb only fills what they left empty.
      synopsis: m.synopsis || d.overview || "",
      director: m.director || credits?.crew?.find((c: any) => c.job === "Director")?.name || "",
      cast: m.cast.length ? m.cast : (credits?.cast?.slice(0, 5).map((c: any) => c.name) ?? m.cast),
      // Main cast with photo and character, from the same credits response (no extra request).
      topCast: stars.length ? stars : undefined,
      rating: Math.round((d.vote_average ?? 0) * 10) / 10,
      runtime: m.runtime || d.runtime || 0,
      year: d.release_date?.slice(0, 4),
      certification: m.certification ?? cert,
      tmdbId: d.id,
      // Official cinema poster first; TMDb only when the cinema gave none (or a placeholder).
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
