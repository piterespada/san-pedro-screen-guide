import { describe, expect, it } from "vitest";
import { sameMovie } from "@/lib/titles";

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
});
