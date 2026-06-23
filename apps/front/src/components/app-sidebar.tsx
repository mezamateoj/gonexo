import { Link, useRouterState } from "@tanstack/react-router"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
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
import {
  LayoutList,
  CirclePlus,
  Briefcase,
  Truck,
  ChartBar,
  Settings,
  LogOut,
  ChevronsUpDown,
  PanelLeftClose,
} from "lucide-react"
import { signOut, useSession } from "@/lib/auth-client"
import { useNavigate } from "@tanstack/react-router"

const NAV_MAIN = [
  { label: "Mis solicitudes", icon: LayoutList, to: "/requests" },
  { label: "Nueva solicitud", icon: CirclePlus, to: "/requests/new" },
  { label: "Mis trabajos", icon: Briefcase, to: "/jobs", badge: "1" },
] as const

const NAV_DRIVER = [
  { label: "Solicitudes disponibles", icon: Truck, to: "/available", badge: "14" },
  { label: "Estadísticas", icon: ChartBar, to: "/stats" },
] as const

function NavItem({
  label,
  icon: Icon,
  to,
  badge,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  to: string
  badge?: string
}) {
  const { pathname } = useRouterState({ select: (s) => s.location })
  const isActive = pathname === to || pathname.startsWith(to + "/")

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
        <Link to={to}>
          <Icon className="size-4" />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
      {badge && <SidebarMenuBadge>{badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const { toggleSidebar } = useSidebar()

  const user = session?.user
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  async function handleSignOut() {
    await signOut()
    navigate({ to: "/login" })
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="h-14 border-b border-sidebar-border px-3">
        <div className="flex items-center justify-between">
          <Link to="/requests" className="flex items-center gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-[5px] bg-primary">
              <span className="text-xs font-bold text-white">g</span>
            </div>
            <span className="text-sm font-bold text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">
              gonexo
            </span>
          </Link>
          <button
            onClick={toggleSidebar}
            className="group-data-[collapsible=icon]:hidden flex size-7 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <PanelLeftClose className="size-3.5" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.08em] text-sidebar-foreground/60 px-2 mb-1">
            PRINCIPAL
          </SidebarGroupLabel>
          <SidebarMenu>
            {NAV_MAIN.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="bg-sidebar-border" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.08em] text-sidebar-foreground/60 px-2 mb-1">
            CONDUCTOR
          </SidebarGroupLabel>
          <SidebarMenu>
            {NAV_DRIVER.map((item) => (
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
                      Cliente
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
