import { describe, expect, it } from "vitest";
import { cleanTitle, isRerun, pickTitle, sameMovie, searchAttempts, searchTitle } from "@/lib/titles";

describe("sameMovie", () => {
  it("groups a title with its subtitled version", () => {
    expect(sameMovie("Verity", "Verity: La sombra de un engaño")).toBe(true);
  });
  it("ignores case, accents and re-release prefixes", () => {
    expect(sameMovie("PLUMAS: OPERACION RESCATE", "Plumas: Operación rescate")).toBe(true);
    expect(sameMovie("RE: Cars 1", "CARS")).toBe(true);
  });
  it("keeps different movies of the same franchise apart", () => {
    expect(sameMovie("AVENGERS ENDGAME", "AVENGERS: DOOMSDAY")).toBe(false);
  });

  it("groups re-release markers at the end or start", () => {
    expect(sameMovie("Avengers Endgame RE", "AVENGERS ENDGAME")).toBe(true);
    expect(sameMovie("Cars 1 RE", "RE: Cars 1")).toBe(true);
    expect(sameMovie("Cars 1 (RE)", "Cars 1")).toBe(true);
    expect(sameMovie("Avengers Endgame - Reestreno", "Avengers Endgame")).toBe(true);
  });
  it("groups a subtitle written without a separator", () => {
    expect(sameMovie("VERTIGO 2", "Vertigo 2 peso muerto")).toBe(true);
  });
  it("does not treat a sequel as a subtitle", () => {
    expect(sameMovie("Cars", "Cars 2")).toBe(false);
    expect(sameMovie("Cars 2", "Cars 3")).toBe(false);
    expect(sameMovie("Toy Story", "Toy Story 2")).toBe(false);
    expect(sameMovie("Kung Fu Panda", "Kung Fu Panda 4")).toBe(false);
    expect(sameMovie("Dune", "Dune Part Two")).toBe(false);
  });
  it("does not merge titles that only end in the letters 're'", () => {
    expect(sameMovie("Cure", "Cu")).toBe(false);
    expect(isRerun("Cure")).toBe(false);
    expect(isRerun("Pre")).toBe(false);
  });
  it("uses the runtime to veto looser matches, never exact ones", () => {
    expect(sameMovie("Spider Man", "Spider Man: Across the Spider Verse")).toBe(true);
    expect(sameMovie("Spider Man", "Spider Man: Across the Spider Verse", 19)).toBe(false);
    expect(sameMovie("Spider Man", "Spider Man: Across the Spider Verse", 2)).toBe(true);
    expect(sameMovie("Cars 1 RE", "RE: Cars 1", 60)).toBe(true);
  });
});

describe("isRerun / cleanTitle", () => {
  it("detects the markers cinemas use", () => {
    for (const t of ["RE: Cars 1", "Cars 1 RE", "Cars 1 (RE)", "(RE) Cars 1", "Avengers Endgame - Reestreno", "Cars 1 Re-release"]) expect(isRerun(t)).toBe(true);
    for (const t of ["Cars", "AVENGERS ENDGAME", "Vertigo 2 peso muerto"]) expect(isRerun(t)).toBe(false);
  });
  it("strips them and keeps the capitalization", () => {
    expect(cleanTitle("Avengers Endgame RE")).toBe("Avengers Endgame");
    expect(cleanTitle("RE: Cars 1")).toBe("Cars 1");
    expect(cleanTitle("Cars 1 (RE)")).toBe("Cars 1");
    expect(cleanTitle("Avengers Endgame - Reestreno")).toBe("Avengers Endgame");
  });
});

describe("pickTitle", () => {
  it("prefers the clean, non-shouting, most complete name", () => {
    expect(pickTitle(["AVENGERS ENDGAME", "Avengers Endgame RE"])).toBe("Avengers Endgame");
    expect(pickTitle(["VERTIGO 2", "Vertigo 2 peso muerto"])).toBe("Vertigo 2 peso muerto");
    expect(pickTitle(["RE: Cars 1", "Cars 1 RE"])).toBe("Cars 1");
  });
  it("keeps ALL CAPS when it is the only name", () => {
    expect(pickTitle(["VERTIGO 2"])).toBe("VERTIGO 2");
  });
});

