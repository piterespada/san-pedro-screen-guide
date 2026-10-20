import { describe, expect, it } from "vitest";
import { addMonths, isPast, monthGrid, nowHN, presaleCalendar, type Movie, type CinemaId } from "@/lib/movies";

// 2026-10-20T03:30:00Z is 21:30 on 2026-10-19 in Honduras (UTC-6, no daylight saving).
const NOW = new Date("2026-10-20T03:30:00Z");

describe("Honduras clock", () => {
  it("reads the date and time in Honduras, not UTC", () => {
    expect(nowHN(NOW)).toEqual({ date: "2026-10-19", time: "21:30" });
    expect(nowHN(new Date("2026-10-19T06:05:00Z"))).toEqual({ date: "2026-10-19", time: "00:05" });
  });
  it("marks sessions that already started today", () => {
    expect(isPast("2026-10-19", "21:00", NOW)).toBe(true);
    expect(isPast("2026-10-19", "09:15", NOW)).toBe(true);
  });
  it("does not mark the current minute, later sessions or other days", () => {
    expect(isPast("2026-10-19", "21:30", NOW)).toBe(false);
    expect(isPast("2026-10-19", "21:31", NOW)).toBe(false);
    expect(isPast("2026-10-19", "23:50", NOW)).toBe(false);
    expect(isPast("2026-10-20", "00:10", NOW)).toBe(false);
  });
  it("marks earlier days as past", () => {
    expect(isPast("2026-10-18", "23:59", NOW)).toBe(true);
  });
});

describe("monthGrid", () => {
  it("starts on Sunday and pads with blanks (October 2026 starts on a Thursday)", () => {
    const weeks = monthGrid(2026, 10);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(weeks[4]![6]).toBe("2026-10-31");
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
  });
  it("handles a month that starts on Sunday, and one on Monday", () => {
    expect(monthGrid(2026, 11)[0]![0]).toBe("2026-11-01");
    expect(monthGrid(2026, 11).flat().filter(Boolean)).toHaveLength(30);
    expect(monthGrid(2027, 2)[0]).toEqual([null, "2027-02-01", "2027-02-02", "2027-02-03", "2027-02-04", "2027-02-05", "2027-02-06"]);
    expect(monthGrid(2027, 2).flat().filter(Boolean)).toHaveLength(28);
  });
  it("every week has 7 cells", () => {
    for (const m of [1, 2, 3, 8, 10, 12]) for (const w of monthGrid(2026, m)) expect(w).toHaveLength(7);
  });
});

describe("addMonths", () => {
  it("moves across year boundaries", () => {
    expect(addMonths("2026-10", 1)).toBe("2026-11");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });
});

describe("presaleCalendar", () => {
  const movie = (id: string, cinema: CinemaId, opening: string, dates: string[], presale = true): Movie => ({
    id, title: id, poster: "", synopsis: "", director: "", cast: [], rating: 0, runtime: 0, presale, opening,
    showtimes: dates.map((date) => ({ cinema, date, formats: ["2D"], audio: "SUB", times: ["20:00"] })),
  });
  const movies = [
    movie("B", "galerias", "2026-10-25", ["2026-10-24"]),
    movie("A", "citymall", "2026-10-23", ["2026-10-22", "2026-10-23"]),
    movie("Regular", "citymall", "2026-10-01", ["2026-10-22"], false),
    movie("Past", "citymall", "2026-10-10", ["2026-10-12"]),
  ];
  const keys = (m: Map<string, Movie[]>) => [...m.keys()];

  it("lists each screening and opening day, in order, with only pre-sale movies", () => {
    const days = presaleCalendar(movies, "2026-10-19", { cinema: "all" });
    expect(keys(days)).toEqual(["2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
    expect(days.get("2026-10-22")!.map((m) => m.id)).toEqual(["A"]);
    expect(days.get("2026-10-25")!.map((m) => m.id)).toEqual(["B"]); // opening day with no session
  });
  it("drops days before today", () => {
    expect(keys(presaleCalendar(movies, "2026-10-19", { cinema: "all" }))).toEqual(["2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
    expect(keys(presaleCalendar(movies, "2026-10-24", { cinema: "all" }))).toEqual(["2026-10-24", "2026-10-25"]);
  });
  it("respects the cinema filter, including a movie's opening day", () => {
    const days = presaleCalendar(movies, "2026-10-19", { cinema: "galerias" });
    expect(keys(days)).toEqual(["2026-10-24", "2026-10-25"]);
  });
  it("sorts a day's movies by title and never repeats one", () => {
    const two = [movie("Zeta", "citymall", "2026-10-23", ["2026-10-23"]), movie("Alfa", "galerias", "2026-10-23", ["2026-10-23", "2026-10-23"])];
    expect(presaleCalendar(two, "2026-10-19", { cinema: "all" }).get("2026-10-23")!.map((m) => m.id)).toEqual(["Alfa", "Zeta"]);
  });
  it("is empty when nothing is a pre-sale (no invented days)", () => {
    expect(presaleCalendar([movie("R", "citymall", "2026-10-01", ["2026-10-22"], false)], "2026-10-19", { cinema: "all" }).size).toBe(0);
    expect(presaleCalendar([], "2026-10-19", { cinema: "all" }).size).toBe(0);
  });
});
