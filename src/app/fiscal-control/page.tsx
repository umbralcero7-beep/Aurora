"use client"

import { useState, useMemo, useEffect } from "react"
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
  BrainCircuit,
  Calculator,
  X,
  AlertTriangle,
  Truck,
  ShoppingBag,
  ListOrdered,
  Hash,
  Wallet,
  Info,
  Coins,
  Receipt,
  MinusCircle,
  ArrowRight,
  RotateCcw
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLanguage } from "@/context/language-context"
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc, useAuth } from "@/firebase"
import { collection, query, orderBy, getDocs, where, doc, setDoc, limit } from "firebase/firestore"
import { signOut } from "firebase/auth"
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
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export default function FiscalControlPage() {
  const { language } = useLanguage()
  const db = useFirestore()
  const auth = useAuth()
  const { user } = useUser()
  const { toast } = useToast()
  const router = useRouter()
  
  const [mounted, setMounted] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [reportPreview, setReportPreview] = useState<any | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isClosureSuccessOpen, setIsClosureSuccessOpen] = useState(false)
  
  const [zStep, setZStep] = useState(1)
  const [cashBase, setCashBase] = useState<string>("0")
  const [cashPhysical, setCashPhysical] = useState<string>("")
  const [showZDialog, setShowZDialog] = useState(false)
  
  // Hydration state para evitar errores de fecha servidor/cliente
  const [sessionStartIso, setSessionStartIso] = useState<string>("")

  useEffect(() => {
    setMounted(true)
  }, [])

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);

  const emailLower = user?.email?.toLowerCase();
  const isSuperUser = emailLower === 'umbralcero7@gmail.com' || emailLower === 'amaroisaias611@gmail.com';
  const effectiveBusinessId = profile?.businessId || (isSuperUser ? 'matu' : null);
  const effectiveVenueName = profile?.assignedVenue || 'Sede Central';

  const invoicesRef = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "invoices"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const deliveriesRef = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "deliveries"), where("venueId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const expensesRef = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "expenses"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const fiscalReportsRef = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(
      collection(db, "fiscal_reports"), 
      where("businessId", "==", effectiveBusinessId),
      orderBy("timestamp", "desc"),
      limit(50)
    )
  }, [db, effectiveBusinessId])

  const { data: allInvoices, isLoading: invoicesLoading } = useCollection(invoicesRef)
  const { data: allDeliveries, isLoading: deliveriesLoading } = useCollection(deliveriesRef)
  const { data: allExpenses } = useCollection(expensesRef)
  const { data: reports, isLoading: reportsLoading } = useCollection(fiscalReportsRef)

  // Establecer el inicio de sesión de forma segura para evitar hidratación fallida
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

  const sessionInvoices = useMemo(() => {
    if (!allInvoices || !sessionStartIso) return [];
    return allInvoices.filter(inv => (inv.timestamp || "") > sessionStartIso);
  }, [allInvoices, sessionStartIso]);

  const sessionDeliveries = useMemo(() => {
    if (!allDeliveries || !sessionStartIso) return [];
    return allDeliveries.filter(d => (d.createdAt || "") > sessionStartIso);
  }, [allDeliveries, sessionStartIso]);

  const sessionExpenses = useMemo(() => {
    if (!allExpenses || !sessionStartIso) return [];
    return allExpenses.filter(e => (e.createdAt || "") > sessionStartIso);
  }, [allExpenses, sessionStartIso]);

  const stats = useMemo(() => {
    const itemMap: Record<string, { name: string, quantity: number, total: number }> = {}
    
    const invStats = sessionInvoices.reduce((acc, inv) => {
      const amt = Number(inv.total || 0)
      acc.total += amt; acc.count += 1
      if (inv.paymentMethod === 'Efectivo') acc.cash += amt
      if (inv.paymentMethod === 'Datafono') acc.card += amt
      if (inv.paymentMethod === 'Nequi') acc.digital += amt

      inv.items?.forEach((item: any) => {
        if (!itemMap[item.id]) itemMap[item.id] = { name: item.name, quantity: 0, total: 0 }
        itemMap[item.id].quantity += Number(item.quantity)
        itemMap[item.id].total += (Number(item.price) * Number(item.quantity))
      })

      return acc
    }, { total: 0, count: 0, cash: 0, card: 0, digital: 0 })

    const activeDeliveries = sessionDeliveries.filter(d => d.status !== 'Anulado')
    const cancelledDeliveries = sessionDeliveries.filter(d => d.status === 'Anulado')
    
    const delTotal = activeDeliveries.reduce((acc, d) => {
      const amt = Number(d.total || 0)
      acc += amt
      
      d.items?.forEach((item: any) => {
        if (!itemMap[item.id]) itemMap[item.id] = { name: item.name, quantity: 0, total: 0 }
        itemMap[item.id].quantity += Number(item.quantity)
        itemMap[item.id].total += (Number(item.price) * Number(item.quantity))
      })
      
      return acc
    }, 0)

    const expTotal = sessionExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0)

    return {
      ...invStats,
      cash: invStats.cash + delTotal,
      totalCombined: invStats.total + delTotal,
      deliveryCount: activeDeliveries.length,
      cancelledDeliveryCount: cancelledDeliveries.length,
      deliveryTotal: delTotal,
      expensesTotal: expTotal,
      posCount: invStats.count,
      posTotal: invStats.total,
      itemSales: Object.values(itemMap).sort((a, b) => b.quantity - a.quantity)
    }
  }, [sessionInvoices, sessionDeliveries, sessionExpenses])

  const printFiscalReport = (report: any) => {
    if (typeof window === 'undefined') return;
    const windowPrint = window.open('', '', 'width=600,height=800');
    if (windowPrint) {
      windowPrint.document.write(`
        <html>
          <head>
            <title>Reporte_Fiscal_${report.type}_#${report.reportNumber}</title>
            <style>
              body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 12px; line-height: 1.4; color: #000; width: 300px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
              .section { margin-bottom: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
              .section-title { font-weight: bold; display: block; margin-bottom: 5px; text-transform: uppercase; border-bottom: 1px solid #000; }
              table { width: 100%; border-collapse: collapse; }
              table td { padding: 2px 0; }
              .grand-total { border: 2px solid #000; padding: 10px; text-align: center; margin-top: 15px; }
              .signature { margin-top: 40px; border-top: 1 solid #000; text-align: center; padding-top: 5px; font-size: 10px; }
              .serial-box { background: #000; color: #fff; padding: 5px; margin-bottom: 10px; font-weight: bold; font-size: 14px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <div style="font-weight: black; font-size: 16px;">AURORA OS</div>
              <div class="serial-box">REPORTE ${report.type} SERIAL: #${report.reportNumber}</div>
              <div style="font-size: 9px; text-transform: uppercase;">${effectiveVenueName}</div>
              <div style="font-size: 11px; font-weight: bold; margin-top: 5px;">FECHA: ${format(new Date(report.timestamp), 'dd/MM/yyyy HH:mm')}</div>
            </div>

            <div class="section">
              <span class="section-title">VENTAS POR CANAL</span>
              <table>
                <tr><td>VENTAS POS:</td><td align="right">${report.posCount}</td></tr>
                <tr><td>RECAUDO POS:</td><td align="right">$${report.posTotal.toLocaleString()}</td></tr>
                <tr><td>DOMICILIOS EXITOSOS:</td><td align="right">${report.deliveryCount}</td></tr>
                <tr><td>RECAUDO DOM:</td><td align="right">$${report.deliveryTotal.toLocaleString()}</td></tr>
              </table>
            </div>

            <div class="section">
              <span class="section-title">DESGLOSE DE RECAUDO</span>
              <table>
                <tr><td>EFECTIVO (SIS):</td><td align="right">$${report.breakdown.cash.toLocaleString()}</td></tr>
                <tr><td>DATÁFONO:</td><td align="right">$${report.breakdown.card.toLocaleString()}</td></tr>
                <tr><td>NEQUI:</td><td align="right">$${report.breakdown.digital.toLocaleString()}</td></tr>
                ${report.type === 'Z' ? `
                  <tr style="border-top: 1px dotted #000;"><td>GASTOS (-):</td><td align="right">$${(report.expensesTotal || 0).toLocaleString()}</td></tr>
                  <tr><td>BASE (-):</td><td align="right">$${(report.cashBase || 0).toLocaleString()}</td></tr>
                  <tr style="font-weight:bold;"><td>EFECTIVO ESPERADO:</td><td align="right">$${(report.breakdown.cash - (report.expensesTotal || 0) - (report.cashBase || 0)).toLocaleString()}</td></tr>
                  <tr style="font-weight:bold;"><td>EFECTIVO FÍSICO:</td><td align="right">$${(report.actualCashCount || 0).toLocaleString()}</td></tr>
                  <tr style="font-weight:bold; color: ${report.discrepancy < 0 ? 'red' : 'black'};"><td>DIFERENCIA:</td><td align="right">$${(report.discrepancy || 0).toLocaleString()}</td></tr>
                ` : ''}
              </table>
            </div>

            <div class="grand-total">
              <div style="font-size: 10px; font-weight: bold;">TOTAL BRUTO SESIÓN</div>
              <div style="font-size: 22px; font-weight: black;">$${report.totalGross.toLocaleString()}</div>
            </div>

            <div class="signature">FIRMA RESPONSABLE TURNO<br><span style="font-size:8px; opacity:0.5;">${report.generatedBy}</span></div>
            <div class="signature">FIRMA ADMINISTRACIÓN / AUDITOR</div>
            <div style="text-align: center; margin-top: 20px; font-size: 8px; opacity: 0.5;">AURORA OS V4.5 • Umbral Cero</div>
          </body>
        </html>
      `);
      windowPrint.document.close();
      windowPrint.focus();
      setTimeout(() => { windowPrint.print(); windowPrint.close(); }, 500);
    }
  }

  const generateReport = (type: 'X' | 'Z') => {
    if (!db || !user || !effectiveBusinessId) return;
    setGenerating(type)
    
    const lastReportNumber = (reports || []).reduce((max, r) => Math.max(max, Number(r.reportNumber) || 0), 0);
    const nextReportNumber = lastReportNumber + 1;

    const reportData = {
      type,
      reportNumber: nextReportNumber,
      timestamp: new Date().toISOString(),
      totalGross: stats.totalCombined,
      posCount: stats.posCount,
      posTotal: stats.posTotal,
      deliveryCount: stats.deliveryCount,
      cancelledDeliveryCount: stats.cancelledDeliveryCount,
      deliveryTotal: stats.deliveryTotal,
      expensesTotal: stats.expensesTotal,
      itemSales: stats.itemSales,
      breakdown: { cash: stats.cash, card: stats.card, digital: stats.digital },
      generatedBy: user.email || 'System',
      businessId: effectiveBusinessId,
      assignedVenue: effectiveVenueName
    }

    setReportPreview(reportData)
    if (type === 'Z') {
      setZStep(1); setShowZDialog(true);
    } else {
      setIsPreviewOpen(true);
    }
    setGenerating(null)
  }

  const finalizeZReport = () => {
    if (!db || !reportPreview || !effectiveBusinessId) return;
    
    const cashValue = Number(cashPhysical) || 0
    const expectedCash = stats.cash - stats.expensesTotal - (Number(cashBase) || 0)
    const discrepancy = cashValue - expectedCash

    const finalReport = {
      ...reportPreview,
      cashBase: Number(cashBase) || 0,
      actualCashCount: cashValue,
      discrepancy: discrepancy,
      id: doc(collection(db, "fiscal_reports")).id
    }

    setDoc(doc(db, "fiscal_reports", finalReport.id), finalReport)
      .then(async () => {
        printFiscalReport(finalReport);
        setShowZDialog(false); 
        setCashBase("0"); 
        setCashPhysical(""); 
        setZStep(1);
        setReportPreview(null);
        toast({ title: "Cierre Z Exitoso", description: "Jornada cerrada. Sesión finalizando..." });
        
        if (auth) {
          setTimeout(() => { signOut(auth).then(() => router.push('/login')); }, 3000);
        }
      })
      .catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
          path: `fiscal_reports/${finalReport.id}`, operation: 'create', requestResourceData: finalReport 
        }));
      });
  }

  const dateLocale = language === 'es' ? es : enUS

  if (!mounted) return null;

  return (
    <div className="p-10 space-y-10 bg-white min-h-full font-body max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-4">
            <FileText className="h-8 w-8 text-primary" />
            Control Fiscal • {effectiveVenueName}
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">Protocolo de Cierre Maestro Auditado.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl h-12 border-primary text-primary font-black text-[9px] uppercase tracking-widest px-6" onClick={() => generateReport('X')}>
            <Zap className="mr-2 h-4 w-4" /> Reporte Parcial (X)
          </Button>
          <Button className="bg-primary hover:bg-primary/90 rounded-xl h-12 font-black text-[9px] uppercase tracking-widest px-8 shadow-xl shadow-primary/20" onClick={() => generateReport('Z')}>
            <ShieldCheck className="mr-2 h-4 w-4" /> Cerrar Jornada (Z)
          </Button>
        </div>
      </div>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2rem] p-2 relative overflow-hidden md:col-span-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Sesión Abierta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black text-primary tracking-tighter">
              {reportsLoading ? <Loader2 className="h-10 w-10 animate-spin" /> : formatCurrencyDetailed(stats.totalCombined)}
            </div>
            <p className={cn("text-[9px] mt-4 font-black uppercase tracking-widest", stats.totalCombined > 0 ? "text-orange-400" : "text-emerald-400")}>
              {stats.totalCombined > 0 ? "VENTAS ACTIVAS / CIERRE PENDIENTE" : "SESIÓN LIMPIA / LISTO"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[2rem] p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gastos del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-destructive tracking-tighter">{formatCurrencyDetailed(stats.expensesTotal)}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[2rem] p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesión Iniciada</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4 text-center">
            <div className="text-lg font-black text-slate-900 tracking-tighter leading-tight">
              {sessionStartIso ? format(new Date(sessionStartIso), "PPpp", { locale: dateLocale }) : 'Sincronizando...'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-8 px-10">
              <CardTitle className="text-lg flex items-center gap-3 font-black uppercase tracking-tighter text-slate-900"><History className="h-5 w-5 text-primary" /> Historial de Auditorías</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/30">
                  <TableRow><TableHead className="font-black text-[10px] uppercase py-6 px-10">Serial / Tipo</TableHead><TableHead className="font-black text-[10px] uppercase">Fecha</TableHead><TableHead className="text-right font-black text-[10px] uppercase px-10">Total Bruto</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {reportsLoading ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-24"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary"/></TableCell></TableRow>
                  ) : !reports || reports.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-32 text-slate-400 font-bold italic">Sin cierres.</TableCell></TableRow>
                  ) : (
                    reports.map((report) => (
                      <TableRow key={report.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                        <TableCell className="px-10 py-6"><div className="flex items-center gap-3"><span className="font-black text-slate-400 text-[10px]">#{report.reportNumber}</span><Badge className={cn("font-black uppercase text-[9px] rounded-full", report.type === 'Z' ? "bg-primary text-white" : "bg-secondary text-white")}>{report.type}</Badge></div></TableCell>
                        <TableCell className="text-[10px] font-black text-slate-500 uppercase">{format(new Date(report.timestamp), "PPpp", { locale: dateLocale })}</TableCell>
                        <TableCell className="text-right font-black text-primary text-lg tracking-tighter px-10">{formatCurrencyDetailed(report.totalGross)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="rounded-[2.5rem] bg-white border-slate-100 shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-6"><CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3"><Wallet className="h-5 w-5 text-primary" /> Recaudo por Medio</CardTitle></CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100"><div className="flex items-center gap-3"><Banknote className="h-5 w-5 text-emerald-600" /><span className="text-[10px] font-black text-emerald-800 uppercase">Efectivo</span></div><span className="text-lg font-black text-emerald-900">{formatCurrencyDetailed(stats.cash)}</span></div>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100"><div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-blue-600" /><span className="text-[10px] font-black text-blue-800 uppercase">Datáfono</span></div><span className="text-lg font-black text-blue-900">{formatCurrencyDetailed(stats.card)}</span></div>
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100"><div className="flex items-center gap-3"><Smartphone className="h-5 w-5 text-purple-600" /><span className="text-[10px] font-black text-purple-800 uppercase">Nequi</span></div><span className="text-lg font-black text-purple-900">{formatCurrencyDetailed(stats.digital)}</span></div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3 items-center">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <p className="text-[8px] font-bold text-slate-500 uppercase italic">Concilia los vouchers antes de cerrar.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showZDialog} onOpenChange={setShowZDialog}>
        <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-white/10"><ShieldCheck className="h-6 w-6 text-primary" /></div><DialogTitle className="text-xl font-black uppercase tracking-tighter">Protocolo Z: Paso {zStep} de 4</DialogTitle></div>
          </div>
          <div className="p-10">
            {zStep === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="text-center space-y-2"><h3 className="text-2xl font-black uppercase text-slate-900">1. Reserva de Base</h3><p className="text-xs font-bold text-slate-400 uppercase italic">Efectivo para mañana.</p></div>
                <div className="space-y-4"><Input type="number" value={cashBase} onChange={e => setCashBase(e.target.value)} className="h-20 rounded-2xl bg-slate-50 border-none font-black text-4xl text-primary text-center" placeholder="0" /></div>
                <Button className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl" onClick={() => setZStep(2)}>Arqueo <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            )}
            {zStep === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="text-center space-y-2"><h3 className="text-2xl font-black uppercase text-slate-900">2. Conteo de Efectivo</h3><p className="text-xs font-bold text-slate-400 uppercase italic">Ingresa el total contado.</p></div>
                <div className="space-y-4"><Input type="number" value={cashPhysical} onChange={e => setCashPhysical(e.target.value)} className="h-24 rounded-[2rem] bg-emerald-50 border-emerald-100 font-black text-4xl text-emerald-900 text-center" placeholder="0" /></div>
                <div className="flex gap-4"><Button variant="ghost" className="flex-1 h-14 font-black text-[9px]" onClick={() => setZStep(1)}>Atrás</Button><Button className="flex-[2] h-14 bg-primary text-white rounded-xl font-black uppercase text-[9px]" onClick={() => setZStep(3)}>Gastos</Button></div>
              </div>
            )}
            {zStep === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="text-center space-y-2"><h3 className="text-2xl font-black uppercase text-slate-900">3. Auditoría de Gastos</h3></div>
                <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 space-y-6">
                  <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-slate-400">Total Gastos</span><span className="text-xl font-black text-destructive">{formatCurrencyDetailed(stats.expensesTotal)}</span></div>
                </div>
                <div className="flex gap-4"><Button variant="ghost" className="flex-1 h-14 font-black text-[9px]" onClick={() => setZStep(2)}>Atrás</Button><Button className="flex-[2] h-14 bg-primary text-white rounded-xl font-black uppercase text-[9px]" onClick={() => setZStep(4)}>Finalizar Z</Button></div>
              </div>
            )}
            {zStep === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="text-center space-y-2"><h3 className="text-2xl font-black uppercase text-slate-900">4. Resumen Fiscal</h3></div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-4 text-[11px] font-mono uppercase">
                  <div className="flex justify-between"><span>Ventas:</span><span className="font-black">{formatCurrencyDetailed(stats.totalCombined)}</span></div>
                  <div className="flex justify-between text-primary"><span>Efectivo Físico:</span><span className="font-black">{formatCurrencyDetailed(Number(cashPhysical))}</span></div>
                  <div className={cn("flex justify-between text-lg font-black pt-4 border-t", (Number(cashPhysical) - (stats.cash - stats.expensesTotal - Number(cashBase))) < 0 ? "text-destructive" : "text-emerald-600")}>
                    <span>Diferencia:</span>
                    <span>{formatCurrencyDetailed(Number(cashPhysical) - (stats.cash - stats.expensesTotal - Number(cashBase)))}</span>
                  </div>
                </div>
                <Button className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-2xl" onClick={finalizeZReport}>Confirmar e Imprimir Z</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white rounded-[2.5rem] shadow-2xl border-none">
          <div className="p-8 bg-slate-900 text-white flex justify-between items-center"><DialogTitle className="text-xl font-black uppercase">Reporte Parcial X</DialogTitle></div>
          <ScrollArea className="max-h-[60vh] p-10"><div className="bg-slate-50 p-8 rounded-3xl font-mono text-[11px] space-y-4"><div className="text-center border-b border-dashed pb-6 mb-6 font-black">AURORA OS</div><div className="flex justify-between"><span>TOTAL:</span><span>{formatCurrencyDetailed(stats.totalCombined)}</span></div></div></ScrollArea>
          <div className="p-8 border-t bg-slate-50"><Button className="w-full h-14 bg-primary text-white rounded-xl font-black uppercase text-[9px]" onClick={() => { printFiscalReport(reportPreview); setIsPreviewOpen(false); }}>Imprimir X</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
