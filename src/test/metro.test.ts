import { describe, expect, it } from "vitest";
import { metroCards, metroListing, metroRows } from "@/lib/metro";

// Reduced, verified official response captured 2026-10-20. Not served as app data.
const html = `<div id="v2MovieGrid">
<div class="v2-mcard" data-cod="5308"><img class="v2-mpbg" src="https://www.metrocinemas.hn/images/posters/100_5308.jpg"><div class="v2-ribbon">Pre-Venta</div><div class="v2-mc-title">CD CAT IN THE HAT</div></div>
<div class="v2-mcard" data-cod="5317"><div class="v2-ribbon">Pre-Venta</div><div class="v2-mc-title">Other branch</div></div>
<div class="v2-mcard" data-cod="5316"><div class="v2-mc-title">Regular</div></div>
</div><script>
const _compMap = {"5308":[501,510,509],"5317":[504],"5316":[509]};
const _dateMap = {"5308":["501|2026-11-08","510|2026-11-08","509|2026-11-08"],"5317":["504|2026-10-24"],"5316":["509|2026-10-19","509|2026-10-20","509|2026-10-25","509|2026-10-26","501|2026-10-21"]};
</script>`;
const sessions = [{ tecnologiaNombre: "VIP 2D", nombreComplejo: "Megamall", funciones: [
  { horaComienzoOriginal: "10:00", subtitulada: false, doblada: true },
] }];

describe("Megamall oficial", () => {
  it("excluye películas y fechas asociadas únicamente a otra sucursal", () => {
    const cards = metroCards(html, "2026-10-20");
    expect(cards.map((card) => card.id)).toEqual(["5308", "5316"]);
    expect(cards.find((card) => card.id === "5316")?.dates).toEqual(["2026-10-20", "2026-10-25"]);
    expect(() => metroRows([{ ...sessions[0], nombreComplejo: "Novacentro" }], "2026-11-08")).toThrow("wrong branch");
  });
  it("extrae Cat in the Hat como preventa real de Megamall sin limitar su estreno al rango diario", () => {
    const card = metroCards(html, "2026-10-20")[0];
    if (!card) throw new Error("Missing verified presale card");
    const listing = metroListing(card, metroRows(sessions, "2026-11-08"), { estreno: "08/11/2026", duracion: 91 });
    expect(listing?.title).toBe("CD CAT IN THE HAT");
    expect(listing?.presale).toBe(true);
    expect(listing?.opening).toBe("2026-11-08");
    expect(listing?.showtimes).toEqual([{ cinema: "megamall", date: "2026-11-08", formats: ["VIP", "2D"], audio: "DOB", seating: undefined, times: ["10:00"] }]);
  });
  it("no inventa horarios y falla cerrado si no puede verificar sucursales", () => {
    expect(() => metroCards("<div>Unavailable</div>", "2026-10-20")).toThrow("missing _compMap");
    const card = metroCards(html, "2026-10-20")[0];
    if (!card) throw new Error("Missing card");
    expect(metroListing(card, [], {})).toBeNull();
    expect(metroRows([{ tecnologiaNombre: "2D", funciones: [{ horaComienzoOriginal: "invalid" }] }], "2026-10-20")).toEqual([]);
  });
});