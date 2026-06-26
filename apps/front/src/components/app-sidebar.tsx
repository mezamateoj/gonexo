import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { useEffect } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { GonexoLogo } from "@/components/gonexo-logo"
import {
  LayoutList,
  CirclePlus,
  Briefcase,
  Truck,
  MessageSquare,
  Car,
  Settings,
  LogOut,
  ChevronsUpDown,
  PanelLeftClose,
  Check,
  User,
} from "lucide-react"
import { signOut, useSession } from "@/lib/auth-client"
import { useAppMode, type AppMode } from "@/lib/app-mode"
import { cn } from "@/lib/utils"
import { useDriverProfile } from "@/hooks/use-driver-profile-gate"

const CLIENT_NAV = [
  { label: "Mis solicitudes", icon: LayoutList, to: "/requests" },
  { label: "Publicar flete", icon: CirclePlus, to: "/requests/new" },
  { label: "Mis trabajos", icon: Briefcase, to: "/jobs" },
] as const

const DRIVER_NAV = [
  { label: "Disponibles", icon: Truck, to: "/available" },
  { label: "Mis cotizaciones", icon: MessageSquare, to: "/quotes" },
  { label: "Mis trabajos", icon: Briefcase, to: "/jobs" },
  { label: "Mi vehículo", icon: Car, to: "/vehicle" },
] as const

function NavItem({
  label,
  icon: Icon,
  to,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  to: string
}) {
  const { pathname } = useRouterState({ select: (s) => s.location })
  const isActive = pathname === to || (to !== "/" && pathname.startsWith(to + "/"))

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
        <Link to={to}>
          <Icon className="size-4" />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function ModeSwitcher({
  mode,
  setMode,
  hasDriverProfile,
}: {
  mode: AppMode
  setMode: (m: AppMode) => void
  hasDriverProfile: boolean
}) {
  const navigate = useNavigate()

  function switchTo(next: AppMode) {
    if (next === "driver" && !hasDriverProfile) {
      navigate({ to: "/driver-onboarding" })
      return
    }
    setMode(next)
    navigate({ to: next === "driver" ? "/available" : "/requests" })
  }

  const isDriver = mode === "driver"

  return (
    <div className="px-2 pt-1 pb-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={cn(
            "flex w-full items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-left transition-colors",
            "hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center"
          )}>
            <div className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-[5px]",
              isDriver ? "bg-primary/15" : "bg-[#E9E7E3]"
            )}>
              {isDriver
                ? <Truck className="size-3 text-primary" />
                : <User className="size-3 text-[#485450]" />
              }
            </div>
            <span className="flex-1 text-[13px] font-semibold text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">
              {isDriver ? "Transportista" : "Cliente"}
            </span>
            <ChevronsUpDown className="size-3 shrink-0 text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={4} className="w-52">
          <DropdownMenuItem
            onClick={() => switchTo("client")}
            className={cn(!isDriver && "bg-accent")}
          >
            <User className="size-4" />
            Cliente
            {!isDriver && <Check className="ml-auto size-3.5" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => switchTo("driver")}
            className={cn(isDriver && "bg-accent")}
          >
            <Truck className="size-4" />
            Transportista
            {isDriver && <Check className="ml-auto size-3.5" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function AppSidebar() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const { toggleSidebar } = useSidebar()
  const { mode, setMode } = useAppMode()
  const { pathname } = useRouterState({ select: (s) => s.location })
  const { data: driverProfile, isFetched: driverProfileFetched } = useDriverProfile()

  useEffect(() => {
    // Don't reset mode while the user is completing driver onboarding — profile doesn't exist yet
    if (driverProfileFetched && mode === "driver" && !driverProfile && pathname !== "/driver-onboarding") {
      setMode("client")
    }
  }, [driverProfile, driverProfileFetched, mode, setMode, pathname])

  const user = session?.user
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  async function handleSignOut() {
    await signOut()
    navigate({ to: "/login" })
  }

  const isDriver = mode === "driver"
  const nav = isDriver ? DRIVER_NAV : CLIENT_NAV
  const groupLabel = isDriver ? "TRANSPORTISTA" : "CLIENTE"

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="h-14 border-b border-sidebar-border px-3">
        <div className="flex items-center justify-between">
          <Link to="/requests">
            <GonexoLogo size="xs" wordmarkClassName="group-data-[collapsible=icon]:hidden text-sidebar-accent-foreground" />
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            className="group-data-[collapsible=icon]:hidden flex size-7 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <PanelLeftClose className="size-3.5" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1 py-2">
        <ModeSwitcher mode={mode} setMode={setMode} hasDriverProfile={!!driverProfile} />

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.08em] text-sidebar-foreground/60 px-2 mb-1">
            {groupLabel}
          </SidebarGroupLabel>
          <SidebarMenu>
            {nav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-10 gap-3 data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="size-7 rounded-full bg-primary shrink-0">
                    <AvatarFallback className="bg-primary text-xs font-bold text-white rounded-full">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 text-left group-data-[collapsible=icon]:hidden">
                    <span className="text-xs font-medium text-sidebar-accent-foreground leading-none">
                      {user?.name ?? "Usuario"}
                    </span>
                    <span className="text-[11px] text-sidebar-foreground leading-none">
                      {isDriver ? "Transportista" : "Cliente"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-3.5 text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <Settings className="size-4" />
                    Configuración
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="size-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
