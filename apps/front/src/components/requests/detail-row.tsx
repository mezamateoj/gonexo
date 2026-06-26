export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#B0ABA5]">{label}</span>
      <span className="text-[13px] text-[#121715]">{value}</span>
    </div>
  )
}
