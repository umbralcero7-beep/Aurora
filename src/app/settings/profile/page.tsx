
'use client';

import { useState } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { useLanguage } from '@/context/language-context';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { User, ShieldCheck, Mail, BadgeCheck, Lock, Loader2, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null
    return doc(db, "users", user.email.toLowerCase())
  }, [db, user?.email])

  const { data: profile } = useDoc(userProfileRef);

  const userDisplayName = (profile?.displayName || user?.displayName || user?.email?.split('@')[0] || "USUARIO").toUpperCase();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Las contraseñas no coinciden.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres.",
      });
      return;
    }

    setUpdating(true);
    try {
      await updatePassword(user, newPassword);
      toast({
        title: t.profile.passwordSuccess,
        description: "Tus credenciales han sido actualizadas.",
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error de Seguridad",
        description: t.profile.passwordError,
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-10 space-y-10 max-w-4xl mx-auto font-body pb-32">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-4">
            <User className="h-8 w-8 text-primary" />
            {t.profile.title}
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">Gestión de identidad Aurora.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-10">
        <div className="flex-1 space-y-10">
          <div className="flex flex-col items-center space-y-6 bg-slate-50/50 p-10 rounded-[2.5rem] border border-slate-100">
            <Avatar className="h-32 w-32 border-4 border-white shadow-2xl rounded-[2.5rem]">
              <AvatarImage src={user?.photoURL || ''} className="rounded-[2.5rem]" />
              <AvatarFallback className="text-4xl bg-primary text-white font-black uppercase rounded-[2.5rem]">
                {userDisplayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{userDisplayName}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <Mail className="h-3 w-3 text-primary" /> {user?.email}
              </p>
            </div>
          </div>

          <Card className="rounded-[2.5rem] border-slate-100 shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter text-slate-900">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Autoridad y Seguridad
              </CardTitle>
              <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Nivel de acceso en la red Aurora.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.profile.role}</Label>
                  <div>
                    <Badge className={profile?.role === 'SUPPORT' ? 'bg-secondary font-black text-[10px] uppercase rounded-full px-4 py-1' : 'bg-primary font-black text-[10px] uppercase rounded-full px-4 py-1'} variant="default">
                      {profile?.role || 'Buscando rol...'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.profile.status}</Label>
                  <div className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase">
                    <BadgeCheck className="h-4 w-4" /> Activa y Auditada
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl">
                <p className="text-[10px] text-blue-800 font-black leading-relaxed uppercase italic">
                  <strong>Nota:</strong> {t.profile.note}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full md:w-[380px]">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden bg-white">
            <CardHeader className="p-8 bg-slate-900 text-white border-b border-white/5">
              <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter">
                <Lock className="h-5 w-5 text-primary" />
                {t.profile.security}
              </CardTitle>
              <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Gestión de credenciales privadas.</CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordChange}>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t.profile.newPassword}</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input 
                      type="password"
                      className="h-12 pl-12 rounded-xl bg-slate-50 border-none font-bold text-sm"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t.profile.confirmPassword}</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input 
                      type="password"
                      className="h-12 pl-12 rounded-xl bg-slate-50 border-none font-bold text-sm"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-8 bg-slate-50/50 border-t border-slate-100">
                <Button 
                  type="submit"
                  disabled={updating || !newPassword}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : t.profile.updateBtn}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
