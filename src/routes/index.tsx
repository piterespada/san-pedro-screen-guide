import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { readCache, saveBoard, type Board } from "@/lib/cache";
import { CINEMAS, availableDates, dateSpan, dayLabel, filterMovies, shortDate, todayHN, visibleShowtimes, type Filters, type Movie } from "@/lib/movies";
import { getShowtimes } from "@/lib/showtimes.functions";
import { MovieModal } from "@/components/MovieModal";
import { Badge } from "@/components/Badge";
import { Poster } from "@/components/Poster";

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
  const [sel, setSel] = useState<Movie | null>(null);
  const [tab, setTab] = useState<Tab>("cartelera");
  const [day, setDay] = useState<string | null>(null);

  const today = todayHN();
  const all = data?.movies ?? [];
  const dates = availableDates(all.filter((m) => !m.presale), today);
  const date = day && dates.includes(day) ? day : dates.includes(today) ? today : dates[0];
  const view = { presale: tab === "preventas", date: tab === "cartelera" ? date : undefined };
  const movies = filterMovies(all, f, view).filter((m) => m.title.toLowerCase().includes(q.toLowerCase()));
  const presaleCount = all.filter((m) => m.presale).length;
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
            <button key={d} onClick={() => setDay(d)} aria-pressed={d === date} className={`shrink-0 rounded-md border px-3 py-1.5 text-sm capitalize ${d === date ? "border-primary bg-primary/20 text-primary" : "bg-secondary"}`}>
              {dayLabel(d, today)}
            </button>
          ))}
        </div>
      )}

      {!data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="animate-pulse"><div className="aspect-[2/3] rounded-md bg-secondary" /><div className="mt-2 h-4 w-3/4 rounded bg-secondary" /></div>
          ))}
        </div>
      ) : movies.length === 0 ? (
        <p className="text-muted-foreground">
          {nobodyAnswered ? "Ningún cine respondió en este momento. Intenta actualizar en unos minutos."
            : tab === "preventas" && presaleCount === 0 ? "No hay preventas disponibles por ahora."
            : "No hay funciones con esos filtros."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {movies.map((m) => {
            const shown = visibleShowtimes(m, f, view);
            const badges = [...new Set(shown.flatMap((s) => [...s.formats, ...(s.audio ? [s.audio] : [])]))];
            const span = m.presale ? dateSpan(shown) : null;
            return (
              <button key={m.id} onClick={() => setSel(m)} className="group text-left">
                <Poster src={m.poster} title={m.title} className="transition group-hover:scale-105 group-hover:ring-2 group-hover:ring-primary" />
                <p className="mt-2 truncate text-sm font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">{[m.rating ? `★ ${m.rating}` : "", m.year, `${new Set(shown.map((s) => s.cinema)).size} cine(s)`].filter(Boolean).join(" · ")}</p>
                {m.presale && (
                  <div className="mt-0.5 text-xs">
                    {m.opening && <p className="font-medium text-primary">Estreno: {shortDate(m.opening)}</p>}
                    {span && <p className="text-muted-foreground">Preventa: {span[0] === span[1] ? shortDate(span[0]) : `${shortDate(span[0])} – ${shortDate(span[1])}`}</p>}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-1">
                  {badges.map((k) => <Badge key={k} kind={k} />)}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {sel && <MovieModal movie={sel} date={view.date} onClose={() => setSel(null)} />}
    </div>
  );
}
