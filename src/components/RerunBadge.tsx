/** White "Re-estreno" badge for re-releases and seasonal events (RE, TS, TN…). */
export function RerunBadge({ size = "sm", className = "" }: { size?: "sm" | "md"; className?: string }) {
  const sizing = size === "md" ? "px-2 py-0.5 text-xs" : "px-1.5 py-0.5 text-[10px]";
  return <span className={`inline-block rounded bg-white font-bold text-black shadow ${sizing} ${className}`}>Re-estreno</span>;
}
