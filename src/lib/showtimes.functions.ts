import { createServerFn } from "@tanstack/react-start";
import { CINEMAS, type CinemaId } from "./movies";

export type CinemaStatus = { cinema: CinemaId; ok: boolean; count: number };

const LIMIT = 8000;
const withTimeout = <T,>(p: Promise<T>) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), LIMIT))]);

// Queries all 4 cinemas in parallel (8s cap each). A cinema that fails or returns nothing is
// reported as unavailable and left out: nothing is ever invented to take its place.
// TMDb (optional) only completes posters and missing details of movies the cinemas really list.
export const getShowtimes = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["TMDB_API_KEY"];
  const { SCRAPERS } = await import("./scrapers.server");
  const { merge } = await import("./merge");
  const { enrich } = await import("./tmdb.server");
  const results = await Promise.all(CINEMAS.map((c) =>
    withTimeout(SCRAPERS[c.id]()).then((r) => ({ id: c.id, r }), (e) => {
      console.error(`scrape ${c.id} failed:`, e instanceof Error ? e.message : e);
      return { id: c.id, r: null };
    })));
  const status: CinemaStatus[] = results.map(({ id, r }) => ({ cinema: id, ok: !!r?.length, count: r?.length ?? 0 }));
  const live = results.flatMap(({ r }) => r ?? []);
  const movies = live.length ? await enrich(merge(live), key) : [];
  return { movies, status, fetchedAt: new Date().toISOString() };
});
