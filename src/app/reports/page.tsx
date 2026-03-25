
"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  DollarSign, 
  Target,
  TrendingUp,
  Send,
  Loader2,
  ShieldCheck,
  Terminal,
  WifiOff,
  ClipboardCheck,
  Printer,
  PackageCheck,
  BrainCircuit,
  X,
  FileSpreadsheet,
  Globe,
  Activity,
  Layers,
  BarChart3,
  Zap,
  UtensilsCrossed
} from "lucide-react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter
} from "@/components/ui/dialog"
import { useFirestore, useMemoFirebase, useUser, useDoc, useCollection } from "@/firebase"
import { collection, query, where, orderBy, doc } from "firebase/firestore"
import { analyzeInventory } from "@/ai/flows/inventory-analyst-flow"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import * as XLSX from 'xlsx'
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

export default function ReportsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [mounted, setMounted] = useState(false)
  const [isOnline, setIsOnline] = useState<boolean | null>(null)
  const [isAuditOpen, setIsAuditOpen] = useState(false)
  const [isDetailedOpen, setIsDetailedOpen] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
  }, [])

  const [dispatching, setDispatching] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: "Soy Cero. He activado el panel de consolidación global inspirado en NetSuite OneWorld. ¿Deseas auditar el ROI consolidado de todas tus sedes?" }
  ])

  const emailLower = user?.email?.toLowerCase();
  const isSuperUser = emailLower === 'umbralcero7@gmail.com' || emailLower === 'amaroisaias611@gmail.com';

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);

  const isSupport = profile?.role === 'SUPPORT' || isSuperUser;
  const effectiveBusinessId = profile?.businessId || (isSuperUser ? 'matu' : null);
  const effectiveVenueName = isSupport ? 'GLOBAL HQ' : (profile?.assignedVenue || 'Sede Central');

  const invoicesRef = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return collection(db, "invoices")
    return query(collection(db, "invoices"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId, isSupport])

  const { data: allInvoices, isLoading: invoicesLoading } = useCollection(invoicesRef)

  const deliveriesRef = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return collection(db, "deliveries")
    return query(collection(db, "deliveries"), where("venueId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId, isSupport])

  const { data: allDeliveries, isLoading: deliveriesLoading } = useCollection(deliveriesRef)

  // Aggregation for "Today" detailed view
  const detailedStats = useMemo(() => {
    if (!allInvoices && !allDeliveries) return null;
    
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const todayStr = startOfToday.toISOString()

    const todayInvoices = allInvoices?.filter(inv => inv.timestamp >= todayStr) || []
    const todayDeliveries = allDeliveries?.filter(d => d.createdAt >= todayStr) || []

    const invTotal = todayInvoices.reduce((acc, i) => acc + (Number(i.total) || 0), 0)
    const delTotal = todayDeliveries.reduce((acc, i) => acc + (Number(i.total) || 0), 0)

    // Product Ranking
    const productMap: Record<string, { qty: number, total: number }> = {}
    
    const processItems = (items: any[]) => {
      items.forEach(item => {
        if (!productMap[item.name]) productMap[item.name] = { qty: 0, total: 0 }
        productMap[item.name].qty += (item.quantity || 1)
        productMap[item.name].total += (Number(item.price) * (item.quantity || 1))
      })
    }

    todayInvoices.forEach(inv => processItems(inv.items || []))
    todayDeliveries.forEach(del => processItems(del.items || []))

    const ranking = Object.entries(productMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)

    return {
      todayInvoices,
      todayDeliveries,
      invTotal,
      delTotal,
      grandTotal: invTotal + delTotal,
      ranking
    }
  }, [allInvoices, allDeliveries])

  const globalTotal = useMemo(() => allInvoices?.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0) || 0, [allInvoices])

  const handleChatSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!chatInput.trim() || chatLoading) return
    const userMsg = { role: 'user', content: chatInput }
    setMessages(prev => [...prev, userMsg])
    setChatInput("")
    setChatLoading(true)
    try {
      const res = await analyzeInventory({ query: userMsg.content, currentInventory: [] })
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Reconectando..." }])
    } finally { setChatLoading(false) }
  }

  if (!mounted) return null;

  return (
    <div className="p-4 md:p-10 space-y-10 bg-white min-h-full max-w-[1600px] mx-auto font-body">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-50 pb-10">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-4">
            <Globe className="h-8 w-8 text-secondary" />
            Consolidación Global OneWorld
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic italic">Inteligencia de Negocios Multi-Subsidiaria • {effectiveVenueName}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl h-12 border-slate-200 font-black text-[9px] uppercase tracking-widest" onClick={() => setIsDetailedOpen(true)}>
            <ClipboardCheck className="mr-2 h-4 w-4 text-primary" /> Venta Detallada
          </Button>
          <Button className="bg-secondary hover:bg-secondary/90 rounded-xl h-12 px-8 font-black text-[9px] uppercase tracking-widest shadow-xl shadow-secondary/20">
            <Activity className="mr-2 h-4 w-4" /> Ejecutar Cierre Global
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2.5rem] p-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Neto (Grupo)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-secondary tracking-tighter">{formatCurrencyDetailed(globalTotal)}</div>
            <p className="text-[9px] mt-4 font-black uppercase text-emerald-400 tracking-widest flex items-center gap-2">
              <TrendingUp className="h-3 w-3" /> +12.5% vs Mes Anterior
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[2.5rem] p-2">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eficiencia Operativa</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">92.4%</div>
            <p className="text-[9px] mt-4 text-muted-foreground font-black uppercase tracking-tight">Promedio de cumplimiento en sedes.</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[2.5rem] p-2">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activos Inmovilizados</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-primary tracking-tighter">$ 0.00</div>
            <p className="text-[9px] mt-4 text-muted-foreground font-black uppercase tracking-tight">Valor de stock en toda la red.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl p-10 bg-white">
            <CardHeader className="p-0 pb-10 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 uppercase">Performance por Sede</CardTitle>
                <CardDescription className="text-[10px] font-black text-slate-400 uppercase mt-1">Comparativa de ingresos y mermas (UDM Model).</CardDescription>
              </div>
              <BarChart3 className="h-8 w-8 text-slate-100" />
            </CardHeader>
            <CardContent className="p-0 h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-slate-50/50">
              <Activity className="h-12 w-12 text-slate-200 mb-4 animate-pulse" />
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Procesando cubos de datos UDM...</p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="rounded-[2.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden flex flex-col h-full border border-white/5">
            <CardHeader className="p-8 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-4">
                <BrainCircuit className="h-8 w-8 text-primary" />
                <h3 className="font-black uppercase text-[11px] tracking-[0.2em]">Cero Consolidated BI</h3>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-[400px] p-8">
                <div className="space-y-6">
                  {messages.map((msg, i) => (
                    <div key={i} className={cn("p-5 rounded-2xl text-[12px] leading-relaxed", msg.role === 'user' ? "bg-primary ml-auto" : "bg-white/5 border border-white/10 font-mono text-slate-300")}>
                      {msg.content}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="p-8 border-t border-white/5">
              <form onSubmit={handleChatSend} className="flex gap-2 w-full">
                <Input placeholder="Pregunta sobre el ROI global..." value={chatInput} onChange={e => setChatInput(e.target.value)} className="bg-white/5 border-white/10 h-12 text-white" />
                <Button type="submit" className="h-12 w-12 bg-primary"><Send className="h-4 w-4" /></Button>
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>
      {/* Detailed Sales Dialog */}
      <Dialog open={isDetailedOpen} onOpenChange={setIsDetailedOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader className="p-10 bg-slate-900 text-white border-b border-white/5">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <ClipboardCheck className="h-6 w-6 text-primary" />
                  Venta Detallada del Día
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-bold italic">
                  Consolidación de Canales POS e In-Delivery • {effectiveVenueName}
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase">Revenue Total Hoy</p>
                <p className="text-3xl font-black text-primary tracking-tighter">{formatCurrencyDetailed(detailedStats?.grandTotal || 0)}</p>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-4">Desglose por Canal</h4>
                <div className="space-y-4">
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-primary/20 hover:shadow-xl transition-all cursor-default">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary group-hover:scale-110 transition-transform"><BarChart3 className="h-6 w-6" /></div>
                      <div>
                        <p className="font-black text-xs uppercase text-slate-900">Ventas Salón / POS</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{detailedStats?.todayInvoices.length || 0} Tickets</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">{formatCurrencyDetailed(detailedStats?.invTotal || 0)}</p>
                      <p className="text-[8px] font-black text-emerald-500 uppercase mt-0.5">Activo hoy</p>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-secondary/20 hover:shadow-xl transition-all cursor-default">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-secondary group-hover:scale-110 transition-transform"><Send className="h-6 w-6" /></div>
                      <div>
                        <p className="font-black text-xs uppercase text-slate-900">Domicilios Entregados</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{detailedStats?.todayDeliveries.length || 0} Despachos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">{formatCurrencyDetailed(detailedStats?.delTotal || 0)}</p>
                      <p className="text-[8px] font-black text-blue-500 uppercase mt-0.5">Canal Digital</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 pt-2">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-4 mb-4">Estado de Domicilios</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 text-center group hover:bg-emerald-50 transition-colors">
                        <p className="text-2xl font-black text-emerald-600 tracking-tighter">{detailedStats?.todayDeliveries.filter(d => d.status === 'Entregado').length || 0}</p>
                        <p className="text-[9px] font-black uppercase text-emerald-600/60 mt-1 tracking-widest">Éxito</p>
                      </div>
                      <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 text-center group hover:bg-orange-50 transition-colors">
                        <p className="text-2xl font-black text-orange-600 tracking-tighter">{detailedStats?.todayDeliveries.filter(d => d.status === 'Pendiente' || d.status === 'En Camino').length || 0}</p>
                        <p className="text-[9px] font-black uppercase text-orange-600/60 mt-1 tracking-widest">En Proceso</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400">Ticket Promedio</p>
                        <p className="text-sm font-black text-slate-900 uppercase">Consumo por Cliente</p>
                      </div>
                    </div>
                    <p className="font-black text-primary text-lg tracking-tighter">
                      {formatCurrencyDetailed((detailedStats?.grandTotal || 0) / Math.max(1, (detailedStats?.todayInvoices.length || 0) + (detailedStats?.todayDeliveries.length || 0)))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-4 flex justify-between items-center">
                  Ranking de Productos
                  <Badge className="bg-primary/10 text-primary text-[8px] font-black uppercase px-3 py-1 rounded-full border-none">Cero Insight</Badge>
                </h4>
                <div className="space-y-3 min-h-[300px]">
                  {detailedStats?.ranking.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 opacity-20 filter grayscale">
                      <UtensilsCrossed className="h-16 w-16 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Sin ventas detectadas aún</p>
                    </div>
                  ) : detailedStats?.ranking.map((item, i) => (
                    <div key={i} className="group flex items-center justify-between p-4 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-2xl transition-all">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 text-primary text-[11px] font-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">#{i+1}</div>
                        <div>
                          <p className="font-black text-xs uppercase text-slate-900 group-hover:text-primary transition-colors">{item.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.qty} Unidades despachadas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 text-xs tracking-tighter">{formatCurrencyDetailed(item.total)}</p>
                        <div className="h-1 w-12 bg-slate-100 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${100 - (i * 20)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-8 bg-slate-900 text-white rounded-[2.5rem] space-y-4 relative overflow-hidden shadow-2xl border border-white/5">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <BrainCircuit className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Estrategia sugerida por Cero AI</p>
                  </div>
                  <p className="text-[11px] font-black italic text-slate-300 leading-relaxed relative z-10">
                    {detailedStats?.delTotal === 0 
                      ? "\"El canal de domicilios está inactivo hoy. Considera lanzar una promoción 'Flash' en redes sociales para incentivar pedidos externos antes del cierre.\""
                      : `"El canal de domicilios ya representa el ${((detailedStats?.delTotal || 0) / (detailedStats?.grandTotal || 1) * 100).toFixed(1)}% de tu ingreso. Sugiero rotar personal de salón hacia empaque para mantener la eficiencia."`}
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 bg-slate-50 border-t flex justify-between items-center">
             <div className="flex gap-2">
                <Button variant="ghost" className="h-10 text-[9px] font-black uppercase" onClick={() => setIsDetailedOpen(false)}>Cerrar Auditoría</Button>
             </div>
             <Button className="h-12 bg-slate-900 text-white rounded-xl px-10 font-black text-[9px] uppercase tracking-widest">
               Descargar XML Consolidado
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
