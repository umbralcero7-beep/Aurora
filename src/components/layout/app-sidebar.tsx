
"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Users,
  Settings,
  LogOut,
  Languages,
  Package,
  TrendingUp,
  ChevronDown,
  Puzzle,
  RefreshCw,
  Truck,
  UtensilsCrossed,
  Wifi,
  WifiOff,
  Store,
  Globe,
  ShieldCheck,
  ShoppingCart,
  ChefHat,
  Briefcase,
  Scale
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  useSidebar
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useLanguage } from "@/context/language-context"
import { useAuth, useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase"
import { doc, collection, query, where, limit } from "firebase/firestore"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Logo } from "@/components/ui/logo"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const { user } = useUser()
  const { state } = useSidebar()
  const { language, setLanguage, t } = useLanguage()
  const [isOnline, setIsOnline] = React.useState<boolean>(true)
  const [mounted, setMounted] = React.useState(false)

  const isCollapsed = state === "collapsed"

  React.useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine)
      
      const handleStatus = () => setIsOnline(navigator.onLine)
      const handleSimulatedOffline = (e: any) => {
        setIsOnline(!e.detail.offline)
      }

      window.addEventListener('online', handleStatus)
      window.addEventListener('offline', handleStatus)
      window.addEventListener('aurora:toggle-offline' as any, handleSimulatedOffline)

      return () => {
        window.removeEventListener('online', handleStatus)
        window.removeEventListener('offline', handleStatus)
        window.removeEventListener('aurora:toggle-offline' as any, handleSimulatedOffline)
      }
    }
  }, [])

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null
    return doc(db, "users", user.email.toLowerCase())
  }, [db, user?.email])

  const { data: profile } = useDoc(userProfileRef)
  
  const emailLower = user?.email?.toLowerCase();
  const isSuperUser = emailLower === 'umbralcero7@gmail.com' || emailLower === 'amaroisaias611@gmail.com';
  
  const role = isSuperUser ? 'SUPPORT' : (profile?.role || 'WAITER');
  const isSupport = role === 'SUPPORT';
  const businessId = profile?.businessId || (isSuperUser ? 'matu' : null);
  
  const venueDisplay = isSupport ? "Aurora Global" : (profile?.assignedVenue || "Aurora OS");

  const userDisplayName = (profile?.displayName || user?.displayName || user?.email?.split('@')[0] || "USUARIO").toUpperCase();

  const notificationsRef = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return query(collection(db, "notifications"), where("status", "==", "unread"), limit(10))
    if (!businessId) return null
    return query(
      collection(db, "notifications"), 
      where("businessId", "==", businessId),
      where("status", "==", "unread"),
      limit(10)
    )
  }, [db, businessId, isSupport])

  const { data: unreadNotifications } = useCollection(notificationsRef)
  const hasNotifications = unreadNotifications && unreadNotifications.length > 0

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut()
      router.push('/login')
    }
  }

  const navigationGroups = React.useMemo(() => [
    {
      group: "Operaciones",
      items: [
        { title: t.nav.dashboard, url: "/", icon: LayoutDashboard, roles: ['ADMIN', 'SUPPORT', 'FINANCE', 'INVENTORY', 'RECEPTIONIST'] },
        { title: t.nav.waiterOrders, url: "/comandas", icon: ShoppingCart, roles: ['ADMIN', 'WAITER', 'SUPPORT'], alert: hasNotifications },
        { title: t.nav.pos, url: "/pos", icon: Receipt, roles: ['ADMIN', 'CASHIER', 'SUPPORT'] },
        { title: t.nav.orders, url: "/orders", icon: ChefHat, roles: ['ADMIN', 'WAITER', 'SUPPORT', 'CHEF'] },
        { title: t.nav.deliveries, url: "/deliveries", icon: Truck, roles: ['ADMIN', 'RECEPTIONIST', 'SUPPORT'] },
        { title: t.nav.menu, url: "/menu", icon: UtensilsCrossed, roles: ['ADMIN', 'CASHIER', 'SUPPORT', 'RECEPTIONIST', 'CHEF'] },
      ]
    },
    {
      group: "Administración",
      items: [
        { title: t.nav.products, url: "/inventory", icon: Package, roles: ['ADMIN', 'SUPPORT', 'INVENTORY', 'CHEF'] },
        { title: "Costos ERP", url: "/costs", icon: Scale, roles: ['ADMIN', 'SUPPORT', 'FINANCE'] },
        { title: t.nav.invoices, url: "/invoices", icon: FileText, roles: ['ADMIN', 'CASHIER', 'SUPPORT', 'FINANCE'] },
        { title: t.nav.hr, url: "/hr", icon: Briefcase, roles: ['ADMIN', 'SUPPORT', 'HR'] },
        { title: t.nav.fiscalControl, url: "/fiscal-control", icon: ShieldCheck, roles: ['ADMIN', 'CASHIER', 'SUPPORT', 'FINANCE'] },
      ]
    },
    {
      group: "Inteligencia",
      items: [
        { title: t.nav.reports, url: "/reports", icon: TrendingUp, roles: ['ADMIN', 'SUPPORT', 'FINANCE'] },
      ]
    },
    {
      group: "Sistema",
      items: [
        { title: "Sedes", url: "/settings/venues", icon: Globe, roles: ['SUPPORT'] },
        { title: t.nav.marketplace, url: "/marketplace", icon: Puzzle, roles: ['ADMIN', 'SUPPORT'] },
        { title: t.nav.users, url: "/settings/users", icon: Users, roles: ['ADMIN', 'SUPPORT'] },
        { title: t.nav.settings, url: "/settings", icon: Settings, roles: ['ADMIN', 'SUPPORT'] },
      ]
    }
  ], [t, hasNotifications]);

  const filteredGroups = React.useMemo(() => {
    return navigationGroups.map(group => ({
      ...group,
      items: group.items.filter(item => item.roles.includes(role))
    })).filter(group => group.items.length > 0);
  }, [navigationGroups, role]);

  if (!mounted) return null;

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-100 bg-white">
      <SidebarHeader className={cn(
        "flex flex-col items-center justify-center border-b border-slate-50 gap-2 overflow-hidden transition-all duration-300",
        isCollapsed ? "h-10 px-0" : "h-10 px-4"
      )}>
        {!isCollapsed ? (
          <Logo className="scale-50 origin-left" />
        ) : (
          <Logo iconOnly className="scale-75" />
        )}
      </SidebarHeader>
      
      <SidebarContent className="px-2 pt-4">
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.group} className="py-2">
            {!isCollapsed && (
              <div className="px-4 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {group.group}
              </div>
            )}
            <SidebarMenu className="gap-1">
              {group.items.map((item) => {
                const isActive = pathname === item.url.split('?')[0];
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton 
                      asChild 
                      tooltip={item.title}
                      isActive={isActive}
                      className={cn(
                        "data-[active=true]:bg-primary/5 data-[active=true]:text-primary transition-all relative",
                        isCollapsed ? "h-10 w-10 mx-auto justify-center rounded-lg" : "h-11 rounded-xl"
                      )}
                    >
                      <Link href={item.url} className={cn(
                        "flex items-center",
                        isCollapsed ? "justify-center p-0" : "gap-3 px-3"
                      )}>
                        <div className="relative">
                          <item.icon className={cn(
                            isActive ? "text-primary stroke-[2.5px]" : "text-slate-400 stroke-[2px]",
                            isCollapsed ? "h-5 w-5" : "h-4 w-4"
                          )} />
                          {item.alert && (
                            <span className={cn(
                              "absolute bg-destructive rounded-full border-2 border-white animate-pulse",
                              isCollapsed ? "-top-0.5 -right-0.5 h-2.5 w-2.5" : "-top-1 -right-1 h-2 w-2"
                            )} />
                          )}
                        </div>
                        {!isCollapsed && (
                          <span translate="no" className="text-[10px] uppercase tracking-widest font-black truncate">{item.title}</span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className={cn(
        "border-t border-slate-50 space-y-2 bg-slate-50/30 transition-all duration-300",
        isCollapsed ? "p-2 items-center" : "p-4"
      )}>
        <SidebarMenu className={isCollapsed ? "items-center" : ""}>
          <SidebarMenuItem>
            <div className={cn(
              "flex items-center bg-white rounded-xl border border-slate-100 shadow-sm transition-all",
              isCollapsed ? "p-0 bg-transparent border-none shadow-none justify-center" : "p-2 gap-2"
            )}>
              <Avatar className={cn(
                "border-2 border-white shadow-sm ring-1 ring-slate-100",
                isCollapsed ? "h-8 w-8" : "h-8 w-8"
              )}>
                <AvatarFallback className={cn("text-white font-black uppercase text-[8px]", isSupport ? 'bg-secondary' : 'bg-primary')}>
                  {userDisplayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[9px] font-black truncate text-slate-900 uppercase tracking-tighter">{userDisplayName}</span>
                  <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest truncate">{role}</span>
                </div>
              )}
            </div>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="Salir" 
              onClick={handleLogout} 
              className={cn(
                "text-slate-400 hover:bg-destructive/5 hover:text-destructive font-black text-[9px] uppercase tracking-widest transition-colors",
                isCollapsed ? "h-10 w-10 justify-center p-0" : "h-10"
              )}
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span className="font-black">Salir</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
