"use client"

import { isSuperUser } from '@/lib/constants';
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
  Truck,
  ShoppingBag,
  History,
  CheckCircle2,
  Utensils,
  ReceiptText,
  Users
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFirestore, useMemoFirebase, useUser, useDoc, useCollection } from "@/firebase"
import { collection, query, where, orderBy, doc, limit } from "firebase/firestore"
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
  const [sessionStartIso, setSessionStartIso] = useState<string>("")
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: "Soy Cero. He activado el panel de consolidación global. ¿Deseas auditar el ROI consolidado o generar la checklist de inventario?" }
  ])

  useEffect(() => {
    setMounted(true)
  }, [])

  const isSuper = isSuperUser(user?.email);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);

  const isSupport = profile?.role === 'SUPPORT' || isSuper;
  const effectiveBusinessId = profile?.businessId || (isSuper ? 'matu' : null);
  const effectiveVenueName = isSupport ? 'GLOBAL HQ' : (profile?.assignedVenue || 'Sede Central');

  const fiscalReportsRef = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(
      collection(db, "fiscal_reports"), 
      where("businessId", "==", effectiveBusinessId),
      orderBy("timestamp", "desc"),
      limit(10)
    )
  }, [db, effectiveBusinessId])

  const { data: reports, isLoading: reportsLoading } = useCollection(fiscalReportsRef)

  // Obtener el último reporte Z para extraer los productos vendidos
  const lastZReport = useMemo(() => {
    return (reports || []).find(r => r.type === 'Z');
  }, [reports])

  useEffect(() => {
    if (!mounted || reportsLoading) return;
    
    if (lastZReport && lastZReport.timestamp) {
      setSessionStartIso(lastZReport.timestamp);
    } else {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      setSessionStartIso(d.toISOString())
    }
  }, [lastZReport, reportsLoading, mounted])

  const invoicesRef = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(
      collection(db, "invoices"), 
      where("businessId", "==", effectiveBusinessId)
    )
  }, [db, effectiveBusinessId])

  const deliveriesRef = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(
      collection(db, "deliveries"), 
      where("venueId", "==", effectiveBusinessId)
    )
  }, [db, effectiveBusinessId])

  const { data: allInvoices } = useCollection(invoicesRef)
  const { data: allDeliveries } = useCollection(deliveriesRef)

  const currentSessionInvoices = useMemo(() => {
    if (!allInvoices || !sessionStartIso) return []
    return allInvoices.filter(inv => (inv.timestamp || "") > sessionStartIso)
  }, [allInvoices, sessionStartIso])

  const currentSessionDeliveries = useMemo(() => {
    if (!allDeliveries || !sessionStartIso) return []
    return allDeliveries.filter(d => (d.createdAt || "") > sessionStartIso && d.status !== 'Anulado')
  }, [allDeliveries, sessionStartIso])

  const stats = useMemo(() => {
    const itemMap: Record<string, { name: string, quantity: number, total: number }> = {}
    
    currentSessionInvoices.forEach(inv => {
      inv.items?.forEach((item: any) => {
        if (!itemMap[item.id]) itemMap[item.id] = { name: item.name, quantity: 0, total: 0 }
        itemMap[item.id].quantity += Number(item.quantity)
        itemMap[item.id].total += (Number(item.price) * Number(item.quantity))
      })
    })

    currentSessionDeliveries.forEach(d => {
      d.items?.forEach((item: any) => {
        if (!itemMap[item.id]) itemMap[item.id] = { name: item.name, quantity: 0, total: 0 }
        itemMap[item.id].quantity += Number(item.quantity)
        itemMap[item.id].total += (Number(item.price) * Number(item.quantity))
      })
    })

    const posTotal = currentSessionInvoices.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0)
    const deliveryTotal = currentSessionDeliveries.reduce((acc, d) => acc + (Number(d.total) || 0), 0)

    // Ventas por Mesero/Cajero
    const staffMap: Record<string, { total: number, count: number }> = {}
    currentSessionInvoices.forEach(inv => {
      const name = inv.cashierName || 'DESCONOCIDO'
      if (!staffMap[name]) staffMap[name] = { total: 0, count: 0 }
      staffMap[name].total += Number(inv.total)
      staffMap[name].count += 1
    })

    // Domicilios cancelados y enviados
    const deliveredDelivs = currentSessionDeliveries.filter(d => d.status === 'Delivered')
    const cancelledDelivs = (allDeliveries || []).filter(d => (d.createdAt || "") > sessionStartIso && d.status === 'Anulado')

    // Ventas rápidas: facturas con tableNumber "PARA LLEVAR"
    const quickSales = currentSessionInvoices.filter(inv => inv.tableNumber === 'PARA LLEVAR')
    const quickTotal = quickSales.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0)

    // Ventas de mesa: facturas con mesa asignada
    const tableSales = currentSessionInvoices.filter(inv => inv.tableNumber && inv.tableNumber !== 'PARA LLEVAR')
    const tableTotal = tableSales.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0)
    
    return {
      posTotal,
      posCount: currentSessionInvoices.length,
      deliveryTotal,
      deliveryCount: currentSessionDeliveries.length,
      deliveredCount: deliveredDelivs.length,
      cancelledCount: cancelledDelivs.length,
      cancelledTotal: cancelledDelivs.reduce((acc, d) => acc + (Number(d.total) || 0), 0),
      grandTotal: posTotal + deliveryTotal,
      itemSales: Object.values(itemMap).sort((a, b) => b.quantity - a.quantity),
      quickSales,
      quickTotal,
      quickCount: quickSales.length,
      tableSales,
      tableTotal,
      tableCount: tableSales.length,
      staffSales: Object.entries(staffMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total)
    }
  }, [currentSessionInvoices, currentSessionDeliveries, allDeliveries, sessionStartIso])

  const printInventoryChecklist = () => {
    if (typeof window === 'undefined') return;
    const windowPrint = window.open('', '', 'width=600,height=800');
    if (windowPrint) {
      const formattedDate = format(new Date(), 'dd-MM-yyyy');
      const docTitle = `Checklist_Inventario_Auditada_${formattedDate}`;
      
      const activeItemSales = stats.itemSales.length > 0 ? stats.itemSales : (lastZReport?.itemSales || []);

      windowPrint.document.write(`
        <html>
          <head>
            <title>${docTitle}</title>
            <style>
              body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 12px; color: #000; width: 300px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
              .section { margin-bottom: 20px; }
              .section-title { font-weight: bold; text-decoration: underline; margin-bottom: 10px; display: block; text-transform: uppercase; border-bottom: 1px solid #000; }
              table { width: 100%; border-collapse: collapse; }
              table td { padding: 5px 0; border-bottom: 1px dotted #ccc; }
              .footer { text-align: center; margin-top: 40px; font-size: 9px; border-top: 1px dashed #000; padding-top: 10px; opacity: 0.7; }
              .check-row { padding: 8px 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }
              .sold-badge { font-weight: bold; font-size: 10px; background: #eee; padding: 2px 5px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin:0; font-size: 16px;">CHECKLIST INVENTARIO</h1>
              <div style="font-size: 10px; text-transform: uppercase;">${effectiveVenueName}</div>
              <div style="font-size: 11px; font-weight: bold; margin-top: 5px;">AUDITORÍA: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
            </div>

            <div class="section">
              <span class="section-title">VENTAS DE LA JORNADA</span>
              <p style="font-size: 9px; font-style: italic; margin-bottom: 10px;">Verifique el stock físico restando estas cantidades:</p>
              ${activeItemSales.length === 0 ? '<p style="text-align:center; opacity:0.5;">No hay ventas registradas.</p>' : 
                activeItemSales.map((item: any) => `
                  <div class="check-row">
                    <span style="max-width: 180px;">[ ] ${item.name.toUpperCase()}</span>
                    <span class="sold-badge">VENDIDO: ${item.quantity}</span>
                  </div>
                `).join('')
              }
            </div>

            <div class="section" style="margin-top: 30px;">
              <span class="section-title">FIRMAS DE AUDITORÍA</span>
              <br><br>
              __________________________<br>
              RESPONSABLE DE CONTEO
              <br><br><br>
              __________________________<br>
              ADMINISTRACIÓN
            </div>

            <div class="footer">
              AURORA OS V4.5 • PROTOCOLO CERO SHIELD<br>
              Umbral Cero - Soberanía Tecnológica
            </div>
          </body>
        </html>
      `);
      windowPrint.document.close();
      windowPrint.focus();
      setTimeout(() => {
        windowPrint.print();
        windowPrint.close();
      }, 500);
    }
  }

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
      setMessages(prev => [...prev, { role: 'assistant', content: "Reconectando con el núcleo..." }])
    } finally { setChatLoading(false) }
  }

  if (!mounted) return null;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-white min-h-full max-w-[1600px] mx-auto font-body">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-50 pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-4">
            <Globe className="h-8 w-8 text-secondary" />
            Consolidación Global OneWorld
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">Inteligencia de Negocios Multi-Canal • {effectiveVenueName}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl h-12 border-slate-200 font-black text-[9px] uppercase tracking-widest" onClick={printInventoryChecklist}>
            <Printer className="mr-2 h-4 w-4 text-primary" /> Generar Checklist de Inventario
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
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Sesión Abierta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-secondary tracking-tighter">{formatCurrencyDetailed(stats.grandTotal)}</div>
            <p className="text-[9px] mt-4 font-black uppercase text-emerald-400 tracking-widest flex items-center gap-2">
              <TrendingUp className="h-3 w-3" /> Monitor de Revenue Real
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[2.5rem] p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canal POS (Salón)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <span className="font-black text-slate-900">{stats.posCount} Ventas</span>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrencyDetailed(stats.posTotal)}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[2.5rem] p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canal Domicilios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-2">
              <Truck className="h-4 w-4 text-secondary" />
              <span className="font-black text-slate-900">{stats.deliveryCount} Entregas</span>
            </div>
            <div className="text-3xl font-black text-secondary tracking-tighter">{formatCurrencyDetailed(stats.deliveryTotal)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <Tabs defaultValue="audit" className="space-y-6">
            <TabsList className="bg-slate-100 rounded-xl p-1 h-12">
              <TabsTrigger value="audit" className="rounded-lg font-black text-[8px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
                <ClipboardCheck className="mr-2 h-3 w-3" /> Auditoría Inventario
              </TabsTrigger>
              <TabsTrigger value="deliveries" className="rounded-lg font-black text-[8px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
                <Truck className="mr-2 h-3 w-3" /> Detalle Domicilios
              </TabsTrigger>
              <TabsTrigger value="dishes" className="rounded-lg font-black text-[8px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
                <Utensils className="mr-2 h-3 w-3" /> Detalle Platos
              </TabsTrigger>
              <TabsTrigger value="staff" className="rounded-lg font-black text-[8px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
                <Users className="mr-2 h-3 w-3" /> Venta por Mesero
              </TabsTrigger>
              <TabsTrigger value="detailed" className="rounded-lg font-black text-[8px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
                <ReceiptText className="mr-2 h-3 w-3" /> Venta Detallada
              </TabsTrigger>
            </TabsList>

            <TabsContent value="staff">
              <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl bg-white">
                <CardHeader className="px-10 pt-10 pb-4">
                  <CardTitle className="text-xl font-black text-slate-900 uppercase flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary" /> Rendimiento de Personal
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-10 pb-10">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-black text-[9px] uppercase">Mesero / Cajero</TableHead>
                        <TableHead className="text-right font-black text-[9px] uppercase">Pedidos</TableHead>
                        <TableHead className="text-right font-black text-[9px] uppercase">Total Vendido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.staffSales.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-10 text-slate-300 font-black text-xs">Sin datos de personal en sesión</TableCell></TableRow>
                      ) : (
                        stats.staffSales.map((s, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-black text-[10px] uppercase">{s.name}</TableCell>
                            <TableCell className="text-right font-black text-[10px]">{s.count}</TableCell>
                            <TableCell className="text-right font-black text-[10px] text-primary">{formatCurrencyDetailed(s.total)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit">
              <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl p-10 bg-white">
                <CardHeader className="p-0 pb-10 flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900 uppercase">Auditoría de Insumos (Post-Cierre)</CardTitle>
                    <CardDescription className="text-[10px] font-black text-slate-400 uppercase mt-1">Checklist auto-generada con los platos y bebidas vendidos.</CardDescription>
                  </div>
                  <ClipboardCheck className="h-8 w-8 text-primary" />
                </CardHeader>
                <CardContent className="p-0 space-y-8">
                  <div className="p-8 border-2 border-dashed rounded-3xl bg-slate-50/50 space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase">Balance de Ventas por Producto</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Ciclo Actual de Auditoría</p>
                        </div>
                      </div>
                      <Button className="bg-primary hover:bg-primary/90 h-10 rounded-xl font-black text-[9px] uppercase tracking-widest px-6" onClick={printInventoryChecklist}>
                        Verificar Stock Físico
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <ScrollArea className="h-[200px] bg-white rounded-2xl border border-slate-100 p-6">
                        <div className="space-y-4">
                          {stats.itemSales.length === 0 ? (
                            <div className="text-center py-10 opacity-20 italic text-xs uppercase font-black">Sin ventas en la sesión actual.</div>
                          ) : (
                            stats.itemSales.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center border-b border-slate-50 pb-2">
                                <span className="text-[10px] font-black uppercase text-slate-600">{item.name}</span>
                                <Badge className="bg-slate-900 text-white font-black text-[10px] rounded-lg px-2">Vendido: {item.quantity}</Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deliveries">
              <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl bg-white">
                <CardHeader className="px-10 pt-10 pb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl font-black text-slate-900 uppercase flex items-center gap-3">
                        <Truck className="h-6 w-6 text-secondary" /> Detalle de Domicilios
                      </CardTitle>
                      <CardDescription className="text-[10px] font-black text-slate-400 uppercase mt-1">
                        {currentSessionDeliveries.length} domicilios en sesión actual
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Total Domicilios</p>
                      <p className="text-2xl font-black text-secondary">{formatCurrencyDetailed(stats.deliveryTotal)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-10 pb-10">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                      <p className="text-[8px] font-black uppercase text-emerald-600">Entregados</p>
                      <p className="text-2xl font-black text-emerald-700">{currentSessionDeliveries.filter(d => d.status === 'Delivered').length}</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                      <p className="text-[8px] font-black uppercase text-amber-600">En Camino</p>
                      <p className="text-2xl font-black text-amber-700">{currentSessionDeliveries.filter(d => d.status === 'OnWay' || d.status === 'Dispatched').length}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
                      <p className="text-[8px] font-black uppercase text-red-600">Cancelados</p>
                      <p className="text-2xl font-black text-red-700">{currentSessionDeliveries.filter(d => d.status === 'Cancelled').length}</p>
                    </div>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-black text-[9px] uppercase">#</TableHead>
                          <TableHead className="font-black text-[9px] uppercase">Cliente</TableHead>
                          <TableHead className="font-black text-[9px] uppercase">Estado</TableHead>
                          <TableHead className="font-black text-[9px] uppercase">Hora</TableHead>
                          <TableHead className="text-right font-black text-[9px] uppercase">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentSessionDeliveries.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-300 font-black text-xs">Sin domicilios en sesión</TableCell></TableRow>
                        ) : (
                          currentSessionDeliveries.map((d, idx) => (
                            <TableRow key={d.id || idx}>
                              <TableCell className="font-black text-[10px]">{d.orderNumber || idx + 1}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-black text-[10px] uppercase">{d.customerName || 'N/A'}</p>
                                  <p className="text-[8px] text-slate-400">{d.address || ''}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={cn("text-[8px] font-bold", 
                                  d.status === 'Delivered' ? "bg-emerald-100 text-emerald-700" : 
                                  d.status === 'Cancelled' ? "bg-red-100 text-red-700" : 
                                  "bg-amber-100 text-amber-700"
                                )}>{d.status || 'Pendiente'}</Badge>
                              </TableCell>
                              <TableCell className="text-[10px] font-bold text-slate-500">{d.createdAt ? format(new Date(d.createdAt), 'HH:mm') : '-'}</TableCell>
                              <TableCell className="text-right font-black text-[10px]">{formatCurrencyDetailed(d.total || 0)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dishes">
              <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl bg-white">
                <CardHeader className="px-10 pt-10 pb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl font-black text-slate-900 uppercase flex items-center gap-3">
                        <Utensils className="h-6 w-6 text-primary" /> Detalle de Platos y Bebidas
                      </CardTitle>
                      <CardDescription className="text-[10px] font-black text-slate-400 uppercase mt-1">
                        {stats.itemSales.length} productos vendidos en sesión
                      </CardDescription>
                    </div>
                    <Button variant="outline" className="rounded-xl h-10 font-black text-[9px] uppercase" onClick={() => {
                      const data = stats.itemSales.map((item: any) => ({ Producto: item.name, Cantidad: item.quantity }))
                      const ws = XLSX.utils.json_to_sheet(data)
                      const wb = XLSX.utils.book_new()
                      XLSX.utils.book_append_sheet(wb, ws, 'Productos')
                      XLSX.writeFile(wb, `detalle_platos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
                    }}>
                      <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" /> Exportar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-10 pb-10">
                  <ScrollArea className="h-[350px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-black text-[9px] uppercase">Producto</TableHead>
                          <TableHead className="text-right font-black text-[9px] uppercase">Cantidad</TableHead>
                          <TableHead className="text-right font-black text-[9px] uppercase">Precio Unit.</TableHead>
                          <TableHead className="text-right font-black text-[9px] uppercase">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.itemSales.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-300 font-black text-xs">Sin productos en sesión</TableCell></TableRow>
                        ) : (
                          stats.itemSales.map((item: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <div>
                                  <p className="font-black text-[10px] uppercase">{item.name}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-black text-[10px]">{item.quantity}</TableCell>
                              <TableCell className="text-right text-[10px] font-bold text-slate-500">{formatCurrencyDetailed((item.total || 0) / (item.quantity || 1))}</TableCell>
                              <TableCell className="text-right font-black text-[10px] text-primary">{formatCurrencyDetailed(item.total || 0)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detailed">
              <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl bg-white">
                <CardHeader className="px-10 pt-10 pb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl font-black text-slate-900 uppercase flex items-center gap-3">
                        <ReceiptText className="h-6 w-6 text-primary" /> Venta Detallada por Canal
                      </CardTitle>
                      <CardDescription className="text-[10px] font-black text-slate-400 uppercase mt-1">
                        Desglose: Domicilios, Ventas Rápidas y Mesas
                      </CardDescription>
                    </div>
                    <Button variant="outline" className="rounded-xl h-10 font-black text-[9px] uppercase" onClick={() => {
                      const data = [
                        { Canal: 'Domicilios', Cantidad: stats.deliveryCount, Total: stats.deliveryTotal },
                        { Canal: 'Venta Rápida', Cantidad: stats.quickCount, Total: stats.quickTotal },
                        { Canal: 'Mesas', Cantidad: stats.tableCount, Total: stats.tableTotal },
                      ]
                      const ws = XLSX.utils.json_to_sheet(data)
                      const wb = XLSX.utils.book_new()
                      XLSX.utils.book_append_sheet(wb, ws, 'Venta Detallada')
                      XLSX.writeFile(wb, `venta_detallada_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
                    }}>
                      <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" /> Exportar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-10 pb-10 space-y-8">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-5 bg-secondary/5 rounded-2xl border border-secondary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="h-4 w-4 text-secondary" />
                        <span className="text-[9px] font-black uppercase text-slate-500">Domicilios</span>
                      </div>
                      <p className="text-2xl font-black text-secondary">{formatCurrencyDetailed(stats.deliveryTotal)}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">{stats.deliveryCount} pedidos</p>
                    </div>
                    <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
                      <div className="flex items-center gap-2 mb-2">
                        <ShoppingBag className="h-4 w-4 text-amber-600" />
                        <span className="text-[9px] font-black uppercase text-slate-500">Venta Rápida</span>
                      </div>
                      <p className="text-2xl font-black text-amber-700">{formatCurrencyDetailed(stats.quickTotal)}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">{stats.quickCount} transacciones</p>
                    </div>
                    <div className="p-5 bg-primary/5 rounded-2xl border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Utensils className="h-4 w-4 text-primary" />
                        <span className="text-[9px] font-black uppercase text-slate-500">Mesas</span>
                      </div>
                      <p className="text-2xl font-black text-primary">{formatCurrencyDetailed(stats.tableTotal)}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">{stats.tableCount} cuentas</p>
                    </div>
                  </div>

                  <Tabs defaultValue="det-deliveries" className="space-y-4">
                    <TabsList className="bg-slate-50 rounded-lg p-1 h-10">
                      <TabsTrigger value="det-deliveries" className="rounded-md font-black text-[7px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">
                        Domicilios ({stats.deliveryCount})
                      </TabsTrigger>
                      <TabsTrigger value="det-quick" className="rounded-md font-black text-[7px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">
                        Venta Rápida ({stats.quickCount})
                      </TabsTrigger>
                      <TabsTrigger value="det-tables" className="rounded-md font-black text-[7px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">
                        Mesas ({stats.tableCount})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="det-deliveries">
                      <ScrollArea className="h-[250px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-black text-[9px] uppercase">#</TableHead>
                              <TableHead className="font-black text-[9px] uppercase">Cliente</TableHead>
                              <TableHead className="font-black text-[9px] uppercase">Items</TableHead>
                              <TableHead className="font-black text-[9px] uppercase">Hora</TableHead>
                              <TableHead className="text-right font-black text-[9px] uppercase">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentSessionDeliveries.length === 0 ? (
                              <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-300 font-black text-xs">Sin domicilios</TableCell></TableRow>
                            ) : (
                              currentSessionDeliveries.map((d, idx) => (
                                <TableRow key={d.id || idx}>
                                  <TableCell className="font-black text-[10px]">{d.orderNumber || idx + 1}</TableCell>
                                  <TableCell className="font-black text-[10px] uppercase">{d.customerName || 'N/A'}</TableCell>
                                  <TableCell className="text-[10px] text-slate-500">{(d.items || []).reduce((a: number, i: any) => a + Number(i.quantity || 0), 0)} items</TableCell>
                                  <TableCell className="text-[10px] font-bold text-slate-500">{d.createdAt ? format(new Date(d.createdAt), 'HH:mm') : '-'}</TableCell>
                                  <TableCell className="text-right font-black text-[10px] text-secondary">{formatCurrencyDetailed(d.total || 0)}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="det-quick">
                      <ScrollArea className="h-[250px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-black text-[9px] uppercase">Factura</TableHead>
                              <TableHead className="font-black text-[9px] uppercase">Cajero</TableHead>
                              <TableHead className="font-black text-[9px] uppercase">Items</TableHead>
                              <TableHead className="font-black text-[9px] uppercase">Hora</TableHead>
                              <TableHead className="text-right font-black text-[9px] uppercase">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stats.quickSales.length === 0 ? (
                              <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-300 font-black text-xs">Sin ventas rápidas</TableCell></TableRow>
                            ) : (
                              stats.quickSales.map((inv, idx) => (
                                <TableRow key={inv.id || idx}>
                                  <TableCell className="font-black text-[10px]">{inv.invoiceNumber || 'N/A'}</TableCell>
                                  <TableCell className="font-black text-[10px] uppercase">{inv.cashierName || 'N/A'}</TableCell>
                                  <TableCell className="text-[10px] text-slate-500">{(inv.items || []).reduce((a: number, i: any) => a + Number(i.quantity || 0), 0)} items</TableCell>
                                  <TableCell className="text-[10px] font-bold text-slate-500">{inv.timestamp ? format(new Date(inv.timestamp), 'HH:mm') : '-'}</TableCell>
                                  <TableCell className="text-right font-black text-[10px] text-amber-600">{formatCurrencyDetailed(inv.total || 0)}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="det-tables">
                      <ScrollArea className="h-[250px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-black text-[9px] uppercase">Factura</TableHead>
                              <TableHead className="font-black text-[9px] uppercase">Mesa</TableHead>
                              <TableHead className="font-black text-[9px] uppercase">Cajero</TableHead>
                              <TableHead className="font-black text-[9px] uppercase">Items</TableHead>
                              <TableHead className="font-black text-[9px] uppercase">Hora</TableHead>
                              <TableHead className="text-right font-black text-[9px] uppercase">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stats.tableSales.length === 0 ? (
                              <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-300 font-black text-xs">Sin ventas de mesa</TableCell></TableRow>
                            ) : (
                              stats.tableSales.map((inv, idx) => (
                                <TableRow key={inv.id || idx}>
                                  <TableCell className="font-black text-[10px]">{inv.invoiceNumber || 'N/A'}</TableCell>
                                  <TableCell><Badge className="bg-slate-900 text-white font-black text-[9px] rounded-lg">Mesa {inv.tableNumber || '?'}</Badge></TableCell>
                                  <TableCell className="font-black text-[10px] uppercase">{inv.cashierName || 'N/A'}</TableCell>
                                  <TableCell className="text-[10px] text-slate-500">{(inv.items || []).reduce((a: number, i: any) => a + Number(i.quantity || 0), 0)} items</TableCell>
                                  <TableCell className="text-[10px] font-bold text-slate-500">{inv.timestamp ? format(new Date(inv.timestamp), 'HH:mm') : '-'}</TableCell>
                                  <TableCell className="text-right font-black text-[10px] text-primary">{formatCurrencyDetailed(inv.total || 0)}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
                  {chatLoading && <div className="animate-pulse text-primary font-black text-[8px] uppercase">Procesando consulta BI...</div>}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="p-8 border-t border-white/5">
              <form onSubmit={handleChatSend} className="flex gap-2 w-full">
                <Input 
                  placeholder="Consultar métricas..." 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)} 
                  className="bg-white/5 border-white/10 h-12 text-white text-[10px]" 
                  disabled={chatLoading}
                />
                <Button type="submit" className="h-12 w-12 bg-primary shrink-0" disabled={chatLoading}><Send className="h-4 w-4" /></Button>
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
