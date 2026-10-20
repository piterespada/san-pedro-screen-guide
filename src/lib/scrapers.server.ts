import { load } from "cheerio/slim";
import { parseBillboard } from "./cinemark";
import { isRerun } from "./titles";
import { CINEMAS, group, todayHN, type Audio, type CinemaId, type Format, type Listing } from "./movies";

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36" };
const TIMEOUT = 7000;
const METRO = "https://www.metrocinemas.hn";
const MEGAMALL = 509;

export type Partial = Listing;

export const today = todayHN;
const get = (url: string, headers: Record<string, string> = {}) => fetch(url, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(TIMEOUT) }).then((r) => {
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r;
});
const fmt = (s: string): Format => (/vip/i.test(s) ? "VIP" : /3d/i.test(s) ? "3D" : "2D");

/** Metrocinema: list page has every location; per-movie JSON endpoint filtered to Megamall (509). */
async function metro(): Promise<Partial[]> {
  const $ = load(await (await get(`${METRO}/cartelera/cartelera`)).text());
  const cards = $(".v2-mcard").map((_, el) => ({
    id: $(el).attr("data-cod")!,
    title: $(el).find(".v2-mc-title").text().trim(),
    poster: $(el).find("img.v2-mpbg").attr("src") ?? "",
  })).get().filter((c) => c.id && c.title);
  const date = today();
  const out = await Promise.all(cards.map(async (c) => {
    try {
      const fx: { tecnologiaNombre: string; funciones: { horaComienzoOriginal: string; subtitulada: boolean }[] }[] =
        await (await get(`${METRO}/Peliculas/GetCacheFuncionesComplejoPeliculaFecha?complejoId=${MEGAMALL}&codPelicula=${c.id}&fecha=${date}`)).json();
      const rows = fx.flatMap((t) => t.funciones.map((f) => ({ date, formats: [fmt(t.tecnologiaNombre)], audio: (f.subtitulada ? "SUB" : "DOB") as Audio, time: f.horaComienzoOriginal })));
      if (!rows.length) return null;
      const d = await get(`${METRO}/Peliculas/GetDetallePelicula?codPelicula=${c.id}`).then((r) => r.json()).catch(() => ({}));
      return { title: c.title, poster: c.poster, synopsis: d.sinopsis, runtime: d.duracion, rerun: isRerun(c.title), showtimes: group("megamall", rows) };
    } catch { return null; }
  }));
  return out.filter((x): x is NonNullable<typeof x> => !!x);
}

/** Cinépolis: showtimes are server-rendered as radio inputs with data-* attributes. */
async function cinepolis(url: string): Promise<Partial[]> {
  const $ = load(await (await get(url)).text());
  const date = today();
  return $(".movie-projection").map((_, el) => {
    const m = $(el);
    // Every date the page lists from today onwards (not just today).
    const rows = m.find("input[data-show-time]").map((_, i) => {
      const d = $(i).attr("data-show-date") ?? "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < date) return null;
      const f = $(i).attr("data-format") ?? "";
      return { date: d, formats: [fmt(f)], audio: (/sub/i.test(f) ? "SUB" : "DOB") as Audio, time: $(i).attr("data-show-time")! };
    }).get().filter((r): r is NonNullable<typeof r> => !!r);
    const runtime = Number(m.find(".movie-projection__inner--meta").text().match(/(\d+)\s*Min/i)?.[1]) || undefined;
    const title = m.find("h2").first().text().trim();
    return { title, poster: m.find("img").attr("src") ?? "", runtime, rerun: isRerun(title), showtimes: group("altara", rows) };
  }).get().filter((p) => p.title && p.showtimes.length);
}

/** Cinemark: official billboard API (all upcoming dates). Any failure throws, so the cinema is hidden. */
async function cinemark(cinema: CinemaId, url: string): Promise<Partial[]> {
  const json = await (await get(url, { Accept: "application/json" })).json();
  return parseBillboard(json, cinema, today());
}

export const SCRAPERS: Record<CinemaId, () => Promise<Partial[]>> = {
  citymall: () => cinemark("citymall", CINEMAS[0].url),
  galerias: () => cinemark("galerias", CINEMAS[1].url),
  altara: () => cinepolis(CINEMAS[2].url),
  megamall: metro,
};
