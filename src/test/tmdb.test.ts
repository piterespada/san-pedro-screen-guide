import { describe, expect, it } from "vitest";
import { lookup, type TmdbRequest } from "@/lib/tmdb.server";
import type { Movie } from "@/lib/movies";

// A stand-in for TMDb: `route` answers by path and language; every call is recorded.
type Route = (path: string, lang: string) => unknown;
const fake = (route: Route) => {
  const calls: { path: string; lang: string }[] = [];
  const request: TmdbRequest = async (path, _key, lang = "es-MX") => { calls.push({ path, lang }); return route(path, lang) ?? null; };
  return { request, calls };
};

const movie = (over: Partial<Movie> = {}): Movie => ({
  id: "m", title: "TS EL EXORCISTA", poster: "https://cine.example/exorcista.jpg", synopsis: "Sinopsis del cine",
  director: "", cast: ["Actor del cine"], rating: 0, runtime: 0, showtimes: [], ...over,
});
const details = (over: Record<string, unknown> = {}) => ({
  id: 9, title: "El exorcista", original_title: "The Exorcist", overview: "Resumen en español de TMDb", release_date: "1973-12-26",
  runtime: 122, poster_path: "/tmdb.jpg", vote_average: 8.1, release_dates: { results: [] }, ...over,
});
const credits = {
  cast: [
    { name: "Ellen Burstyn", character: "Chris MacNeil", profile_path: "/e.jpg", order: 0 },
    { name: "Max von Sydow", character: "Padre Merrin", profile_path: null, order: 1 },
  ],
  crew: [{ job: "Director", name: "William Friedkin" }],
};
const happy: Route = (p) =>
  p.startsWith("/search/movie") ? { results: [{ id: 9, title: "El exorcista", original_title: "The Exorcist" }] } : p.startsWith("/movie/9/credits") ? credits : p.startsWith("/movie/9") ? details() : null;

describe("TMDb search", () => {
  it("asks with the sanitized title, never with the cinema's tags", async () => {
    const { request, calls } = fake(happy);
    await lookup(movie(), "key", request);
    expect(calls[0]!.path).toBe("/search/movie?query=El%20Exorcista");
    const r2 = fake(happy);
    await lookup(movie({ title: "Shrek 1 (Re-estreno)" }), "key", r2.request);
    expect(r2.calls[0]!.path).toBe("/search/movie?query=Shrek");
  });
  it("shows TMDb's Spanish title when it is the same film", async () => {
    expect((await lookup(movie(), "key", fake(happy).request)).title).toBe("El exorcista");
  });
  it("requests everything in es-MX", async () => {
    const { request, calls } = fake(happy);
    await lookup(movie(), "key", request);
    expect(calls.every((c) => c.lang === "es-MX")).toBe(true);
  });
});

describe("search fallbacks", () => {
  const route = (hits: Record<string, number>, runtime = 143, title = "Cars"): Route => (p, lang) => {
    if (p.startsWith("/search/movie")) return { results: hits[p] ? [{ id: hits[p], title, original_title: title }] : [] };
    if (p.startsWith("/movie/9/credits")) return credits;
    if (p.startsWith("/movie/9")) return lang === "es-MX" ? details({ runtime, title: "Otra", original_title: "Other" }) : null;
    return null;
  };

  it("forces the release year the cinema gives in the very first request", async () => {
    const { request, calls } = fake(route({ "/search/movie?query=Cars&primary_release_year=2006": 9 }));
    const out = await lookup(movie({ title: "Cars (2006)" }), "key", request);
    expect(calls[0]!.path).toBe("/search/movie?query=Cars&primary_release_year=2006");
    expect(out.tmdbId).toBe(9);
  });
  it("falls back to the main keyword and links it when the runtime agrees", async () => {
    const { request, calls } = fake(route({ "/search/movie?query=Avengers": 9 }, 143, "Avengers: Doomsday"));
    const out = await lookup(movie({ title: "Avengers: Doomsday", runtime: 150 }), "key", request);
    expect(calls.slice(0, 2).map((c) => c.path)).toEqual(["/search/movie?query=Avengers%20Doomsday", "/search/movie?query=Avengers"]);
    expect(out.tmdbId).toBe(9);
  });
  it("does not link a keyword guess whose runtime differs (avoids a wrong movie)", async () => {
    const m = movie({ title: "Avengers: Doomsday", runtime: 150 });
    const out = await lookup(m, "key", fake(route({ "/search/movie?query=Avengers": 9 }, 90, "Avengers: Doomsday")).request);
    expect(out).toBe(m);
    expect(out.tmdbId).toBeUndefined();
  });
  it("does not link a keyword guess when the runtime is unknown", async () => {
    const m = movie({ title: "Avengers: Doomsday", runtime: 0 });
    expect(await lookup(m, "key", fake(route({ "/search/movie?query=Avengers": 9 }, 143, "Avengers: Doomsday")).request)).toBe(m);
  });
  it("leaves the movie untouched when nothing is found or TMDb fails", async () => {
    const m = movie();
    expect(await lookup(m, "key", fake(() => ({ results: [] })).request)).toBe(m);
    const broken: TmdbRequest = async () => { throw new Error("network"); };
    expect(await lookup(m, "key", broken)).toBe(m);
  });
});

