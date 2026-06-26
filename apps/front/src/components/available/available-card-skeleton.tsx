import { Skeleton } from "@/components/ui/skeleton"

export function AvailableCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-[#E9E7E3] bg-white p-5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}
