
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { isSuperUser } from '@/lib/constants';
import { collection, doc, setDoc, serverTimestamp, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  UserPlus, 
  Loader2, 
  UserCheck,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Store,
  Pencil,
  Info,
  Key
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";
import { validateUserAuthority } from "@/ai/flows/user-validation-flow";
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, FirestoreOfflineError, isOfflineError } from '@/firebase/errors';

export default function UserManagementPage() {
  const { t, language } = useLanguage();
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  
  // Password reset dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordResetEmail, setPasswordResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [emailInput, setEmailInput] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('WAITER');
  const [businessId, setBusinessId] = useState('');

  const isSuper = isSuperUser(currentUser?.email);

  const usersRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "users");
  }, [db]);

  const venuesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "businesses");
  }, [db]);

  const { data: rawUsers, isLoading: usersLoading } = useCollection(usersRef);
  const { data: venues } = useCollection(venuesRef);

  const users = rawUsers ? [...rawUsers].sort((a, b) => (a.email || "").localeCompare(b.email || "")) : [];

  const handleSaveUser = async () => {
    if (!db || !emailInput || (!businessId && role !== 'SUPPORT' && role !== 'HR')) {
      toast({ variant: "destructive", title: "Campos Incompletos", description: "Selecciona una sede para vincular al personal." });
      return;
    }
    setLoading(true);
    
    try {
      const email = emailInput.toLowerCase().trim();
      const userRef = doc(db, 'users', email);
      
      const selectedVenue = venues?.find(v => v.id === businessId);
      const venueName = role === 'SUPPORT' ? 'AURORA GLOBAL HQ' : (selectedVenue?.name || 'SEDE AURORA');

      const finalDisplayName = (displayName.trim() || email.split('@')[0] || 'NUEVO USUARIO').toUpperCase();

      const updateData: any = {
        email: email,
        displayName: finalDisplayName,
        role: role,
        businessId: role === 'SUPPORT' ? 'global' : businessId,
        assignedVenue: venueName.toUpperCase(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(userRef, updateData, { merge: true }).catch(async (err) => {
        if (isOfflineError(err)) {
          errorEmitter.emit('offline-error', new FirestoreOfflineError({
            path: userRef.path, operation: 'write',
          }));
        } else {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userRef.path,
            operation: 'write',
            requestResourceData: updateData
          }));
        }
      });

      toast({
        title: editingEmail ? "Perfil Actualizado" : "Autorización Exitosa",
        description: `El personal para ${venueName} ha sido calibrado.`,
      });
      
      setIsOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (user: any) => {
    setEditingEmail(user.email);
    setEmailInput(user.email || '');
    setDisplayName(user.displayName || '');
    setRole(user.role || 'WAITER');
    setBusinessId(user.businessId || '');
    setIsOpen(true);
  };

  const handleDeleteUser = async (userEmail: string) => {
    if (!db || !userEmail) return;
    try {
      const uRef = doc(db, 'users', userEmail);
      await deleteDoc(uRef).catch(async (err) => {
        if (isOfflineError(err)) {
          errorEmitter.emit('offline-error', new FirestoreOfflineError({
            path: uRef.path, operation: 'delete',
          }));
        } else {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: uRef.path,
            operation: 'delete'
          }));
        }
      });
      toast({
        title: "Acceso Revocado",
        description: `El usuario ya no tiene permiso de entrada.`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleValidation = async () => {
    if (!users || users.length === 0) return;
    setValidating(true);
    try {
      await validateUserAuthority({
        users: users.map(u => ({
          email: u.email || '---',
          role: u.role || 'WAITER',
          displayName: u.displayName || 'USUARIO'
        }))
      });
      toast({
        title: "Auditoría Finalizada",
        description: "Cero ha completado la validación global.",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setValidating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!db || !passwordResetEmail || !newPassword) return;
    if (!isSuper) {
      toast({ variant: "destructive", title: "Acceso Denegado", description: "Solo el superusuario puede cambiar contraseñas." });
      return;
    }
    setResetLoading(true);
    try {
      await updateDoc(doc(db, 'users', passwordResetEmail.toLowerCase()), {
        passwordHash: newPassword,
        passwordUpdatedAt: serverTimestamp(),
        passwordUpdatedBy: currentUser?.email
      });
      toast({
        title: language === 'es' ? "Contraseña Actualizada" : "Password Updated",
        description: language === 'es' ? `La contraseña de ${passwordResetEmail} ha sido actualizada.` : `Password for ${passwordResetEmail} has been updated.`,
      });
      setShowPasswordDialog(false);
      setPasswordResetEmail('');
      setNewPassword('');
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la contraseña." });
    } finally {
      setResetLoading(false);
    }
  };

  const openPasswordReset = (email: string) => {
    setPasswordResetEmail(email);
    setShowPasswordDialog(true);
  };

  const resetForm = () => {
    setEmailInput('');
    setDisplayName('');
    setRole('WAITER');
    setBusinessId('');
    setEditingEmail(null);
  };

  return (
    <div className="p-10 space-y-10 bg-white min-h-full max-w-[1400px] mx-auto font-body overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <Users className="h-8 w-8 text-primary" />
            Autoridad Personal
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">
            Gestión de White-list Multi-Sede • Aurora V3.5
          </p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <Button 
            variant="outline" 
            onClick={handleValidation}
            disabled={validating || !users?.length}
            className="flex-1 md:flex-none rounded-xl h-12 border-primary text-primary hover:bg-primary/5 font-black text-[9px] uppercase tracking-widest"
          >
            {validating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Auditoría Cero
          </Button>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="flex-1 md:flex-none bg-secondary hover:bg-secondary/90 shadow-xl shadow-secondary/20 h-12 px-8 rounded-xl font-black text-[9px] uppercase tracking-widest">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Personal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-[2.5rem] p-10 bg-white border-none shadow-2xl">
              <DialogHeader className="space-y-4">
                <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter text-slate-900">
                  <UserPlus className="h-6 w-6 text-primary" />
                  {editingEmail ? "Modificar Autoridad" : "Nueva Autoridad"}
                </DialogTitle>
                <DialogDescription className="text-xs font-bold text-slate-400 italic">
                  Calibra los permisos y la sede asignada para este perfil.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-8">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                  <Info className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-[9px] font-bold text-blue-700 leading-relaxed uppercase">
                    IMPORTANTE: El usuario deberá usar "Crear Perfil" en el login la primera vez para definir su contraseña.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Corporativo</Label>
                  <Input 
                    type="email"
                    placeholder="usuario@dominio.com" 
                    value={emailInput} 
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="h-12 rounded-xl bg-slate-50 border-none px-5 font-bold"
                    disabled={!!editingEmail}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre Público</Label>
                  <Input 
                    placeholder="Ej: JUAN PÉREZ" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-12 rounded-xl bg-slate-50 border-none px-5 font-bold uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nivel (Rol)</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none px-5 font-bold text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-2xl border-slate-100 bg-white">
                        <SelectItem value="ADMIN" className="font-bold text-xs uppercase py-3">Administrador</SelectItem>
                        <SelectItem value="HR" className="font-bold text-xs uppercase py-3 text-emerald-600">Talento (HR)</SelectItem>
                        <SelectItem value="INVENTORY" className="font-bold text-xs uppercase py-3">Inventario</SelectItem>
                        <SelectItem value="CHEF" className="font-bold text-xs uppercase py-3">Cocina (Chef)</SelectItem>
                        <SelectItem value="WAITER" className="font-bold text-xs uppercase py-3">Mesero</SelectItem>
                        <SelectItem value="CASHIER" className="font-bold text-xs uppercase py-3">Cajero</SelectItem>
                        <SelectItem value="RECEPTIONIST" className="font-bold text-xs uppercase py-3">Recepcionista</SelectItem>
                        {isSuper && <SelectItem value="SUPPORT" className="font-bold text-xs uppercase py-3 text-secondary">Soporte Global</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Sede Asignada</Label>
                    <Select value={businessId} onValueChange={setBusinessId} disabled={role === 'SUPPORT'}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none px-5 font-bold text-xs">
                        <SelectValue placeholder={role === 'SUPPORT' ? "GLOBAL HQ" : "Seleccionar Sede"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-2xl border-slate-100 bg-white">
                        {venues && venues.length > 0 ? (
                          venues.map((v) => (
                            <SelectItem key={v.id} value={v.id} className="font-bold text-xs uppercase py-3">
                              {v.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled className="font-bold text-[9px] uppercase py-3 opacity-50">
                            Carga sedes primero
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex gap-4">
                <Button variant="ghost" onClick={() => setIsOpen(false)} className="flex-1 font-black text-[10px] uppercase tracking-widest h-12">Cancelar</Button>
                <Button onClick={handleSaveUser} disabled={loading || !emailInput || (!businessId && role !== 'SUPPORT' && role !== 'HR')} className="bg-primary hover:bg-primary/90 flex-1 font-black text-[10px] uppercase tracking-widest h-12 rounded-xl shadow-lg shadow-primary/20">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : editingEmail ? "Guardar" : "Confirmar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-2xl shadow-slate-200/40 rounded-[2rem] border-slate-100 overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-8 px-10">
          <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter text-slate-900">
            <UserCheck className="h-5 w-5 text-primary" />
            Personal por Sede
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-b border-slate-100">
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 px-10">Identidad</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Sede Asignada</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Nivel / Rol</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-right px-10">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-24"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary"/></TableCell></TableRow>
              ) : users?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-24 text-slate-400 font-bold italic">No hay personal registrado.</TableCell></TableRow>
              ) : users?.map((u) => (
                <TableRow key={u.id} className="hover:bg-slate-50/50 border-b border-slate-50 transition-colors">
                  <TableCell className="px-10 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 uppercase text-xs">
                        {u.displayName || u.email?.split('@')[0]?.toUpperCase() || 'USUARIO'}
                      </span>
                      <span className="font-mono text-[9px] text-primary font-black uppercase tracking-tighter">{u.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-black text-[9px] px-3 py-1 uppercase rounded-full border-slate-200 text-slate-500 flex w-fit items-center gap-2">
                      <Store className="h-3 w-3 text-primary" />
                      {u.role === 'SUPPORT' ? 'AURORA GLOBAL HQ' : (u.assignedVenue || 'SEDE CENTRAL')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("font-black text-[9px] px-3 py-1 uppercase rounded-full", u.role === 'SUPPORT' ? "bg-secondary text-white" : "bg-primary text-white")}>
                      {u.role || 'WAITER'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-10">
                    <div className="flex justify-end gap-2">
                      {isSuper && (
                        <Button variant="ghost" size="icon" onClick={() => openPasswordReset(u.email)} className="h-10 w-10 rounded-xl hover:bg-amber-50 hover:text-amber-500 text-slate-200" title={language === 'es' ? 'Cambiar contraseña' : 'Change password'}>
                          <Key className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(u)} className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary text-slate-200"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.email)} className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive text-slate-200"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Password Reset Dialog - Only for Super User */}
      {isSuper && (
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="max-w-sm rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl">
            <DialogHeader className="p-8 bg-slate-900 text-white">
              <DialogTitle className="text-lg font-black uppercase flex items-center gap-3">
                <Key className="h-5 w-5" />
                {language === 'es' ? 'Restablecer Contraseña' : 'Reset Password'}
              </DialogTitle>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <p className="text-sm text-slate-500 text-center">
                {language === 'es' 
                  ? `Restablecer contraseña para: ${passwordResetEmail}`
                  : `Reset password for: ${passwordResetEmail}`}
              </p>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                  {language === 'es' ? 'Nueva Contraseña' : 'New Password'}
                </Label>
                <Input 
                  type="password"
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="p-8 pt-0">
              <Button 
                className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-[10px] uppercase" 
                onClick={handleResetPassword}
                disabled={resetLoading || !newPassword}
              >
                {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'es' ? 'Actualizar Contraseña' : 'Update Password')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