describe("searchTitle (what TMDb is asked for)", () => {
  it("cleans the examples: season prefix, re-release marker and tags", () => {
    expect(searchTitle("TS EL EXORCISTA")).toBe("El Exorcista");
    expect(searchTitle("SHREK 1 RE")).toBe("Shrek");
    expect(searchTitle("Shrek 1 (Re-estreno)")).toBe("Shrek");
  });
  it("removes the other season prefix and re-release spellings", () => {
    expect(searchTitle("TN HOME ALONE")).toBe("Home Alone");
    expect(searchTitle("Shrek 1 Reestreno")).toBe("Shrek");
    expect(searchTitle("Shrek 1 Re-estreno")).toBe("Shrek");
    expect(searchTitle("RE: Cars 1")).toBe("Cars");
  });
  it("removes format and language tags", () => {
    expect(searchTitle("Avengers: Endgame 3D DOB")).toBe("Avengers Endgame");
    expect(searchTitle("Dune IMAX SUB")).toBe("Dune");
    expect(searchTitle("Spider-Man 4DX DOBLADA")).toBe("Spider Man");
    expect(searchTitle("Toy Story 2D SUBTITULADA")).toBe("Toy Story");
    expect(searchTitle("SHREK 1 RE 3D")).toBe("Shrek");
  });
  it("removes special characters and the year in parentheses", () => {
    expect(searchTitle("Plumas: Operación de rescate!")).toBe("Plumas Operación de rescate");
    expect(searchTitle("Cars (2006)")).toBe("Cars");
    expect(searchTitle("S.W.A.T. 2D")).toBe("Swat");
  });
  it("leaves real titles alone", () => {
    expect(searchTitle("Cars 2")).toBe("Cars 2");
    expect(searchTitle("Blade Runner 2049")).toBe("Blade Runner 2049");
    expect(searchTitle("Apollo 11")).toBe("Apollo 11");
    expect(searchTitle("TSUNAMI")).toBe("Tsunami");
    expect(searchTitle("Ocean's 11")).toBe("Ocean's 11");
    expect(searchTitle("Vertigo 2 peso muerto")).toBe("Vertigo 2 peso muerto");
  });
});

describe("season prefixes (TS, TN)", () => {
  it("count as re-release markers", () => {
    expect(isRerun("TS EL EXORCISTA")).toBe(true);
    expect(isRerun("TN Mi pobre angelito")).toBe(true);
    expect(isRerun("TS: Pesadilla")).toBe(true);
    expect(isRerun("Shrek 1 (Re-estreno)")).toBe(true);
    expect(isRerun("TSUNAMI")).toBe(false);
    expect(isRerun("El Exorcista")).toBe(false);
  });
  it("are stripped from the displayed name and ignored when grouping", () => {
    expect(cleanTitle("TS EL EXORCISTA")).toBe("EL EXORCISTA");
    expect(cleanTitle("Shrek 1 (Re-estreno)")).toBe("Shrek 1");
    expect(sameMovie("TS EL EXORCISTA", "El Exorcista")).toBe(true);
    expect(sameMovie("SHREK 1 RE", "Shrek 1 (Re-estreno)")).toBe(true);
  });
});

describe("searchAttempts", () => {
  it("starts with the exact sanitized title", () => {
    expect(searchAttempts("TS EL EXORCISTA")[0]).toEqual({ query: "El Exorcista", loose: false });
  });
  it("adds the original year when the title has one", () => {
    const a = searchAttempts("Cars (2006)");
    expect(a[0]).toEqual({ query: "Cars", loose: false });
    expect(a[1]).toEqual({ query: "Cars", year: "2006", loose: false });
  });
  it("falls back to the subtitle head and the main keyword, both marked loose", () => {
    const a = searchAttempts("Avengers: Doomsday");
    expect(a.map((x) => x.query)).toEqual(["Avengers Doomsday", "Avengers"]);
    expect(a[1]!.loose).toBe(true);
    const b = searchAttempts("La Caída de la Ballena");
    expect(b.map((x) => x.query)).toEqual(["La Caída de la Ballena", "Caída"]);
    expect(b[1]!.loose).toBe(true);
  });
  it("makes no duplicate or useless attempts", () => {
    expect(searchAttempts("Shrek").map((x) => x.query)).toEqual(["Shrek"]);
    expect(searchAttempts("Up").map((x) => x.query)).toEqual(["Up"]);
    expect(searchAttempts("3D 2D")).toEqual([]);
  });
});
