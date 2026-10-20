import { describe, expect, it } from "vitest";
import { merge } from "@/lib/merge";
import { isRerun } from "@/lib/titles";
import type { CinemaId, Listing } from "@/lib/movies";

// What each cinema reports for the same film, under the names it uses.
const listing = (cinema: CinemaId, title: string, runtime?: number, extra: Partial<Listing> = {}): Listing => ({
  title, runtime, rerun: isRerun(title),
  showtimes: [{ cinema, date: "2026-10-19", formats: ["2D"], audio: "SUB", times: ["20:00"] }],
  ...extra,
});

describe("merge", () => {
  it("joins Avengers Endgame under one card, marked as a re-release", () => {
    const out = merge([
      listing("megamall", "AVENGERS ENDGAME", 181),
      listing("citymall", "Avengers Endgame RE", 181),
      listing("galerias", "Avengers Endgame RE", 181),
      listing("altara", "RE: Avengers Endgame", 181),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.title).toBe("Avengers Endgame");
    expect(out[0]!.rerun).toBe(true);
    expect(out[0]!.showtimes.map((s) => s.cinema)).toEqual(["megamall", "citymall", "galerias", "altara"]);
  });

  it("joins Cars written as 'Cars 1 RE' and 'RE: Cars 1'", () => {
    const out = merge([listing("citymall", "Cars 1 RE", 117), listing("altara", "RE: Cars 1", 117), listing("megamall", "RE: Cars 1", 117)]);
    expect(out).toHaveLength(1);
    expect(out[0]!.title).toBe("Cars 1");
    expect(out[0]!.showtimes).toHaveLength(3);
  });

  it("joins Vertigo 2 with its subtitle and shows the full name", () => {
    const out = merge([listing("megamall", "VERTIGO 2", 100), listing("citymall", "Vertigo 2 peso muerto", 100)]);
    expect(out).toHaveLength(1);
    expect(out[0]!.title).toBe("Vertigo 2 peso muerto");
    expect(out[0]!.rerun).toBe(false);
  });

  it("is order independent", () => {
    const a = merge([listing("megamall", "VERTIGO 2"), listing("citymall", "Vertigo 2 peso muerto")]);
    const b = merge([listing("citymall", "Vertigo 2 peso muerto"), listing("megamall", "VERTIGO 2")]);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });

  it("keeps different movies apart", () => {
    const out = merge([
      listing("citymall", "Cars 1 RE", 117), listing("citymall", "Cars 2", 106),
      listing("megamall", "AVENGERS ENDGAME", 181), listing("megamall", "AVENGERS: DOOMSDAY", 150),
    ]);
    expect(out).toHaveLength(4);
  });

  it("keeps same-looking titles apart when the runtimes differ a lot", () => {
    const out = merge([listing("citymall", "Spider Man", 121), listing("megamall", "Spider Man: Across the Spider Verse", 140)]);
    expect(out).toHaveLength(2);
  });

  it("treats a regular-release listing as not pre-sale if any cinema says so", () => {
    const out = merge([listing("citymall", "Vertigo 2", 100, { presale: true }), listing("megamall", "VERTIGO 2", 100, { presale: false })]);
    expect(out[0]!.presale).toBe(false);
  });
});
