
"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Users,
  Settings,
  LogOut,
  Package,
  TrendingUp,
  Puzzle,
  Truck,
  UtensilsCrossed,
  Globe,
  ShieldCheck,
  ShoppingCart,
  ChefHat,
  Briefcase,
  Scale,
  Sparkles,
  Key
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
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
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
import { isSuperUser } from '@/lib/constants';
import { cn } from "@/lib/utils"

type NavItem = {
  title: string;
  url: string;
  icon: React.ElementType;
  roles: string[];
  alert?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

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
  
  const isSuper = isSuperUser(user?.email);
  
  const role = isSuper ? 'SUPPORT' : (profile?.role || 'WAITER');
  const isSupport = role === 'SUPPORT';
  const businessId = profile?.businessId || (isSuper ? 'matu' : null);
  
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

  const navGroups: NavGroup[] = React.useMemo(() => [
    {
      label: t.navGroups.operations,
      items: [
        { title: t.nav.pos, url: "/pos", icon: Receipt, roles: ['ADMIN', 'CASHIER', 'SUPPORT'] },
        { title: t.nav.deliveries, url: "/deliveries", icon: Truck, roles: ['ADMIN', 'RECEPTIONIST', 'SUPPORT'] },
      ],
    },
    {
      label: t.navGroups.middle,
      items: [
        { title: t.unified.service, url: "/orders", icon: ChefHat, roles: ['ADMIN', 'CHEF', 'WAITER', 'SUPPORT'] },
        { title: t.unified.inventory, url: "/inventory", icon: Package, roles: ['ADMIN', 'SUPPORT', 'INVENTORY', 'CHEF'] },
      ],
    },
    {
      label: t.navGroups.finance,
      items: [
        { title: t.unified.audit, url: "/fiscal-control", icon: ShieldCheck, roles: ['ADMIN', 'CASHIER', 'SUPPORT', 'FINANCE'] },
        { title: t.unified.analytics, url: "/reports", icon: TrendingUp, roles: ['ADMIN', 'SUPPORT', 'FINANCE'] },
        { title: t.unified.hr, url: "/hr", icon: Briefcase, roles: ['ADMIN', 'SUPPORT', 'HR', 'FINANCE'] },
        { title: t.nav.customers, url: "/customers", icon: Users, roles: ['ADMIN', 'SUPPORT', 'RECEPTIONIST'] },
      ],
    },
    {
      label: t.navGroups.system,
      items: [
        { title: t.nav.settings, url: "/settings", icon: Settings, roles: ['ADMIN', 'SUPPORT'] },
      ],
    },
  ], [t, role, hasNotifications])

  const filteredGroups = React.useMemo(() => 
    navGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => item.roles.includes(role)),
      }))
      .filter(group => group.items.length > 0),
    [navGroups, role]
  );

  if (!mounted) return null;

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-100/80 bg-white">
      <SidebarHeader className={cn(
        "flex flex-col items-center justify-center border-b border-slate-100/60 overflow-hidden transition-all duration-300",
        isCollapsed ? "h-12 px-0" : "h-14 px-4"
      )}>
        {!isCollapsed ? (
          <Logo className="scale-[0.45] origin-left" />
        ) : (
          <Logo iconOnly className="scale-[0.65]" />
        )}
      </SidebarHeader>
      
      <SidebarContent className="px-1.5 pt-3 pb-2">
        {filteredGroups.map((group, groupIndex) => (
          <React.Fragment key={group.label}>
            {groupIndex > 0 && (
              <SidebarSeparator className="mx-3 my-1.5" />
            )}
            <SidebarGroup className="py-1">
              {!isCollapsed && (
                <SidebarGroupLabel className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-300 px-3 mb-1">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.url.split('?')[0];
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton 
                          asChild 
                          tooltip={item.title}
                          isActive={isActive}
                          className={cn(
                            "transition-all duration-200 relative",
                            isActive 
                              ? "bg-primary/[0.06] text-primary" 
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
                            isCollapsed 
                              ? "h-10 w-10 mx-auto justify-center rounded-xl" 
                              : "h-10 rounded-xl"
                          )}
                        >
                          <Link href={item.url} className={cn(
                            "flex items-center",
                            isCollapsed ? "justify-center p-0" : "gap-3 px-3"
                          )}>
                            <div className="relative">
                              <item.icon className={cn(
                                isActive ? "stroke-[2.2px]" : "stroke-[1.8px]",
                                isCollapsed ? "h-[18px] w-[18px]" : "h-[16px] w-[16px]"
                              )} />
                              {item.alert && (
                                <span className="absolute -top-1 -right-1 h-2 w-2 bg-rose-500 rounded-full border-[1.5px] border-white" />
                              )}
                            </div>
                            {!isCollapsed && (
                              <span className="text-[10px] uppercase tracking-[0.08em] font-semibold truncate">
                                {item.title}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </React.Fragment>
        ))}
      </SidebarContent>

      <SidebarFooter className={cn(
        "border-t border-slate-100/60 transition-all duration-300",
        isCollapsed ? "p-1.5 items-center" : "p-3"
      )}>
        <SidebarMenu className={isCollapsed ? "items-center gap-0.5" : "gap-0.5"}>
          <SidebarMenuItem>
            <div className={cn(
              "flex items-center transition-all",
              isCollapsed ? "justify-center" : "gap-2.5 px-1"
            )}>
              <Avatar className={cn(
                "ring-1 ring-slate-200",
                isCollapsed ? "h-8 w-8" : "h-9 w-9"
              )}>
                <AvatarFallback className={cn(
                  "text-white font-black uppercase text-[9px]",
                  isSupport ? 'bg-slate-700' : 'bg-primary'
                )}>
                  {userDisplayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden min-w-0">
                  <span className="text-[9px] font-bold truncate text-slate-800 uppercase tracking-tight">
                    {userDisplayName}
                  </span>
                  <span className="text-[7px] font-semibold uppercase text-slate-400 tracking-wider truncate">
                    {isSupport ? 'Soporte Global' : role}
                  </span>
                </div>
              )}
            </div>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="Salir" 
              onClick={handleLogout} 
              className={cn(
                "text-slate-400 hover:bg-rose-50 hover:text-rose-500 font-semibold text-[9px] uppercase tracking-wider transition-colors",
                isCollapsed ? "h-9 w-9 justify-center p-0 rounded-xl" : "h-9 rounded-xl"
              )}
            >
              <LogOut className="h-[15px] w-[15px]" />
              {!isCollapsed && <span>Salir</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
