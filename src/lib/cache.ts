import type { CinemaId, Movie } from "./movies";

const KEY = "cartelera-sps:v1";
export type Status = { cinema: CinemaId; ok: boolean; count: number; stale?: boolean };
export type Board = { movies: Movie[]; status: Status[]; fetchedAt: string };

export function readCache(): Board | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}

/** Fill cinemas that failed live with their showtimes from the last saved board, then persist. */
export function reconcile(fresh: Board, prev: Board | null): Board {
  const failed = new Set(fresh.status.filter((s) => !s.ok).map((s) => s.cinema));
  const restored = new Set<CinemaId>();
  const movies = fresh.movies.map((m) => ({ ...m, showtimes: m.showtimes.filter((s) => !(failed.has(s.cinema) && s.demo)) }));
  for (const old of prev?.movies ?? []) {
    const sts = old.showtimes.filter((s) => failed.has(s.cinema) && !s.demo);
    if (!sts.length) continue;
    sts.forEach((s) => restored.add(s.cinema));
    const cur = movies.find((m) => m.id === old.id);
    if (cur) cur.showtimes.push(...sts); else movies.push({ ...old, showtimes: sts });
  }
  // Cinemas with nothing saved keep their demo showtimes so the grid never empties.
  if (failed.size) for (const m of fresh.movies) for (const s of m.showtimes)
    if (s.demo && !restored.has(s.cinema)) movies.find((x) => x.id === m.id)?.showtimes.push(s);
  const board: Board = {
    ...fresh,
    movies,
    status: fresh.status.map((s) => (restored.has(s.cinema) ? { ...s, stale: true } : s)),
  };
  try { localStorage.setItem(KEY, JSON.stringify(board)); } catch { /* quota */ }
  return board;
}
