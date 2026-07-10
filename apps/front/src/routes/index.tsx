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
  { icon: Inbox, num: "02", title: "Recibe ofertas", desc: "Transportistas disponibles te envían sus ofertas." },
  { icon: CircleCheck, num: "03", title: "Compara y acepta", desc: "Revisa precio, vehículo, perfil y mensaje antes de elegir." },
  { icon: Truck, num: "04", title: "Coordina el trabajo", desc: "Sigue el estado del flete hasta la entrega final." },
]

const TRUST_CARDS = [
  { icon: Lock, title: "Contacto protegido hasta que hay match", desc: "No se muestran teléfonos antes de aceptar una oferta." },
  { icon: Image, title: "Fotos y detalles antes de ofertar", desc: "Menos sorpresas para el conductor y precios más certeros." },
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
  { q: "¿Cuánto cuesta publicar un flete?", a: "Publicar una solicitud es completamente gratis. Gonexo no cobra comisiones a clientes por recibir ofertas." },
  { q: "¿Cómo elijo al transportista?", a: "Revisa el precio, vehículo, perfil y mensaje de cada oferta. Solo tú decides quién hace el trabajo." },
  { q: "¿Puedo ser cliente y transportista con la misma cuenta?", a: "Sí, puedes publicar solicitudes y también ofertar por fletes con la misma cuenta." },
  { q: "¿Qué necesito para ofertar como transportista?", a: "Necesitas crear un perfil con los datos de tu vehículo (tipo, patente, fotos) y tu información de contacto." },
  { q: "¿Cuándo veo el teléfono de la otra persona?", a: "Solo después de aceptar una oferta. El contacto queda protegido hasta que hay un match." },
  { q: "¿Qué pasa si el transportista no aparece?", a: "Puedes contactarnos para resolver el problema. Estamos trabajando en un sistema de garantías para estos casos." },
]

