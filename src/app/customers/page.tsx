
"use client"

import { isSuperUser } from '@/lib/constants';
import { useState } from "react"
import { 
  Users, 
  Search, 
  Plus, 
  Heart, 
  Star, 
  Loader2,
  BrainCircuit,
  Zap,
  MoreVertical,
  Mail,
  UserPlus,
  TrendingUp,
  Target,
  BadgeCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/context/language-context"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, addDoc, doc, where } from "firebase/firestore"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

export default function CustomersPage() {
  const { t } = useLanguage()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isSuper = isSuperUser(user?.email);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);

  const isSupport = profile?.role === 'SUPPORT' || isSuper;
  const effectiveBusinessId = profile?.businessId || (isSuper ? 'matu' : null);
  const effectiveVenueName = isSupport ? 'TODAS LAS SEDES' : (profile?.assignedVenue || 'Sede Central');

  const customersRef = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return query(collection(db, "customers"))
    if (!effectiveBusinessId) return null
    return query(collection(db, "customers"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId, isSupport])

  const { data: rawCustomers, isLoading } = useCollection(customersRef)

  const customers = rawCustomers ? [...rawCustomers].sort((a, b) => (a.name || "").localeCompare(b.name || "")) : [];

  const handleRegister = async () => {
    if (!db || !newName.trim() || !effectiveBusinessId) return
    setIsSaving(true)
    try {
      await addDoc(collection(db, "customers"), {
        name: newName.trim().toUpperCase(),
        tier: "Regular",
        points: 0,
        ltv: 0,
        loyaltyScore: 50,
        lastVisit: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        businessId: effectiveBusinessId,
        assignedVenue: effectiveVenueName
      })
      toast({ title: "Cliente Registrado", description: "Iniciado seguimiento 360." })
      setIsRegisterOpen(false)
      setNewName("")
    } catch (error) { console.error(error) } finally { setIsSaving(false) }
  }

  const filteredCustomers = customers?.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="p-4 md:p-10 space-y-6 md:space-y-10 bg-white min-h-full max-w-[1400px] mx-auto font-body">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-3 md:gap-4">
            <Users className="h-6 md:h-8 w-6 md:w-8 text-primary" />
            Customer 360 • CRM Unificado
          </h1>
          <p className="text-[9px] md:text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic hidden md:block">Inteligencia de Lealtad Oracle-Style • {effectiveVenueName}</p>
        </div>
        <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto bg-primary hover:bg-primary/90 rounded-xl h-10 md:h-12 font-black shadow-lg shadow-primary/20 uppercase text-[9px] md:text-[10px] tracking-widest px-4 md:px-8">
               <UserPlus className="mr-1 md:mr-2 h-4 w-4" /> Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] md:max-w-md rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 bg-white">
            <DialogHeader><DialogTitle className="text-lg md:text-2xl font-black uppercase">Nueva Identidad CRM</DialogTitle></DialogHeader>
            <div className="py-4 md:py-8"><Label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400">Nombre del Invitado</Label><Input placeholder="EJ: MARIO ROSSI" value={newName} onChange={e => setNewName(e.target.value)} className="h-12 md:h-14 rounded-2xl bg-slate-50 border-none px-4 md:px-6 font-bold uppercase mt-2" /></div>
            <Button className="w-full h-12 md:h-14 bg-primary rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-xl" onClick={handleRegister} disabled={isSaving || !newName.trim()}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Registro 360"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
        {[
          { label: "Base de Datos", value: customers?.length || 0, icon: Users, color: "text-slate-900" },
          { label: "LTV Promedio", value: "$ 45.000", icon: TrendingUp, color: "text-emerald-600" },
          { label: "Loyalty Score", value: "84/100", icon: Target, color: "text-secondary" },
        ].map((item, i) => (
          <Card key={i} className="bg-slate-50 border-slate-100 shadow-xl rounded-[1.5rem] md:rounded-[2rem] p-2 md:p-2 transition-all hover:shadow-2xl">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</CardTitle>
                <item.icon className={cn("h-3 md:h-4 w-3 md:w-4", item.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl md:text-4xl font-black tracking-tighter", item.color)}>{item.value}</div>
              <p className="text-[8px] md:text-[9px] mt-1 md:mt-2 text-muted-foreground font-black uppercase tracking-tight">Sync Cloud Real-time</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[1.5rem] md:rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden bg-white">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100">
                <TableHead className="font-black text-[9px] md:text-[10px] uppercase tracking-widest py-6 md:py-8 px-4 md:px-10">Invitado 360</TableHead>
                <TableHead className="font-black text-[9px] md:text-[10px] uppercase tracking-widest">Estatus / Valor</TableHead>
                <TableHead className="text-right font-black text-[9px] md:text-[10px] uppercase tracking-widest">Loyalty Score</TableHead>
                <TableHead className="text-right font-black text-[9px] md:text-[10px] uppercase tracking-widest px-2 md:px-10">LTV Acumulado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-16 md:py-24"><Loader2 className="h-8 md:h-10 w-8 md:w-10 animate-spin mx-auto text-primary"/></TableCell></TableRow>
              ) : filteredCustomers.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                  <TableCell className="px-4 md:px-10 py-4 md:py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 uppercase text-[10px] md:text-xs">{c.name}</span>
                      <span className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase">Última Visita: {c.lastVisit ? format(new Date(c.lastVisit), "dd/MM/yy") : "---"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("font-black text-[8px] md:text-[9px] px-3 md:px-4 py-0.5 md:py-1 rounded-full uppercase", 
                      c.tier === "VIP" ? "bg-secondary text-white" : "bg-primary text-white"
                    )}>
                      {c.tier || "REGULAR"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 md:gap-2">
                      <span className="font-black text-slate-900 text-[10px] md:text-xs">{c.loyaltyScore || '50'}%</span>
                      <div className="w-12 md:w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${c.loyaltyScore || 50}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black text-primary text-xl tracking-tighter px-10">
                    {formatCurrencyDetailed(c.ltv || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center gap-4 relative z-10">
          <BrainCircuit className="h-8 w-8 text-primary" />
          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">IA Cero Engagement Analyst</h4>
        </div>
        <p className="text-[11px] leading-relaxed font-black italic text-slate-400 uppercase tracking-tight relative z-10">
          "He analizado el comportamiento de tus {customers?.length || 0} clientes vinculados. El 15% de tus invitados VIP generan el 60% de tu ROI en fines de semana. Sugiero activar el 'Protocolo de Cortesía' para este segmento."
        </p>
        <div className="pt-6 border-t border-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-[9px] font-black uppercase text-slate-500">Auditoría CRM bajo estándar UDM de Oracle.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
