/** Movie poster; when no image exists (cinema and TMDb gave none) shows the title on a plain tile. */
export function Poster({ src, title, className = "" }: { src: string; title: string; className?: string }) {
  if (!src) {
    return (
      <div role="img" aria-label={title} className={`flex aspect-[2/3] w-full items-center justify-center rounded-md bg-secondary p-2 text-center text-sm font-medium text-muted-foreground ${className}`}>
        {title}
      </div>
    );
  }
  return <img src={src} alt={title} loading="lazy" className={`aspect-[2/3] w-full rounded-md object-cover ${className}`} />;
}
