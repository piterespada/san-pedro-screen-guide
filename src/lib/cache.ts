import type { CinemaId, Movie } from "./movies";

// v2: showtimes now carry a date and a list of formats, so boards saved by v1 are not readable.
const KEY = "cartelera-sps:v2";
export type Status = { cinema: CinemaId; ok: boolean; count: number };
export type Board = { movies: Movie[]; status: Status[]; fetchedAt: string };

export function readCache(): Board | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}

/** Remember the last board that had real movies, to paint the page instantly on the next visit. */
export function saveBoard(board: Board): Board {
  if (board.movies.length) {
    try { localStorage.setItem(KEY, JSON.stringify(board)); } catch { /* quota */ }
  }
  return board;
}