function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 flex h-[58px] shrink-0 items-center justify-between border-b border-border bg-background px-5 md:h-[68px] md:px-14">
        <GonexoLogo size="md" />

        {/* Nav links — desktop only */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a key={label} href={href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login" className="text-[13px] font-medium text-foreground transition-colors hover:text-muted-foreground md:text-sm">
            Iniciar sesión
          </Link>
          <Button asChild size="sm" className="rounded-[7px] px-[14px] py-[7px] text-[13px] md:rounded-lg md:px-[18px]">
            <Link to="/signup">Comenzar</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex w-full flex-col items-center gap-7 bg-background px-5 py-12 text-center md:flex-row md:gap-14 md:px-14 md:py-[72px] md:text-left">
        {/* Left */}
        <div className="flex w-full flex-col items-center gap-7 md:w-[540px] md:shrink-0 md:items-start">
          <div className="flex w-fit items-center gap-2 rounded-full px-3 py-1.5" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
            <div className="size-[7px] rounded-full bg-primary" />
            <span className="text-[12px] font-medium text-primary md:text-[13px]">Marketplace de fletes en Chile</span>
          </div>

          <h1 className="text-[36px] font-bold leading-[1.08] tracking-[-1.2px] text-foreground md:text-[52px] md:tracking-[-1.5px]">
            Publica tu flete.<br />Recibe ofertas.<br />Elige tranquilo.
          </h1>

          <p className="text-[15px] leading-[1.6] text-muted-foreground md:w-[480px] md:text-[17px]">
            Describe qué necesitas mover, agrega origen y destino, y recibe ofertas de transportistas disponibles. Tú comparas y eliges.
          </p>

          {/* CTAs — stacked on mobile, row on desktop */}
          <div className="flex w-full flex-col gap-[10px] md:w-auto md:flex-row md:gap-3">
            <Button asChild className="w-full rounded-[9px] py-[14px] text-[15px] font-semibold md:w-auto md:px-[26px] md:py-[13px]">
              <Link to="/signup">Publicar un flete</Link>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-[9px] border-border bg-card py-[14px] text-[15px] font-semibold md:w-auto md:px-[26px] md:py-[13px]">
              <Link to="/signup">Soy transportista</Link>
            </Button>
          </div>

          {/* Status strip */}
          <div className="flex items-center justify-center gap-2 md:justify-start md:gap-2.5">
            <div className="flex items-center gap-1.5 rounded-full px-3 py-[5px]" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              <div className="size-[6px] rounded-full bg-primary" />
              <span className="text-xs font-medium text-primary">Publicado</span>
            </div>
            <span className="text-[12px] text-muted-foreground md:text-[13px]">→</span>
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-[5px]">
              <div className="size-[6px] rounded-full bg-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Cotizado</span>
            </div>
            <span className="text-[12px] text-muted-foreground md:text-[13px]">→</span>
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-[5px]">
              <div className="size-[6px] rounded-full bg-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Aceptado</span>
            </div>
          </div>
        </div>

        {/* Right — mock cards (desktop only on side; mobile shows below) */}
        <div className="flex w-full flex-1 items-center justify-center">
          <div className="flex w-full flex-col gap-3 md:w-[460px] md:gap-4">
            {/* Request card */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-[0_4px_16px_#0000000f] md:gap-3.5 md:p-5">
              <div className="flex w-full items-center justify-between">
                <span className="text-[14px] font-semibold text-foreground md:text-[15px]">Mudanza departamento 2D</span>
                <div className="rounded-full px-[9px] py-[3px]" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
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
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-[0_4px_16px_#0000000f] md:p-5">
              <span className="text-[14px] font-semibold text-foreground">3 ofertas recibidas</span>
              <div className="flex items-center justify-between rounded-lg px-3 py-[10px]" style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", border: "1px solid var(--primary)" }}>
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
      <section id="como-funciona" className="flex w-full flex-col gap-8 border-y border-border bg-card px-5 py-14 md:items-center md:gap-12 md:px-14 md:py-20">
        <div className="flex flex-col gap-3 md:w-[640px] md:items-center">
          <h2 className="text-[26px] font-bold leading-tight tracking-[-0.8px] text-foreground md:text-center md:text-[36px] md:tracking-[-1px]">
            De publicar a elegir en pocos pasos
          </h2>
          <p className="text-[14px] leading-[1.5] text-muted-foreground md:w-[520px] md:text-center md:text-base">
            Un flujo simple, pensado para que muevas lo que necesitas sin complicaciones.
          </p>
        </div>

        {/* Mobile: stacked row cards / Desktop: 4-col grid */}
        <div className="flex flex-col gap-3 md:grid md:w-full md:grid-cols-4 md:gap-5">
          {STEPS.map(({ icon: Icon, num, title, desc }) => (
            <div
              key={num}
              className="flex items-center gap-[14px] rounded-[12px] border border-border bg-background p-5 md:flex-col md:items-start md:gap-3.5 md:p-6"
            >
              {/* Icon box */}
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] md:size-[42px] md:rounded-[9px]" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <Icon className="size-5 text-primary" />
              </div>
              {/* Text */}
              <div className="flex flex-1 flex-col gap-1 md:flex-none md:gap-3.5">
                {/* Step number — desktop only */}
                <span className="hidden self-end text-[22px] font-bold text-border md:block">{num}</span>
                <span className="text-[14px] font-semibold text-foreground md:text-[16px]">{title}</span>
                <p className="text-[12px] leading-[1.55] text-muted-foreground md:w-[240px] md:text-[13px]">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Driver Section */}
      <section id="transportistas" className="flex w-full flex-col gap-8 px-5 py-14 md:flex-row md:items-center md:gap-14 md:px-14 md:py-20" style={{ background: "var(--color-panel)" }}>
        {/* Text content */}
        <div className="flex w-full flex-col gap-6 md:w-[480px] md:shrink-0">
          <div className="w-fit rounded-full px-3 py-1.5" style={{ background: "color-mix(in srgb, var(--color-panel-accent) 10%, transparent)" }}>
            <span className="text-[12px] font-medium md:text-[13px]" style={{ color: "var(--color-panel-accent)" }}>Para transportistas</span>
          </div>
          <h2 className="text-[28px] font-bold leading-[1.15] tracking-[-0.8px] md:w-[460px] md:text-[34px] md:tracking-[-1px]" style={{ color: "var(--color-surface)" }}>
            También puedes trabajar como transportista
          </h2>
          <p className="text-[15px] leading-[1.6] md:w-[440px]" style={{ color: "var(--color-muted-foreground)" }}>
            Crea tu perfil, agrega tu vehículo y encuentra fletes disponibles cerca de ti.
          </p>
          <div className="flex flex-col gap-3">
            {DRIVER_BULLETS.map((bullet) => (
              <div key={bullet} className="flex items-center gap-2.5">
                <div className="flex size-[22px] shrink-0 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--color-panel-accent) 10%, transparent)" }}>
                  <Check className="size-3" style={{ color: "var(--color-panel-accent)" }} />
                </div>
                <span className="text-[15px]" style={{ color: "var(--color-panel-muted)" }}>{bullet}</span>
              </div>
            ))}
          </div>
          <Button asChild className="w-full rounded-[9px] py-[14px] text-[15px] font-semibold md:w-fit md:px-[26px] md:py-[13px]">
            <Link to="/signup">Crear perfil de transportista</Link>
          </Button>
        </div>

        {/* Jobs card */}
        <div className="flex w-full flex-1 items-center justify-center">
          <div className="w-full overflow-hidden rounded-xl md:w-[520px]" style={{ background: "var(--color-foreground)", border: "1px solid var(--color-panel-line)" }}>
            <div className="flex items-center justify-between px-[18px] py-4" style={{ borderBottom: "1px solid var(--color-panel-line)" }}>
              <span className="text-[14px] font-semibold" style={{ color: "var(--color-surface)" }}>Fletes disponibles</span>
              <span className="text-[12px]" style={{ color: "var(--color-muted-foreground)" }}>12 cerca de ti</span>
            </div>
            {DRIVER_JOBS.map(({ route, meta }, i) => (
              <div key={route} className="flex items-center justify-between px-[18px] py-3.5" style={{ borderBottom: i < DRIVER_JOBS.length - 1 ? "1px solid var(--color-panel-line)" : "none" }}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-medium" style={{ color: "var(--color-surface)" }}>{route}</span>
                  <span className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>{meta}</span>
                </div>
                <div className="rounded-[7px] px-3.5 py-1.5" style={{ background: "color-mix(in srgb, var(--color-panel-accent) 10%, transparent)" }}>
                  <span className="text-[12px] font-semibold" style={{ color: "var(--color-panel-accent)" }}>Ofertar</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="seguridad" className="flex w-full flex-col gap-8 bg-background px-5 py-14 md:items-center md:gap-12 md:px-14 md:py-20">
        <div className="flex flex-col gap-3 md:w-[640px] md:items-center">
          <h2 className="text-[26px] font-bold leading-tight tracking-[-0.8px] text-foreground md:text-center md:text-[36px] md:tracking-[-1px]">
            Menos llamadas, más claridad
          </h2>
          <p className="text-[14px] leading-[1.5] text-muted-foreground md:w-[540px] md:text-center md:text-base">
            Todo lo importante queda registrado en la plataforma, desde la solicitud hasta la entrega.
          </p>
        </div>

        {/* Mobile: stacked row cards / Desktop: 3-col grid */}
        <div className="flex flex-col gap-3 md:grid md:w-full md:grid-cols-3 md:gap-5">
          {TRUST_CARDS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-center gap-4 rounded-[12px] border border-border bg-card p-[18px] md:flex-col md:items-start md:gap-3.5 md:p-7"
            >
              <div className="flex size-[42px] shrink-0 items-center justify-center rounded-[10px] md:size-[46px]" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <Icon className="size-5 text-primary md:size-[22px]" />
              </div>
              <div className="flex flex-1 flex-col gap-1 md:flex-none md:gap-2">
                <span className="text-[14px] font-semibold leading-[1.3] text-foreground md:w-[320px] md:text-[17px]">{title}</span>
                <p className="text-[12px] leading-[1.55] text-muted-foreground md:w-[320px] md:text-[14px]">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[12px] text-muted-foreground md:w-[560px] md:text-[13px]">
          Perfiles con vehículo y datos visibles. La verificación de documentos se está incorporando.
        </p>
      </section>

      {/* Product Preview — desktop only */}
      <section className="hidden w-full flex-col items-center gap-12 border-y border-border bg-card px-14 py-20 md:flex">
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
                <div className="rounded-full px-2 py-0.5" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                  <span className="text-[10px] font-medium text-primary">Publicado</span>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground">Sáb 28 jun · 10–15 cajas · 3 fotos</span>
            </div>
            <span className="text-[12px] font-semibold text-muted-foreground">Ofertas recibidas</span>
            <div className="flex items-center justify-between rounded-lg px-3.5 py-[10px]" style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", border: "1px solid var(--primary)" }}>
              <span className="text-[13px] font-medium text-foreground">Carlos M. · Furgón</span>
              <span className="text-[14px] font-bold text-primary">$45.000</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3.5 py-[10px]">
              <span className="text-[13px] font-medium text-foreground">Rodrigo T. · Camioneta</span>
              <span className="text-[14px] font-bold text-foreground">$52.000</span>
            </div>
            <button className="w-full rounded-lg bg-primary py-[11px] text-[13px] font-semibold text-white">
              Aceptar oferta
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
              <span className="text-[12px] font-semibold text-foreground">Tu oferta</span>
              <div className="flex items-center justify-between rounded-[7px] border border-input bg-background px-3 py-[9px]">
                <span className="text-[14px] font-semibold text-foreground">$48.000</span>
                <span className="text-[12px] text-muted-foreground">CLP</span>
              </div>
              <button className="w-full rounded-lg bg-primary py-[10px] text-[13px] font-semibold text-white">
                Enviar oferta
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="flex w-full flex-col gap-7 bg-background px-5 py-14 md:items-center md:gap-12 md:px-14 md:py-20">
        <div className="flex flex-col gap-3 md:w-[640px] md:items-center">
          <div className="w-fit rounded-full px-3 py-[5px]" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
            <span className="text-[12px] font-medium text-primary md:text-[13px]">Preguntas frecuentes</span>
          </div>
          <h2 className="text-[26px] font-bold leading-tight tracking-[-0.8px] text-foreground md:text-center md:text-[36px] md:tracking-[-1px]">
            Preguntas frecuentes
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full overflow-hidden rounded-xl border border-border md:w-[780px]">
          {FAQ_ITEMS.map(({ q, a }, i) => (
            <AccordionItem key={q} value={`item-${i}`} className={cn("border-b border-border px-5 md:px-6", i === FAQ_ITEMS.length - 1 && "border-b-0")}>
              <AccordionTrigger className="py-[18px] text-[14px] font-medium text-foreground hover:no-underline md:py-5 md:text-[15px]">
                {q}
              </AccordionTrigger>
              <AccordionContent className="pb-[18px] text-[13px] leading-[1.65] text-muted-foreground md:pb-5 md:text-[14px]">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="flex w-full flex-col items-center gap-6 px-5 py-16 md:gap-7 md:px-14 md:py-[88px]" style={{ background: "var(--color-panel)" }}>
        <div className="flex flex-col items-center gap-3 md:w-[680px] md:gap-4">
          <h2 className="text-center text-[32px] font-bold leading-[1.1] tracking-[-1px] md:text-[42px] md:tracking-[-1.2px]" style={{ color: "var(--color-surface)" }}>
            ¿Listo para<br className="md:hidden" /> mover algo?
          </h2>
          <p className="text-center text-[15px] leading-[1.5]" style={{ color: "var(--color-muted-foreground)" }}>
            Publica tu solicitud y deja que los transportistas coticen.
          </p>
        </div>
        {/* Buttons — stacked on mobile, row on desktop */}
        <div className="flex w-full flex-col gap-[10px] md:w-auto md:flex-row md:gap-3.5">
          <Button asChild className="w-full rounded-[9px] py-[15px] text-[15px] font-semibold md:w-auto md:px-[30px] md:py-[14px]">
            <Link to="/signup">Publicar un flete</Link>
          </Button>
          <Button asChild variant="outline" className="w-full rounded-[9px] py-[15px] text-[15px] font-semibold md:w-auto md:px-[30px] md:py-[14px]" style={{ borderColor: "var(--color-ink-soft)", background: "transparent", color: "var(--color-surface)" }}>
            <Link to="/signup">Ver oportunidades como transportista</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex w-full flex-col gap-7 border-t border-border bg-background px-5 pt-10 pb-0 md:gap-8 md:px-14 md:pt-12">
        <div className="flex w-full flex-col gap-7 md:flex-row md:items-start md:justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-2.5 md:w-[280px] md:gap-3">
            <GonexoLogo size="sm" />
            <p className="text-[13px] text-muted-foreground">El marketplace de fletes de Chile.</p>
          </div>

          {/* Link columns */}
          <div className="flex justify-between gap-8 md:justify-end md:gap-16">
            <div className="flex flex-col gap-3">
              <span className="text-[13px] font-semibold text-foreground">Producto</span>
              {["Cómo funciona", "Para transportistas", "Seguridad", "FAQ"].map((l) => (
                <a key={l} href="#" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">{l}</a>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[13px] font-semibold text-foreground">Empresa</span>
              {["Sobre nosotros", "Contacto", "Blog"].map((l) => (
                <a key={l} href="#" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">{l}</a>
              ))}
            </div>
            {/* Legal — desktop only */}
            <div className="hidden flex-col gap-3 md:flex">
              <span className="text-[13px] font-semibold text-foreground">Legal</span>
              {["Términos", "Privacidad", "Cookies"].map((l) => (
                <a key={l} href="#" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">{l}</a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar — stacked on mobile, row on desktop */}
        <div className="flex flex-col gap-1 border-t border-border py-4 md:flex-row md:items-center md:justify-between md:py-5">
          <span className="text-[11px] text-muted-foreground md:text-[12px]">© 2026 gonexo. Todos los derechos reservados.</span>
          <span className="text-[11px] text-muted-foreground md:text-[12px]">Hecho en Chile 🇨🇱</span>
        </div>
      </footer>
    </div>
  )
}
