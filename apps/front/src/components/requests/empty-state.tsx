import { Link } from "@tanstack/react-router"

export function EmptyState({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center rounded-[10px] border border-dashed border-[#E9E7E3] bg-white py-12 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#F5F4F0] text-2xl leading-none">
          📦
        </div>
        <p className="text-[14px] font-medium text-foreground">Sin solicitudes en esta categoría</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Prueba otro filtro</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      {/* Icon circle — 96×96, fully rounded, #0c8c5e0d fill */}
      <div className="flex size-24 items-center justify-center rounded-full bg-[#0c8c5e0d] text-[44px] leading-none">
        📦
      </div>

      {/* Text block — gap 10 */}
      <div className="flex flex-col items-center gap-2.5">
        <h2 className="text-[22px] font-bold tracking-[-0.5px] text-[#121715] md:text-[28px]">
          Aún no tienes envíos
        </h2>
        <p className="w-full max-w-[400px] px-4 text-[15px] leading-[1.6] text-[#717d79]">
          Publica tu primer flete y recibe ofertas de transportistas verificados.
        </p>
      </div>

      {/* Steps row */}
      <div className="flex items-center gap-2 text-[13px]">
        <span className="font-medium text-[#121715]">1. Publica</span>
        <span className="text-[#717d79]">·</span>
        <span className="font-medium text-[#121715]">2. Recibe ofertas</span>
        <span className="text-[#717d79]">·</span>
        <span className="font-medium text-[#121715]">3. Elige y listo</span>
      </div>

      {/* CTA group — gap 16, vertical, centered */}
      <div className="flex flex-col items-center gap-4">
        <Link
          to="/requests/new"
          className="rounded-[8px] bg-primary px-[28px] py-[13px] text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Publicar mi primer flete →
        </Link>
        <Link
          to="/driver-onboarding"
          className="text-[13px] text-[#717d79] transition-colors hover:text-foreground"
        >
          ¿Eres transportista? Encuentra solicitudes
        </Link>
      </div>
    </div>
  )
}
