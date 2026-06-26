import { Link } from "@tanstack/react-router"
import { ArrowRight, Calendar, Package } from "lucide-react"
import { formatCompactDateTime, initials, volumeLabels } from "@/lib/display"
import type { OpenRequest } from "@/lib/types"

export function AvailableRequestCard({ req }: { req: OpenRequest }) {
  return (
    <Link
      to="/available/$id"
      params={{ id: req.id }}
      className="group flex flex-col rounded-[12px] border border-[#E9E7E3] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_3px_12px_rgba(0,0,0,0.08)]"
    >
      {req.photos.length > 0 && (
        <img
          src={req.photos[0].url}
          alt=""
          className="mb-4 h-32 w-full rounded-[8px] object-cover"
        />
      )}

      <div className="flex flex-col gap-2.5">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 size-[7px] shrink-0 rounded-full bg-primary" />
          <span className="text-[13px] font-medium leading-snug text-[#121715] line-clamp-1">{req.originAddress}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 size-[7px] shrink-0 rounded-full bg-[#969e9b]" />
          <span className="text-[13px] font-medium leading-snug text-[#121715] line-clamp-1">{req.destAddress}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-[#F0EEE9] pt-3">
        <div className="flex items-center gap-1.5 text-[#969e9b]">
          <Calendar className="size-3.5" />
          <span className="text-[12px]">{formatCompactDateTime(req.scheduledAt)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#969e9b]">
          <Package className="size-3.5" />
          <span className="text-[12px]">{volumeLabels[req.volumeCategory]}</span>
        </div>
        <ArrowRight className="ml-auto size-4 text-[#B0ABA5] transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
          {initials(req.user.name)}
        </div>
        <span className="text-[12px] text-[#969e9b]">{req.user.name}</span>
      </div>
    </Link>
  )
}
