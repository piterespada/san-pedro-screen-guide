import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { readCache, reconcile, type Board } from "@/lib/cache";
import { CINEMAS, filterMovies, type Filters, type Movie } from "@/lib/movies";
import { getShowtimes } from "@/lib/showtimes.functions";
import { MovieModal } from "@/components/MovieModal";
import { Badge } from "@/components/Badge";

const showtimesQuery = queryOptions({ queryKey: ["showtimes"], queryFn: () => getShowtimes(), staleTime: 1000 * 60 * 60, retry: 1 });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cartelera SPS — Cines de San Pedro Sula hoy" },
      { name: "description", content: "Horarios de hoy en Cinemark, Cinépolis y Metrocinema en San Pedro Sula." },
      { property: "og:title", content: "Cartelera SPS" },
      { property: "og:description", content: "Todas las películas de hoy en San Pedro Sula en un solo lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className="rounded-md border bg-secondary px-3 py-2 text-sm">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function Index() {
  const { data: fresh, isFetching, isError, refetch } = useQuery(showtimesQuery);
  const [data, setData] = useState<Board | null>(null);
  const [fromCache, setFromCache] = useState(false);
  useEffect(() => { const c = readCache(); if (c) { setData((d) => d ?? c); setFromCache(true); } }, []);
  useEffect(() => { if (fresh) { setData(reconcile(fresh, readCache())); setFromCache(false); } }, [fresh]);
  const [q, setQ] = useState("");
  const [f, setF] = useState<Filters>({ cinema: "all", format: "all", audio: "all" });
  const [sel, setSel] = useState<Movie | null>(null);
  const movies = filterMovies(data?.movies ?? [], f).filter((m) => m.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen px-6 py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-primary">CARTELERA SPS</h1>
          <p className="text-sm text-muted-foreground">Hoy en San Pedro Sula · {data ? "actualizado " : "cargando horarios de los 4 cines…"}{data && new Date(data.fetchedAt).toLocaleTimeString("es-HN", { timeZone: "America/Tegucigalpa" })}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {data?.status.map((s) => {
              const name = CINEMAS.find((c) => c.id === s.cinema)?.name;
              return (
                <span key={s.cinema} className={`rounded-full px-2 py-0.5 ${s.ok ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                  {s.ok ? `${name}: en vivo (${s.count})` : s.stale ? `${name}: mostrando última cartelera guardada` : `Servidor de ${name} no disponible temporalmente`}
                </span>
              );
            })}
          </div>
          {(isError || (fromCache && !isFetching)) && (
            <p className="mt-2 text-xs text-muted-foreground">⚠ No se pudo actualizar. Mostrando última cartelera guardada.</p>
          )}
          {fromCache && isFetching && <p className="mt-2 text-xs text-muted-foreground">Mostrando última cartelera guardada mientras se actualiza…</p>}
          <div className="hidden">
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar película…" className="rounded-md border bg-secondary px-3 py-2 text-sm" />
          <button onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            <span className={isFetching ? "inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" : "hidden"} />
            {isFetching ? "Actualizando…" : "Actualizar cartelera"}
          </button>
          <Select value={f.cinema} onChange={(cinema) => setF({ ...f, cinema })} options={[["all", "Todos los cines"], ...CINEMAS.map((c) => [c.id, c.name] as [typeof c.id, string])]} />
          <Select value={f.format} onChange={(format) => setF({ ...f, format })} options={[["all", "Formato"], ["2D", "2D"], ["3D", "3D"], ["VIP", "VIP"]]} />
          <Select value={f.audio} onChange={(audio) => setF({ ...f, audio })} options={[["all", "Audio"], ["SUB", "Subtitulada"], ["DOB", "Doblada"]]} />
        </div>
      </header>
      {!data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="animate-pulse"><div className="aspect-[2/3] rounded-md bg-secondary" /><div className="mt-2 h-4 w-3/4 rounded bg-secondary" /></div>
          ))}
        </div>
      ) : movies.length === 0 ? <p className="text-muted-foreground">No hay funciones con esos filtros.</p> : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {movies.map((m) => (
            <button key={m.id} onClick={() => setSel(m)} className="group text-left">
              <img src={m.poster} alt={m.title} className="aspect-[2/3] w-full rounded-md object-cover transition group-hover:scale-105 group-hover:ring-2 group-hover:ring-primary" />
              <p className="mt-2 truncate text-sm font-medium">{m.title}</p>
              <p className="text-xs text-muted-foreground">{[m.rating ? `★ ${m.rating}` : "", m.year, `${new Set(m.showtimes.map((s) => s.cinema)).size} cine(s)`].filter(Boolean).join(" · ")}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {[...new Set(m.showtimes.flatMap((s) => [s.format, s.audio]))].map((k) => <Badge key={k} kind={k} />)}
              </div>
            </button>
          ))}
        </div>
      )}
      {sel && <MovieModal movie={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
