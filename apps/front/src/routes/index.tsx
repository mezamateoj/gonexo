import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FilePlus2, Inbox, CircleCheck, Truck, Lock, Image, ListChecks, Package, Check, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { GonexoLogo } from "@/components/gonexo-logo"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

const NAV_LINKS = [
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Para transportistas", href: "#transportistas" },
  { label: "Seguridad", href: "#seguridad" },
  { label: "FAQ", href: "#faq" },
]

const STEPS = [
  { icon: FilePlus2, num: "01", title: "Publica tu solicitud", desc: "Origen, destino, fecha, fotos y detalles de lo que necesitas mover." },
  { icon: Inbox, num: "02", title: "Recibe cotizaciones", desc: "Transportistas disponibles te envían sus ofertas." },
  { icon: CircleCheck, num: "03", title: "Compara y acepta", desc: "Revisa precio, vehículo, perfil y mensaje antes de elegir." },
  { icon: Truck, num: "04", title: "Coordina el trabajo", desc: "Sigue el estado del flete hasta la entrega final." },
]

const TRUST_CARDS = [
  { icon: Lock, title: "Contacto protegido hasta que hay match", desc: "No se muestran teléfonos antes de aceptar una cotización." },
  { icon: Image, title: "Fotos y detalles antes de cotizar", desc: "Menos sorpresas para el conductor y precios más certeros." },
  { icon: ListChecks, title: "Estados claros del trabajo", desc: "Agendado, en camino, llegó y entregado, siempre visible." },
]

const DRIVER_BULLETS = [
  "Solicitudes abiertas en una tabla fácil de revisar",
  "Cotiza trabajos que calzan con tu vehículo",
  "Gestiona tus trabajos desde el mismo lugar",
]

const DRIVER_JOBS = [
  { route: "Providencia → Ñuñoa", meta: "Furgón · Hoy" },
  { route: "Las Condes → Maipú", meta: "Camión chico · Mañana" },
  { route: "Santiago Centro → La Florida", meta: "Camioneta · Sáb 28" },
]

const FAQ_ITEMS = [
  { q: "¿Cuánto cuesta publicar un flete?", a: "Publicar una solicitud es completamente gratis. Gonexo no cobra comisiones a clientes por recibir cotizaciones." },
  { q: "¿Cómo elijo al transportista?", a: "Revisa el precio, vehículo, perfil y mensaje de cada cotización. Solo tú decides quién hace el trabajo." },
  { q: "¿Puedo ser cliente y transportista con la misma cuenta?", a: "Sí, puedes publicar solicitudes y también cotizar trabajos con la misma cuenta." },
  { q: "¿Qué necesito para cotizar como transportista?", a: "Necesitas crear un perfil con los datos de tu vehículo (tipo, patente, fotos) y tu información de contacto." },
  { q: "¿Cuándo veo el teléfono de la otra persona?", a: "Solo después de aceptar una cotización. El contacto queda protegido hasta que hay un match." },
  { q: "¿Qué pasa si el transportista no aparece?", a: "Puedes contactarnos para resolver el problema. Estamos trabajando en un sistema de garantías para estos casos." },
]

