import { useState } from "react";
import { CINEMAS, dayLabel, todayHN, type Movie } from "@/lib/movies";
import { Badge } from "./Badge";
import { Poster } from "./Poster";

export function MovieModal({ movie, date, onClose }: { movie: Movie; date?: string | undefined; onClose: () => void }) {
  const today = todayHN();
  const dates = [...new Set(movie.showtimes.map((s) => s.date))].filter((d) => d >= today).sort();
  const [tab, setTab] = useState<"info" | "times">("info");
  const [day, setDay] = useState<string | undefined>(date && dates.includes(date) ? date : dates[0]);
  const rows = movie.showtimes.filter((s) => s.date === day);
  const cinemas = CINEMAS.filter((c) => rows.some((s) => s.cinema === c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border bg-card text-card-foreground" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-4 p-5">
          <div className="hidden w-32 shrink-0 sm:block"><Poster src={movie.poster} title={movie.title} /></div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold">{movie.title}</h2>
              <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground">×</button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{[movie.rating ? `★ ${movie.rating} TMDb` : "", movie.year, movie.runtime ? `${movie.runtime} min` : "", movie.certification].filter(Boolean).join(" · ")}</p>
            {movie.presale && <span className="mt-2 inline-block rounded bg-primary/20 px-2 py-0.5 text-xs font-bold uppercase text-primary">Preventa</span>}
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
              {cinemas.length === 0 ? <p className="text-sm text-muted-foreground">Sin funciones para este día.</p> : cinemas.map((c) => (
                <div key={c.id} className="rounded-lg bg-secondary p-3">
                  <p className="font-semibold">{c.name}</p>
                  <div className="mt-1 divide-y divide-border">
                    {rows.filter((s) => s.cinema === c.id).map((s, i) => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <div className="flex w-28 shrink-0 flex-wrap gap-1 sm:w-40">
                          {s.formats.map((k) => <Badge key={k} kind={k} />)}
                          {s.audio && <Badge kind={s.audio} />}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {s.times.map((t) => <span key={t} className="rounded border px-2 py-0.5 text-sm tabular-nums">{t}</span>)}
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
