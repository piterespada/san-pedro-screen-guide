import { createServerFn } from "@tanstack/react-start";
import { CINEMAS, MOCK_MOVIES, type Movie } from "./movies";

// Best-effort scrape: fetches each cinema page and extracts movie titles with Cheerio.
// Cinema sites render much of their data client-side, so we fall back to mock data.
export const getShowtimes = createServerFn({ method: "GET" }).handler(async () => {
  const { load } = await import("cheerio");
  const status = await Promise.all(
    CINEMAS.map(async (c) => {
      try {
        const res = await fetch(c.url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
        const $ = load(await res.text());
        let scope = $("body");
        if (c.id === "megamall") {
          const mm = $("*:contains('Megamall')").last().closest("section, div");
          if (mm.length) scope = mm;
        }
        const titles = scope.find("h2, h3, .movie-title, .title").map((_, el) => $(el).text().trim()).get().filter(Boolean);
        return { cinema: c.id, ok: res.ok, found: titles.length };
      } catch {
        return { cinema: c.id, ok: false, found: 0 };
      }
    }),
  );
  const movies: Movie[] = MOCK_MOVIES;
  return { movies, status, fetchedAt: new Date().toISOString() };
});
