import { useState, type ReactNode } from "react";
import { addMonths, longDate, monthGrid, monthLabel, type Movie } from "@/lib/movies";

const WEEKDAYS = [["D", "domingo"], ["L", "lunes"], ["M", "martes"], ["M", "miércoles"], ["J", "jueves"], ["V", "viernes"], ["S", "sábado"]] as const;

/**
 * Month calendar of pre-sales. Days with screenings or openings are highlighted with their movie
 * count; picking one shows that day's movies through `renderDay`. Nothing here is invented: the
 * highlighted days come straight from the cinemas' sessions and release dates (`days`).
 */
export function PresaleCalendar({ days, today, renderDay }: {
  days: Map<string, Movie[]>; today: string; renderDay: (movies: Movie[], date: string) => ReactNode;
}) {
  const keys = [...days.keys()];
  const first = keys[0];
  const last = keys[keys.length - 1];
  const [picked, setPicked] = useState<string | null>(null);
  const [visible, setVisible] = useState<string | null>(null);
  if (!first || !last) return null;

  const selected = picked && days.has(picked) ? picked : first;
  const [min, max] = [first.slice(0, 7), last.slice(0, 7)];
  const month = [min, visible ?? selected.slice(0, 7), max].sort()[1]!; // clamp to the months that have pre-sales
  const [year, mon] = month.split("-").map(Number) as [number, number];
  const weeks = monthGrid(year, mon);
  const selectedMovies = days.get(selected) ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
      <section aria-label="Calendario de preventas" className="w-full max-w-sm">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setVisible(addMonths(month, -1))} disabled={month <= min} aria-label="Mes anterior" className="rounded-md bg-secondary px-3 py-1.5 text-lg disabled:opacity-30">‹</button>
          <h2 className="font-semibold capitalize">{monthLabel(month)}</h2>
          <button onClick={() => setVisible(addMonths(month, 1))} disabled={month >= max} aria-label="Mes siguiente" className="rounded-md bg-secondary px-3 py-1.5 text-lg disabled:opacity-30">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map(([short, name], i) => <abbr key={i} title={name} className="pb-1 text-xs font-medium text-muted-foreground no-underline">{short}</abbr>)}
          {weeks.flat().map((d, i) => {
            if (!d) return <div key={`blank-${i}`} />;
            const count = days.get(d)?.length ?? 0;
            const isSelected = d === selected;
            const tone = count === 0
              ? "border-transparent text-muted-foreground/50"
              : isSelected ? "border-primary bg-primary text-primary-foreground"
              : "border-primary/40 bg-secondary hover:border-primary";
            return (
              <button key={d} disabled={count === 0} onClick={() => setPicked(d)} aria-pressed={isSelected}
                aria-label={count ? `${longDate(d)}: ${count} ${count === 1 ? "película" : "películas"}` : longDate(d)}
                className={`flex aspect-square min-h-11 flex-col items-center justify-center rounded-md border text-sm transition ${tone} ${d === today ? "font-black underline" : ""}`}>
                {Number(d.slice(8))}
                {count > 0 && <span className="text-[10px] font-bold leading-none">{count}</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Los días marcados tienen preventas o estrenos; el número es la cantidad de películas.</p>
      </section>

      <section aria-live="polite">
        <h2 className="mb-4 text-lg font-semibold capitalize">
          {longDate(selected)} <span className="text-sm font-normal normal-case text-muted-foreground">· {selectedMovies.length} {selectedMovies.length === 1 ? "película" : "películas"}</span>
        </h2>
        {renderDay(selectedMovies, selected)}
      </section>
    </div>
  );
}
