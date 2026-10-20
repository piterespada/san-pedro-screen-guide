import type { CastMember } from "./movies";

const PROFILE = "https://image.tmdb.org/t/p/w185";

/**
 * Main cast from a TMDb `/movie/{id}/credits` response: the first `limit` actors in billing order,
 * each with their real name, the character they play and the profile photo (`profile_path`) when
 * there is one. Anything missing stays missing: no photo or character is ever made up.
 */
export function topCast(credits: unknown, limit = 12): CastMember[] {
  const raw = credits && typeof credits === "object" ? (credits as { cast?: unknown }).cast : undefined;
  if (!Array.isArray(raw)) return [];
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const seen = new Set<string>();
  return raw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map((p, i) => ({ p, order: typeof p["order"] === "number" ? p["order"] : i }))
    .sort((a, b) => a.order - b.order)
    .flatMap(({ p }): CastMember[] => {
      const name = text(p["name"]);
      const character = text(p["character"]);
      const path = text(p["profile_path"]);
      if (!name || seen.has(name.toLowerCase()) || /\(uncredited\)/i.test(character)) return [];
      seen.add(name.toLowerCase());
      return [{ name, character: character || undefined, photo: path.startsWith("/") ? PROFILE + path : undefined }];
    })
    .slice(0, limit);
}
