// Title normalization used to group the same movie listed under slightly different names.
const NOISE = /\b(4k|preventa|reestreno|aniversario|2d|3d|vip|dob|sub|doblada|subtitulada)\b/g;

// Re-release markers that cinemas attach to a title: "RE: Cars 1", "Cars 1 RE", "Cars 1 (RE)", "Re-estreno".
const RERUN_LEAD = /^\s*(?:\(\s*re\s*\)|re\s*[:\-–])\s*/i;
const RERUN_TAIL = /[\s:\-–(]+re\s*\)?\s*$/i;
const RERUN_WORD = /\b(?:re[\s-]?estreno|re[\s-]?release|rerun)\b/i;

// Season / event codes cinemas put before a title: "TS EL EXORCISTA" (Temporada Siniestra), "TN ..." (Temporada
// Navideña). They mark seasonal re-releases. Add more codes here as the cinemas introduce them.
const EVENT_PREFIXES = ["TS", "TN"];
const EVENT_LEAD = new RegExp(`^\\s*(?:${EVENT_PREFIXES.join("|")})\\b\\s*[:\\-–]?\\s*(?=\\S)`, "i");

/** True when the title carries a re-release or seasonal-event marker (RE, Re-estreno, TS, TN…). */
export const isRerun = (t: string) => RERUN_LEAD.test(t) || EVENT_LEAD.test(t) || RERUN_TAIL.test(t) || RERUN_WORD.test(t);

/** The title without re-release / event markers, keeping the original capitalization. */
export const cleanTitle = (t: string) => {
  let s = t.replace(RERUN_WORD, " ");
  for (let i = 0; i < 2; i++) s = s.replace(RERUN_LEAD, "").replace(EVENT_LEAD, ""); // "RE: TS X" or "TS RE: X"
  return s.replace(RERUN_TAIL, "").replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ").replace(/^[\s:\-–]+|[\s:\-–(]+$/g, "").trim();
};

const flat = (t: string) =>
  cleanTitle(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\.{2,}|…/g, "").replace(NOISE, " ");
const alnum = (t: string) => t.replace(/[^a-z0-9]/g, "").replace(/1$/, "");

/** Full normalized key ("Verity: La sombra…" -> "veritylasombra…"). */
export const titleKey = (t: string) => alnum(flat(t));
/** Base title before a subtitle separator ("Verity: La sombra…" -> "verity"). */
export const baseKey = (t: string) => alnum(flat(t).split(/:| - |\(/)[0]!);

/** Normalized words ("Vertigo 2 peso muerto" -> [vertigo, 2, peso, muerto]); a trailing "1" is dropped like in titleKey. */
const tokens = (t: string) => {
  const w = flat(t).split(/[^a-z0-9]+/).filter(Boolean);
  if (w.length > 1 && w[w.length - 1] === "1") w.pop();
  return w;
};

// Words that make an extra tail a different movie (a sequel or part), not a subtitle.
const SEQUEL = /^(?:\d+|ii|iii|iv|v|vi|vii|viii|ix|x|uno|dos|tres|cuatro|cinco|two|three|four|five|part|parte|chapter|capitulo)$/;

/** `b` is `a` followed by a subtitle with no separator ("Vertigo 2" -> "Vertigo 2 peso muerto"). */
const withSubtitle = (a: string[], b: string[]) =>
  a.length >= 2 && b.length > a.length && a.every((w, i) => w === b[i]) && !b.slice(a.length).some((w) => SEQUEL.test(w));

/** Runtimes that differ by more than this many minutes are different movies, even with similar titles. */
const MAX_RUNTIME_GAP = 15;

/**
 * Same movie when the normalized titles match (re-release markers, case, accents and 4K/2D/DOB noise
 * are ignored), when they share a base title and one of them is just that base
 * ("Verity" vs "Verity: La sombra de un engaño"), or when one is the other plus a subtitle that
 * is not a sequel marker ("Vertigo 2" vs "Vertigo 2 peso muerto").
 * "Avengers Endgame" vs "Avengers: Doomsday", and "Cars" vs "Cars 2", stay separate.
 *
 * `minutesApart` (when both cinemas report a runtime) vetoes the looser matches: a similar title
 * with a very different length is another movie.
 */
export function sameMovie(a: string, b: string, minutesApart?: number) {
  const [ka, kb, ba, bb] = [titleKey(a), titleKey(b), baseKey(a), baseKey(b)];
  if (ka === kb) return true;
  if (minutesApart !== undefined && minutesApart > MAX_RUNTIME_GAP) return false;
  if (ba === bb && ba.length >= 3 && (ka === ba || kb === bb)) return true;
  const [ta, tb] = [tokens(a), tokens(b)];
  return withSubtitle(ta, tb) || withSubtitle(tb, ta);
}

const shouting = (t: string) => t === t.toUpperCase() && t !== t.toLowerCase();

/** Best name to show for a movie listed under several: no re-release marker, not ALL CAPS, the most complete. */
export function pickTitle(names: string[]) {
  const clean = names.map(cleanTitle).filter(Boolean);
  return clean.sort((a, b) => Number(shouting(a)) - Number(shouting(b)) || b.length - a.length)[0] ?? names[0] ?? "";
}

// ---- Search terms for TMDb ----------------------------------------------------------------------------------------

// Format / language tags cinemas append to a title.
const FORMAT_TAGS = /\b(?:4dx|imax|3d|2d|dob|sub|doblada|subtitulada|4k|preventa|vip)\b/gi;
const YEAR_IN_PARENS = /\(\s*((?:19|20)\d{2})\s*\)/;
// Connecting words that stay lowercase in Title Case and never count as the main keyword.
const SMALL_WORDS = new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "y", "e", "en", "a", "the", "an", "of", "and", "in", "on", "at", "to", "for"]);

