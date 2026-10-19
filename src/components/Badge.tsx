const TONE: Record<string, string> = {
  "2D": "badge-2d", "3D": "badge-3d", VIP: "badge-vip", SUB: "badge-sub", DOB: "badge-dob",
  XD: "badge-xd", "D-BOX": "badge-dbox", IV: "badge-iv",
};
const LABEL: Record<string, string> = { SUB: "Sub", DOB: "Dob" };
const TITLE: Record<string, string> = {
  SUB: "Subtitulada", DOB: "Doblada", XD: "Extreme Digital", "D-BOX": "Asientos D-BOX", IV: "Infiniti Vision",
};

export function Badge({ kind }: { kind: string }) {
  return <span title={TITLE[kind]} className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${TONE[kind] ?? "bg-secondary"}`}>{LABEL[kind] ?? kind}</span>;
}
