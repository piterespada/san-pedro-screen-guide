import { useState } from "react";
import { CINEMAS, type Movie } from "@/lib/movies";
import { Badge } from "./Badge";

export function MovieModal({ movie, onClose }: { movie: Movie; onClose: () => void }) {
  const [tab, setTab] = useState<"info" | "times">("info");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border bg-card text-card-foreground" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-4 p-5">
          <img src={movie.poster} alt={movie.title} className="hidden w-32 rounded-md sm:block" />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold">{movie.title}</h2>
              <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground">×</button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{[movie.rating ? `★ ${movie.rating} TMDb` : "", movie.year, movie.runtime ? `${movie.runtime} min` : "", movie.certification].filter(Boolean).join(" · ")}</p>
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
            </div>
          ) : (
            <div className="space-y-3">
              {CINEMAS.map((c) => {
                const st = movie.showtimes.filter((s) => s.cinema === c.id);
                return (
                  <div key={c.id} className="rounded-lg bg-secondary p-3">
                    <p className="font-semibold">{c.name}</p>
                    {st.length === 0 ? <p className="text-sm text-muted-foreground">No disponible hoy</p> : st.map((s, i) => (
                      <div key={i} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <Badge kind={s.format} /><Badge kind={s.audio} />
                        {s.demo && <span className="text-xs text-muted-foreground">(datos de prueba)</span>}
                        {s.times.map((t) => <span key={t} className="rounded border px-2">{t}</span>)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
