import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { ChevronDown, Star, Package, ReceiptText, ShieldCheck, MapPin } from "lucide-react"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* ── Navbar ── */}
      <header
        className="sticky top-0 z-50 flex h-[72px] shrink-0 items-center justify-between bg-white px-20"
        style={{ borderBottom: "1px solid #F0F0F0" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary">
            <span className="text-sm font-bold text-white">g</span>
          </div>
          <span className="text-base font-semibold text-foreground">gonexo</span>
        </div>

        <nav className="flex items-center gap-8">
          <a href="#como-funciona" className="text-sm text-muted-foreground hover:text-foreground">Cómo funciona</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Transportistas</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Precios</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Empresas</a>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Iniciar sesión</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/signup">Comenzar gratis</Link>
          </Button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex h-[640px] w-full overflow-hidden bg-[#1A1A1A] px-20">
        {/* Left content */}
        <div className="relative z-10 flex flex-col justify-center gap-8 py-20" style={{ maxWidth: 560 }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-primary">Conecta. Transporta. Confía.</span>
          </div>

          <div className="flex flex-col gap-5">
            <h1 className="text-5xl font-bold leading-tight text-white">
              Mueve lo que importa,<br />al mejor precio.
            </h1>
            <p className="text-base leading-relaxed text-white/60">
              Publica tu envío en segundos. Recibe ofertas de transportistas verificados y elige lo que más se adapta a ti.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button size="lg">
              Publicar envío
              <ChevronDown data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="ghost" className="text-white hover:text-white hover:bg-white/10">
              Soy transportista
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-3.5 fill-primary text-primary" />
              ))}
            </div>
            <span className="text-xs text-white/50">+2,000 envíos confirmados este mes</span>
          </div>
        </div>

        {/* Decorative pills */}
        <div
          className="pointer-events-none absolute bg-primary opacity-80"
          style={{ width: 260, height: 420, borderRadius: "130px", top: "10%", right: "32%", transform: "rotate(25deg)" }}
        />
        <div
          className="pointer-events-none absolute bg-primary opacity-40"
          style={{ width: 180, height: 320, borderRadius: "90px", top: "30%", right: "20%", transform: "rotate(25deg)" }}
        />

        {/* Bid card widget */}
        <div className="absolute right-20 top-1/2 z-10 -translate-y-1/2">
          <div className="flex w-[260px] flex-col gap-3 rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Envío PENS-4921</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Activo</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
                <span className="text-xs text-foreground">Carlos M</span>
                <span className="text-xs font-semibold text-foreground">$8,900</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
                <span className="text-xs text-muted-foreground">—</span>
                <span className="text-xs font-semibold text-foreground">$8,500</span>
              </div>
            </div>
            <Button size="sm" className="w-full">Mejor oferta</Button>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="flex h-[120px] w-full items-center justify-between bg-[#1A1A1A] px-20">
        {[
          { value: "+12,000", label: "Publicaciones activas este mes" },
          { value: "+3,800", label: "Transportistas verificados" },
          { value: "48", label: "Ciudades disponibles" },
          { value: "98%", label: "Calidad de servicio" },
        ].map(({ value, label }) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-2xl font-bold text-white">{value}</span>
            <span className="text-xs text-white/40">{label}</span>
          </div>
        ))}
      </section>

      {/* ── How It Works ── */}
      <section id="como-funciona" className="flex w-full flex-col gap-12 bg-white px-20 py-24">
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Cómo funciona</span>
          <h2 className="text-4xl font-bold text-foreground">De la publicación<br />a la entrega.</h2>
          <p className="text-base text-muted-foreground">Un proceso simple a seguros, ágil, eficiente y transparente.</p>
        </div>

        <div className="grid grid-cols-4 gap-5">
          {[
            {
              icon: Package,
              title: "Publica tu envío",
              desc: "Describe lo que necesitas mover, origen, destino y fecha. Tarda menos de 2 minutos.",
              highlight: false,
            },
            {
              icon: ReceiptText,
              title: "Recibe ofertas",
              desc: "Transportistas verificados te envían sus cotizaciones en tiempo real.",
              highlight: true,
            },
            {
              icon: ShieldCheck,
              title: "Elige y paga seguro",
              desc: "Compara perfiles, reseñas y precio. El pago queda en escrow hasta la entrega.",
              highlight: false,
            },
            {
              icon: MapPin,
              title: "Seguimiento en vivo",
              desc: "Rastrea tu envío en el mapa. Notificaciones en cada etapa.",
              highlight: false,
            },
          ].map(({ icon: Icon, title, desc, highlight }) => (
            <div
              key={title}
              className={`flex flex-col gap-4 rounded-2xl p-6 ${highlight ? "bg-primary text-white" : "bg-secondary"}`}
            >
              <div className={`flex size-10 items-center justify-center rounded-xl ${highlight ? "bg-white/20" : "bg-background"}`}>
                <Icon className={`size-5 ${highlight ? "text-white" : "text-primary"}`} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className={`text-base font-semibold ${highlight ? "text-white" : "text-foreground"}`}>{title}</h3>
                <p className={`text-sm leading-relaxed ${highlight ? "text-white/80" : "text-muted-foreground"}`}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="flex w-full flex-col gap-12 bg-[#F7F7F7] px-20 py-24">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Lo ofrecemos</span>
            <h2 className="text-4xl font-bold leading-tight text-foreground">
              Todo lo que necesitas<br />en un solo lugar.
            </h2>
          </div>
          <p className="max-w-xs pt-12 text-sm text-muted-foreground">
            Seguridad, transparencia y velocidad — sin compromiso.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Pago en escrow — orange */}
          <div className="flex flex-col gap-4 rounded-2xl bg-primary p-8">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/20">
              <ShieldCheck className="size-5 text-white" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-white">Pago en escrow</h3>
              <p className="text-sm leading-relaxed text-white/80">
                Tu dinero queda retenido hasta confirmar la entrega. Sin riesgos, sin sorpresas para ninguna de las partes.
              </p>
            </div>
          </div>

          {/* Calificaciones verificadas — light */}
          <div className="flex flex-col gap-4 rounded-2xl bg-white p-8">
            <div className="flex size-10 items-center justify-center rounded-xl bg-secondary">
              <Star className="size-5 text-primary" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-foreground">Calificaciones verificadas</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Cada reseña proviene de envíos realizados realmente. Sin manipulaciones.
              </p>
            </div>
          </div>

          {/* Seguimiento en vivo — light */}
          <div className="flex flex-col gap-4 rounded-2xl bg-white p-8">
            <div className="flex size-10 items-center justify-center rounded-xl bg-secondary">
              <MapPin className="size-5 text-primary" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-foreground">Seguimiento en vivo</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Rastrea tu envío en el mapa. Notificaciones en cada etapa.
              </p>
            </div>
          </div>

          {/* Respuesta inmediata — dark */}
          <div className="flex flex-col gap-4 rounded-2xl bg-[#1A1A1A] p-8">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
              <Package className="size-5 text-white" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-white">Respuesta inmediata</h3>
              <p className="text-sm leading-relaxed text-white/60">
                Recibe tus primeras ofertas en minutos. Sin esperas, sin llamadas telefónicas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative flex h-[280px] w-full items-center overflow-hidden bg-[#1A1A1A] px-20">
        {/* Decorative pill */}
        <div
          className="pointer-events-none absolute bg-primary opacity-70"
          style={{ width: 240, height: 380, borderRadius: "120px", right: "8%", top: "50%", transform: "translateY(-50%) rotate(25deg)" }}
        />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-4xl font-bold text-white">¿Listo para tu primer envío?</h2>
            <p className="text-base text-white/50">
              Únete a miles de personas que ya mueven lo que importa con gonexo.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg">
              Publicar envío gratis
              <ChevronDown data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="ghost" className="text-white hover:text-white hover:bg-white/10">
              Ver cómo funciona
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="flex h-16 w-full items-center justify-between bg-[#111111] px-20">
        <p className="text-xs text-white/30">© 2025 gonexo. Todos los derechos reservados.</p>
        <div className="flex items-center gap-6">
          <a href="#" className="text-xs text-white/40 hover:text-white/70">Términos</a>
          <a href="#" className="text-xs text-white/40 hover:text-white/70">Privacidad</a>
          <a href="#" className="text-xs text-white/40 hover:text-white/70">Contacto</a>
        </div>
      </footer>
    </div>
  )
}
