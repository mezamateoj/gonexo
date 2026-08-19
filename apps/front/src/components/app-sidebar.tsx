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
  SidebarMenuBadge,
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
import { CargUpLogo } from "@/components/cargup-logo"
import {
  CirclePlus,
  Briefcase,
  Truck,
  Settings,
  LogOut,
  ChevronsUpDown,
  PanelLeftClose,
  Users,
  ShieldCheck,
} from "lucide-react"
import { signOut, useSession } from "@/lib/auth-client"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { Badge } from "@/components/ui/badge"
import { useAttentionQueries } from "@/hooks/use-attention-queries"

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
  badge,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  to: string
  isActive: boolean
  badge?: number
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
      {!!badge && <SidebarMenuBadge>{badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const { data: session } = useSession()
  const userId = session?.user.id
  const accountType = session?.user.accountType
  const attention = useAttentionQueries(accountType, userId)

  const { data: currentUser } = useQuery({
    queryKey: queryKeys.users.me(userId ?? "anonymous"),
    queryFn: api.users.me,
    enabled: !!userId,
  })

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toggleSidebar } = useSidebar()

  const userName = currentUser?.name ?? session?.user.name
  const userEmail = currentUser?.email ?? session?.user.email
  const initials = userName
    ? userName.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  async function handleSignOut() {
    // signOut clears the Better Auth session cookie and the useSession store.
    // Drop account-scoped queries before returning to the public app.
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          queryClient.clear()
          navigate({ to: "/login" })
        },
      },
    })
  }

  const { pathname } = useRouterState({ select: (s) => s.location })

  const isDriver = session?.user.accountType === "driver"
  const isAdmin = session?.user.role === "admin"
  const nav = isDriver ? DRIVER_NAV : CLIENT_NAV
  const home = isDriver ? "/available" : "/requests"
  const attentionCount = isDriver
    ? attention.jobs.data?.count ?? 0
    : (attention.offers.data?.count ?? 0) + (attention.jobs.data?.count ?? 0)
  const attentionNav = isDriver ? "/jobs" : "/requests"

  // Pick the single best match: the nav item whose `to` is the longest prefix of
  // the current path. This keeps "Mis fletes" (/requests) from lighting up on
  // /requests/new, where "Publicar flete" (/requests/new) is the more specific match.
  const candidates = [
    ...nav.map((i) => i.to),
    ...(isAdmin ? ADMIN_NAV.map((i) => i.to) : []),
  ]
  const matches = candidates.filter(
    (to) => pathname === to || pathname.startsWith(to + "/"),
  )
  const activeTo = matches.reduce((best, to) => (to.length > best.length ? to : best), "")

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="h-14 border-b border-sidebar-border px-3">
        <div className="flex items-center justify-between">
          <Link to={home}>
            <CargUpLogo size="xs" wordmarkClassName="group-data-[collapsible=icon]:hidden text-sidebar-accent-foreground" />
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
              <NavItem
                key={item.to}
                {...item}
                isActive={item.to === activeTo}
                badge={item.to === attentionNav ? attentionCount : undefined}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-auto">
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
