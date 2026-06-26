import { Link } from "@tanstack/react-router"
import { Package, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function EmptyState({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <div className="col-span-2 flex flex-col items-center justify-center rounded-[10px] border border-dashed border-[#E9E7E3] bg-white py-12 text-center">
        <Package className="size-9 text-[#CCCCCC] mb-3" />
        <p className="text-[14px] font-medium text-foreground">Sin solicitudes en esta categoría</p>
        <p className="mt-1 text-sm text-muted-foreground">Prueba otro filtro</p>
      </div>
    )
  }

  return (
    <div className="col-span-2 flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#E9E7E3] bg-white py-14 text-center">
      <div className="mb-6 flex items-center gap-1 rounded-full bg-[#F5F4F0] px-4 py-2">
        {[
          { n: 1, label: "Describe tu flete" },
          { n: 2, label: "Recibe ofertas" },
          { n: 3, label: "Elige y muévete" },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-1">
            {i > 0 && <span className="mx-1 text-[#D0CCC7]">·</span>}
            <div className="flex items-center gap-1.5">
              <div className="flex size-[18px] items-center justify-center rounded-full bg-primary">
                <span className="text-[9px] font-bold text-white">{n}</span>
              </div>
              <span className="text-[11px] font-medium text-[#485450]">{label}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[16px] font-semibold text-[#121715]">Publica tu primer flete</p>
      <p className="mt-1 text-[13px] text-[#969e9b] max-w-[260px] leading-relaxed">
        Recibe cotizaciones de transportistas verificados en minutos.
      </p>

      <Button className="mt-5 gap-2" asChild>
        <Link to="/requests/new">
          <Plus className="size-4" />
          Publicar flete
        </Link>
      </Button>

      <p className="mt-4 text-[12px] text-[#B0ABA5]">
        ¿Eres transportista?{" "}
        <Link to="/driver-onboarding" className="text-primary underline underline-offset-2">
          Regístrate aquí
        </Link>
      </p>
    </div>
  )
}
