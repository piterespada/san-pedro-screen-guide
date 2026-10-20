import { describe, expect, it } from "vitest";
import { inScheduleRange, scheduleDates } from "@/lib/movies";

describe("horarios de hoy hasta cinco días en el futuro", () => {
  it("incluye hoy y exactamente los próximos cinco días", () => {
    expect(scheduleDates("2026-10-20")).toEqual([
      "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25",
    ]);
    expect(inScheduleRange("2026-10-20", "2026-10-20")).toBe(true);
    expect(inScheduleRange("2026-10-25", "2026-10-20")).toBe(true);
    expect(inScheduleRange("2026-10-19", "2026-10-20")).toBe(false);
    expect(inScheduleRange("2026-10-26", "2026-10-20")).toBe(false);
  });
  it("mantiene el rango al cambiar de mes y de año", () => {
    expect(scheduleDates("2026-12-29")).toEqual([
      "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03",
    ]);
  });
});