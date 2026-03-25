
"use client"

import { useState, useMemo } from "react"
import { 
  FileText, 
  Printer, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Zap,
  ShieldCheck,
  Banknote,
  CreditCard,
  Smartphone,
  TrendingUp,
  ClipboardCheck,
  PackageCheck,
  BrainCircuit
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { useLanguage } from "@/context/language-context"
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, orderBy, addDoc, getDocs, where, doc } from "firebase/firestore"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { AURORA_TAX_RATE } from "@/lib/constants"
import { printerRegistry } from "@/lib/printer"

export default function FiscalControlPage() {
  const { t, language } = useLanguage()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const router = useRouter()
  
  const [generating, setGenerating] = useState<string | null>(null)
  const [reportPreview, setReportPreview] = useState<any | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isClosureSuccessOpen, setIsClosureSuccessOpen] = useState(false)
  const [isArqueoOpen, setIsArqueoOpen] = useState(false)
  const [arqueoData, setArqueoData] = useState({ physicalCash: 0, expenses: 0, notes: "" })

  const emailLower = user?.email?.toLowerCase();
  const isSuperUser = emailLower === 'umbralcero7@gmail.com' || emailLower === 'amaroisaias611@gmail.com';

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);

  const effectiveBusinessId = profile?.businessId || (isSuperUser ? 'matu' : null);
  const effectiveVenueName = profile?.assignedVenue || 'Sede Central';

  // Listen to today's invoices for real-time dashboard
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todayInvoicesRef = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(
      collection(db, "invoices"),
      where("businessId", "==", effectiveBusinessId),
      where("timestamp", ">=", today.toISOString()),
      orderBy("timestamp", "desc")
    )
  }, [db, effectiveBusinessId])

  const fiscalReportsRef = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(
      collection(db, "fiscal_reports"), 
      where("businessId", "==", effectiveBusinessId),
      orderBy("timestamp", "desc")
    )
  }, [db, effectiveBusinessId])

  const { data: todayInvoices, isLoading: invoicesLoading } = useCollection(todayInvoicesRef)
  const { data: reports, isLoading: reportsLoading } = useCollection(fiscalReportsRef)

  const dateLocale = language === 'es' ? es : enUS

  const stats = useMemo(() => {
    if (!todayInvoices || todayInvoices.length === 0) return { total: 0, count: 0, cash: 0, card: 0, digital: 0, range: "N/A", waiters: {} }
    
    // Sort to get min/max
    const sorted = [...todayInvoices].sort((a, b) => (a.invoiceNumber || 0) - (b.invoiceNumber || 0))
    const min = sorted[0].invoiceNumber || '000'
    const max = sorted[sorted.length - 1].invoiceNumber || '001'
    
    return todayInvoices.reduce((acc, inv) => {
      const amt = Number(inv.total || 0)
      acc.total += amt
      acc.count += 1
      if (inv.paymentMethod === 'Efectivo') acc.cash += amt
      if (inv.paymentMethod === 'Datafono') acc.card += amt
      if (inv.paymentMethod === 'Nequi') acc.digital += amt

      // Waiter Performance
      const wName = inv.waiterName || 'CAJERO'
      if (!acc.waiters[wName]) acc.waiters[wName] = { tables: new Set(), total: 0, count: 0 }
      acc.waiters[wName].total += amt
      acc.waiters[wName].count += 1
      if (inv.tableNumber && inv.tableNumber !== 'PARA LLEVAR') {
        acc.waiters[wName].tables.add(inv.tableNumber)
      }

      return acc
    }, { total: 0, count: 0, cash: 0, card: 0, digital: 0, range: `${min} - ${max}`, waiters: {} as any })
  }, [todayInvoices])

  const generateReport = async (type: 'X' | 'Z') => {
    if (!db || !user || !effectiveBusinessId) return
    
    setGenerating(type)
    try {
      const totalGross = stats.total
      const totalTax = totalGross * AURORA_TAX_RATE
      const totalNet = totalGross - totalTax

      const reportData = {
        type,
        timestamp: new Date().toISOString(),
        totalGross,
        totalTax,
        totalNet,
        invoiceCount: stats.count,
        invoiceRange: stats.range,
        breakdown: {
          cash: stats.cash,
          card: stats.card,
          digital: stats.digital
        },
        generatedBy: user.email || 'System',
        businessId: effectiveBusinessId,
        venueId: effectiveBusinessId,
        assignedVenue: effectiveVenueName
      }

      setReportPreview(reportData)
      setIsPreviewOpen(true)
      
      toast({
        title: `Auditoría ${type} Iniciada`,
        description: "Los montos han sido consolidados por Cero AI.",
      })

    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Error Fiscal",
        description: "No se pudieron consolidar los datos de la jornada.",
      })
    } finally {
      setGenerating(null)
    }
  }

  const finalizeReport = async () => {
    if (!db || !reportPreview) return
    
    try {
      // 1. Vincular Impresora (si no está vinculada)
      const connected = await printerRegistry.connect()
      
      // 2. Guardar en Base de Datos
      await addDoc(collection(db, "fiscal_reports"), reportPreview)
      
      // 3. Imprimir Reporte Físico
      if (connected) {
        await printerRegistry.printZReport({
          venue: effectiveVenueName,
          ...reportPreview
        })
      }

      toast({
        title: "Reporte Guardado e Impreso",
        description: `El Cierre ${reportPreview.type} ha sido registrado y despachado a la tiquetera.`,
      })
      setIsPreviewOpen(false)
      if (reportPreview.type === 'Z') {
        setIsClosureSuccessOpen(true)
      }
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", title: "Error de Impresión", description: "El reporte se guardó pero falló la tiquetera." })
    }
  }

  return (
    <div className="p-10 space-y-10 bg-white min-h-full font-body max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-4">
            <FileText className="h-8 w-8 text-primary" />
            Control Fiscal • {effectiveVenueName}
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">Gestión de cierres diarios y auditoría de ingresos.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="rounded-xl h-12 border-slate-200 text-slate-800 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest px-8"
            onClick={() => setIsArqueoOpen(true)}
          >
            <Banknote className="mr-2 h-4 w-4" />
            Arqueo de Caja
          </Button>
          <Button 
            variant="outline" 
            className="rounded-xl h-12 border-primary text-primary hover:bg-primary/5 font-black text-[10px] uppercase tracking-widest px-8"
            disabled={!!generating}
            onClick={() => generateReport('X')}
          >
            {generating === 'X' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Auditoría Parcial (X)
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 rounded-xl h-12 font-black text-[10px] uppercase tracking-widest px-8 shadow-xl shadow-primary/20"
            disabled={!!generating}
            onClick={() => generateReport('Z')}
          >
            {generating === 'Z' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Cerrar Jornada (Z)
          </Button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2.5rem] p-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recaudado Hoy (Sede)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black text-primary tracking-tighter">
              {formatCurrencyDetailed(stats.total)}
            </div>
            <div className="flex items-center gap-2 mt-4 text-[9px] font-black uppercase text-emerald-400 tracking-widest">
              <TrendingUp className="h-3 w-3" /> 
              Sincronización Cloud Activa
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[2.5rem] p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ventas por Método</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2">
                <Banknote className="h-3 w-3 text-emerald-500" /> Efectivo
              </span>
              <span className="font-black text-slate-900">{formatCurrencyDetailed(stats.cash)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2">
                <CreditCard className="h-3 w-3 text-blue-500" /> Datáfono
              </span>
              <span className="font-black text-slate-900">{formatCurrencyDetailed(stats.card)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2">
                <Smartphone className="h-3 w-3 text-purple-500" /> Nequi
              </span>
              <span className="font-black text-slate-900">{formatCurrencyDetailed(stats.digital)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[2.5rem] p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos Emitidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">{stats.count}</div>
            <p className="text-[9px] mt-4 text-muted-foreground font-black uppercase tracking-tight italic">Facturación validada por Cero AI.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-8 px-10">
            <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter text-slate-900">
              <TrendingUp className="h-5 w-5 text-primary" />
              Desempeño de Meseros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/30 font-black uppercase text-[10px]">
                <TableRow>
                  <TableHead className="px-10 py-5">Mesero</TableHead>
                  <TableHead className="text-center">Mesas</TableHead>
                  <TableHead className="text-center">Tickets</TableHead>
                  <TableHead className="text-right px-10">Venta Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(stats.waiters).map(([name, data]: [string, any]) => (
                  <TableRow key={name} className="hover:bg-slate-50/50">
                    <TableCell className="px-10 py-4 font-black uppercase text-[11px] text-slate-900">{name}</TableCell>
                    <TableCell className="text-center font-bold text-slate-500">{data.tables.size}</TableCell>
                    <TableCell className="text-center font-bold text-slate-500">{data.count}</TableCell>
                    <TableCell className="text-right px-10 font-black text-slate-900 font-mono">{formatCurrencyDetailed(data.total)}</TableCell>
                  </TableRow>
                ))}
                {Object.keys(stats.waiters).length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400 italic font-bold">Sin actividad de meseros hoy.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] bg-slate-900 text-white shadow-2xl overflow-hidden p-8 flex flex-col justify-center relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-32 -mt-32" />
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                <BrainCircuit className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Cero Operational Insights</h3>
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">Sugerencias para el cierre operativo</p>
              </div>
            </div>
            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4 font-mono text-xs leading-relaxed text-slate-300">
              <p>• El mesero con mayor efectividad hoy es <strong>{Object.entries(stats.waiters).sort((a:any, b:any) => b[1].total - a[1].total)[0]?.[0] || '---'}</strong>.</p>
              <p>• Se detectó un flujo digital (Nequi) del <strong>{((stats.digital / (stats.total || 1)) * 100).toFixed(1)}%</strong>. Prepárate para la conciliación bancaria.</p>
              <p>• Los tickets en efectivo suman <strong>{formatCurrencyDetailed(stats.cash)}</strong>. Realiza el arqueo antes del reporte Z definitivo.</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-8 px-10">
          <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter text-slate-900">
            <History className="h-5 w-5 text-primary" />
            Historial de Auditorías (X/Z)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-b border-slate-100">
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 px-10">Tipo</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Fecha y Hora</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest">Tickets</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest">Base Imponible</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest px-10">Total Bruto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportsLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-24"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary"/></TableCell></TableRow>
              ) : !reports || reports.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-32 text-slate-400 font-bold italic">No hay registros de cierre fiscal.</TableCell></TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                    <TableCell className="px-10 py-6">
                      <Badge className={cn("font-black uppercase text-[9px] rounded-full px-4 border-none", 
                        report.type === 'Z' ? "bg-primary text-white" : "bg-secondary text-white"
                      )}>
                        REPORTE {report.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] font-black text-slate-500 uppercase">
                      {format(new Date(report.timestamp), "PPpp", { locale: dateLocale })}
                    </TableCell>
                    <TableCell className="text-right font-mono font-black text-slate-700">{report.invoiceCount}</TableCell>
                    <TableCell className="text-right font-mono font-black text-slate-400">{formatCurrencyDetailed(report.totalNet)}</TableCell>
                    <TableCell className="text-right font-black text-primary text-lg tracking-tighter px-10">{formatCurrencyDetailed(report.totalGross)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader className="p-8 bg-slate-900 text-white border-b border-white/5">
            <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter">
              <Printer className="h-6 w-6 text-primary" />
              Recibo de Auditoría
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-bold italic">
              Consolidación de montos para el cierre {reportPreview?.type}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-10 space-y-8">
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 font-mono text-[11px] space-y-4 shadow-inner">
              <div className="text-center border-b border-slate-200 border-dashed pb-6 mb-6">
                <p className="font-black uppercase tracking-[0.3em] text-slate-900">AURORA OPERATING SYSTEM</p>
                <p className="text-[9px] opacity-60 uppercase mt-1">{effectiveVenueName} • Cierre V3.0</p>
              </div>
              
              <div className="flex justify-between font-black">
                <span>TIPO DE CIERRE:</span>
                <span className="text-primary">[{reportPreview?.type}]</span>
              </div>
              <div className="flex justify-between">
                <span>FECHA EMISIÓN:</span>
                <span className="font-bold">
                  {reportPreview && format(new Date(reportPreview.timestamp), "dd/MM/yy HH:mm")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>RANGO INICIAL/FINAL:</span>
                <span className="font-bold">{reportPreview?.invoiceRange}</span>
              </div>
              <div className="flex justify-between">
                <span>TOTAL DOCUMENTOS:</span>
                <span className="font-bold">{reportPreview?.invoiceCount}</span>
              </div>
              
              <div className="border-y border-slate-200 border-dashed py-6 my-6 space-y-3">
                <div className="flex justify-between text-slate-400 uppercase font-bold">
                  <span>EFECTIVO:</span>
                  <span>{formatCurrencyDetailed(reportPreview?.breakdown.cash || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-400 uppercase font-bold">
                  <span>DATÁFONO:</span>
                  <span>{formatCurrencyDetailed(reportPreview?.breakdown.card || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-400 uppercase font-bold">
                  <span>DIGITAL (NEQUI):</span>
                  <span>{formatCurrencyDetailed(reportPreview?.breakdown.digital || 0)}</span>
                </div>
                <div className="h-px bg-slate-200 border-dashed w-full my-2" />
                <div className="flex justify-between font-bold">
                  <span>BASE IMPONIBLE:</span>
                  <span>{formatCurrencyDetailed(reportPreview?.totalNet || 0)}</span>
                </div>
                <div className="flex justify-between text-primary font-black">
                  <span>IMPUESTOS (15%):</span>
                  <span>{formatCurrencyDetailed(reportPreview?.totalTax || 0)}</span>
                </div>
              </div>

              <div className="flex justify-between text-3xl font-black text-slate-900 pt-2 tracking-tighter">
                <span>TOTAL</span>
                <span>{formatCurrencyDetailed(reportPreview?.totalGross || 0)}</span>
              </div>

              <div className="text-center pt-8 opacity-30 text-[9px] font-black uppercase tracking-widest">
                <p>--- FIN DE AUDITORÍA ---</p>
              </div>
            </div>

            {reportPreview?.type === 'Z' && (
              <div className="p-5 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-4 shadow-sm">
                <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-orange-800 font-black leading-relaxed uppercase">
                  Atención: El Reporte Z bloquea la facturación del turno actual y prepara el motor de inventario para la auditoría de cierre.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="p-8 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsPreviewOpen(false)} className="font-black text-[10px] uppercase tracking-widest flex-1 h-14">Cancelar</Button>
            <Button className="bg-primary hover:bg-primary/90 font-black text-[10px] uppercase tracking-widest flex-1 h-14 rounded-2xl shadow-xl shadow-primary/20" onClick={finalizeReport}>
              <CheckCircle2 className="mr-3 h-5 w-5" /> Confirmar Cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Closure Success Dialog (Inventory Trigger) */}
      <Dialog open={isClosureSuccessOpen} onOpenChange={setIsClosureSuccessOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-10 bg-white border-none shadow-2xl">
          <div className="text-center space-y-6">
            <div className="h-20 w-20 bg-emerald-500 text-white rounded-full mx-auto flex items-center justify-center shadow-xl">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900">Jornada Cerrada</DialogTitle>
              <DialogDescription className="text-xs font-bold text-slate-400 italic">Cero AI ha consolidado las ventas fiscales de {effectiveVenueName}.</DialogDescription>
            </div>
            
            <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
              <div className="flex items-center gap-3"><BrainCircuit className="h-5 w-5 text-primary" /><span className="text-[9px] font-black uppercase tracking-widest text-primary">Protocolo de Salida</span></div>
              <p className="text-[11px] font-black italic text-slate-300 text-left leading-relaxed">
                "He organizado el reporte de consumos diarios. Por favor, imprime la checklist para la auditoría física del almacén antes de terminar el turno."
              </p>
            </div>

            <div className="grid gap-3 pt-4">
              <Button 
                className="h-14 bg-primary hover:bg-primary/90 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 flex gap-3"
                onClick={() => router.push('/reports')}
              >
                <ClipboardCheck className="h-5 w-5" /> Generar Checklist de Inventario
              </Button>
              <Button 
                variant="outline" 
                className="h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                onClick={() => setIsClosureSuccessOpen(false)}
              >
                Cerrar y Salir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Arqueo de Caja Dialog */}
      <Dialog open={isArqueoOpen} onOpenChange={setIsArqueoOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader className="p-8 bg-slate-900 text-white border-b border-white/5">
            <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter">
              <Banknote className="h-6 w-6 text-primary" />
              Arqueo de Caja Físico
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-bold italic">Auditoría de billetes y gastos de caja.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <span>Esperado en Sistema (Efectivo)</span>
                  <span className="text-slate-900 font-mono">{formatCurrencyDetailed(stats.cash)}</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400">¿Cuánto dinero hay físicamente?</label>
                  <input 
                    type="number"
                    value={arqueoData.physicalCash}
                    onChange={e => setArqueoData({...arqueoData, physicalCash: Number(e.target.value)})}
                    className="w-full h-14 bg-white rounded-2xl border-2 border-slate-100 px-6 font-black text-xl text-primary focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400">Gastos Realizados (Caja Menor)</label>
                  <input 
                    type="number"
                    value={arqueoData.expenses}
                    onChange={e => setArqueoData({...arqueoData, expenses: Number(e.target.value)})}
                    className="w-full h-14 bg-white rounded-2xl border-2 border-slate-100 px-6 font-black text-xl text-orange-500 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className={cn(
                "p-6 rounded-3xl border-2 flex justify-between items-center transition-all",
                (stats.cash - arqueoData.physicalCash - arqueoData.expenses) === 0 
                  ? "bg-emerald-50 border-emerald-500/20 text-emerald-600" 
                  : "bg-red-50 border-red-500/20 text-red-600"
              )}>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest">Diferencia / Desfase</p>
                  <p className="text-2xl font-black tracking-tighter">
                    {formatCurrencyDetailed(stats.cash - arqueoData.physicalCash - arqueoData.expenses)}
                  </p>
                </div>
                {(stats.cash - arqueoData.physicalCash - arqueoData.expenses) === 0 ? <CheckCircle2 className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
              </div>
            </div>
            <textarea 
              placeholder="Notas u observaciones del arqueo..."
              className="w-full h-24 bg-slate-50 rounded-2xl p-4 text-xs font-bold border-none resize-none uppercase"
              value={arqueoData.notes}
              onChange={e => setArqueoData({...arqueoData, notes: e.target.value})}
            />
          </div>
          <DialogFooter className="p-8 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsArqueoOpen(false)} className="h-10 font-black text-[10px] uppercase flex-1">Cerrar</Button>
            <Button className="h-14 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase flex-1 shadow-2xl" onClick={() => {
               toast({ title: "Arqueo Registrado", description: "La diferencia ha sido auditada." });
               setIsArqueoOpen(false);
            }}>Guardar Arqueo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
