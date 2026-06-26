import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"

export function PromoCard() {
  return (
    <div className="rounded-[10px] bg-[#121715] p-[18px]">
      <p className="text-[15px] font-bold text-white">¿Necesitas mover algo más?</p>
      <p className="mt-[6px] text-[13px] text-white/45">
        Publica gratis y recibe cotizaciones de transportistas verificados en minutos.
      </p>
      <Button className="mt-[12px]" size="sm" asChild>
        <Link to="/requests/new">
          Publicar flete
        </Link>
      </Button>
    </div>
  )
}
