import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Car } from "lucide-react"

export const Route = createFileRoute("/_app/vehicle")({
  component: VehiclePage,
})

const VEHICLE_LABELS: Record<string, { label: string; emoji: string }> = {
  van: { label: "Furgón", emoji: "🚐" },
  pickup: { label: "Camioneta", emoji: "🛻" },
  truck_small: { label: "Camión chico", emoji: "🚚" },
  truck_large: { label: "Camión grande", emoji: "🚛" },
}

function VehiclePage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["driver", "me"],
    queryFn: api.drivers.me,
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[480px] space-y-3 px-4 py-8">
        <div className="h-32 animate-pulse rounded-[12px] bg-[#F0EDE9]" />
        <div className="h-10 animate-pulse rounded-[12px] bg-[#F0EDE9]" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#F0EDE9]">
          <Car className="size-5 text-[#969e9b]" />
        </div>
        <p className="text-[15px] font-semibold text-[#121715]">Sin perfil de transportista</p>
        <p className="text-[13px] text-[#969e9b]">Completa tu perfil para comenzar a recibir solicitudes.</p>
        <Link
          to="/driver-onboarding"
          className="rounded-[8px] bg-primary px-4 py-2 text-[13px] font-semibold text-white"
        >
          Activar perfil
        </Link>
      </div>
    )
  }

  const vehicleInfo = VEHICLE_LABELS[profile.vehicleType]

  return (
    <div className="mx-auto max-w-[480px] px-4 py-8">
      <h1 className="text-[18px] font-semibold text-[#121715]">Mi vehículo</h1>

      <div className="mt-6 space-y-4">
        <div className="rounded-[12px] border border-[#EDEAE6] bg-white p-5">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{vehicleInfo?.emoji ?? "🚗"}</span>
            <div>
              <p className="text-[18px] font-semibold text-[#121715]">{vehicleInfo?.label ?? profile.vehicleType}</p>
              <p className="font-mono text-[15px] font-bold tracking-[0.12em] text-[#485450]">
                {profile.vehiclePlate}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#F0EDE9] pt-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">Teléfono</p>
              <p className="mt-0.5 text-[13px] text-[#485450]">{profile.phone}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">Documentos</p>
              <p className="mt-0.5 text-[13px] capitalize text-[#485450]">{profile.documentsStatus}</p>
            </div>
            {profile.totalJobs > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">Trabajos</p>
                <p className="mt-0.5 text-[13px] text-[#485450]">{profile.totalJobs}</p>
              </div>
            )}
            {profile.avgRating != null && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#969e9b]">Calificación</p>
                <p className="mt-0.5 text-[13px] text-[#485450]">⭐ {Number(profile.avgRating).toFixed(1)}</p>
              </div>
            )}
          </div>
        </div>

        <Link
          to="/driver-onboarding"
          className="block rounded-[10px] border border-[#EDEAE6] bg-white px-4 py-3 text-center text-[13px] font-medium text-[#485450] transition-colors hover:border-[#C4C0BA]"
        >
          Editar información del vehículo
        </Link>
      </div>
    </div>
  )
}