describe("metadata priority", () => {
  it("keeps the cinema's poster and only keeps TMDb's as an alternative", async () => {
    const out = await lookup(movie(), "key", fake(happy).request);
    expect(out.poster).toBe("https://cine.example/exorcista.jpg");
    expect(out.posterAlt).toBe("https://image.tmdb.org/t/p/w780/tmdb.jpg");
  });
  it("uses TMDb's poster only when the cinema gives no image", async () => {
    expect((await lookup(movie({ poster: "" }), "key", fake(happy).request)).poster).toBe("https://image.tmdb.org/t/p/w780/tmdb.jpg");
    expect((await lookup(movie({ poster: "https://placehold.co/400x600" }), "key", fake(happy).request)).poster).toBe("https://image.tmdb.org/t/p/w780/tmdb.jpg");
  });
  it("discards the cinema's synopsis for TMDb's Spanish one", async () => {
    expect((await lookup(movie(), "key", fake(happy).request)).synopsis).toBe("Resumen en español de TMDb");
  });
  it("tries es-ES when es-MX has no synopsis, and keeps the cinema's only as a last resort", async () => {
    const noMx: Route = (p, lang) => (p === "/movie/9" ? { overview: "Resumen es-ES" } : p.startsWith("/movie/9?") && lang === "es-MX" ? details({ overview: "" }) : happy(p, lang));
    expect((await lookup(movie(), "key", fake(noMx).request)).synopsis).toBe("Resumen es-ES");
    const none: Route = (p, lang) => (p === "/movie/9" ? { overview: "" } : p.startsWith("/movie/9?") ? details({ overview: "" }) : happy(p, lang));
    expect((await lookup(movie(), "key", fake(none).request)).synopsis).toBe("Sinopsis del cine");
  });
  it("takes the cast from TMDb, with photo and character", async () => {
    const out = await lookup(movie(), "key", fake(happy).request);
    expect(out.cast).toEqual(["Ellen Burstyn", "Max von Sydow"]);
    expect(out.topCast).toEqual([
      { name: "Ellen Burstyn", character: "Chris MacNeil", photo: "https://image.tmdb.org/t/p/w185/e.jpg" },
      { name: "Max von Sydow", character: "Padre Merrin" },
    ]);
    expect(out.director).toBe("William Friedkin");
  });
  it("keeps the cinema's cast only when TMDb has none", async () => {
    const noCast: Route = (p, lang) => (p.startsWith("/movie/9/credits") ? { cast: [], crew: [] } : happy(p, lang));
    const out = await lookup(movie(), "key", fake(noCast).request);
    expect(out.cast).toEqual(["Actor del cine"]);
    expect(out.topCast).toBeUndefined();
  });
});

describe("choosing the right result", () => {
  const callMe = { id: 1, title: "Llámame por tu nombre", original_title: "Call Me by Your Name", release_date: "2017-10-27" };
  const yourName = { id: 9, title: "Your Name", original_title: "君の名は。", release_date: "2016-08-26" };
  const route = (results: unknown[]): Route => (p) =>
    p.startsWith("/search/movie") ? { results } : p.startsWith("/movie/9/credits") ? credits : p.startsWith("/movie/9") ? details({ id: 9, title: "Your Name", original_title: "君の名は。" }) : null;

  it("skips a first result that only contains the title and takes the exact one", async () => {
    const out = await lookup(movie({ title: "Your Name", runtime: 106 }), "key", fake(route([callMe, yourName])).request);
    expect(out.tmdbId).toBe(9);
  });
  it("links nothing when only look-alikes come back", async () => {
    const m = movie({ title: "Your Name" });
    expect(await lookup(m, "key", fake(route([callMe])).request)).toBe(m);
  });
  it("matches by original title too", async () => {
    const r = [{ id: 9, title: "Otro", original_title: "Up", release_date: "2009-05-29" }, { id: 2, title: "Up", original_title: "Up Close", release_date: "2000-01-01" }];
    expect((await lookup(movie({ title: "UP" }), "key", fake(route(r)).request)).tmdbId).toBe(9);
  });
  it("uses a year written without parentheses as primary_release_year", async () => {
    const { request, calls } = fake(route([callMe, yourName]));
    const out = await lookup(movie({ title: "Your Name 2016", runtime: 106 }), "key", request);
    expect(calls[0]!.path).toBe("/search/movie?query=Your%20Name&primary_release_year=2016");
    expect(out.tmdbId).toBe(9);
  });
  it("rejects a namesake from another year", async () => {
    const m = movie({ title: "Your Name 2016" });
    expect(await lookup(m, "key", fake(route([{ ...yourName, release_date: "1990-01-01" }])).request)).toBe(m);
  });
});
