// Title normalization used to group the same movie listed under slightly different names.
const NOISE = /\b(4k|preventa|reestreno|aniversario|2d|3d|vip|dob|sub|doblada|subtitulada)\b/g;

const flat = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/^re:\s*/, "").replace(/\.{2,}|…/g, "").replace(NOISE, " ");
const alnum = (t: string) => t.replace(/[^a-z0-9]/g, "").replace(/1$/, "");

/** Full normalized key ("Verity: La sombra…" -> "veritylasombra…"). */
export const titleKey = (t: string) => alnum(flat(t));
/** Base title before a subtitle separator ("Verity: La sombra…" -> "verity"). */
export const baseKey = (t: string) => alnum(flat(t).split(/:| - |\(/)[0]!);

/**
 * Same movie when the normalized titles match, or when they share a base title and one of
 * them is just that base ("Verity" vs "Verity: La sombra de un engaño").
 * "Avengers Endgame" vs "Avengers: Doomsday" stays separate.
 */
export function sameMovie(a: string, b: string) {
  const [ka, kb, ba, bb] = [titleKey(a), titleKey(b), baseKey(a), baseKey(b)];
  if (ka === kb) return true;
  return ba === bb && ba.length >= 3 && (ka === ba || kb === bb);
}
