import type { Listing, Movie } from "./movies";
import { pickTitle, sameMovie, titleKey } from "./titles";

/** Merge per-cinema listings into one Movie per film, grouping the different names cinemas use for it. */
export function merge(parts: Listing[]): Movie[] {
  const out: (Movie & { names: string[] })[] = [];
  for (const p of parts) {
    // Runtimes are only compared when both sides report one.
    const gap = (m: Movie) => (m.runtime && p.runtime ? Math.abs(m.runtime - p.runtime) : undefined);
    let m = out.find((x) => x.names.some((n) => sameMovie(n, p.title, gap(x))));
    if (!m) out.push((m = { id: titleKey(p.title), title: p.title, names: [], poster: "", synopsis: "", director: "", cast: [], rating: 0, runtime: 0, showtimes: [], presale: true, rerun: false }));
    m.names.push(p.title);
    // Cinema posters win; the first real one found is kept (TMDb fills in later when none exists).
    if (p.poster && (!m.poster || m.poster.includes("placehold.co"))) m.poster = p.poster;
    m.synopsis ||= p.synopsis ?? "";
    m.runtime ||= p.runtime ?? 0;
    if (!m.director) m.director = p.director ?? "";
    if (!m.cast.length) m.cast = p.cast ?? [];
    m.certification ||= p.certification;
    m.trailer ||= p.trailer;
    if (p.opening && (!m.opening || p.opening < m.opening)) m.opening = p.opening;
    // A movie only counts as pre-sale when every cinema lists it that way.
    m.presale = !!m.presale && !!p.presale;
    // A re-release if any cinema says so (some cinemas drop the "RE" marker).
    m.rerun = !!m.rerun || !!p.rerun;
    m.showtimes.push(...p.showtimes);
  }
  return out
    .map(({ names, ...m }) => ({ ...m, title: pickTitle(names) }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
