/* Hallmark · genre: modern-minimal · macrostructure: Workbench (editorial spine)
 * theme: CargUp road black, signal red, and Montserrat
 * nav: N1b slim · footer: slim index · enrichment: Tier-A CSS product surfaces
 * diversification: suspended — locked design-system project (index.css is the source of truth)
 */
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FilePlus2, Inbox, CircleCheck, Truck, Lock, Image, ListChecks, Package, Check, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { CargUpLogo } from "@/components/cargup-logo"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

// Shared editorial container — every section composes on the same spine.
const CONTAINER = "mx-auto w-full max-w-6xl px-5 md:px-8"

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

const HERO_QUOTES = [
  { name: "Rodrigo T.", sub: "Camioneta · ★ 4.7", price: "$52.000" },
  { name: "Andrés P.", sub: "Furgón · ★ 4.8", price: "$60.000" },
]

const FAQ_ITEMS = [
  { q: "¿Cuánto cuesta publicar un flete?", a: "Publicar una solicitud es completamente gratis. CargUp no cobra comisiones a clientes por recibir ofertas." },
  { q: "¿Cómo elijo al transportista?", a: "Revisa el precio, vehículo, perfil y mensaje de cada oferta. Solo tú decides quién hace el trabajo." },
  { q: "¿Puedo ser cliente y transportista con la misma cuenta?", a: "No. Al registrarte eliges una cuenta de cliente o de transportista. Cada una tiene herramientas y responsabilidades distintas." },
  { q: "¿Qué necesito para ofertar como transportista?", a: "Necesitas crear un perfil con los datos de tu vehículo (tipo, patente, fotos) y tu información de contacto." },
  { q: "¿Cuándo veo el teléfono de la otra persona?", a: "Solo después de aceptar una oferta. El contacto queda protegido hasta que hay un match." },
  { q: "¿Qué pasa si el transportista no aparece?", a: "Puedes contactarnos para resolver el problema. Estamos trabajando en un sistema de garantías para estos casos." },
]

