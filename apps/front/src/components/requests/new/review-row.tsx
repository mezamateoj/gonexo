export function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-[#F0EEE9] last:border-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#B0ABA5]">{label}</span>
      <span className="text-[14px] text-[#121715]">{value}</span>
    </div>
  )
}
