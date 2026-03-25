"use client"

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { 
  Store, 
  Plus, 
  Loader2, 
  ShieldCheck,
  Trash2,
  MapPin,
  Pencil,
  Lock,
  Globe,
  Zap,
  Info,
  BrainCircuit
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

export default function VenuesManagementPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [idInput, setIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [addressInput, setAddressInput] = useState('');

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);
  const { data: profile } = useDoc(userProfileRef);
  
  const emailLower = user?.email?.toLowerCase();
  const isSuperUser = emailLower === 'umbralcero7@gmail.com' || emailLower === 'amaroisaias611@gmail.com';
  const isSupport = profile?.role === 'SUPPORT' || isSuperUser;

  const venuesRef = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "businesses"), orderBy("name"));
  }, [db]);

  const { data: venues, isLoading: venuesLoading } = useCollection(venuesRef);

  const handleSaveVenue = async () => {
    if (!db || !idInput || !nameInput) return;
    setLoading(true);
    
    try {
      const venueId = idInput.toLowerCase().trim().replace(/\s+/g, '-');
      const venueRef = doc(db, 'businesses', venueId);
      
      await setDoc(venueRef, {
        id: venueId,
        name: nameInput.trim(),
        address: addressInput.trim(),
        updatedAt: serverTimestamp(),
        createdAt: editingId ? undefined : serverTimestamp(),
      }, { merge: true });

      toast({
        title: editingId ? "Marca Actualizada" : "Nueva Marca Inyectada",
        description: `El ecosistema ${nameInput} ha sido configurado correctamente.`,
      });
      
      setIsOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error Cloud", description: "No se pudo sincronizar la marca." });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (v: any) => {
    setEditingId(v.id);
    setIdInput(v.id || '');
    setNameInput(v.name || '');
    setAddressInput(v.address || '');
    setIsOpen(true);
  };

  const handleDeleteVenue = async (vid: string) => {
    if (!db || !vid) return;
    try {
      await deleteDoc(doc(db, 'businesses', vid));
      toast({
        title: "Marca Eliminada",
        description: "La unidad ha sido purgada del ecosistema global.",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const resetForm = () => {
    setIdInput('');
    setNameInput('');
    setAddressInput('');
    setEditingId(null);
  };

  if (!isSupport) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-6 bg-slate-50">
        <div className="h-20 w-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center border border-slate-100">
          <Lock className="h-8 w-8 text-slate-300" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900">Acceso Restringido</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Solo personal de Soporte Aurora puede gestionar el mapa de marcas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-10 bg-white min-h-full max-w-[1400px] mx-auto font-body overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <Globe className="h-8 w-8 text-primary" />
            Control Multi-Marca
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">
            Gestión de Marcas Independientes (ej: Casos de estudio como Frutas y Sabores / Pikate)
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 h-12 px-8 rounded-xl font-black text-[9px] uppercase tracking-widest">
              <Plus className="mr-2 h-4 w-4" /> Inyectar Nueva Marca
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-[2.5rem] p-10 bg-white border-none shadow-2xl">
            <DialogHeader className="space-y-4">
              <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter text-slate-900">
                <Store className="h-6 w-6 text-primary" />
                {editingId ? "Ajustar Marca" : "Nueva Marca"}
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-slate-400 italic">
                Define los parámetros de la nueva unidad operativa (ADN de Negocio).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-8">
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex gap-3">
                <Zap className="h-4 w-4 text-primary shrink-0" />
                <p className="text-[9px] font-bold text-primary leading-relaxed uppercase">
                  Aurora aislará automáticamente todos los datos bajo esta marca.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">ID Técnico (ej: pikate-principal)</Label>
                <Input 
                  placeholder="ej: marca-demo-01" 
                  value={idInput} 
                  onChange={(e) => setIdInput(e.target.value)}
                  className="h-12 rounded-xl bg-slate-50 border-none px-5 font-bold"
                  disabled={!!editingId}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre Comercial</Label>
                <Input 
                  placeholder="Ej: Nombre de la Unidad" 
                  value={nameInput} 
                  onChange={(e) => setNameInput(e.target.value)}
                  className="h-12 rounded-xl bg-slate-50 border-none px-5 font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Dirección Fiscal</Label>
                <Input 
                  placeholder="Calle 123..." 
                  value={addressInput} 
                  onChange={(e) => setAddressInput(e.target.value)}
                  className="h-12 rounded-xl bg-slate-50 border-none px-5 font-bold"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-4">
              <Button variant="ghost" onClick={() => setIsOpen(false)} className="flex-1 font-black text-[10px] uppercase tracking-widest h-12">Cancelar</Button>
              <Button onClick={handleSaveVenue} disabled={loading || !idInput || !nameInput} className="bg-primary hover:bg-primary/90 flex-1 font-black text-[10px] uppercase tracking-widest h-12 rounded-xl shadow-lg shadow-primary/20">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "Actualizar" : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card className="shadow-2xl shadow-slate-200/40 rounded-[2rem] border-slate-100 overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-8 px-10">
              <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter text-slate-900">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Marcas en la Red
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/30">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 px-10">ID ADN</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Nombre Marca</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Estado</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right px-10">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venuesLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-24"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary"/></TableCell></TableRow>
                  ) : venues?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-24 text-slate-400 font-bold italic">No hay marcas registradas.</TableCell></TableRow>
                  ) : venues?.map((v) => (
                    <TableRow key={v.id} className="hover:bg-slate-50/50 border-b border-slate-50 transition-colors">
                      <TableCell className="px-10 py-6">
                        <code className="font-mono text-[10px] bg-slate-100 px-3 py-1 rounded-lg text-primary font-black uppercase tracking-tighter">{v.id}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 uppercase text-xs">{v.name || 'Sin Nombre'}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {v.address || 'Sin dirección'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500 text-white font-black text-[8px] px-3 py-1 rounded-full uppercase tracking-widest">ACTIVA</Badge>
                      </TableCell>
                      <TableCell className="text-right px-10">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(v)} className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary text-slate-200"><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteVenue(v.id)} className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive text-slate-200"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="rounded-[2.5rem] bg-slate-900 text-white p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <BrainCircuit className="h-8 w-8 text-primary" />
                <h3 className="font-black uppercase text-[11px] tracking-[0.3em] text-white">Cero Tenant Advisor</h3>
              </div>
              <p className="text-[11px] leading-relaxed font-black italic text-slate-400 uppercase tracking-tight">
                "He configurado los túneles de aislamiento. Al crear unidades de negocio independientes (ej: Unidades de ejemplo como 'frutas-sabores' o 'pikate'), el motor de base de datos dividirá lógicamente los registros. La seguridad está garantizada por ADN de Negocio."
              </p>
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="text-[9px] font-black uppercase text-white">Consejo Estratégico</span>
                </div>
                <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">
                  Asigna personal a cada ID de marca desde el módulo de Personal para activar el aislamiento de interfaz.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}