function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Nav — slim, edge-aligned, links sit beside the wordmark on a spine */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className={cn(CONTAINER, "flex h-14 items-center justify-between md:h-16")}>
          <div className="flex items-center gap-9">
            <CargUpLogo size="md" />
            <nav className="hidden items-center gap-7 md:flex">
              {NAV_LINKS.map(({ label, href }) => (
                <a key={label} href={href} className="text-sm text-ink-muted transition-colors hover:text-foreground">
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden px-2 text-sm font-medium text-foreground transition-colors hover:text-ink-muted sm:inline">
              Iniciar sesión
            </Link>
            <Button asChild size="sm">
              <Link to="/signup">Comenzar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — editorial left spine, one product panel on the right */}
      <section className="bg-background">
        <div className={cn(CONTAINER, "grid items-center gap-12 py-14 md:grid-cols-[minmax(0,1fr)_440px] md:gap-16 md:py-24")}>
          {/* Left — the statement */}
          <div className="flex flex-col items-start gap-7">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Marketplace de fletes · Chile
            </span>

            <h1 className="font-heading text-[40px] font-bold leading-[1.04] tracking-tight text-foreground md:text-[58px]">
              Publica tu flete.<br />Recibe ofertas reales.
            </h1>

            <p className="max-w-[480px] text-[16px] leading-[1.6] text-ink-muted md:text-[18px]">
              Describe qué necesitas mover, agrega origen y destino, y recibe ofertas de transportistas disponibles. Tú comparas y eliges.
            </p>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg" className="w-full text-[15px] sm:w-auto">
                <Link to="/signup" search={{ accountType: "client" }}>Publicar un flete</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full text-[15px] sm:w-auto">
                <Link to="/signup" search={{ accountType: "driver" }}>Soy transportista</Link>
              </Button>
            </div>

            <p className="text-[13px] text-ink-muted">
              Gratis para publicar <span className="text-ink-faint">·</span> Contacto protegido <span className="text-ink-faint">·</span> Sin comisiones a clientes
            </p>
          </div>

          {/* Right — the product panel: request → progress → ofertas, one coherent surface */}
          <div className="w-full rounded-xl border border-border bg-card shadow-sm">
            {/* Request header strip */}
            <div className="flex flex-col gap-3 border-b border-border p-5">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold text-foreground">Mudanza departamento 2D</span>
                <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">Publicado</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-ink-muted">
                <span>Providencia</span>
                <ArrowRight className="size-4" />
                <span>Ñuñoa</span>
              </div>
              <div className="flex items-center gap-4 text-[12px] text-ink-faint">
                <span>Sáb 28 jun</span>
                <span>10–15 cajas</span>
                <span>3 fotos</span>
              </div>

              {/* Progress stepper — the old status strip, now anchored to the request */}
              <div className="mt-1 flex items-center gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 font-medium text-primary">
                  <span className="size-1.5 rounded-full bg-primary" /> Publicado
                </span>
                <span className="h-px flex-1 bg-border" />
                <span className="flex items-center gap-1.5 text-ink-faint">
                  <span className="size-1.5 rounded-full bg-ink-faint" /> Cotizado
                </span>
                <span className="h-px flex-1 bg-border" />
                <span className="flex items-center gap-1.5 text-ink-faint">
                  <span className="size-1.5 rounded-full bg-ink-faint" /> Aceptado
                </span>
              </div>
            </div>

            {/* Ofertas list */}
            <div className="flex flex-col gap-2.5 p-5">
              <span className="text-[13px] font-semibold text-foreground">3 ofertas recibidas</span>

              {/* Accepted / recommended */}
              <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">C</div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-foreground">Carlos M.</span>
                    <span className="text-[11px] text-ink-muted">Furgón · ★ 4.9</span>
                  </div>
                </div>
                <span className="text-[15px] font-bold text-primary">$45.000</span>
              </div>

              {HERO_QUOTES.map(({ name, sub, price }) => (
                <div key={name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">{name[0]}</div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium text-foreground">{name}</span>
                      <span className="text-[11px] text-ink-muted">{sub}</span>
                    </div>
                  </div>
                  <span className="text-[15px] font-semibold text-foreground">{price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — horizontal numbered ledger on a rule line */}
      <section id="como-funciona" className="border-y border-border bg-card">
        <div className={cn(CONTAINER, "flex flex-col gap-10 py-16 md:gap-14 md:py-24")}>
          <div className="flex max-w-[560px] flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Cómo funciona</span>
            <h2 className="font-heading text-[28px] font-bold leading-tight tracking-tight text-foreground md:text-[40px]">
              De publicar a elegir en pocos pasos
            </h2>
            <p className="text-[15px] leading-[1.55] text-ink-muted md:text-base">
              Un flujo simple, pensado para que muevas lo que necesitas sin complicaciones.
            </p>
          </div>

          <div className="grid gap-x-8 gap-y-8 md:grid-cols-4">
            {STEPS.map(({ icon: Icon, num, title, desc }) => (
              <div key={num} className="flex flex-col gap-4 border-t border-border pt-5">
                <div className="flex items-center justify-between">
                  <span className="font-heading text-[26px] font-semibold text-ink-faint md:text-[30px]">{num}</span>
                  <Icon className="size-5 text-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[15px] font-semibold text-foreground md:text-base">{title}</h3>
                  <p className="text-[13px] leading-[1.55] text-ink-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Driver Section — dark panel, editorial split + real data table */}
      <section id="transportistas" className="bg-panel">
        <div className={cn(CONTAINER, "grid gap-12 py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center md:gap-16 md:py-24")}>
          {/* Text */}
          <div className="flex flex-col items-start gap-6">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-panel-accent">Para transportistas</span>
            <h2 className="font-heading text-[30px] font-bold leading-[1.12] tracking-tight text-surface md:text-[38px]">
              Encuentra trabajo como transportista
            </h2>
            <p className="max-w-[440px] text-[16px] leading-[1.6] text-panel-muted">
              Crea tu perfil, agrega tu vehículo y encuentra fletes disponibles cerca de ti.
            </p>
            <div className="flex flex-col gap-3">
              {DRIVER_BULLETS.map((bullet) => (
                <div key={bullet} className="flex items-center gap-2.5">
                  <div className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-panel-accent/10">
                    <Check className="size-3 text-panel-accent" />
                  </div>
                  <span className="text-[15px] text-panel-muted">{bullet}</span>
                </div>
              ))}
            </div>
            <Button asChild size="lg" className="mt-1 w-full text-[15px] sm:w-fit">
              <Link to="/signup" search={{ accountType: "driver" }}>Crear cuenta de transportista</Link>
            </Button>
          </div>

          {/* Jobs table */}
          <div className="w-full overflow-hidden rounded-xl border border-panel-border bg-panel-card">
            <div className="flex items-center justify-between border-b border-panel-line px-5 py-4">
              <span className="text-[14px] font-semibold text-surface">Fletes disponibles</span>
              <span className="text-[12px] text-panel-muted">12 cerca de ti</span>
            </div>
            {DRIVER_JOBS.map(({ route, meta }, i) => (
              <div
                key={route}
                className={cn(
                  "flex items-center justify-between px-5 py-3.5",
                  i < DRIVER_JOBS.length - 1 && "border-b border-panel-line",
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-surface">{route}</span>
                  <span className="text-[11px] text-panel-muted">{meta}</span>
                </div>
                <span className="rounded-md bg-panel-accent/10 px-3.5 py-1.5 text-[12px] font-semibold text-panel-accent">Ofertar</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section — three items divided by hairlines, unboxed icons */}
      <section id="seguridad" className="bg-background">
        <div className={cn(CONTAINER, "flex flex-col gap-10 py-16 md:gap-14 md:py-24")}>
          <div className="flex max-w-[560px] flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Seguridad</span>
            <h2 className="font-heading text-[28px] font-bold leading-tight tracking-tight text-foreground md:text-[40px]">
              Menos llamadas, más claridad
            </h2>
            <p className="text-[15px] leading-[1.55] text-ink-muted md:text-base">
              Todo lo importante queda registrado en la plataforma, desde la solicitud hasta la entrega.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border">
            {TRUST_CARDS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col gap-3 md:px-8 md:first:pl-0 md:last:pr-0">
                <Icon className="size-6 text-primary" />
                <h3 className="text-[16px] font-semibold leading-[1.3] text-foreground md:text-[17px]">{title}</h3>
                <p className="text-[13px] leading-[1.55] text-ink-muted md:text-[14px]">{desc}</p>
              </div>
            ))}
          </div>

          <p className="text-[13px] text-ink-faint">
            Perfiles con vehículo y datos visibles. La verificación de documentos se está incorporando.
          </p>
        </div>
      </section>

      {/* Product Preview — the workbench payoff, two views side by side (desktop) */}
      <section className="hidden border-y border-border bg-card md:block">
        <div className={cn(CONTAINER, "flex flex-col gap-12 py-24")}>
          <div className="flex max-w-[560px] flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">La plataforma</span>
            <h2 className="font-heading text-[40px] font-bold leading-tight tracking-tight text-foreground">
              Dos vistas, una misma plataforma
            </h2>
            <p className="max-w-[520px] text-base leading-[1.5] text-ink-muted">
              Lo que ve quien publica un flete y quien busca trabajo como transportista.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Client Panel */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-6">
              <div className="flex items-center gap-2">
                <Package className="size-[18px] text-primary" />
                <span className="text-[15px] font-semibold text-foreground">Vista de cliente</span>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
                <div className="flex w-full items-center justify-between">
                  <span className="text-[13px] font-semibold text-foreground">Mudanza 2D · Providencia → Ñuñoa</span>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">Publicado</span>
                </div>
                <span className="text-[11px] text-ink-muted">Sáb 28 jun · 10–15 cajas · 3 fotos</span>
              </div>
              <span className="text-[12px] font-semibold text-ink-muted">Ofertas recibidas</span>
              <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 px-3.5 py-2.5">
                <span className="text-[13px] font-medium text-foreground">Carlos M. · Furgón</span>
                <span className="text-[14px] font-bold text-primary">$45.000</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3.5 py-2.5">
                <span className="text-[13px] font-medium text-foreground">Rodrigo T. · Camioneta</span>
                <span className="text-[14px] font-bold text-foreground">$52.000</span>
              </div>
              <span className="mt-1 w-full rounded-md bg-primary py-[11px] text-center text-[13px] font-semibold text-primary-foreground">
                Aceptar oferta
              </span>
            </div>

            {/* Driver Panel */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-6">
              <div className="flex items-center gap-2">
                <Truck className="size-[18px] text-primary" />
                <span className="text-[15px] font-semibold text-foreground">Vista de transportista</span>
              </div>
              <span className="text-[12px] font-semibold text-ink-muted">Trabajos disponibles</span>
              {[{ route: "Providencia → Ñuñoa", when: "Hoy" }, { route: "Las Condes → Maipú", when: "Mañana" }].map(({ route, when }) => (
                <div key={route} className="flex items-center justify-between rounded-lg border border-border bg-card px-3.5 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-medium text-foreground">{route}</span>
                    <span className="text-[11px] text-ink-muted">{when}</span>
                  </div>
                  <ArrowRight className="size-4 text-ink-muted" />
                </div>
              ))}
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3.5">
                <span className="text-[12px] font-semibold text-foreground">Tu oferta</span>
                <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2.5">
                  <span className="text-[14px] font-semibold text-foreground">$48.000</span>
                  <span className="text-[12px] text-ink-muted">CLP</span>
                </div>
                <span className="w-full rounded-md bg-primary py-[10px] text-center text-[13px] font-semibold text-primary-foreground">
                  Enviar oferta
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — head left, accordion right */}
      <section id="faq" className="bg-background">
        <div className={cn(CONTAINER, "grid gap-10 py-16 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-16 md:py-24")}>
          <div className="flex flex-col gap-3 md:sticky md:top-24 md:self-start">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Preguntas frecuentes</span>
            <h2 className="font-heading text-[28px] font-bold leading-tight tracking-tight text-foreground md:text-[36px]">
              Todo lo que necesitas saber
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map(({ q, a }, i) => (
              <AccordionItem key={q} value={`item-${i}`} className={cn("border-b border-border", i === 0 && "border-t")}>
                <AccordionTrigger className="py-5 text-left text-[15px] font-medium text-foreground hover:no-underline">
                  {q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[14px] leading-[1.65] text-ink-muted">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA — left statement on the dark panel */}
      <section className="bg-panel">
        <div className={cn(CONTAINER, "flex flex-col gap-8 py-20 md:flex-row md:items-end md:justify-between md:py-28")}>
          <div className="flex max-w-[600px] flex-col gap-4">
            <h2 className="font-heading text-[34px] font-bold leading-[1.06] tracking-tight text-surface md:text-[46px]">
              ¿Listo para mover algo?
            </h2>
            <p className="text-[16px] leading-[1.5] text-panel-muted">
              Publica tu solicitud y deja que los transportistas coticen.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:shrink-0 md:flex-row">
            <Button asChild size="lg" className="w-full text-[15px] md:w-auto">
              <Link to="/signup" search={{ accountType: "client" }}>Publicar un flete</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-panel-border bg-transparent text-[15px] text-surface hover:bg-panel-card hover:text-surface md:w-auto"
            >
              <Link to="/signup" search={{ accountType: "driver" }}>Ver oportunidades</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className={cn(CONTAINER, "flex flex-col gap-10 pt-12 pb-0")}>
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="flex max-w-[280px] flex-col gap-3">
              <CargUpLogo size="sm" />
              <p className="text-[13px] text-ink-muted">El marketplace de fletes de Chile.</p>
            </div>

            <div className="flex justify-between gap-8 md:justify-end md:gap-16">
              <div className="flex flex-col gap-3">
                <span className="text-[13px] font-semibold text-foreground">Producto</span>
                {["Cómo funciona", "Para transportistas", "Seguridad", "FAQ"].map((l) => (
                  <a key={l} href="#" className="text-[13px] text-ink-muted transition-colors hover:text-foreground">{l}</a>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-[13px] font-semibold text-foreground">Empresa</span>
                {["Sobre nosotros", "Contacto", "Blog"].map((l) => (
                  <a key={l} href="#" className="text-[13px] text-ink-muted transition-colors hover:text-foreground">{l}</a>
                ))}
              </div>
              <div className="hidden flex-col gap-3 md:flex">
                <span className="text-[13px] font-semibold text-foreground">Legal</span>
                {["Términos", "Privacidad", "Cookies"].map((l) => (
                  <a key={l} href="#" className="text-[13px] text-ink-muted transition-colors hover:text-foreground">{l}</a>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t border-border py-5 md:flex-row md:items-center md:justify-between">
            <span className="text-[12px] text-ink-faint">© 2026 CargUp. Todos los derechos reservados.</span>
            <span className="text-[12px] text-ink-faint">Hecho en Chile 🇨🇱</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
