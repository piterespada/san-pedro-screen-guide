import { load } from "cheerio/slim";
import { CINEMAS, type Audio, type CinemaId, type Format, type Movie } from "./movies";

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36" };
const TIMEOUT = 7000;
const METRO = "https://www.metrocinemas.hn";
const MEGAMALL = 509;

export type Partial = { title: string; poster?: string | undefined; synopsis?: string | undefined; runtime?: number | undefined; showtimes: Movie["showtimes"] };

export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Tegucigalpa" });
const get = (url: string) => fetch(url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT) }).then((r) => {
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r;
});
const fmt = (s: string): Format => (/vip/i.test(s) ? "VIP" : /3d/i.test(s) ? "3D" : "2D");

/** Group raw (format, audio, time) rows into Showtime entries. */
function group(cinema: CinemaId, rows: { format: Format; audio: Audio; time: string }[]) {
  const map = new Map<string, Movie["showtimes"][number]>();
  for (const r of rows) {
    const k = r.format + r.audio;
    if (!map.has(k)) map.set(k, { cinema, format: r.format, audio: r.audio, times: [] });
    map.get(k)!.times.push(r.time);
  }
  return [...map.values()].map((s) => ({ ...s, times: [...new Set(s.times)].sort() }));
}

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
      const rows = fx.flatMap((t) => t.funciones.map((f) => ({ format: fmt(t.tecnologiaNombre), audio: (f.subtitulada ? "SUB" : "DOB") as Audio, time: f.horaComienzoOriginal })));
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
      return { format: fmt(f), audio: (/sub/i.test(f) ? "SUB" : "DOB") as Audio, time: $(i).attr("data-show-time")! };
    }).get();
    const runtime = Number(m.find(".movie-projection__inner--meta").text().match(/(\d+)\s*Min/i)?.[1]) || undefined;
    return { title: m.find("h2").first().text().trim(), poster: m.find("img").attr("src") ?? "", runtime, showtimes: group("altara", rows) };
  }).get().filter((p) => p.title && p.showtimes.length);
}

/** Cinemark sits behind Cloudflare bot protection (HTTP 403); we try, and the caller falls back. */
async function cinemark(url: string): Promise<Partial[]> {
  await get(url);
  return [];
}

export const SCRAPERS: Record<CinemaId, () => Promise<Partial[]>> = {
  citymall: () => cinemark(CINEMAS[0].url),
  galerias: () => cinemark(CINEMAS[1].url),
  altara: () => cinepolis(CINEMAS[2].url),
  megamall: metro,
};

const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Merge per-cinema results into one Movie per title. */
export function merge(parts: Partial[]): Movie[] {
  const map = new Map<string, Movie>();
  for (const p of parts) {
    const k = norm(p.title);
    const m = map.get(k) ?? { id: k, title: p.title, poster: "", synopsis: "", director: "", cast: [], rating: 0, runtime: 0, showtimes: [] };
    m.poster ||= p.poster ?? "";
    m.synopsis ||= p.synopsis ?? "";
    m.runtime ||= p.runtime ?? 0;
    m.showtimes.push(...p.showtimes);
    map.set(k, m);
  }
  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
}