const titleCase = (t: string) =>
  t.toLowerCase().split(" ").map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");

/**
 * The cinema's title reduced to what TMDb should search for: no season/event prefix (TS, TN), no re-release
 * marker (RE, Re-estreno), no format or language tag (3D, 2D, 4DX, IMAX, DOB, SUB…), no "(year)", no special
 * characters and no trailing "1". ALL CAPS titles come out in Title Case.
 *   "TS EL EXORCISTA" -> "El Exorcista"    "SHREK 1 RE" / "Shrek 1 (Re-estreno)" -> "Shrek"
 */
export function searchTitle(raw: string) {
  const s = cleanTitle(raw.replace(YEAR_IN_PARENS, " ").replace(FORMAT_TAGS, " "))
    .replace(/(?<=\p{L})\.(?=\p{L})/gu, "") // S.W.A.T. -> SWAT.
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ").trim()
    .replace(/\s1$/, "");
  return shouting(s) ? titleCase(s) : s;
}

const BARE_YEAR = /^(.*\S)\s+((?:19|20)\d{2})$/;
/** Splits a trailing release year off a sanitized title: "Your Name 2016" -> Your Name + 2016. Years in the future stay part of the title ("Blade Runner 2049"). */
const splitYear = (t: string): { base: string; year?: string } => {
  const m = t.match(BARE_YEAR);
  return m && Number(m[2]) <= new Date().getFullYear() + 1 ? { base: m[1]!, year: m[2]! } : { base: t };
};

/** The release year the cinema's title carries: "Cars (2006)" or "Your Name 2016". */
export const titleYear = (raw: string): string | undefined =>
  raw.match(YEAR_IN_PARENS)?.[1] ?? splitYear(searchTitle(raw)).year;

export type SearchAttempt = {
  query: string;
  /** Sent to TMDb as primary_release_year when the cinema title carries a year. */
  year?: string | undefined;
  /** Fallback guess: the caller must confirm the TMDb hit (e.g. by runtime) before linking it. */
  loose: boolean;
};

/**
 * Ordered TMDb searches for a cinema title, stopping at the first that yields an acceptable hit:
 * 1. the exact sanitized title, forced to the release year when the title has one ("Your Name 2016");
 * 2. the full title without the year filter (the number may be part of the name: "Fantasia 2000");
 * 3. the part before a subtitle separator ("Avengers: Doomsday" -> "Avengers");
 * 4. the first main keyword. Attempts 3 and 4 are `loose`, so a vague hit is never linked blindly.
 */
