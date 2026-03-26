'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  Loader2, 
  ChevronDown,
  ShieldCheck,
  Globe,
  Info
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from '@/context/language-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [keepSession, setKeepSession] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Hydration Guard: Asegura que el componente solo se renderice en el cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    setError(null);

    try {
      await setPersistence(
        auth, 
        keepSession ? browserLocalPersistence : browserSessionPersistence
      );
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError(language === 'es' 
          ? "Credenciales no válidas. Si es tu primera vez, pulsa 'Crear Perfil' abajo." 
          : "Invalid credentials. If it's your first time, click 'Create Profile' below.");
      } else {
        setError(language === 'es' ? "Error de conexión. Intenta más tarde." : "Connection error. Try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    setLoading(true);
    setError(null);

    try {
      const emailLower = email.toLowerCase().trim();
      const userDocRef = doc(db, 'users', emailLower);
      const userDoc = await getDoc(userDocRef);

      const isSuperUser = emailLower === 'umbralcero7@gmail.com';

      if (!userDoc.exists() && !isSuperUser) {
        setError(language === 'es' 
          ? "Este correo no ha sido autorizado en la white-list." 
          : "This email hasn't been whitelisted.");
        setLoading(false);
        return;
      }

      await setPersistence(
        auth, 
        keepSession ? browserLocalPersistence : browserSessionPersistence
      );
      await createUserWithEmailAndPassword(auth, emailLower, password);
      toast({ 
        title: language === 'es' ? "Acceso Concedido" : "Access Granted", 
        description: language === 'es' ? "Bienvenido a Aurora." : "Welcome to Aurora." 
      });
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError(language === 'es' ? "Este correo ya está registrado." : "This email is already in use.");
      } else if (err.code === 'auth/weak-password') {
        setError(language === 'es' ? "La contraseña es muy débil (min. 6 caracteres)." : "Password is too weak.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
    </div>
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden selection:bg-primary/20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05)_0%,transparent_50%)]" />
        <div className="absolute top-[10%] left-[-20%] w-[140%] h-[140%] bg-[conic-gradient(from_230deg_at_50%_50%,transparent_0%,rgba(139,92,246,0.03)_20%,transparent_40%)] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] px-6 flex flex-col items-center">
        <div className="flex flex-col items-center mb-12 text-center">
          <div className="h-24 w-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl shadow-primary/10 border border-slate-100">
             <svg viewBox="0 0 100 100" fill="none" className="w-16 h-16" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="login-aurora-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--secondary))" />
                </linearGradient>
              </defs>
              <path d="M50 15L85 85H72L50 45L28 85H15L50 15Z" fill="url(#login-aurora-grad)" />
              <path d="M30 75C40 65 60 65 70 75" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-[0.1em] uppercase">Aurora</h1>
          <p className="text-[9px] font-black tracking-[0.4em] text-slate-300 uppercase mt-2">Sistema Operativo</p>
        </div>

        <div className="w-full bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/60 relative overflow-hidden group">
          <h2 className="text-xl font-black text-slate-900 text-center mb-10 tracking-tight">
            {showRegister ? (language === 'es' ? 'Crear Perfil' : 'Create Profile') : (language === 'es' ? 'Iniciar Sesión' : 'Sign In')}
          </h2>

          {error && (
            <Alert variant="destructive" className="bg-destructive/5 border-destructive/10 text-destructive mb-8 py-3 rounded-2xl relative z-10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs font-bold leading-relaxed">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={showRegister ? handleRegister : handleEmailLogin} className="space-y-8 relative z-10">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Corporativo</Label>
              <Input 
                type="email" 
                placeholder="usuario@dominio.com" 
                className="h-14 bg-slate-50 border-slate-100 text-slate-900 rounded-2xl px-6"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Contraseña</Label>
              <Input 
                type="password" 
                placeholder="••••••••"
                className="h-14 bg-slate-50 border-slate-100 text-slate-900 rounded-2xl px-6"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center space-x-3 px-2">
              <Switch id="keep-session" checked={keepSession} onCheckedChange={setKeepSession} className="data-[state=checked]:bg-primary" />
              <Label htmlFor="keep-session" className="text-[10px] text-slate-500 font-black uppercase tracking-widest cursor-pointer">
                {t.login.keepSession}
              </Label>
            </div>

            <Button type="submit" className="w-full h-16 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-[0.98]" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (showRegister ? "Activar Perfil" : "Ingresar al Sistema")}
            </Button>

            <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-50">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 px-4 bg-slate-50 text-slate-400 text-[9px] border border-slate-100 rounded-xl font-black uppercase">
                    <Globe className="mr-2 h-3 w-3" />
                    {language === 'es' ? 'Español' : 'English'}
                    <ChevronDown className="ml-1.5 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white rounded-2xl shadow-2xl p-1 min-w-[140px]">
                  <DropdownMenuItem onClick={() => setLanguage('es')} className="rounded-xl font-bold text-xs px-4 py-3 cursor-pointer">Español</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage('en')} className="rounded-xl font-bold text-xs px-4 py-3 cursor-pointer">English</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button type="button" onClick={() => { setShowRegister(!showRegister); setError(null); }} className="text-[9px] font-black text-primary uppercase tracking-widest">
                {showRegister ? (language === 'es' ? 'Ya tengo cuenta' : 'Already registered') : (language === 'es' ? 'Crear Perfil' : 'Registro')}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-16 flex flex-col items-center gap-4 text-center opacity-30">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Aurora OS • Tecnología de Precisión</p>
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em]">Umbral Cero</span>
        </div>
      </div>
    </div>
  );
}
