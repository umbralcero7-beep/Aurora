"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  BrainCircuit, 
  Search,
  ShoppingCart,
  Bell,
  Package,
  TrendingUp,
  Activity,
  Target,
  Receipt,
  LayoutDashboard,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ClipboardList,
  LayoutGrid,
  ChefHat,
  ChevronLeft,
  Wifi,
  WifiOff,
  Briefcase,
  Users,
  ShieldCheck,
  Truck,
  FileSpreadsheet
} from "lucide-react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { useLanguage } from "@/context/language-context"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase"
import { doc, collection, query, where, limit } from "firebase/firestore"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function Dashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const db = useFirestore();
  const { user } = useUser();
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);
  const businessId = profile?.businessId || (user?.email?.toLowerCase() === 'umbralcero7@gmail.com' ? 'matu' : null);

  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !businessId) return null
    return query(collection(db, "invoices"), where("businessId", "==", businessId))
  }, [db, businessId])

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !businessId) return null
    return query(collection(db, "expenses"), where("businessId", "==", businessId))
  }, [db, businessId])

  const { data: invoices } = useCollection(invoicesQuery)
  const { data: expenses } = useCollection(expensesQuery)

  const totalSales = useMemo(() => invoices?.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0) || 0, [invoices])
  const totalExpenses = useMemo(() => expenses?.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0) || 0, [expenses])

  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !businessId) return null
    return query(
      collection(db, "notifications"),
      where("businessId", "==", businessId),
      where("status", "==", "unread"),
      limit(5)
    )
  }, [db, businessId])

  const { data: notifications } = useCollection(notificationsQuery)

  const tutorialSteps = [
    {
      title: "Bienvenido a Aurora OS V4.5",
      description: "Cero ha detectado tu identidad. He calibrado tu acceso basándome en el protocolo de aislamiento de roles.",
      items: [
        { title: "Aislamiento Mesero", desc: "Interfaz exclusiva: Comandas y Cocina.", icon: ShoppingCart },
        { title: "Soberanía Súper Usuario", desc: "Control total centralizado para Auditoría.", icon: ShieldCheck },
        { title: "Smart POS Híbrido", desc: "Cambia entre Venta Directa y Salón.", icon: LayoutGrid },
        { title: "Cloud Persistence", desc: "Modo Offline real en Móviles y Tablets.", icon: WifiOff }
      ]
    },
    {
      title: "Deep HR & Talento",
      description: "Gestiona tu capital humano con herramientas de nivel corporativo integradas en el ERP.",
      items: [
        { title: "Inyección Masiva", desc: "Carga tu nómina desde Excel auditado por IA.", icon: FileSpreadsheet },
        { title: "Control de Nómina", desc: "Auditoría salarial y gasto prestacional mensual.", icon: Briefcase },
        { title: "Cálculos Expertos", desc: "Proyecta liquidaciones y horas extra al instante.", icon: TrendingUp },
        { title: "White-list", desc: "Acceso seguro por pre-autorización de correo.", icon: Users }
      ]
    },
    {
      title: "Operaciones de Precisión",
      description: "Cada centavo y cada ingrediente están bajo el escaneo constante del núcleo Cero.",
      items: [
        { title: "Anulación Auditada", desc: "Protocolo de bajas con motivo obligatorio.", icon: Truck },
        { title: "Calculadora POS", desc: "Selector rápido de efectivo para checkout veloz.", icon: Receipt },
        { title: "Monitor de Cocina", desc: "Producción en tiempo real sincronizada.", icon: ChefHat },
        { title: "Checklist Térmico", desc: "Auditoría de insumos vía ticket térmico.", icon: ClipboardList }
      ]
    }
  ];

  const handleNextStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
      setTutorialStep(0);
    }
  };

  const handlePrevStep = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1);
    }
  };

  const toggleOfflineSimulation = (checked: boolean) => {
    setIsSimulatedOffline(checked);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aurora:toggle-offline', { detail: { offline: checked } }));
    }
  };

  if (!mounted) return null;

  return (
    <div className="p-3 md:p-6 lg:p-8 space-y-4 md:space-y-6 bg-white min-h-full max-w-[1600px] mx-auto font-body overflow-x-hidden">
      {/* Dashboard Header - Compact */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="shrink-0">
          <h1 className="text-lg font-black tracking-tighter text-slate-900 uppercase flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Resumen Aurora
          </h1>
          <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mt-0.5 italic">V4.5 • Ecosistema Sincronizado</p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input 
              placeholder="Consultar..." 
              className="pl-10 bg-slate-50 border-slate-100 h-10 rounded-xl shadow-none font-medium focus:ring-primary/20 w-full text-[10px]" 
            />
          </div>
          <button 
            className="relative rounded-xl bg-slate-50 h-10 w-10 border border-slate-100 shrink-0 flex items-center justify-center transition-all hover:bg-slate-100"
            onClick={() => router.push('/comandas')}
          >
            <Bell className="h-4 w-4 text-slate-500" />
            {notifications && notifications.length > 0 && (
              <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-destructive rounded-full border-2 border-white animate-pulse" />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-4 md:space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <Card className="shadow-lg border-slate-100 rounded-2xl p-4 bg-primary text-white relative overflow-hidden transition-all hover:shadow-xl">
              <CardHeader className="p-0 pb-1">
                <CardTitle className="text-[8px] font-black text-white/60 uppercase tracking-widest">Ventas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-xl md:text-2xl font-black tracking-tighter">{formatCurrencyDetailed(totalSales)}</div>
                <p className="text-[7px] mt-2 font-bold uppercase tracking-widest opacity-80 flex items-center gap-1">
                  <TrendingUp className="h-2.5 w-2.5" /> Auditado
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-slate-100 rounded-2xl p-4 bg-white transition-all hover:shadow-xl">
              <CardHeader className="p-0 pb-1">
                <CardTitle className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Gastos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-xl md:text-2xl font-black text-destructive tracking-tighter">-{formatCurrencyDetailed(totalExpenses)}</div>
                <p className="text-[7px] text-muted-foreground mt-2 font-bold uppercase tracking-widest flex items-center gap-1">
                  <Receipt className="h-2.5 w-2.5 text-destructive" /> Registrados
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-slate-100 rounded-2xl p-4 bg-white transition-all hover:shadow-xl">
              <CardHeader className="p-0 pb-1">
                <CardTitle className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Balance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className={cn("text-xl md:text-2xl font-black tracking-tighter", totalSales - totalExpenses >= 0 ? "text-emerald-600" : "text-destructive")}>
                  {formatCurrencyDetailed(totalSales - totalExpenses)}
                </div>
                <p className="text-[7px] text-muted-foreground mt-2 font-bold uppercase tracking-widest flex items-center gap-1">
                  <Target className="h-2.5 w-2.5 text-emerald-500" /> Neto Sede
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Placeholder - Height Optimized */}
          <Card className="shadow-xl border-slate-100 rounded-3xl p-5 md:p-6 bg-white overflow-hidden">
            <CardHeader className="p-0 pb-4 flex flex-row justify-between items-start">
              <div>
                <CardTitle className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tighter">Actividad Reciente</CardTitle>
                <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">Histórico V4.5</p>
              </div>
              <Badge variant="outline" className="rounded-full border-slate-100 text-[7px] font-black uppercase px-2 py-0.5 tracking-widest">Live Cloud</Badge>
            </CardHeader>
            <CardContent className="h-[140px] md:h-[200px] w-full p-0 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-slate-50/50">
               <Activity className="h-6 w-6 text-slate-200 mb-3" />
               <p className="text-[8px] font-black uppercase text-slate-300">Sin movimientos nuevos</p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-4 md:space-y-6">
          {/* Cero AI Insight & Simulation */}
          <div className="bg-slate-900 p-5 md:p-6 rounded-3xl shadow-xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <BrainCircuit className="h-16 w-16 text-primary" />
            </div>
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <h3 className="text-white font-black uppercase text-[9px] tracking-[0.2em]">Cero Command</h3>
            </div>
            <div className="space-y-4 relative z-10">
              <p className="text-[10px] md:text-[11px] text-slate-300 leading-relaxed font-bold italic">
                "He habilitado el simulador de red. Úsalo para validar el resguardo local de datos en cualquier dispositivo."
              </p>
              
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  {isSimulatedOffline ? <WifiOff className="h-4 w-4 text-orange-500 animate-pulse" /> : <Wifi className="h-4 w-4 text-emerald-500" />}
                  <div className="flex flex-col">
                    <Label htmlFor="offline-mode" className="text-[9px] font-black text-white uppercase cursor-pointer">Simular Offline</Label>
                    <span className="text-[7px] text-slate-500 uppercase font-bold">Resguardo de datos</span>
                  </div>
                </div>
                <Switch 
                  id="offline-mode" 
                  checked={isSimulatedOffline} 
                  onCheckedChange={toggleOfflineSimulation}
                  className="data-[state=checked]:bg-orange-500"
                />
              </div>

              <Button className="w-full h-9 rounded-xl bg-primary hover:bg-primary/90 font-black text-[8px] uppercase tracking-widest shadow-lg transition-all active:scale-95" onClick={() => { setTutorialStep(0); setShowTutorial(true); }}>
                <Sparkles className="mr-2 h-3 w-3" /> Ver Tutorial Aurora
              </Button>
            </div>
          </div>

          {/* Priorities List - Compact */}
          <Card className="shadow-xl border-slate-100 rounded-3xl p-5 md:p-6 bg-white">
            <CardHeader className="pt-0 px-0 pb-3 border-b border-slate-50 flex flex-row justify-between items-center">
              <CardTitle className="text-xs font-black text-slate-900 uppercase tracking-tighter">Prioridades</CardTitle>
              <Package className="h-3.5 w-3.5 text-slate-200" />
            </CardHeader>
            <CardContent className="space-y-2 px-0 pt-3">
              {[
                { task: "Auditoría de Insumos", priority: "Crítico" },
                { task: "Sincronización Cloud", priority: "Media" }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50/50 p-2 rounded-xl border border-transparent hover:border-slate-100 transition-all cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Checkbox id={`task-${i}`} className="h-3.5 w-3.5 rounded-md border-slate-200" />
                    <label htmlFor={`task-${i}`} className="text-[9px] font-bold text-slate-600 cursor-pointer uppercase tracking-tight line-clamp-1">{item.task}</label>
                  </div>
                  <Badge variant="ghost" className="text-[6px] font-black uppercase text-slate-400 shrink-0">{item.priority}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl rounded-3xl p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="bg-slate-900 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <DialogHeader className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <BrainCircuit className="h-6 w-6 text-primary" />
                <Badge className="bg-primary text-white font-black text-[8px] px-3 py-0.5 rounded-full uppercase tracking-widest">Paso {tutorialStep + 1} de {tutorialSteps.length}</Badge>
              </div>
              <DialogTitle className="text-lg md:text-xl font-black uppercase tracking-tighter">{tutorialSteps[tutorialStep].title}</DialogTitle>
              <div className="text-slate-400 text-[10px] md:text-xs font-bold italic mt-2 leading-relaxed">
                "{tutorialSteps[tutorialStep].description}"
              </div>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tutorialSteps[tutorialStep].items.map((step, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                  <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                    <step.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-900">{step.title}</h4>
                    <p className="text-[9px] text-slate-400 font-bold leading-snug mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2 flex-1">
              {tutorialStep > 0 && (
                <Button variant="outline" onClick={handlePrevStep} className="h-10 rounded-xl font-black text-[9px] uppercase tracking-widest px-4">
                  <ChevronLeft className="mr-1.5 h-3.5 w-3.5" /> Atrás
                </Button>
              )}
              <Button variant="ghost" onClick={() => setShowTutorial(false)} className="h-10 rounded-xl font-black text-[9px] uppercase tracking-widest">Omitir</Button>
            </div>
            <Button className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95" onClick={handleNextStep}>
              {tutorialStep < tutorialSteps.length - 1 ? "Siguiente" : "Finalizar"} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
