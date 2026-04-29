
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
import { useLanguage } from '@/context/language-context';
import { ThemeProvider } from '@/components/theme-provider';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { DianSyncService } from '@/components/services/dian-sync-service';
import { OfflineBunkerService } from '@/components/services/offline-bunker-service';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-6 w-6" />;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-6 w-6 md:h-7 md:w-7 bg-muted hover:bg-accent rounded-md flex items-center justify-center transition-all border border-border"
    >
      {theme === 'dark' ? (
        <Moon className="h-3 w-3.5 text-foreground" />
      ) : (
        <Sun className="h-3 w-3.5 text-foreground" />
      )}
    </button>
  );
}

function MobileBottomNav() {
  return null;
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Registrar Service Worker para PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

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
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('online', handleStatus);
        window.removeEventListener('offline', handleStatus);
        window.removeEventListener('aurora:toggle-offline' as any, handleSimulatedOffline);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

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
          <div className="flex items-center justify-between px-2 md:px-4 h-9 bg-white/80 backdrop-blur-md border-b border-slate-100/50 shrink-0 z-40 sticky top-0 transition-all duration-300">
            <div className="flex items-center gap-1.5 md:gap-2">
              <SidebarTrigger className="h-6 w-6 md:h-7 md:w-7 bg-transparent hover:bg-slate-100 rounded-md flex items-center justify-center transition-all border border-transparent">
                <Menu className="h-3 w-3.5 text-slate-500" />
              </SidebarTrigger>
              <div className="hidden xs:block scale-50 origin-left opacity-80">
                <Logo iconOnly />
              </div>
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 hidden lg:inline">{profile?.assignedVenue || 'Aurora'}</span>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2">
              {isInstallable && (
                <button 
                  onClick={handleInstallClick}
                  className="px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full text-[6px] font-black uppercase tracking-widest transition-all mr-1"
                >
                  Instalar App
                </button>
              )}
              
              <div 
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-all cursor-default",
                  isOnline ? "bg-slate-50 border-slate-100" : "bg-orange-500 border-orange-400 shadow-lg shadow-orange-500/20"
                )}
                title={isOnline ? "Conectado al Servidor" : "Modo Bnker Activo (Local)"}
              >
                {isOnline ? (
                  <Wifi className="h-2 w-2.5 text-emerald-500" />
                ) : (
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="h-2 w-2.5 text-white" />
                    <button 
                      onClick={() => {
                        // Lgica simple para descargar respaldo crtico en bnker
                        const criticalData = { timestamp: new Date().toISOString(), platform: 'Aurora OS' };
                        const blob = new Blob([JSON.stringify(criticalData)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `aurora-bunker-backup-${Date.now()}.json`;
                        a.click();
                      }}
                      className="text-[5px] font-black text-white underline decoration-white/30"
                    >
                      Bajar Respaldo
                    </button>
                  </div>
                )}
                <span className={cn(
                  "text-[6px] font-black uppercase tracking-widest",
                  isOnline ? "text-emerald-600" : "text-white"
                )}>
                  {isOnline ? 'Online' : 'Bnker'}
                </span>
              </div>

              <button 
                onClick={() => router.push('/settings/profile')} 
                className="h-6 w-6 md:h-7 md:w-7 bg-slate-100/50 hover:bg-white rounded-md flex items-center justify-center transition-all border border-slate-200/50"
              >
                <UserCircle className="h-3 w-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {!isOnline && (
            <div className="bg-orange-500 text-white px-4 py-1.5 flex items-center justify-center animate-in slide-in-from-top duration-500 z-50 shadow-lg shrink-0">
              <div className="flex items-center gap-2 text-center">
                <WifiOff className="h-2.5 w-2.5 animate-pulse" />
                <span className="text-[7px] font-black uppercase tracking-[0.1em]">Sin Conexión · Los datos se sincronizarán al reconectarse</span>
              </div>
            </div>
          )}
          
          <div className="flex-1 w-full max-w-[1600px] mx-auto p-0 overflow-y-auto scroll-smooth pb-20 md:pb-0">
            {children}
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
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
      <FirebaseClientProvider>
        <LanguageProvider>
          <AuthWrapper>
            <DianSyncService />
            <OfflineBunkerService />
            {children}
          </AuthWrapper>
        </LanguageProvider>
        <Toaster />
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}
