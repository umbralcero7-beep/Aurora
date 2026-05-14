
'use client';

import React, { useEffect, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { LanguageProvider } from "@/context/language-context";
import { Toaster } from "@/components/ui/toaster";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from '@/lib/supabase/client';
import { 
  WifiOff, 
  Menu, 
  UserCircle, 
  Wifi, 
  Eye, 
  EyeOff, 
  ShieldCheck 
} from "lucide-react";
import { Logo } from '@/components/ui/logo';
import { isSuperUser } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

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

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isMounted, setIsMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [visualComfort, setVisualComfort] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('aurora-visual-comfort') === 'true';
    setVisualComfort(saved);
    setIsMounted(true);

    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleStatus = () => setIsOnline(navigator.onLine);
      window.addEventListener('online', handleStatus);
      window.addEventListener('offline', handleStatus);
      return () => {
        window.removeEventListener('online', handleStatus);
        window.removeEventListener('offline', handleStatus);
      };
    }
  }, []);

  useEffect(() => {
    async function getInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(userProfile);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(userProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isMounted && !isLoading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router, isMounted]);

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

  if (isLoading || (user && !profile && pathname !== '/login')) {
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
      <div className={cn(
        "flex h-dvh w-full overflow-hidden relative transition-colors duration-700",
        visualComfort ? "soft-eye-mode bg-[#fdfaf6]" : "bg-slate-50/30"
      )}>
        <AppSidebar />
        <main className="flex-1 overflow-hidden relative flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between px-2 md:px-4 h-9 bg-white/80 backdrop-blur-md border-b border-slate-100/50 shrink-0 z-40 sticky top-0 transition-all duration-300">
            <div className="flex items-center gap-1.5 md:gap-2">
              <SidebarTrigger className="h-6 w-6 md:h-7 md:w-7 bg-transparent hover:bg-slate-100 rounded-md flex items-center justify-center transition-all border border-transparent">
                <Menu className="h-3 w-3.5 text-slate-500" />
              </SidebarTrigger>
              <div className="hidden xs:block scale-50 origin-left opacity-80">
                <Logo iconOnly />
              </div>
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 hidden lg:inline">{profile?.assigned_venue || 'Aurora'}</span>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2">
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
                  <ShieldCheck className="h-2 w-2.5 text-white" />
                )}
                <span className={cn(
                  "text-[6px] font-black uppercase tracking-widest",
                  isOnline ? "text-emerald-600" : "text-white"
                )}>
                  {isOnline ? 'Online' : 'Bnker'}
                </span>
              </div>

              <button 
                onClick={() => {
                  const newState = !visualComfort;
                  setVisualComfort(newState);
                  localStorage.setItem('aurora-visual-comfort', String(newState));
                }} 
                className={cn(
                  "h-6 w-6 md:h-7 md:w-7 rounded-md flex items-center justify-center transition-all border",
                  visualComfort ? "bg-amber-100 border-amber-200 text-amber-600" : "bg-slate-100/50 border-slate-200/50 text-slate-400 hover:bg-white"
                )}
              >
                {visualComfort ? <Eye className="h-3 w-3.5" /> : <EyeOff className="h-3 w-3.5" />}
              </button>

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
        </main>
      </div>
    </SidebarProvider>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
      <LanguageProvider>
        <AuthWrapper>
          {children}
        </AuthWrapper>
      </LanguageProvider>
      <Toaster />
    </ThemeProvider>
  );
}
