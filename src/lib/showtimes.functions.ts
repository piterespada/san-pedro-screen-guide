import { createServerFn } from "@tanstack/react-start";
import { CINEMAS, MOCK_MOVIES, type CinemaId } from "./movies";

export type CinemaStatus = { cinema: CinemaId; ok: boolean; count: number };

// Scrapes all 4 cinemas in parallel; any failure falls back to mock data for that cinema,
// and if nothing real comes back the whole grid uses mock data so the screen is never empty.
export const getShowtimes = createServerFn({ method: "GET" }).handler(async () => {
  const { SCRAPERS, merge } = await import("./scrapers.server");
  const results = await Promise.all(CINEMAS.map((c) => SCRAPERS[c.id]().then((r) => ({ id: c.id, r }), () => ({ id: c.id, r: null }))));
  const status: CinemaStatus[] = results.map(({ id, r }) => ({ cinema: id, ok: !!r?.length, count: r?.length ?? 0 }));
  const live = results.flatMap(({ r }) => r ?? []);
  const failed = new Set(status.filter((s) => !s.ok).map((s) => s.cinema));
  const fallback = MOCK_MOVIES.map((m) => ({ title: m.title, poster: m.poster, synopsis: m.synopsis, runtime: m.runtime, showtimes: m.showtimes.filter((s) => failed.has(s.cinema)) }))
    .filter((p) => p.showtimes.length);
  const movies = live.length ? merge([...live, ...fallback]) : MOCK_MOVIES;
  return { movies, status, live: live.length > 0, fetchedAt: new Date().toISOString() };
});
