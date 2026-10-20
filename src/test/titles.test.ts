import { describe, expect, it } from "vitest";
import { cleanTitle, isRerun, pickTitle, sameMovie } from "@/lib/titles";

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
