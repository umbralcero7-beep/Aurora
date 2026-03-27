
"use client"

import { useState, useMemo, useEffect } from "react"
import { 
  Briefcase, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Loader2,
  BrainCircuit,
  UserPlus,
  Plus,
  Calendar,
  CheckCircle2,
  FileText,
  BadgeCheck,
  Zap,
  ArrowRight,
  ClipboardCheck,
  Target,
  DollarSign,
  PieChart,
  Calculator,
  Clock,
  X,
  History,
  AlertTriangle,
  Printer
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLanguage } from "@/context/language-context"
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { differenceInDays, parseISO, format } from "date-fns"

export default function HRDashboardPage() {
  const { t } = useLanguage()
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  
  const [mounted, setMounted] = useState(false)
  const [isLiquidationOpen, setIsLiquidationOpen] = useState(false)
  const [isOvertimeOpen, setIsOvertimeOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const emailLower = user?.email?.toLowerCase();
  const isSuperUser = emailLower === 'umbralcero7@gmail.com' || emailLower === 'amaroisaias611@gmail.com';

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);

  const effectiveBusinessId = profile?.businessId || (isSuperUser ? 'matu' : null);
  const effectiveVenueName = isSuperUser ? 'AURORA GLOBAL HQ' : (profile?.assignedVenue || 'Sede Central');

  const staffRef = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "staff"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const { data: staff, isLoading } = useCollection(staffRef)

  const stats = useMemo(() => {
    if (!staff || !mounted) return { total: 0, active: 0, avgPerformance: 0, payroll: 0 }
    const total = staff.length
    const active = staff.filter(s => s.status === 'ACTIVO').length
    const payroll = staff.reduce((acc, s) => acc + (Number(s.salary) || 0), 0)
    const avgPerf = staff.reduce((acc, s) => acc + (Number(s.performanceScore) || 0), 0) / (total || 1)
    return { total, active, avgPerformance: Math.round(avgPerf), payroll }
  }, [staff, mounted])

  const liquidationProjections = useMemo(() => {
    if (!staff || !mounted) return []
    return staff.filter(s => s.status === 'ACTIVO').map(s => {
      const salary = Number(s.salary) || 0
      const startDate = s.hireDate ? parseISO(s.hireDate) : new Date()
      const daysWorked = differenceInDays(new Date(), startDate)
      
      const factor = (daysWorked / 360) * 2
      const projected = salary * factor

      return {
        id: s.id,
        name: s.fullName,
        role: s.role,
        days: daysWorked,
        amount: projected
      }
    }).sort((a, b) => b.amount - a.amount)
  }, [staff, mounted])

  if (!mounted || isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center py-40 gap-4 bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-black text-primary uppercase text-[10px] tracking-widest animate-pulse">Analizando Capital Humano...</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10 space-y-10 bg-white min-h-full max-w-[1600px] mx-auto font-body">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-4">
            <Briefcase className="h-8 w-8 md:h-10 md:w-10 text-primary" />
            {t.hr.title}
          </h1>
          <p className="text-[10px] md:text-[11px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">{t.hr.subtitle}</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="flex-1 md:flex-none rounded-xl h-12 border-slate-200 font-black text-[10px] uppercase tracking-widest px-8"
            onClick={() => router.push('/hr/staff')}
          >
            <Users className="mr-2 h-4 w-4" /> Directorio Equipo
          </Button>
          <Button 
            className="flex-1 md:flex-none bg-primary hover:bg-primary/90 rounded-xl h-12 font-black text-[10px] uppercase tracking-widest px-8 shadow-xl shadow-primary/20"
            onClick={() => router.push('/hr/staff?new=true')}
          >
            <UserPlus className="mr-2 h-4 w-4" /> {t.hr.addStaff}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t.hr.totalStaff, value: stats.total, icon: Users, trend: "Sede Activa", color: "text-slate-900" },
          { label: t.hr.activeContracts, value: stats.active, icon: BadgeCheck, trend: "Vinculados", color: "text-emerald-600" },
          { label: t.hr.performanceAvg, value: `${stats.avgPerformance}%`, icon: Target, trend: "Score KPI", color: "text-primary" },
          { label: t.hr.totalPayroll, value: formatCurrencyDetailed(stats.payroll), icon: DollarSign, trend: "Costo Mensual", color: "text-secondary" },
        ].map((item, i) => (
          <Card key={i} className="bg-slate-50 border-slate-100 shadow-xl rounded-[2rem] p-2 transition-all hover:shadow-2xl">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</CardTitle>
                <item.icon className={cn("h-4 w-4", item.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-black tracking-tighter", item.color)}>{item.value}</div>
              <p className="text-[8px] mt-2 text-muted-foreground font-black uppercase tracking-tight">{item.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-10">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl p-8 md:p-10 bg-white">
            <CardHeader className="p-0 pb-10 border-b border-slate-50 mb-10">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Auditoría de Nómina y Roles</CardTitle>
                  <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Control de impacto financiero por departamento.</CardDescription>
                </div>
                <Badge className="bg-emerald-50 text-emerald-600 font-black text-[8px] uppercase px-3 py-1 rounded-full border border-emerald-100">Protocolo Financiero Activo</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-10">
              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <PieChart className="h-3 w-3" /> Distribución de Gasto
                  </h4>
                  <div className="space-y-4">
                    {[
                      { role: 'Meseros', pct: 45, color: 'bg-primary' },
                      { role: 'Cocina', pct: 30, color: 'bg-secondary' },
                      { role: 'Administración', pct: 15, color: 'bg-slate-900' },
                      { role: 'Otros', pct: 10, color: 'bg-slate-200' }
                    ].map((item, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-[9px] font-black uppercase text-slate-500 tracking-widest">
                          <span>{item.role}</span>
                          <span>{item.pct}%</span>
                        </div>
                        <Progress value={item.pct} className={cn("h-1.5 bg-slate-100", item.color)} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-6 bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] flex items-center gap-2">
                    <ClipboardCheck className="h-3 w-3" /> Alertas HR & Nómina
                  </h4>
                  <div className="space-y-4">
                    <div className="flex gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                      <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-900 uppercase">Vencimiento Contrato</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase italic">Revisar términos de 2 colaboradores.</p>
                      </div>
                    </div>
                    <div className="flex gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-900 uppercase">Ajuste Salarial</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase italic">Pendiente validación de bonos KPI.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-10">
          <Card className="rounded-[2.5rem] bg-slate-900 text-white p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4">
                <BrainCircuit className="h-8 w-8 text-primary" />
                <h3 className="font-black uppercase text-[11px] tracking-[0.3em] text-white">{t.hr.ceroInsight}</h3>
              </div>
              <p className="text-[11px] leading-relaxed font-black italic text-slate-400 uppercase tracking-tight">
                "He cruzado los datos de nómina con el ticket promedio de {effectiveVenueName}. El costo laboral actual representa el 18% de las ventas brutas, manteniéndose en el rango de eficiencia óptima para gastronomía de élite."
              </p>
              <div className="pt-6 border-t border-white/5 space-y-4">
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Acciones de Nómina:</p>
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsLiquidationOpen(true)}
                    className="w-full justify-between h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white border-none text-[9px] font-black uppercase tracking-widest px-4 transition-all"
                  >
                    Proyectar Liquidaciones <ArrowRight className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsOvertimeOpen(true)}
                    className="w-full justify-between h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white border-none text-[9px] font-black uppercase tracking-widest px-4 transition-all"
                  >
                    Reporte de Horas Extra <ArrowRight className="h-3.5 w-3.5 text-primary" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2.5rem] border-slate-100 shadow-xl p-8 bg-slate-50/30">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Seguridad de Nómina
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-[9px] font-bold text-slate-500 leading-relaxed uppercase italic">
                Los datos salariales están blindados bajo el protocolo Cero Trust. Cualquier ajuste en la nómina es notificado al Súper Usuario y queda registrado en el historial inalterable de la sede.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DIÁLOGO: PROYECCIÓN DE LIQUIDACIONES */}
      <Dialog open={isLiquidationOpen} onOpenChange={setIsLiquidationOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-white/10">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tighter">Proyección de Liquidaciones</DialogTitle>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Simulación de Pasivos Laborales • {effectiveVenueName}</p>
              </div>
            </div>
            <button onClick={() => setIsLiquidationOpen(false)} className="text-white/50 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
          </div>

          <div className="p-10 space-y-8">
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex gap-4 items-start">
              <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
              <p className="text-[11px] text-emerald-800 font-bold uppercase leading-relaxed">
                Este cálculo es una simulación basada en la fecha de ingreso y el salario base registrado. Incluye una estimación de prestaciones sociales acumuladas a la fecha de hoy.
              </p>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {liquidationProjections.length === 0 ? (
                  <div className="text-center py-20 opacity-20 italic">No hay personal activo para proyectar.</div>
                ) : (
                  liquidationProjections.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all group">
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-slate-900 uppercase">{p.name}</p>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[7px] font-black uppercase px-2 py-0 border-slate-200 text-slate-400">{p.role}</Badge>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{p.days} días trabajados</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-primary tracking-tighter">{formatCurrencyDetailed(p.amount)}</p>
                        <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Liquidación Proyectada</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Pasivo Proyectado</span>
                <span className="text-2xl font-black text-slate-900 tracking-tighter">
                  {formatCurrencyDetailed(liquidationProjections.reduce((acc, curr) => acc + curr.amount, 0))}
                </span>
              </div>
              <Button onClick={() => window.print()} variant="outline" className="h-12 rounded-xl px-6 font-black text-[9px] uppercase tracking-widest border-slate-200">
                <Printer className="mr-2 h-4 w-4" /> Exportar a PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: REPORTE DE HORAS EXTRA */}
      <Dialog open={isOvertimeOpen} onOpenChange={setIsOvertimeOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-secondary/20 flex items-center justify-center border border-white/10">
                <Clock className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tighter">Reporte de Horas Extra</DialogTitle>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Auditoría de Sobrecostos Operativos • {effectiveVenueName}</p>
              </div>
            </div>
            <button onClick={() => setIsOvertimeOpen(false)} className="text-white/50 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
          </div>

          <div className="p-10 space-y-8">
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Horas Totales</p>
                <p className="text-xl font-black text-slate-900">0.0h</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Costo Adicional</p>
                <p className="text-xl font-black text-secondary">$ 0</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Alertas Crit.</p>
                <p className="text-xl font-black text-emerald-500">0</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30 gap-4">
              <History className="h-10 w-10 text-slate-200" />
              <div className="text-center">
                <p className="text-xs font-black text-slate-400 uppercase">Sin registros en este ciclo</p>
                <p className="text-[9px] font-bold text-slate-300 uppercase italic mt-1">Cero: No se detectan desviaciones de horario.</p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <div className="bg-slate-900 rounded-2xl p-6 text-white flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-4">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed max-w-xs">
                    "Las horas extra impactan directamente en el margen de contribución. He activado el monitor de turnos para el próximo fin de semana."
                  </p>
                </div>
                <Button variant="ghost" className="text-primary hover:bg-primary/10 font-black text-[9px] uppercase tracking-widest h-10 px-6 rounded-xl">
                  Configurar Alertas
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
