import { load } from "cheerio/slim";
import { parseBillboard } from "./cinemark";
import { sameMovie, titleKey } from "./titles";
import { CINEMAS, group, todayHN, type Audio, type CinemaId, type Format, type Listing, type Movie } from "./movies";

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
      return { title: c.title, poster: c.poster, synopsis: d.sinopsis, runtime: d.duracion, showtimes: group("megamall", rows) };
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
    const rows = m.find("input[data-show-time]").filter((_, i) => $(i).attr("data-show-date") === date).map((_, i) => {
      const f = $(i).attr("data-format") ?? "";
      return { date, formats: [fmt(f)], audio: (/sub/i.test(f) ? "SUB" : "DOB") as Audio, time: $(i).attr("data-show-time")! };
    }).get();
    const runtime = Number(m.find(".movie-projection__inner--meta").text().match(/(\d+)\s*Min/i)?.[1]) || undefined;
    return { title: m.find("h2").first().text().trim(), poster: m.find("img").attr("src") ?? "", runtime, showtimes: group("altara", rows) };
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

/** Merge per-cinema results into one Movie per title, grouping near-identical titles. */
export function merge(parts: Partial[]): Movie[] {
  const out: (Movie & { names: string[] })[] = [];
  for (const p of parts) {
    let m = out.find((x) => x.names.some((n) => sameMovie(n, p.title)));
    if (!m) out.push((m = { id: titleKey(p.title), title: p.title, names: [], poster: "", synopsis: "", director: "", cast: [], rating: 0, runtime: 0, showtimes: [], presale: true }));
    m.names.push(p.title);
    if (p.title.length > m.title.length) m.title = p.title;
    // Cinema posters win; the first real one found is kept (TMDb fills in later when none exists).
    if (p.poster && (!m.poster || m.poster.includes("placehold.co"))) m.poster = p.poster;
    m.synopsis ||= p.synopsis ?? "";
    m.runtime ||= p.runtime ?? 0;
    if (!m.director) m.director = p.director ?? "";
    if (!m.cast.length) m.cast = p.cast ?? [];
    m.certification ||= p.certification;
    m.trailer ||= p.trailer;
    // A movie only counts as pre-sale when every cinema lists it that way.
    m.presale = !!m.presale && !!p.presale;
    m.showtimes.push(...p.showtimes);
  }
  return out.map(({ names: _n, ...m }) => m).sort((a, b) => a.title.localeCompare(b.title));
}
