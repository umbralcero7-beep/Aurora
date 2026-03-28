
'use client';

import React, { useEffect, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { LanguageProvider } from "@/context/language-context";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { Toaster } from "@/components/ui/toaster";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { usePathname, useRouter } from "next/navigation";
import { doc } from "firebase/firestore";
import { 
  WifiOff, 
  Menu, 
  UserCircle, 
  Wifi, 
  LayoutDashboard, 
  ShoppingCart, 
  Receipt, 
  ChefHat,
  TrendingUp,
  Truck,
  Settings
} from "lucide-react";
import { Logo } from '@/components/ui/logo';
import { isSuperUser } from '@/lib/constants';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/error-boundary';
import { useLanguage } from '@/context/language-context';

function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();
  const { t } = useLanguage();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);
  
  const isSuper = isSuperUser(user?.email);
  const role = isSuper ? 'SUPPORT' : (profile?.role || 'WAITER');

  const allNavItems = [
    { icon: LayoutDashboard, label: t.nav.dashboard, url: '/', roles: ['ADMIN', 'SUPPORT', 'FINANCE', 'INVENTORY', 'RECEPTIONIST'] },
    { icon: ShoppingCart, label: t.nav.waiterOrders, url: '/comandas', roles: ['ADMIN', 'WAITER', 'SUPPORT'] },
    { icon: Receipt, label: t.nav.pos, url: '/pos', roles: ['ADMIN', 'CASHIER', 'SUPPORT'] },
    { icon: ChefHat, label: t.nav.orders, url: '/orders', roles: ['ADMIN', 'CHEF', 'SUPPORT'] },
    { icon: TrendingUp, label: t.nav.reports, url: '/reports', roles: ['ADMIN', 'SUPPORT', 'FINANCE'] },
    { icon: Truck, label: t.nav.deliveries, url: '/deliveries', roles: ['ADMIN', 'RECEPTIONIST', 'SUPPORT'] },
    { icon: Settings, label: t.nav.settings, url: '/settings', roles: ['ADMIN', 'SUPPORT'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(role)).slice(0, 5);

  if (navItems.length === 0) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-100/80 flex items-center justify-around z-50 safe-area-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}>
      {navItems.map((item) => {
        const isActive = pathname === item.url;
        return (
          <Link key={item.url} href={item.url} className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 transition-all active:scale-90",
            isActive ? "text-primary" : "text-slate-400"
          )}>
            <div className={cn(
              "flex items-center justify-center rounded-xl transition-all",
              isActive ? "bg-primary/[0.08]" : ""
            )}>
              <item.icon className={cn("h-[20px] w-[20px]", isActive ? "stroke-[2.2px]" : "stroke-[1.6px]")} />
            </div>
            <span className={cn(
              "text-[7px] uppercase tracking-[0.06em] font-semibold",
              isActive ? "text-primary" : "text-slate-400"
            )}>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
      
      const handleStatus = () => setIsOnline(navigator.onLine);
      const handleSimulatedOffline = (e: any) => {
        setIsOnline(!e.detail.offline);
      };

      window.addEventListener('online', handleStatus);
      window.addEventListener('offline', handleStatus);
      window.addEventListener('aurora:toggle-offline' as any, handleSimulatedOffline);

      return () => {
        window.removeEventListener('online', handleStatus);
        window.removeEventListener('offline', handleStatus);
        window.removeEventListener('aurora:toggle-offline' as any, handleSimulatedOffline);
      };
    }
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  useEffect(() => {
    if (isMounted && !isUserLoading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, isUserLoading, pathname, router, isMounted]);

  useEffect(() => {
    if (isMounted && user && profile) {
      const isSuper = isSuperUser(user?.email);
      if (isSuper) return;
      if (profile.role === 'WAITER' && pathname === '/') {
        router.push('/comandas');
      } else if (profile.role === 'RECEPTIONIST' && pathname === '/') {
        router.push('/deliveries');
      } else if (profile.role === 'HR' && pathname === '/') {
        router.push('/hr');
      }
    }
  }, [user, profile, pathname, router, isMounted]);

  if (!isMounted) return null;

  if (isUserLoading || (user && isProfileLoading && !profile)) {
    return (
      <div className="h-dvh w-full flex flex-col items-center justify-center gap-6 bg-white overflow-hidden">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
          <div className="absolute inset-0 rounded-full border-t-4 border-primary animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <span className="text-lg font-black text-slate-900 tracking-tighter uppercase font-body">Aurora OS</span>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Autoridad...</p>
        </div>
      </div>
    );
  }

  if (!user && pathname !== '/login') return null;
  if (pathname === '/login') return <>{children}</>;

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-slate-50/30 overflow-hidden relative">
        <AppSidebar />
        <main className="flex-1 overflow-hidden relative flex flex-col h-full min-h-0">
          {/* Universal Sticky Header (Ultra-Slim Version) */}
          <div className="flex items-center justify-between px-4 h-10 bg-white/70 backdrop-blur-md border-b border-slate-100/50 shrink-0 z-40 sticky top-0 transition-all duration-300">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-7 w-7 bg-transparent hover:bg-slate-100 rounded-md flex items-center justify-center transition-all border border-transparent">
                <Menu className="h-3.5 w-3.5 text-slate-500" />
              </SidebarTrigger>
              <div className="hidden xs:block scale-50 origin-left opacity-80">
                <Logo iconOnly />
              </div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 hidden md:inline">Protocolo {profile?.assignedVenue || 'Aurora'}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                {isOnline ? (
                  <Wifi className="h-2.5 w-2.5 text-emerald-500" />
                ) : (
                  <WifiOff className="h-2.5 w-2.5 text-orange-500 animate-pulse" />
                )}
                <span className={cn(
                  "text-[7px] font-black uppercase tracking-widest",
                  isOnline ? "text-emerald-600" : "text-orange-600"
                )}>
                  {isOnline ? 'Online' : 'Local'}
                </span>
              </div>
              <button 
                onClick={() => router.push('/settings/profile')} 
                className="h-7 w-7 bg-slate-100/50 hover:bg-white rounded-md flex items-center justify-center transition-all border border-slate-200/50"
              >
                <UserCircle className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {!isOnline && (
            <div className="bg-orange-500 text-white px-4 py-1.5 flex items-center justify-center animate-in slide-in-from-top duration-500 z-50 shadow-lg shrink-0">
              <div className="flex items-center gap-2 text-center">
                <WifiOff className="h-2.5 w-2.5 animate-pulse" />
                <span className="text-[7px] font-black uppercase tracking-[0.1em]">Modo Resguardo Local Activo</span>
              </div>
            </div>
          )}
          
          <div className="flex-1 w-full max-w-[1600px] mx-auto p-0 overflow-y-auto scroll-smooth pb-20 md:pb-0">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>

          {/* Mobile Navigator Bar */}
          <MobileBottomNav />
        </main>
      </div>
    </SidebarProvider>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <LanguageProvider>
        <AuthWrapper>
          {children}
        </AuthWrapper>
      </LanguageProvider>
      <Toaster />
    </FirebaseClientProvider>
  );
}
