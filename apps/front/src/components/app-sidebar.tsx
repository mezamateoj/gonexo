import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { GonexoLogo } from "@/components/gonexo-logo"
import {
  CirclePlus,
  Briefcase,
  Truck,
  Settings,
  LogOut,
  ChevronsUpDown,
  PanelLeftClose,
  User,
  Users,
  ShieldCheck,
} from "lucide-react"
import { signOut, useSession } from "@/lib/auth-client"
import { useAppMode } from "@/lib/app-mode"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { Badge } from "@/components/ui/badge"

const CLIENT_NAV = [
  { label: "Publicar flete", icon: CirclePlus, to: "/requests/new" },
  { label: "Mis fletes", icon: Briefcase, to: "/requests" },
] as const

const DRIVER_NAV = [
  { label: "Buscar fletes", icon: Truck, to: "/available" },
  { label: "Mis fletes", icon: Briefcase, to: "/jobs" },
] as const

const ADMIN_NAV = [
  { label: "Usuarios", icon: Users, to: "/admin/users" },
  { label: "Verificación", icon: ShieldCheck, to: "/admin/drivers" },
] as const

function NavItem({
  label,
  icon: Icon,
  to,
  isActive,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  to: string
  isActive: boolean
}) {
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
        <Link to={to} onClick={() => isMobile && setOpenMobile(false)}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const { data: session } = useSession()
  const userId = session?.user.id

  const { data: currentUser } = useQuery({
    queryKey: queryKeys.users.me(userId ?? "anonymous"),
    queryFn: api.users.me,
    enabled: !!userId,
  })

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toggleSidebar } = useSidebar()
  const { mode, setMode, clearMode, hasDriverProfile } = useAppMode()

  const userName = currentUser?.name ?? session?.user.name
  const userEmail = currentUser?.email ?? session?.user.email
  const initials = userName
    ? userName.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  async function handleSignOut() {
    // signOut clears the Better Auth session cookie and the useSession store.
    // Drop account-scoped queries and the current session's mode selection too.
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          clearMode()
          queryClient.clear()
          navigate({ to: "/login" })
        },
      },
    })
  }

  const { pathname } = useRouterState({ select: (s) => s.location })

  const isDriver = mode === "driver"
  const isAdmin = session?.user.role === "admin"
  const nav = isDriver ? DRIVER_NAV : CLIENT_NAV

  // Pick the single best match: the nav item whose `to` is the longest prefix of
  // the current path. This keeps "Mis fletes" (/requests) from lighting up on
  // /requests/new, where "Publicar flete" (/requests/new) is the more specific match.
  const candidates = [
    ...nav.map((i) => i.to),
    "/driver-onboarding",
    ...(isAdmin ? ADMIN_NAV.map((i) => i.to) : []),
  ]
  const matches = candidates.filter(
    (to) => pathname === to || (to !== "/" && pathname.startsWith(to + "/")),
  )
  const activeTo = matches.reduce((best, to) => (to.length > best.length ? to : best), "")

  function switchMode() {
    const nextMode = isDriver ? "client" : "driver"
    setMode(nextMode)
    navigate({ to: nextMode === "driver" ? "/available" : "/requests" })
  }

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
            aria-label="Contraer barra lateral"
            className="group-data-[collapsible=icon]:hidden flex size-7 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <PanelLeftClose className="size-3.5" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1 py-2">
        {isDriver && (
          <SidebarGroup className="pb-0">
            <Badge className="h-7 w-full justify-center rounded-md group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:px-0">
              <Truck />
              <span className="group-data-[collapsible=icon]:hidden">Transportista</span>
            </Badge>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarMenu>
            {nav.map((item) => (
              <NavItem key={item.to} {...item} isActive={item.to === activeTo} />
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {!hasDriverProfile && (
          <SidebarGroup className="mt-auto">
            <SidebarMenu>
              <NavItem
                label="Conviértete en transportista"
                icon={Truck}
                to="/driver-onboarding"
                isActive={activeTo === "/driver-onboarding"}
              />
            </SidebarMenu>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup className={hasDriverProfile ? "mt-auto" : undefined}>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenu>
              {ADMIN_NAV.map((item) => (
                <NavItem key={item.to} {...item} isActive={item.to === activeTo} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
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
                      {userName ?? "Usuario"}
                    </span>
                    <span className="max-w-36 truncate text-[11px] leading-none text-sidebar-foreground">
                      {userEmail}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-3.5 text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <Settings />
                      Configuración
                    </Link>
                  </DropdownMenuItem>
                  {hasDriverProfile && (
                    <DropdownMenuItem onClick={switchMode}>
                      {isDriver ? <User /> : <Truck />}
                      Cambiar a modo {isDriver ? "cliente" : "transportista"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
