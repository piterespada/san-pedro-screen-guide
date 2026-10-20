import { useState } from "react";
import { CINEMAS, dateSpan, dayLabel, isPast, longDate, nowHN, shortDate, type Movie } from "@/lib/movies";
import { useNow } from "@/hooks/use-now";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { Badge } from "./Badge";
import { Poster } from "./Poster";

const SEATING = { "D-BOX": "Butacas D-BOX", Tradicional: "Butacas tradicionales" } as const;

export function MovieModal({ movie, date, onClose }: { movie: Movie; date?: string | undefined; onClose: () => void }) {
  useScrollLock(); // the page behind stays still; only the card below scrolls
  const now = useNow();
  const today = nowHN(now).date;
  const upcoming = movie.showtimes.filter((s) => s.date >= today);
  const dates = [...new Set(upcoming.map((s) => s.date))].sort();
  const span = dateSpan(upcoming);
  const [tab, setTab] = useState<"info" | "times">("info");
  const [day, setDay] = useState<string | undefined>(date && dates.includes(date) ? date : dates[0]);
  const rows = upcoming.filter((s) => s.date === day);
  const cinemas = CINEMAS.filter((c) => rows.some((s) => s.cinema === c.id));

  return (
    <div role="dialog" aria-modal="true" aria-label={movie.title} className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-background/80 p-4 backdrop-blur" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-xl border bg-card text-card-foreground" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-4 p-5">
          <div className="hidden w-32 shrink-0 sm:block"><Poster src={movie.poster} title={movie.title} /></div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold">{movie.title}</h2>
              <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground">×</button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{[movie.rating ? `★ ${movie.rating} TMDb` : "", movie.year, movie.runtime ? `${movie.runtime} min` : "", movie.certification].filter(Boolean).join(" · ")}</p>
            {movie.rerun && <span className="mr-2 mt-2 inline-block rounded bg-secondary px-2 py-0.5 text-xs font-bold uppercase">Reestreno</span>}
            {movie.presale && (
              <div className="mt-2 space-y-0.5 text-sm">
                <span className="inline-block rounded bg-primary/20 px-2 py-0.5 text-xs font-bold uppercase text-primary">Preventa</span>
                {movie.opening && <p><span className="text-muted-foreground">Estreno:</span> <span className="capitalize">{longDate(movie.opening)}</span></p>}
                {span && <p><span className="text-muted-foreground">Funciones de preventa:</span> {span[0] === span[1] ? shortDate(span[0]) : `${shortDate(span[0])} – ${shortDate(span[1])}`}</p>}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              {(["info", "times"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1 text-sm ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  {t === "info" ? "Detalles" : "Horarios"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          {tab === "info" ? (
            <div className="space-y-3 text-sm">
              <p>{movie.synopsis || "Sinopsis no disponible."}</p>
              {movie.director && <p><span className="text-muted-foreground">Director:</span> {movie.director}</p>}
              {movie.cast.length > 0 && <p><span className="text-muted-foreground">Reparto:</span> {movie.cast.join(", ")}</p>}
              {movie.trailer && (
                <a href={movie.trailer} target="_blank" rel="noopener noreferrer" className="inline-block rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground">
                  ▶ Ver tráiler
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {dates.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {dates.map((d) => (
                    <button key={d} onClick={() => setDay(d)} aria-pressed={d === day} className={`shrink-0 rounded-full px-3 py-1 text-xs capitalize ${d === day ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                      {dayLabel(d, today)}
                    </button>
                  ))}
                </div>
              )}
              {day && <h3 className="text-sm font-semibold capitalize">{longDate(day)}</h3>}
              {cinemas.length === 0 ? <p className="text-sm text-muted-foreground">Sin funciones para este día.</p> : cinemas.map((c) => (
                <div key={c.id} className="rounded-lg bg-secondary p-3">
                  <p className="font-semibold">{c.name}</p>
                  <div className="mt-1 divide-y divide-border">
                    {rows.filter((s) => s.cinema === c.id).map((s, i) => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <div className="w-28 shrink-0 sm:w-44">
                          <div className="flex flex-wrap gap-1">
                            {s.formats.map((k) => <Badge key={k} kind={k} />)}
                            {s.audio && <Badge kind={s.audio} />}
                          </div>
                          {s.seating && <p className="mt-1 text-[11px] text-muted-foreground">{SEATING[s.seating]}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {s.times.map((t) => {
                            const past = isPast(s.date, t, now); // already started, by Honduras time
                            return (
                              <span key={t} title={past ? "Función ya transcurrida" : undefined} aria-label={past ? `${t}, función ya transcurrida` : undefined}
                                className={`rounded border px-2 py-0.5 text-sm tabular-nums ${past ? "line-through opacity-40" : ""}`}>
                                {t}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
