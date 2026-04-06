
'use client';

import { useState, useEffect } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
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
import { User, ShieldCheck, Mail, BadgeCheck, Lock, Loader2, KeyRound, Fingerprint, QrCode, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from "@/hooks/use-toast";
import { generateTOTPSecret, verifyTOTP, generateTOTPUri, generateQRCodeDataUrl } from '@/lib/totp';

export default function ProfilePage() {
  const { t, language } = useLanguage();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [settingUp2FA, setSettingUp2FA] = useState(false);
  const [has2FA, setHas2FA] = useState(false);

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

    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (newPassword.length < minLength || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      toast({
        variant: "destructive",
        title: "Error",
        description: language === 'es' 
          ? "La contraseña debe tener al menos 8 caracteres con mayúsculas, minúsculas, números y carácter especial."
          : "Password must be at least 8 characters with uppercase, lowercase, numbers and special character.",
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

  const handleSetup2FA = async () => {
    if (!db || !user?.email) return;
    setSettingUp2FA(true);
    try {
      const secret = generateTOTPSecret();
      const uri = generateTOTPUri(secret, user.email.toLowerCase());
      
      const dataUrl = await generateQRCodeDataUrl(secret, user.email.toLowerCase());
      setQrCodeUrl(dataUrl);
      
      await updateDoc(doc(db, 'users', user.email.toLowerCase()), {
        totpSecret: secret,
        totpPending: true,
      });
      
      setShow2FASetup(true);
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: language === 'es' ? "Error al configurar 2FA." : "Error setting up 2FA.",
      });
    } finally {
      setSettingUp2FA(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user?.email) return;
    setSettingUp2FA(true);
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.email.toLowerCase()));
      const secret = userDoc.data()?.totpSecret;
      
      if (!secret || !verifyTOTP(secret, verificationCode)) {
        toast({
          variant: "destructive",
          title: "Error",
          description: language === 'es' ? "Código inválido. Intenta de nuevo." : "Invalid code. Try again.",
        });
        setSettingUp2FA(false);
        return;
      }

      const backupCodes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      await updateDoc(doc(db, 'users', user.email.toLowerCase()), {
        has2FA: true,
        totpPending: false,
        backupCodes: backupCodes,
      });

      setHas2FA(true);
      setShow2FASetup(false);
      setVerificationCode('');
      setQrCodeUrl(null);
      
      toast({
        title: language === 'es' ? "2FA Activado" : "2FA Enabled",
        description: language === 'es' 
          ? "Copia estos códigos de respaldo: " + backupCodes.join(', ')
          : "Copy these backup codes: " + backupCodes.join(', '),
      });
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: language === 'es' ? "Error al verificar código." : "Error verifying code.",
      });
    } finally {
      setSettingUp2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!db || !user?.email) return;
    setSettingUp2FA(true);
    try {
      await updateDoc(doc(db, 'users', user.email.toLowerCase()), {
        has2FA: false,
        totpSecret: null,
        backupCodes: null,
      });
      setHas2FA(false);
      toast({
        title: language === 'es' ? "2FA Desactivado" : "2FA Disabled",
      });
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast({
        variant: "destructive",
        title: "Error",
      });
    } finally {
      setSettingUp2FA(false);
    }
  };

  useEffect(() => {
    if (profile?.has2FA !== undefined) {
      setHas2FA(profile.has2FA);
    }
  }, [profile]);

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

          <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden bg-white mt-6">
            <CardHeader className="p-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-b border-white/5">
              <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter">
                <Fingerprint className="h-5 w-5" />
                {language === 'es' ? 'Autenticación de Dos Factores' : 'Two-Factor Authentication'}
              </CardTitle>
              <CardDescription className="text-purple-100 font-bold text-[10px] uppercase tracking-widest mt-1">
                {language === 'es' ? 'Protege tu cuenta con 2FA' : 'Protect your account with 2FA'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {show2FASetup ? (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    {qrCodeUrl && (
                      <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 rounded-xl border-2 border-slate-200" />
                    )}
                  </div>
                  <p className="text-center text-sm text-slate-500">
                    {language === 'es' 
                      ? 'Escanea este código con tu aplicación de autenticación (Google Authenticator, Authy, etc.)'
                      : 'Scan this code with your authenticator app (Google Authenticator, Authy, etc.)'
                    }
                  </p>
                  <form onSubmit={handleVerify2FA} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                        {language === 'es' ? 'Código de verificación' : 'Verification code'}
                      </Label>
                      <Input 
                        type="text"
                        className="h-12 text-center text-xl tracking-[0.5em] font-mono rounded-xl"
                        placeholder="000000"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        type="button"
                        variant="outline"
                        className="flex-1 h-12 rounded-xl font-black text-xs uppercase"
                        onClick={() => { setShow2FASetup(false); setQrCodeUrl(null); }}
                      >
                        {language === 'es' ? 'Cancelar' : 'Cancel'}
                      </Button>
                      <Button 
                        type="submit"
                        disabled={settingUp2FA || verificationCode.length !== 6}
                        className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs uppercase"
                      >
                        {settingUp2FA ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'es' ? 'Activar' : 'Enable')}
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <div className={`p-4 rounded-full ${has2FA ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    {has2FA ? (
                      <Fingerprint className="h-8 w-8 text-emerald-600" />
                    ) : (
                      <QrCode className="h-8 w-8 text-slate-400" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700">
                      {has2FA 
                        ? (language === 'es' ? '2FA Activado' : '2FA Enabled')
                        : (language === 'es' ? '2FA No Configurado' : '2FA Not Configured')
                      }
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {has2FA 
                        ? (language === 'es' ? 'Tu cuenta está protegida' : 'Your account is protected')
                        : (language === 'es' ? 'Añade una capa extra de seguridad' : 'Add an extra layer of security')
                      }
                    </p>
                  </div>
                  {has2FA ? (
                    <Button 
                      variant="destructive"
                      className="w-full h-12 rounded-xl font-black text-xs uppercase bg-red-500 hover:bg-red-600"
                      onClick={handleDisable2FA}
                      disabled={settingUp2FA}
                    >
                      {settingUp2FA ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'es' ? 'Desactivar 2FA' : 'Disable 2FA')}
                    </Button>
                  ) : (
                    <Button 
                      className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs uppercase"
                      onClick={handleSetup2FA}
                      disabled={settingUp2FA}
                    >
                      {settingUp2FA ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'es' ? 'Configurar 2FA' : 'Set Up 2FA')}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
