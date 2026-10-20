// Title normalization used to group the same movie listed under slightly different names.
const NOISE = /\b(4k|preventa|reestreno|aniversario|2d|3d|vip|dob|sub|doblada|subtitulada)\b/g;

// Re-release markers that cinemas attach to a title: "RE: Cars 1", "Cars 1 RE", "Cars 1 (RE)", "Reestreno".
const RERUN_LEAD = /^\s*(?:\(\s*re\s*\)|re\s*[:\-–])\s*/i;
const RERUN_TAIL = /[\s:\-–(]+re\s*\)?\s*$/i;
const RERUN_WORD = /\b(?:re-?estreno|re-?release|rerun)\b/i;

/** True when the title carries a re-release marker. */
export const isRerun = (t: string) => RERUN_LEAD.test(t) || RERUN_TAIL.test(t) || RERUN_WORD.test(t);

/** The title without re-release markers, keeping the original capitalization. */
export const cleanTitle = (t: string) =>
  t.replace(RERUN_WORD, " ").replace(RERUN_LEAD, "").replace(RERUN_TAIL, "")
    .replace(/\s+/g, " ").replace(/^[\s:\-–]+|[\s:\-–(]+$/g, "").trim();

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