function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 flex h-[68px] shrink-0 items-center justify-between border-b border-border bg-background px-14">
        <GonexoLogo size="md" />

        <nav className="flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <a key={label} href={href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3.5">
          <Link to="/login" className="text-sm font-medium text-foreground hover:text-muted-foreground transition-colors">
            Iniciar sesión
          </Link>
          <Button asChild size="sm" className="rounded-lg px-[18px]">
            <Link to="/signup">Comenzar</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex w-full items-center gap-14 bg-background px-14 py-[72px]">
        {/* Left */}
        <div className="flex w-[540px] shrink-0 flex-col gap-7">
          <div className="flex w-fit items-center gap-2 rounded-full px-3 py-1.5" style={{ background: "#0c8c5e14" }}>
            <div className="size-[7px] rounded-full bg-primary" />
            <span className="text-[13px] font-medium text-primary">Marketplace de fletes en Chile</span>
          </div>

          <h1 className="text-[52px] font-bold leading-[1.08] tracking-[-1.5px] text-foreground">
            Publica tu flete.<br />Recibe ofertas.<br />Elige tranquilo.
          </h1>

          <p className="w-[480px] text-[17px] leading-[1.6] text-muted-foreground">
            Describe qué necesitas mover, agrega origen y destino, y recibe cotizaciones de transportistas disponibles. Tú comparas y eliges.
          </p>

          <div className="flex items-center gap-3">
            <Button asChild className="rounded-[9px] px-[26px] py-[13px] text-[15px] font-semibold">
              <Link to="/signup">Publicar un flete</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-[9px] border-border bg-card px-[26px] py-[13px] text-[15px] font-semibold">
              <Link to="/signup">Soy transportista</Link>
            </Button>
          </div>

          {/* Status strip */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-full px-3 py-[5px]" style={{ background: "#0c8c5e14" }}>
              <div className="size-[6px] rounded-full bg-primary" />
              <span className="text-xs font-medium text-primary">Publicado</span>
            </div>
            <span className="text-[13px] text-muted-foreground">→</span>
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-[5px]">
              <div className="size-[6px] rounded-full bg-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Cotizado</span>
            </div>
            <span className="text-[13px] text-muted-foreground">→</span>
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-[5px]">
              <div className="size-[6px] rounded-full bg-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Aceptado</span>
            </div>
          </div>
        </div>

        {/* Right — mock cards */}
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-[460px] flex-col gap-4">
            {/* Request card */}
            <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5 shadow-[0_4px_16px_#0000000f]">
              <div className="flex w-full items-center justify-between">
                <span className="text-[15px] font-semibold text-foreground">Mudanza departamento 2D</span>
                <div className="rounded-full px-[9px] py-[3px]" style={{ background: "#0c8c5e14" }}>
                  <span className="text-[11px] font-medium text-primary">Publicado</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span>Providencia</span>
                <ArrowRight className="size-4 text-muted-foreground" />
                <span>Ñuñoa</span>
              </div>
              <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
                <span>Sáb 28 jun</span>
                <span>10–15 cajas</span>
                <span>3 fotos</span>
              </div>
            </div>

            {/* Quotes card */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-[0_4px_16px_#0000000f]">
              <span className="text-[14px] font-semibold text-foreground">3 cotizaciones recibidas</span>
              <div className="flex items-center justify-between rounded-lg px-3 py-[10px]" style={{ background: "#0c8c5e0d", border: "1px solid #0c8c5e" }}>
                <div className="flex items-center gap-3">
                  <div className="flex size-[34px] items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">C</div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-medium text-foreground">Carlos M.</span>
                    <span className="text-[11px] text-muted-foreground">Furgón · ★ 4.9</span>
                  </div>
                </div>
                <span className="text-[15px] font-bold text-primary">$45.000</span>
              </div>
              {[{ name: "Rodrigo T.", sub: "Camioneta · ★ 4.7", price: "$52.000" }, { name: "Andrés P.", sub: "Furgón · ★ 4.8", price: "$60.000" }].map(({ name, sub, price }) => (
                <div key={name} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-[10px]">
                  <div className="flex items-center gap-3">
                    <div className="flex size-[34px] items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">{name[0]}</div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-medium text-foreground">{name}</span>
                      <span className="text-[11px] text-muted-foreground">{sub}</span>
                    </div>
                  </div>
                  <span className="text-[15px] font-bold text-foreground">{price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="como-funciona" className="flex w-full flex-col items-center gap-12 border-y border-border bg-card px-14 py-20">
        <div className="flex w-[640px] flex-col items-center gap-3">
          <h2 className="text-center text-[36px] font-bold leading-tight tracking-[-1px] text-foreground">
            De publicar a elegir en pocos pasos
          </h2>
          <p className="w-[520px] text-center text-base leading-[1.5] text-muted-foreground">
            Un flujo simple, pensado para que muevas lo que necesitas sin complicaciones.
          </p>
        </div>

        <div className="grid w-full grid-cols-4 gap-5">
          {STEPS.map(({ icon: Icon, num, title, desc }) => (
            <div key={num} className="flex flex-col gap-3.5 rounded-xl border border-border bg-background p-6">
              <div className="flex w-full items-center justify-between">
                <div className="flex size-[42px] items-center justify-center rounded-[9px]" style={{ background: "#0c8c5e14" }}>
                  <Icon className="size-5 text-primary" />
                </div>
                <span className="text-[22px] font-bold text-border">{num}</span>
              </div>
              <span className="text-[16px] font-semibold text-foreground">{title}</span>
              <p className="w-[240px] text-[13px] leading-[1.55] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Driver Section */}
      <section id="transportistas" className="flex w-full items-center gap-14 px-14 py-20" style={{ background: "#0a0b0f" }}>
        {/* Left */}
        <div className="flex w-[480px] shrink-0 flex-col gap-6">
          <div className="w-fit rounded-full px-3 py-1.5" style={{ background: "#18e2991a" }}>
            <span className="text-[13px] font-medium" style={{ color: "#18e299" }}>Para transportistas</span>
          </div>
          <h2 className="w-[460px] text-[34px] font-bold leading-[1.15] tracking-[-1px]" style={{ color: "#faf8f5" }}>
            También puedes trabajar como transportista
          </h2>
          <p className="w-[440px] text-base leading-[1.6]" style={{ color: "#969e9b" }}>
            Crea tu perfil, agrega tu vehículo y encuentra solicitudes disponibles cerca de ti.
          </p>
          <div className="flex flex-col gap-3.5">
            {DRIVER_BULLETS.map((bullet) => (
              <div key={bullet} className="flex items-center gap-2.5">
                <div className="flex size-[22px] items-center justify-center rounded-[11px]" style={{ background: "#18e2991a" }}>
                  <Check className="size-3" style={{ color: "#18e299" }} />
                </div>
                <span className="text-[15px]" style={{ color: "#d9d7d4" }}>{bullet}</span>
              </div>
            ))}
          </div>
          <Button asChild className="w-fit rounded-[9px] px-[26px] py-[13px] text-[15px] font-semibold">
            <Link to="/signup">Crear perfil de transportista</Link>
          </Button>
        </div>

        {/* Right — jobs card */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-[520px] overflow-hidden rounded-xl" style={{ background: "#121715", border: "1px solid #1e1f21" }}>
            <div className="flex items-center justify-between px-[18px] py-4" style={{ borderBottom: "1px solid #1e1f21" }}>
              <span className="text-[14px] font-semibold" style={{ color: "#faf8f5" }}>Solicitudes disponibles</span>
              <span className="text-[12px]" style={{ color: "#969e9b" }}>12 cerca de ti</span>
            </div>
            {DRIVER_JOBS.map(({ route, meta }, i) => (
              <div key={route} className="flex items-center justify-between px-[18px] py-3.5" style={{ borderBottom: i < DRIVER_JOBS.length - 1 ? "1px solid #1e1f21" : "none" }}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-medium" style={{ color: "#faf8f5" }}>{route}</span>
                  <span className="text-[11px]" style={{ color: "#969e9b" }}>{meta}</span>
                </div>
                <div className="rounded-[7px] px-3.5 py-1.5" style={{ background: "#18e2991a" }}>
                  <span className="text-[12px] font-semibold" style={{ color: "#18e299" }}>Cotizar</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="seguridad" className="flex w-full flex-col items-center gap-12 bg-background px-14 py-20">
        <div className="flex w-[640px] flex-col items-center gap-3">
          <h2 className="text-center text-[36px] font-bold leading-tight tracking-[-1px] text-foreground">
            Menos llamadas, más claridad
          </h2>
          <p className="w-[540px] text-center text-base leading-[1.5] text-muted-foreground">
            Todo lo importante queda registrado en la plataforma, desde la solicitud hasta la entrega.
          </p>
        </div>

        <div className="grid w-full grid-cols-3 gap-5">
          {TRUST_CARDS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-7">
              <div className="flex size-[46px] items-center justify-center rounded-[10px]" style={{ background: "#0c8c5e14" }}>
                <Icon className="size-[22px] text-primary" />
              </div>
              <span className="w-[320px] text-[17px] font-semibold leading-[1.3] text-foreground">{title}</span>
              <p className="w-[320px] text-[14px] leading-[1.55] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <p className="w-[560px] text-center text-[13px] text-muted-foreground">
          Perfiles con vehículo y datos visibles. La verificación de documentos se está incorporando.
        </p>
      </section>

      {/* Product Preview */}
      <section className="flex w-full flex-col items-center gap-12 border-y border-border bg-card px-14 py-20">
        <div className="flex w-[640px] flex-col items-center gap-3">
          <h2 className="text-center text-[36px] font-bold leading-tight tracking-[-1px] text-foreground">
            Dos vistas, una misma plataforma
          </h2>
          <p className="w-[520px] text-center text-base leading-[1.5] text-muted-foreground">
            Lo que ve quien publica un flete y quien busca trabajo como transportista.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-6">
          {/* Client Panel */}
          <div className="flex flex-col gap-4 rounded-[14px] border border-border bg-background p-6">
            <div className="flex items-center gap-2">
              <Package className="size-[18px] text-primary" />
              <span className="text-[15px] font-semibold text-foreground">Vista de cliente</span>
            </div>
            <div className="flex flex-col gap-2 rounded-[10px] border border-border bg-card p-4">
              <div className="flex w-full items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">Mudanza 2D · Providencia → Ñuñoa</span>
                <div className="rounded-full px-2 py-0.5" style={{ background: "#0c8c5e14" }}>
                  <span className="text-[10px] font-medium text-primary">Publicado</span>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground">Sáb 28 jun · 10–15 cajas · 3 fotos</span>
            </div>
            <span className="text-[12px] font-semibold text-muted-foreground">Cotizaciones recibidas</span>
            <div className="flex items-center justify-between rounded-lg px-3.5 py-[10px]" style={{ background: "#0c8c5e0d", border: "1px solid #0c8c5e" }}>
              <span className="text-[13px] font-medium text-foreground">Carlos M. · Furgón</span>
              <span className="text-[14px] font-bold text-primary">$45.000</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3.5 py-[10px]">
              <span className="text-[13px] font-medium text-foreground">Rodrigo T. · Camioneta</span>
              <span className="text-[14px] font-bold text-foreground">$52.000</span>
            </div>
            <button className="w-full rounded-lg bg-primary py-[11px] text-[13px] font-semibold text-white">
              Aceptar cotización
            </button>
          </div>

          {/* Driver Panel */}
          <div className="flex flex-col gap-4 rounded-[14px] border border-border bg-background p-6">
            <div className="flex items-center gap-2">
              <Truck className="size-[18px] text-primary" />
              <span className="text-[15px] font-semibold text-foreground">Vista de transportista</span>
            </div>
            <span className="text-[12px] font-semibold text-muted-foreground">Trabajos disponibles</span>
            {[{ route: "Providencia → Ñuñoa", when: "Hoy" }, { route: "Las Condes → Maipú", when: "Mañana" }].map(({ route, when }) => (
              <div key={route} className="flex items-center justify-between rounded-lg border border-border bg-card px-3.5 py-[10px]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-foreground">{route}</span>
                  <span className="text-[11px] text-muted-foreground">{when}</span>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            ))}
            <div className="flex flex-col gap-2 rounded-[10px] border border-border bg-card p-3.5">
              <span className="text-[12px] font-semibold text-foreground">Tu cotización</span>
              <div className="flex items-center justify-between rounded-[7px] border border-input bg-background px-3 py-[9px]">
                <span className="text-[14px] font-semibold text-foreground">$48.000</span>
                <span className="text-[12px] text-muted-foreground">CLP</span>
              </div>
              <button className="w-full rounded-lg bg-primary py-[10px] text-[13px] font-semibold text-white">
                Enviar cotización
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="flex w-full flex-col items-center gap-12 bg-background px-14 py-20">
        <div className="flex w-[640px] flex-col items-center gap-3">
          <div className="w-fit rounded-full px-3 py-[5px]" style={{ background: "#0c8c5e14" }}>
            <span className="text-[13px] font-medium text-primary">Preguntas frecuentes</span>
          </div>
          <h2 className="text-center text-[36px] font-bold leading-tight tracking-[-1px] text-foreground">
            Preguntas frecuentes
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-[780px] overflow-hidden rounded-xl border border-border">
          {FAQ_ITEMS.map(({ q, a }, i) => (
            <AccordionItem key={q} value={`item-${i}`} className={cn("border-b border-border px-6", i === FAQ_ITEMS.length - 1 && "border-b-0")}>
              <AccordionTrigger className="py-5 text-[15px] font-medium text-foreground hover:no-underline">
                {q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-[14px] leading-[1.65] text-muted-foreground">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="flex w-full flex-col items-center gap-7 px-14 py-[88px]" style={{ background: "#0a0b0f" }}>
        <div className="flex w-[680px] flex-col items-center gap-4">
          <h2 className="text-center text-[42px] font-bold leading-tight tracking-[-1.2px]" style={{ color: "#faf8f5" }}>
            ¿Listo para mover algo?
          </h2>
          <p className="w-[520px] text-center text-[17px] leading-[1.5]" style={{ color: "#969e9b" }}>
            Publica tu solicitud y deja que los transportistas coticen.
          </p>
        </div>
        <div className="flex items-center gap-3.5">
          <Button asChild className="rounded-[9px] px-[30px] py-[14px] text-[15px] font-semibold">
            <Link to="/signup">Publicar un flete</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-[9px] px-[30px] py-[14px] text-[15px] font-semibold" style={{ borderColor: "#485450", background: "transparent", color: "#faf8f5" }}>
            <Link to="/signup">Ver oportunidades como transportista</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex w-full flex-col gap-8 border-t border-border bg-background px-14 pt-12 pb-0">
        <div className="flex w-full items-start justify-between">
          {/* Brand */}
          <div className="flex w-[280px] flex-col gap-3">
            <GonexoLogo size="sm" />
            <p className="text-[13px] text-muted-foreground">El marketplace de fletes de Chile.</p>
          </div>

          {/* Columns */}
          <div className="flex gap-16">
            <div className="flex flex-col gap-3">
              <span className="text-[13px] font-semibold text-foreground">Producto</span>
              {["Cómo funciona", "Para transportistas", "Seguridad", "FAQ"].map((l) => (
                <a key={l} href="#" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">{l}</a>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[13px] font-semibold text-foreground">Empresa</span>
              {["Sobre nosotros", "Contacto", "Blog"].map((l) => (
                <a key={l} href="#" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">{l}</a>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[13px] font-semibold text-foreground">Legal</span>
              {["Términos", "Privacidad", "Cookies"].map((l) => (
                <a key={l} href="#" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-between border-t border-border py-5">
          <span className="text-[12px] text-muted-foreground">© 2026 gonexo. Todos los derechos reservados.</span>
          <span className="text-[12px] text-muted-foreground">Hecho en Chile 🇨🇱</span>
        </div>
      </footer>
    </div>
  )
}
