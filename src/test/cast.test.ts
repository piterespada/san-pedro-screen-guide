import { describe, expect, it } from "vitest";
import { topCast } from "@/lib/cast";

// Same shape as TMDb's /movie/{id}/credits (values invented for the test).
const person = (order: number, name: string, character: string, profile_path: string | null) => ({ id: order, name, character, profile_path, order });

describe("topCast", () => {
  const credits = {
    cast: [
      person(1, "Second Star", "Sidekick", "/b.jpg"),
      person(0, "First Star", "Hero", "/a.jpg"),
      person(2, "No Photo", "Villain", null),
      person(3, "No Role", "", "/d.jpg"),
    ],
  };

  it("returns real name, character and photo, in billing order", () => {
    const [a, b] = topCast(credits);
    expect(a).toEqual({ name: "First Star", character: "Hero", photo: "https://image.tmdb.org/t/p/w185/a.jpg" });
    expect(b).toEqual({ name: "Second Star", character: "Sidekick", photo: "https://image.tmdb.org/t/p/w185/b.jpg" });
  });
  it("leaves the photo undefined when TMDb has none (the UI shows an avatar)", () => {
    expect(topCast(credits)[2]).toEqual({ name: "No Photo", character: "Villain" });
    expect(topCast(credits)[2]!.photo).toBeUndefined();
  });
  it("leaves the character undefined when TMDb has none", () => {
    expect(topCast(credits)[3]!.character).toBeUndefined();
  });
  it("keeps only the first `limit` actors (12 by default)", () => {
    const many = { cast: Array.from({ length: 30 }, (_, i) => person(i, `Actor ${i}`, `Role ${i}`, "/x.jpg")) };
    expect(topCast(many)).toHaveLength(12);
    expect(topCast(many, 5)).toHaveLength(5);
    expect(topCast(many, 5)[4]!.name).toBe("Actor 4");
  });
  it("skips uncredited roles and repeated names", () => {
    const out = topCast({ cast: [person(0, "Star", "Hero", null), person(1, "Star", "Hero (young)", null), person(2, "Extra", "Passerby (uncredited)", null)] });
    expect(out.map((c) => c.name)).toEqual(["Star"]);
  });
  it("trims names and ignores entries without one", () => {
    const out = topCast({ cast: [person(0, "  Padded Name ", " Role ", null), { order: 1, character: "Nameless" }, null, "x", 7] });
    expect(out).toEqual([{ name: "Padded Name", character: "Role" }]);
  });
  it("returns nothing for a missing or malformed response (no invented actors)", () => {
    for (const bad of [null, undefined, {}, "nope", 3, { cast: "nope" }, { cast: [] }]) expect(topCast(bad)).toEqual([]);
  });
  it("ignores a profile path that is not a path", () => {
    expect(topCast({ cast: [person(0, "Odd", "Role", "javascript:alert(1)")] })[0]!.photo).toBeUndefined();
  });
});
