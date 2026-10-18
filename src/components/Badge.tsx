const TONE: Record<string, string> = {
  "2D": "badge-2d", "3D": "badge-3d", VIP: "badge-vip", SUB: "badge-sub", DOB: "badge-dob",
};
const LABEL: Record<string, string> = { SUB: "Sub", DOB: "Dob" };

export function Badge({ kind }: { kind: string }) {
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${TONE[kind] ?? "bg-secondary"}`}>{LABEL[kind] ?? kind}</span>;
}
