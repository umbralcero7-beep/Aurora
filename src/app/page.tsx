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
import { isSuperUser } from '@/lib/constants';
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
import { doc, collection, query, where, limit, orderBy } from "firebase/firestore"
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
  
  // Hydration safety for fiscal session
  const [sessionStartIso, setSessionStartIso] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);
  const isSuper = isSuperUser(user?.email);
  const businessId = profile?.businessId || (isSuper ? 'matu' : null);

  const fiscalReportsRef = useMemoFirebase(() => {
    if (!db || !businessId) return null
    return query(
      collection(db, "fiscal_reports"), 
      where("businessId", "==", businessId),
      orderBy("timestamp", "desc"),
      limit(50)
    )
  }, [db, businessId])

  const { data: reports, isLoading: reportsLoading } = useCollection(fiscalReportsRef)

  useEffect(() => {
    if (!mounted || reportsLoading) return;
    
    const lastZ = (reports || []).find(r => r.type === 'Z');
    if (lastZ && lastZ.timestamp) {
      setSessionStartIso(lastZ.timestamp);
    } else {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      setSessionStartIso(d.toISOString());
    }
  }, [reports, reportsLoading, mounted]);

  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !businessId) return null
    return query(collection(db, "invoices"), where("businessId", "==", businessId))
  }, [db, businessId])

  const deliveriesQuery = useMemoFirebase(() => {
    if (!db || !businessId) return null
    return query(collection(db, "deliveries"), where("venueId", "==", businessId))
  }, [db, businessId])

  const { data: invoices } = useCollection(invoicesQuery)
  const { data: deliveries } = useCollection(deliveriesQuery)

  const currentSessionInvoices = useMemo(() => {
    if (!invoices || !sessionStartIso) return []
    return invoices.filter(inv => (inv.timestamp || "") > sessionStartIso)
  }, [invoices, sessionStartIso])

  const currentSessionDeliveries = useMemo(() => {
    if (!deliveries || !sessionStartIso) return []
    return deliveries.filter(d => (d.createdAt || "") > sessionStartIso && d.status !== 'Anulado')
  }, [deliveries, sessionStartIso])

  const totalSales = useMemo(() => {
    const posTotal = currentSessionInvoices.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0)
    const delTotal = currentSessionDeliveries.reduce((acc, d) => acc + (Number(d.total) || 0), 0)
    return posTotal + delTotal
  }, [currentSessionInvoices, currentSessionDeliveries])

  if (!mounted) return null;

  return (
    <div className="p-3 md:p-6 lg:p-8 space-y-4 md:space-y-6 bg-white min-h-full max-w-[1600px] mx-auto font-body overflow-x-hidden">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="shrink-0">
          <h1 className="text-lg font-black tracking-tighter text-slate-900 uppercase flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Resumen Aurora
          </h1>
          <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mt-0.5 italic">V4.5 • Ecosistema Sincronizado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        <div className="lg:col-span-8 space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <Card className="shadow-lg border-slate-100 rounded-2xl p-4 bg-primary text-white relative overflow-hidden">
              <CardHeader className="p-0 pb-1">
                <CardTitle className="text-[8px] font-black text-white/60 uppercase tracking-widest">Recaudo Sesión</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-xl md:text-2xl font-black tracking-tighter">
                  {reportsLoading ? "---" : formatCurrencyDetailed(totalSales)}
                </div>
              </CardContent>
            </Card>

            <Card className={cn("shadow-lg border-slate-100 rounded-2xl p-4 transition-all", 
              totalSales > 0 ? "bg-orange-50" : "bg-white"
            )}>
              <CardHeader className="p-0 pb-1">
                <CardTitle className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Estado Fiscal</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className={cn("text-xl md:text-2xl font-black tracking-tighter", 
                  totalSales > 0 ? "text-orange-600" : "text-emerald-600"
                )}>
                  {reportsLoading ? "SINCRONIZANDO..." : totalSales > 0 ? "VENTAS ACTIVAS" : "SESIÓN LIMPIA"}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-slate-100 rounded-2xl p-4 bg-white">
              <CardHeader className="p-0 pb-1">
                <CardTitle className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Último Cierre Z</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-xl md:text-2xl font-black text-primary tracking-tighter">
                  #{reports?.find(r => r.type === 'Z')?.reportNumber || '---'}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-xl border-slate-100 rounded-3xl p-5 md:p-6 bg-white overflow-hidden">
            <CardHeader className="p-0 pb-4 flex flex-row justify-between items-start">
              <div>
                <CardTitle className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tighter">Monitor Operativo</CardTitle>
              </div>
              <Badge variant="outline" className="rounded-full text-[7px] font-black uppercase">Live Cloud</Badge>
            </CardHeader>
            <CardContent className="h-[140px] md:h-[200px] w-full p-0 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-slate-50/50">
               <Activity className="h-6 w-6 text-slate-200 mb-3" />
               <p className="text-[8px] font-black uppercase text-slate-300">Terminal Sincronizada</p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-4 md:space-y-6">
          <div className="bg-slate-900 p-5 md:p-6 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <h3 className="text-white font-black uppercase text-[9px] tracking-[0.2em]">Cero Command</h3>
            </div>
            <p className="text-[10px] md:text-[11px] text-slate-300 leading-relaxed font-bold italic mb-4">
              "He calibrado los sensores. Todo el flujo operativo está bajo supervisión de grado militar."
            </p>
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                {isSimulatedOffline ? <WifiOff className="h-4 w-4 text-orange-500 animate-pulse" /> : <Wifi className="h-4 w-4 text-emerald-500" />}
                <Label htmlFor="offline-mode" className="text-[9px] font-black text-white uppercase cursor-pointer">Modo Offline</Label>
              </div>
              <Switch id="offline-mode" checked={isSimulatedOffline} onCheckedChange={(c) => setIsSimulatedOffline(c)} className="data-[state=checked]:bg-orange-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
