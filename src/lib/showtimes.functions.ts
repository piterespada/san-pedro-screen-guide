import { createServerFn } from "@tanstack/react-start";
import { CINEMAS, MOCK_MOVIES, type CinemaId } from "./movies";

export type CinemaStatus = { cinema: CinemaId; ok: boolean; count: number };

const LIMIT = 8000;
const withTimeout = <T,>(p: Promise<T>) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), LIMIT))]);

// Scrapes all 4 cinemas in parallel (8s cap each). Failed cinemas get demo showtimes
// (the client swaps in its last saved board when available). If nothing live comes back,
// TMDb "now playing" fills the grid; mock data is the last resort.
export const getShowtimes = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["TMDB_API_KEY"];
  const { SCRAPERS, merge } = await import("./scrapers.server");
  const { enrich, nowPlaying } = await import("./tmdb.server");
  const results = await Promise.all(CINEMAS.map((c) =>
    withTimeout(SCRAPERS[c.id]()).then((r) => ({ id: c.id, r }), (e) => {
      console.error(`scrape ${c.id} failed:`, e instanceof Error ? e.message : e);
      return { id: c.id, r: null };
    })));
  const status: CinemaStatus[] = results.map(({ id, r }) => ({ cinema: id, ok: !!r?.length, count: r?.length ?? 0 }));
  const live = results.flatMap(({ r }) => r ?? []);
  const failed = new Set(status.filter((s) => !s.ok).map((s) => s.cinema));
  const fallback = MOCK_MOVIES.map((m) => ({ title: m.title, poster: m.poster, synopsis: m.synopsis, runtime: m.runtime, showtimes: m.showtimes.filter((s) => failed.has(s.cinema)).map((s) => ({ ...s, demo: true })) }))
    .filter((p) => p.showtimes.length);
  let movies = live.length ? await enrich(merge([...live, ...fallback]), key) : [];
  if (!live.length) movies = (await nowPlaying(key).catch(() => [])) ;
  if (!movies.length) movies = MOCK_MOVIES;
  return { movies, status, fetchedAt: new Date().toISOString() };
});
