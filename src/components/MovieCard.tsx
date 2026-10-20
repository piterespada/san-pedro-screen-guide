import { dateSpan, shortDate, type Movie, type Showtime } from "@/lib/movies";
import { Badge } from "./Badge";
import { Poster } from "./Poster";

/**
 * Poster card used by both the regular listing and the pre-sale calendar.
 * `shown` are the sessions on screen (they decide the badges and the cinema count);
 * `range` (pre-sales) are all the movie's sessions, to show its whole pre-sale window.
 */
export function MovieCard({ movie, shown, range, onSelect }: {
  movie: Movie; shown: Showtime[]; range?: Showtime[] | undefined; onSelect: (movie: Movie) => void;
}) {
  const badges = [...new Set(shown.flatMap((s) => [...s.formats, ...(s.audio ? [s.audio] : [])]))];
  const span = movie.presale ? dateSpan(range ?? shown) : null;
  return (
    <button onClick={() => onSelect(movie)} className="group text-left">
      <Poster src={movie.poster} title={movie.title} className="transition group-hover:scale-105 group-hover:ring-2 group-hover:ring-primary" />
      <p className="mt-2 truncate text-sm font-medium">{movie.title}</p>
      <p className="text-xs text-muted-foreground">{[movie.rating ? `★ ${movie.rating}` : "", movie.year, `${new Set(shown.map((s) => s.cinema)).size} cine(s)`].filter(Boolean).join(" · ")}</p>
      {movie.presale && (
        <div className="mt-0.5 text-xs">
          {movie.opening && <p className="font-medium text-primary">Estreno: {shortDate(movie.opening)}</p>}
          {span && <p className="text-muted-foreground">Preventa: {span[0] === span[1] ? shortDate(span[0]) : `${shortDate(span[0])} – ${shortDate(span[1])}`}</p>}
        </div>
      )}
      <div className="mt-1 flex flex-wrap gap-1">
        {movie.rerun && <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">Reestreno</span>}
        {badges.map((k) => <Badge key={k} kind={k} />)}
      </div>
    </button>
  );
}
