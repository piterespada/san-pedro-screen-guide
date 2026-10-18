import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CINEMAS, filterMovies, type Filters, type Movie } from "@/lib/movies";
import { getShowtimes } from "@/lib/showtimes.functions";
import { MovieModal } from "@/components/MovieModal";

const showtimesQuery = queryOptions({ queryKey: ["showtimes"], queryFn: () => getShowtimes(), staleTime: 1000 * 60 * 60 });

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
  loader: ({ context }) => context.queryClient.ensureQueryData(showtimesQuery),
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
  const { data } = useSuspenseQuery(showtimesQuery);
  const [f, setF] = useState<Filters>({ cinema: "all", format: "all", audio: "all" });
  const [sel, setSel] = useState<Movie | null>(null);
  const movies = filterMovies(data.movies, f);

  return (
    <div className="min-h-screen px-6 py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-primary">CARTELERA SPS</h1>
          <p className="text-sm text-muted-foreground">Hoy en San Pedro Sula · actualizado {new Date(data.fetchedAt).toLocaleTimeString("es-HN", { timeZone: "America/Tegucigalpa" })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={f.cinema} onChange={(cinema) => setF({ ...f, cinema })} options={[["all", "Todos los cines"], ...CINEMAS.map((c) => [c.id, c.name] as [typeof c.id, string])]} />
          <Select value={f.format} onChange={(format) => setF({ ...f, format })} options={[["all", "Formato"], ["2D", "2D"], ["3D", "3D"], ["VIP", "VIP"]]} />
          <Select value={f.audio} onChange={(audio) => setF({ ...f, audio })} options={[["all", "Audio"], ["SUB", "Subtitulada"], ["DOB", "Doblada"]]} />
        </div>
      </header>
      {movies.length === 0 ? <p className="text-muted-foreground">No hay funciones con esos filtros.</p> : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {movies.map((m) => (
            <button key={m.id} onClick={() => setSel(m)} className="group text-left">
              <img src={m.poster} alt={m.title} className="aspect-[2/3] w-full rounded-md object-cover transition group-hover:scale-105 group-hover:ring-2 group-hover:ring-primary" />
              <p className="mt-2 truncate text-sm font-medium">{m.title}</p>
              <p className="text-xs text-muted-foreground">★ {m.rating} · {m.runtime} min</p>
            </button>
          ))}
        </div>
      )}
      {sel && <MovieModal movie={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
