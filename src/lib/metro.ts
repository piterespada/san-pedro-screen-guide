import { load } from "cheerio/slim";
import { group, inScheduleRange, type Audio, type Format, type Listing, type SessionRow } from "./movies";
import { isRerun } from "./titles";

export const MEGAMALL = 509;
export const METRO = "https://www.metrocinemas.hn";
export type MetroCard = { id: string; title: string; poster: string; presale: boolean; dates: string[] };
type Json = Record<string, unknown>;
const object = (value: unknown): Json | null => value && typeof value === "object" && !Array.isArray(value) ? value as Json : null;
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";

/** Read only JSON literals, never evaluate the site's JavaScript. Missing branch maps fail closed. */
export function metroCards(html: string, today: string): MetroCard[] {
  const readMap = (name: string): Json => {
    const raw = html.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\{[^\\n]*?\\});`))?.[1];
    if (!raw) throw new Error(`Metrocinemas: missing ${name}`);
    const result = object(JSON.parse(raw));
    if (!result) throw new Error(`Metrocinemas: invalid ${name}`);
    return result;
  };
  const branches = readMap("_compMap");
  const dates = readMap("_dateMap");
  const $ = load(html);
  return $("#v2MovieGrid .v2-mcard").toArray().flatMap((el) => {
    const card = $(el);
    const id = card.attr("data-cod") ?? "";
    const title = card.find(".v2-mc-title").text().trim();
    if (!/^\d+$/.test(id) || !title || !array(branches[id]).some((code) => String(code) === String(MEGAMALL))) return [];
    const presale = /pre[\s-]?venta/i.test(card.find(".v2-ribbon").text());
    const mine = array(dates[id]).flatMap((slot) => {
      const [branch, date] = text(slot).split("|");
      return branch === String(MEGAMALL) && date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today && (presale || inScheduleRange(date, today)) ? [date] : [];
    });
    if (!mine.length) return [];
    const src = card.find("img.v2-mpbg").attr("src");
    let poster = "";
    try { if (src) poster = new URL(src, METRO).toString(); } catch { /* no usable poster */ }
    return [{ id, title, poster, presale, dates: [...new Set(mine)].sort() }];
  });
}

/** Only the branch-scoped endpoint supplies times; reject an explicitly different branch. */
export function metroRows(json: unknown, date: string): SessionRow[] {
  if (!Array.isArray(json)) throw new Error("Metrocinemas: invalid sessions");
  return json.flatMap((raw) => {
    const technology = object(raw);
    if (!technology) return [];
    const branch = text(technology.nombreComplejo);
    if (branch && branch.toLowerCase() !== "megamall") throw new Error("Metrocinemas: wrong branch");
    const name = text(technology.tecnologiaNombre);
    const formats: Format[] = [];
    if (/\bVIP\b/i.test(name)) formats.push("VIP");
    if (/\b2D\b/i.test(name)) formats.push("2D");
    if (/\b3D\b/i.test(name)) formats.push("3D");
    return array(technology.funciones).flatMap((rawSession) => {
      const session = object(rawSession);
      if (!session) return [];
      const time = text(session.horaComienzoOriginal).slice(0, 5);
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return [];
      const audio: Audio | undefined = session.subtitulada === true ? "SUB" : session.doblada === true ? "DOB" : undefined;
      return [{ date, formats, audio, time }];
    });
  });
}

export function metroListing(card: MetroCard, rows: SessionRow[], detail: unknown): Listing | null {
  if (!rows.length) return null;
  const d = object(detail) ?? {};
  const release = text(d.estreno);
  const local = release.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const opening = local ? `${local[3]}-${local[2]}-${local[1]}` : /^\d{4}-\d{2}-\d{2}/.test(release) ? release.slice(0, 10) : undefined;
  return { title: card.title, poster: card.poster, presale: card.presale, opening,
    synopsis: text(d.sinopsis), runtime: Number(d.duracion) || undefined,
    certification: text(d.clasificacion) || undefined, rerun: isRerun(card.title), showtimes: group("megamall", rows) };
}