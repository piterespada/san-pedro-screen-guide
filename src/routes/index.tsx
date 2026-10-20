import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { readCache, saveBoard, type Board } from "@/lib/cache";
import { CINEMAS, scheduleDates, dayLabel, filterMovies, matches, presaleCalendar, todayHN, visibleShowtimes, type Filters, type Movie } from "@/lib/movies";
import { getShowtimes } from "@/lib/showtimes.functions";
import { MovieModal } from "@/components/MovieModal";
import { MovieCard } from "@/components/MovieCard";
import { PresaleCalendar } from "@/components/PresaleCalendar";
import { Button } from "@/components/ui/button";

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

type Tab = "cartelera" | "preventas";

function Index() {
  const { data: fresh, isFetching, isError, refetch } = useQuery(showtimesQuery);
  const [data, setData] = useState<Board | null>(null);
  const [fromCache, setFromCache] = useState(false);
  useEffect(() => { const c = readCache(); if (c) { setData((d) => d ?? c); setFromCache(true); } }, []);
  useEffect(() => { if (fresh) { setData(saveBoard(fresh)); setFromCache(false); } }, [fresh]);
  const [q, setQ] = useState("");
  const [f, setF] = useState<Filters>({ cinema: "all" });
  const [sel, setSel] = useState<{ movie: Movie; date: string | undefined } | null>(null);
  const [tab, setTab] = useState<Tab>("cartelera");
  const [day, setDay] = useState<string | null>(null);

  const today = todayHN();
  const all = data?.movies ?? [];
  const dates = scheduleDates(today);
  const date = day && dates.includes(day) ? day : today;
  const view = { presale: tab === "preventas", date: tab === "cartelera" ? date : undefined };
  const movies = filterMovies(all, f, view).filter((m) => m.title.toLowerCase().includes(q.toLowerCase()));
  const presaleCount = all.filter((m) => m.presale).length;
  // Pre-sale tab: calendar of days with screenings or openings (only real dates from the cinemas).
  const presaleDays = tab === "preventas" ? presaleCalendar(movies, today, f) : null;
  const nothingToShow = presaleDays ? presaleDays.size === 0 : movies.length === 0;
  const nobodyAnswered = !!data && data.status.length > 0 && data.status.every((s) => !s.ok);

  return (
    <div className="min-h-screen px-6 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-primary">CARTELERA SPS</h1>
          <p className="text-sm text-muted-foreground">Cartelera en San Pedro Sula · {data ? "actualizado " : "cargando horarios de los 4 cines…"}{data && new Date(data.fetchedAt).toLocaleTimeString("es-HN", { timeZone: "America/Tegucigalpa" })}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {data?.status.map((s) => {
              const name = CINEMAS.find((c) => c.id === s.cinema)?.name;
              return (
                <span key={s.cinema} className={`rounded-full px-2 py-0.5 ${s.ok ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                  {s.ok ? `${name}: en vivo (${s.count})` : `Servidor de ${name} no disponible temporalmente`}
                </span>
              );
            })}
          </div>
          {(isError || (fromCache && !isFetching)) && (
            <p className="mt-2 text-xs text-muted-foreground">⚠ No se pudo actualizar. Mostrando última cartelera guardada.</p>
          )}
          {fromCache && isFetching && <p className="mt-2 text-xs text-muted-foreground">Mostrando última cartelera guardada mientras se actualiza…</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar película…" className="rounded-md border bg-secondary px-3 py-2 text-sm" />
          <button onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            <span className={isFetching ? "inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" : "hidden"} />
            {isFetching ? "Actualizando…" : "Actualizar cartelera"}
          </button>
          <Select value={f.cinema} onChange={(cinema) => setF({ ...f, cinema })} options={[["all", "Todos los cines"], ...CINEMAS.map((c) => [c.id, c.name] as [typeof c.id, string])]} />
        </div>
      </header>

      <div className="mb-3 flex gap-2">
        {([["cartelera", "Cartelera"], ["preventas", `Preventas${presaleCount ? ` (${presaleCount})` : ""}`]] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "cartelera" && dates.length > 0 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {dates.map((d) => (
            <Button variant="secondary" key={d} onClick={() => setDay(d)} aria-pressed={d === date} className={`shrink-0 rounded-md border px-3 py-1.5 text-sm capitalize ${d === date ? "border-primary bg-primary/20 text-primary" : "bg-secondary"}`}>
              {dayLabel(d, today)}
            </Button>
          ))}
        </div>
      )}

      {!data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="animate-pulse"><div className="aspect-[2/3] rounded-md bg-secondary" /><div className="mt-2 h-4 w-3/4 rounded bg-secondary" /></div>
          ))}
        </div>
      ) : nothingToShow ? (
        <p className="text-muted-foreground">
          {nobodyAnswered ? "Ningún cine respondió en este momento. Intenta actualizar en unos minutos."
            : tab === "preventas" && presaleCount === 0 ? "No hay preventas disponibles por ahora."
            : "No hay funciones con esos filtros."}
        </p>
      ) : presaleDays ? (
        <PresaleCalendar days={presaleDays} today={today} renderDay={(dayMovies, d) => (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {dayMovies.map((m) => {
              const mine = m.showtimes.filter((s) => matches(s, f));
              const thatDay = mine.filter((s) => s.date === d);
              return <MovieCard key={m.id} movie={m} shown={thatDay.length ? thatDay : mine} range={mine} onSelect={(movie) => setSel({ movie, date: d })} />;
            })}
          </div>
        )} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} shown={visibleShowtimes(m, f, view)} onSelect={(movie) => setSel({ movie, date: view.date })} />
          ))}
        </div>
      )}
      {sel && <MovieModal movie={sel.movie} date={sel.date} onClose={() => setSel(null)} />}
    </div>
  );
}
