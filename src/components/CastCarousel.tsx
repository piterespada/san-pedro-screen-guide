import { useRef, useState } from "react";
import type { CastMember } from "@/lib/movies";

/** Round actor photo; falls back to a neutral silhouette when TMDb has no photo or the image fails to load. */
function ActorPhoto({ photo, name }: { photo?: string | undefined; name: string }) {
  const [failed, setFailed] = useState(false);
  const size = "mx-auto size-20 rounded-full sm:size-24";
  if (!photo || failed) {
    return (
      <div role="img" aria-label={`${name} (sin foto)`} className={`${size} flex items-end justify-center overflow-hidden bg-secondary text-muted-foreground`}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3/4 translate-y-1" fill="currentColor">
          <circle cx="12" cy="8" r="4.5" />
          <path d="M3 22c0-4.7 4-8 9-8s9 3.3 9 8z" />
        </svg>
      </div>
    );
  }
  return <img src={photo} alt={name} loading="lazy" onError={() => setFailed(true)} className={`${size} object-cover`} />;
}

/** IMDb-style row of round cast photos: name on top, the character they play below in gray. Scrolls sideways. */
export function CastCarousel({ cast }: { cast: CastMember[] }) {
  const track = useRef<HTMLUListElement | null>(null);
  const scroll = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: "smooth" });
  if (!cast.length) return null;
  return (
    <section aria-label="Elenco principal">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Elenco principal</h3>
        <div className="hidden gap-1 sm:flex">
          <button onClick={() => scroll(-1)} aria-label="Ver actores anteriores" className="rounded-full bg-secondary px-2.5 py-0.5 text-base">‹</button>
          <button onClick={() => scroll(1)} aria-label="Ver más actores" className="rounded-full bg-secondary px-2.5 py-0.5 text-base">›</button>
        </div>
      </div>
      <ul ref={track} className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]">
        {cast.map((c, i) => (
          <li key={`${c.name}-${i}`} className="w-20 shrink-0 snap-start text-center sm:w-24">
            <ActorPhoto photo={c.photo} name={c.name} />
            <p className="mt-2 text-xs font-medium leading-tight">{c.name}</p>
            {c.character && <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{c.character}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
