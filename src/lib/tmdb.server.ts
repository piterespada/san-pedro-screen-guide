import type { Movie } from "./movies";

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
const clean = (t: string) => t.replace(/^re:\s*/i, "").replace(/\b(4k|preventa|3d|2d|vip|reestreno)\b/gi, "").replace(/\s+/g, " ").trim();

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
    return {
      ...m,
      synopsis: d.overview || m.synopsis,
      director: credits?.crew?.find((c: any) => c.job === "Director")?.name ?? m.director,
      cast: credits?.cast?.slice(0, 5).map((c: any) => c.name) ?? m.cast,
      rating: Math.round((d.vote_average ?? 0) * 10) / 10,
      runtime: d.runtime || m.runtime,
      year: d.release_date?.slice(0, 4),
      certification: cert,
      poster: d.poster_path ? IMG + d.poster_path : m.poster,
    };
  } catch {
    return m;
  }
}

export async function enrich(movies: Movie[], key: string | undefined) {
  if (!key) return movies;
  return Promise.all(movies.map((m) => lookup(m, key)));
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
