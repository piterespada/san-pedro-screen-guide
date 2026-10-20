import { group, type Audio, type CinemaId, type Format, type Listing, type SessionRow, type Seating } from "./movies";
import { isRerun, titleKey } from "./titles";

// Parser for Cinemark's official billboard API:
//   https://api.cinemarkca.com/api/vista/data/billboard?cinema_id=<id>
// Shape: [{ date, movies: [{ title, synopsis, trailer_url, graphic_url, runtime, rating, opening_date,
//   cast: [{ FirstName, LastName, PersonType }], movie_versions: [{ title, sessions: [{ day, hour, showtime }] }] }] }]
// Pure (no network) so it can be tested; the caller does the fetch.

type Json = Record<string, unknown>;
const obj = (v: unknown): Json | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Version titles embed the technology and audio: "Street Fighter (2D SUB XD DBOX -HN)".
 * Only the trailing parenthesis is read, so a movie called "XD" can't pollute the badges.
 * Audio is left undefined when the title says neither DOB nor SUB (nothing is guessed).
 * Seating: D-BOX when the title says so; "Tradicional" when it names no special seating;
 * unknown (undefined) for Premier, whose seats the title doesn't describe.
 */
export function parseVersion(title: string): { formats: Format[]; audio: Audio | undefined; seating: Seating | undefined } {
  const tag = title.match(/\(([^()]*)\)\s*$/)?.[1] ?? title;
  const has = (re: RegExp) => re.test(tag);
  const formats: Format[] = [];
  if (has(/\b2D\b/i)) formats.push("2D");
  if (has(/\b3D\b/i)) formats.push("3D");
  if (has(/\bXD\b/i)) formats.push("XD");
  if (has(/\bD-?BOX\b/i)) formats.push("D-BOX");
  if (has(/\bIV\b/i)) formats.push("IV");
  if (has(/\bPREMIERE?\b/i)) formats.push("PREMIER");
  const audio: Audio | undefined = has(/\b(DOB|DOBLADA)\b/i) ? "DOB" : has(/\b(SUB|SUBTITULADA)\b/i) ? "SUB" : undefined;
  const seating: Seating | undefined = formats.includes("D-BOX") ? "D-BOX" : formats.includes("PREMIER") ? undefined : "Tradicional";
  return { formats, audio, seating };
}

/** Accepts a YouTube URL (watch, embed, youtu.be) or a bare 11-char video id; anything else is dropped. */
export function youtubeUrl(raw: string): string | undefined {
  if (!raw) return undefined;
  if (/^[\w-]{11}$/.test(raw)) return `https://www.youtube.com/watch?v=${raw}`;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^(www|m)\./, "");
    if (host === "youtu.be") return u.toString();
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const embed = u.pathname.match(/^\/embed\/([\w-]{11})/)?.[1];
      return embed ? `https://www.youtube.com/watch?v=${embed}` : u.toString();
    }
  } catch { /* not a URL */ }
  return undefined;
}

// Titles that mark a pre-sale or a special event even when the opening date is not in the future.
const PRESALE = /\b(pre-?venta|avant[\s-]?premi[eè]re?|funci[oó]n especial|evento)\b/i;

type Meta = Omit<Listing, "showtimes">;

function metaOf(m: Json, title: string, today: string): Meta {
  const people = arr(m["cast"]).map(obj).filter((p): p is Json => !!p);
  const names = (type: string) => [...new Set(
    people.filter((p) => str(p["PersonType"]).toLowerCase() === type)
      .map((p) => [str(p["FirstName"]), str(p["LastName"])].filter(Boolean).join(" "))
      .filter(Boolean),
  )];
  const graphic = str(m["graphic_url"]);
  const opening = str(m["opening_date"]).slice(0, 10);
  return {
    title,
    poster: /^https?:\/\//.test(graphic) ? graphic : undefined, // empty -> TMDb supplies the poster later
    synopsis: str(m["synopsis"]) || undefined,
    runtime: Number(str(m["runtime"])) || undefined,
    director: names("director").join(", ") || undefined,
    cast: names("actor"),
    certification: str(m["rating"]) || undefined,
    trailer: youtubeUrl(str(m["trailer_url"])),
    opening: /^\d{4}-\d{2}-\d{2}$/.test(opening) ? opening : undefined,
    rerun: isRerun(title),
    presale: (/^\d{4}-\d{2}-\d{2}$/.test(opening) && opening > today) || PRESALE.test(title),
  };
}

/**
 * Turns the billboard JSON into one Listing per movie, with sessions grouped by date, cinema,
 * formats and audio. Throws on an unexpected response so the caller hides the cinema instead
 * of showing made-up data.
 */
export function parseBillboard(json: unknown, cinema: CinemaId, today: string): Listing[] {
  if (!Array.isArray(json)) throw new Error("billboard: unexpected response shape");
  const films = new Map<string, { meta: Meta; rows: SessionRow[] }>();

  for (const entry of json) {
    const day = obj(entry);
    if (!day) continue;
    const date = str(day["date"]).slice(0, 10);
    for (const raw of arr(day["movies"])) {
      const m = obj(raw);
      const title = m && str(m["title"]);
      if (!m || !title) continue;
      const key = str(m["corporate_film_id"]) || str(m["film_HO_code"]) || titleKey(title);
      const meta = metaOf(m, title, today);
      let film = films.get(key);
      if (!film) films.set(key, (film = { meta, rows: [] }));
      else { // later dates only fill what the first one lacked
        film.meta.poster ||= meta.poster;
        film.meta.synopsis ||= meta.synopsis;
        film.meta.runtime ||= meta.runtime;
        film.meta.director ||= meta.director;
        film.meta.certification ||= meta.certification;
        film.meta.trailer ||= meta.trailer;
        film.meta.opening ||= meta.opening;
        if (!film.meta.cast?.length) film.meta.cast = meta.cast;
      }

      for (const v of arr(m["movie_versions"])) {
        const version = obj(v);
        if (!version) continue;
        const { formats, audio, seating } = parseVersion(str(version["title"]));
        for (const s of arr(version["sessions"])) {
          const session = obj(s);
          if (!session) continue;
          const sessionDate = str(session["day"]).slice(0, 10) || str(session["showtime"]).slice(0, 10) || date;
          const time = str(session["hour"]).slice(0, 5) || str(session["showtime"]).slice(11, 16);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate) || sessionDate < today || !/^\d{2}:\d{2}$/.test(time)) continue;
          film.rows.push({ date: sessionDate, formats, audio, seating, time });
        }
      }
    }
  }

  return [...films.values()]
    .map(({ meta, rows }) => ({ ...meta, showtimes: group(cinema, rows) }))
    .filter((l) => l.showtimes.length > 0);
}