export function searchAttempts(raw: string): SearchAttempt[] {
  const year = titleYear(raw);
  const out: SearchAttempt[] = [];
  const add = (query: string, y: string | undefined, loose: boolean) => {
    const dup = out.some((a) => a.query.toLowerCase() === query.toLowerCase() && a.year === y);
    if (query.length >= 2 && !dup) out.push({ query, year: y, loose });
  };
  const full = searchTitle(raw);
  const base = splitYear(full).base;
  if (year) add(YEAR_IN_PARENS.test(raw) ? full : base, year, false);
  add(full, undefined, false);
  add(splitYear(searchTitle(cleanTitle(raw).split(/\s*(?::|\s[-–]\s)\s*/)[0] ?? "")).base, year, true);
  const keyword = base.split(" ").find((w) => w.length >= 4 && !SMALL_WORDS.has(w.toLowerCase()));
  if (keyword) add(keyword, year, true);
  return out;
}

// ---- Choosing the right TMDb result -------------------------------------------------------------------------------

/** Words of a title without accents, case or punctuation (same normalization used for grouping). */
const words = (t: string) => tokens(t);
const digits = (w: string[]) => w.filter((x) => /^\d+$/.test(x)).join(",");

function edit(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length]!;
}

/** Fuzzy matching is only trusted for titles at least this long (letters/digits); shorter ones must match exactly. */
const MIN_FUZZY = 8;
const FUZZY_RATIO = 0.88;

/** How well a TMDb name matches what the cinema asked for: 3 exact, 2 typographically very close, 1 same words plus a subtitle, 0 no. */
function score(query: string, name: unknown): number {
  if (typeof name !== "string" || !name.trim()) return 0;
  const [q, n] = [words(query), words(name)];
  const [kq, kn] = [q.join(""), n.join("")];
  if (!kq || !kn) return 0;
  if (kq === kn) return 3;
  if (digits(q) !== digits(n)) return 0; // another number = another movie (Cars vs Cars 2)
  if (Math.min(kq.length, kn.length) >= MIN_FUZZY && 1 - edit(kq, kn) / Math.max(kq.length, kn.length) >= FUZZY_RATIO) return 2;
  // "Plumas" -> "Plumas: Operación rescate" style tails, never for short titles and never a sequel marker.
  if (q.length >= 3 && n.length > q.length && q.every((w, i) => w === n[i]) && !n.slice(q.length).some((w) => SEQUEL.test(w))) return 1;
  return 0;
}

const yearOf = (r: any) => Number(String(r?.release_date ?? "").slice(0, 4)) || 0;

/**
 * Picks the TMDb search result for `query` instead of trusting the first one: the result whose `title` or
 * `original_title` is exactly the query (or typographically almost the same) wins; a title that merely CONTAINS
 * the query ("Call Me by Your Name" for "Your Name") is never accepted. Ties go to the release year the
 * cinema gave (±1), then to TMDb's own order. `undefined` means "none of these is that movie".
 */
export function pickHit(query: string, results: unknown, year?: string): any {
  const list: any[] = Array.isArray(results) ? results : [];
  const want = Number(year) || 0;
  let best: any;
  let bestScore = 0;
  for (const r of list) {
    const base = Math.max(score(query, r?.title), score(query, r?.original_title));
    if (!base) continue;
    const gap = want && yearOf(r) ? Math.abs(yearOf(r) - want) : 0;
    if (want && gap > 1) continue; // a different year is a different movie (remake, namesake)
    const s = base * 10 + (want && yearOf(r) ? 5 - Math.min(gap, 5) : 0);
    if (s > bestScore) { best = r; bestScore = s; }
  }
  return best;
}

/** For loose (keyword) searches: the result must start with the searched words or be the cinema's movie. */
export function pickLoose(query: string, raw: string, results: unknown): any {
  const q = words(query);
  return (Array.isArray(results) ? results : []).find((r: any) =>
    [r?.title, r?.original_title].some((n) => typeof n === "string" && (words(n).slice(0, q.length).join(" ") === q.join(" ") || sameMovie(raw, n))));
}
