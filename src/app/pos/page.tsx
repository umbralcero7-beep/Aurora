
"use client"

import { isSuperUser } from '@/lib/constants';
import { useState, useMemo, useEffect, useRef } from "react"
import { 
  Search, 
  Loader2,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  ShoppingCart,
  X,
  LayoutGrid,
  Sparkles,
  Printer,
  Calculator,
  ArrowLeftRight,
  Utensils,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  Zap,
  ShoppingBag,
  BrainCircuit,
  ChevronUp,
  FileText,
  Mail,
  User,
  MapPin,
  IdCard,
  ShieldCheck,
  Lock,
  ArrowRight,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Download,
  PenLine
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, where, doc, updateDoc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { processElectronicInvoice } from "@/ai/flows/electronic-invoice-flow"
import { useRouter } from "next/navigation"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError, FirestoreOfflineError, isOfflineError } from "@/firebase/errors"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import * as XLSX from 'xlsx'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export default function POSPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const router = useRouter()
  
  const [mounted, setMounted] = useState(false)
  const categories = ["Todos", "Entradas", "Platos Fuertes", "Bebidas", "Postres"]
  
  const [activeTab, setActiveTab] = useState("direct") 
  const [selectedOrder, setSelectedOrder] = useState<any>(null) 
  const [directCart, setDirectCart] = useState<CartItem[]>([]) 
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Datafono' | 'Nequi'>('Efectivo')
  const [isFinishing, setIsFinishing] = useState(false)
  const [menuSearch, setMenuSearch] = useState("")
  const [showCheckoutMobile, setShowCheckoutMobile] = useState(false)
  const [cashReceived, setCashAmount] = useState<number>(0)
  const [activeCategory, setActiveCategory] = useState("Todos")

  // Pago mixto y propina
  const [isSplitPayment, setIsSplitPayment] = useState(false)
  const [splitAmount1, setSplitAmount1] = useState("")
  const [splitMethod1, setSplitMethod1] = useState<'Efectivo' | 'Datafono' | 'Nequi'>('Efectivo')
  const [splitMethod2, setSplitMethod2] = useState<'Efectivo' | 'Datafono' | 'Nequi'>('Datafono')
  const [tipAmount, setTipAmount] = useState(0)
  const [customTip, setCustomTip] = useState("")

  // Facturación Electrónica State
  const [isElectronic, setIsElectronic] = useState(false)
  const paymentSectionRef = useRef<HTMLDivElement>(null)
  const checkoutScrollRef = useRef<React.ElementRef<typeof ScrollArea>>(null)
  const [customerData, setCustomerData] = useState({
    name: "",
    taxId: "",
    email: "",
    address: ""
  })

  // Cierre de Caja State
  const [showCierreCaja, setShowCierreCaja] = useState(false)
  const [cierreStep, setCierreStep] = useState(1)
  const [efectivoContado, setEfectivoContado] = useState("")
  const [baseCaja, setBaseCaja] = useState("")
  const [isCierreLoading, setIsCierreLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isElectronic && checkoutScrollRef.current) {
      setTimeout(() => {
        const scrollRoot = checkoutScrollRef.current
        if (!scrollRoot) return
        const viewport = scrollRoot.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
        if (viewport) {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
        }
      }, 350)
    }
  }, [isElectronic])

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);
  
  const isSuper = isSuperUser(user?.email);
  
  const effectiveBusinessId = profile?.businessId || (isSuper ? 'matu' : null);
  const effectiveVenueName = profile?.assignedVenue || 'Sede Central';

  const openOrdersQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "orders"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const menuQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "menu"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const { data: allOrders } = useCollection(openOrdersQuery)
  const { data: dbMenu, isLoading: menuLoading } = useCollection(menuQuery)

  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "invoices"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "expenses"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const fiscalReportsQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "fiscal_reports"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const { data: allInvoices } = useCollection(invoicesQuery)
  const { data: allExpenses } = useCollection(expensesQuery)
  const { data: allFiscalReports } = useCollection(fiscalReportsQuery)

  const sessionStartIso = useMemo(() => {
    const lastZ = (allFiscalReports || []).find(r => r.type === 'Z')
    if (lastZ?.timestamp) return lastZ.timestamp
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }, [allFiscalReports])

  const sessionInvoices = useMemo(() => {
    if (!allInvoices || !sessionStartIso) return []
    return allInvoices.filter(inv => (inv.timestamp || "") > sessionStartIso)
  }, [allInvoices, sessionStartIso])

  const sessionExpenses = useMemo(() => {
    if (!allExpenses || !sessionStartIso) return []
    return allExpenses.filter(e => (e.createdAt || "") > sessionStartIso)
  }, [allExpenses, sessionStartIso])

  const cierreStats = useMemo(() => {
    const cash = sessionInvoices.filter(inv => inv.paymentMethod === 'Efectivo').reduce((a, inv) => a + (Number(inv.total) || 0), 0)
    const card = sessionInvoices.filter(inv => inv.paymentMethod === 'Datafono').reduce((a, inv) => a + (Number(inv.total) || 0), 0)
    const transfer = sessionInvoices.filter(inv => inv.paymentMethod === 'Nequi').reduce((a, inv) => a + (Number(inv.total) || 0), 0)
    const expensesTotal = sessionExpenses.reduce((a, e) => a + (Number(e.amount) || 0), 0)
    return {
      cash, card, transfer,
      totalSales: cash + card + transfer,
      salesCount: sessionInvoices.length,
      expensesTotal,
      expectedCash: cash - expensesTotal - (Number(baseCaja) || 0),
      physicalCash: Number(efectivoContado) || 0,
    }
  }, [sessionInvoices, sessionExpenses, baseCaja, efectivoContado])

  const cierreDiscrepancy = cierreStats.physicalCash - cierreStats.expectedCash

  const activeOrders = useMemo(() => {
    if (!allOrders) return []
    return allOrders.filter(o => ["Open", "Preparing", "Ready"].includes(o.status))
  }, [allOrders])

  const activeMenu = dbMenu || [];

  const filteredMenu = activeMenu.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(menuSearch.toLowerCase())
    const matchesCategory = activeCategory === "Todos" || item.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const tables = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
  const tableData = useMemo(() => {
    const map: Record<string, any> = {}
    activeOrders.forEach(order => { map[order.tableNumber] = order })
    return map
  }, [activeOrders])

  const addToDirectCart = (item: any) => {
    if (item.available === false) {
      toast({ variant: "destructive", title: "Agotado", description: "Plato no disponible." })
      return
    }
    setSelectedOrder(null)
    setDirectCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { id: item.id, name: item.name, price: Number(item.price), quantity: 1 }]
    })
    toast({ title: "Agregado", description: item.name, duration: 500 })
  }

  const selectOrder = (order: any) => {
    setSelectedOrder(order)
    setDirectCart([]) 
    setCashAmount(0)
    setShowCheckoutMobile(true)
  }

  const handleFinalizeInvoice = async () => {
    if (!db || !effectiveBusinessId) {
      toast({ variant: "destructive", title: "Error de Configuración", description: "No se detectó el ID de negocio. Verifica tu perfil." })
      return
    }
    
    const isDirect = directCart.length > 0
    const cartToProcess = isDirect ? directCart : (selectedOrder?.items || [])
    const totalToProcess = isDirect ? directCart.reduce((acc, i) => acc + (i.price * i.quantity), 0) * 1.15 : (selectedOrder?.total || 0)

    if (cartToProcess.length === 0) {
      toast({ variant: "destructive", title: "Caja Vacía", description: "Selecciona productos o una mesa." })
      return
    }

    if (isElectronic && (!customerData.name || !customerData.taxId || !customerData.email)) {
      toast({ variant: "destructive", title: "Datos Fiscales", description: "Completa los datos del cliente para la factura electrónica." })
      return
    }

    setIsFinishing(true)
    
    const invoiceRef = doc(collection(db, "invoices"))
    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
    const finalTotal = totalToProcess + tipAmount
    const paymentData = isSplitPayment ? {
      method: 'Mixto',
      split: { method1: splitMethod1, amount1: Number(splitAmount1) || 0, method2: splitMethod2, amount2: finalTotal - (Number(splitAmount1) || 0) }
    } : { method: paymentMethod }

    const invoiceData = {
      id: invoiceRef.id,
      orderId: isDirect ? "direct-sale" : selectedOrder.id,
      orderNumber: isDirect ? `DIR-${Date.now().toString().slice(-4)}` : (selectedOrder?.orderNumber || 'S/N'),
      invoiceNumber: invoiceNum,
      tableNumber: isDirect ? "PARA LLEVAR" : selectedOrder.tableNumber,
      customerName: isElectronic ? customerData.name : "Consumidor Final",
      customerTaxId: isElectronic ? customerData.taxId : "S/N",
      customerEmail: isElectronic ? customerData.email : "",
      customerAddress: isElectronic ? customerData.address : "",
      isElectronic: isElectronic,
      items: cartToProcess,
      subtotal: totalToProcess / 1.15,
      tax: totalToProcess - (totalToProcess / 1.15),
      total: finalTotal,
      tip: tipAmount,
      paymentMethod: paymentData.method,
      splitPayment: isSplitPayment ? paymentData.split : null,
      timestamp: new Date().toISOString(),
      businessId: effectiveBusinessId,
      venueId: effectiveBusinessId,
      assignedVenue: effectiveVenueName,
      cashierName: (profile?.displayName || user?.email?.split('@')[0] || 'CAJERO').toUpperCase()
    }

    setDoc(invoiceRef, invoiceData)
      .catch(async (err) => {
        if (isOfflineError(err)) {
          errorEmitter.emit('offline-error', new FirestoreOfflineError({
            path: invoiceRef.path,
            operation: 'create',
          }));
        } else {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: invoiceRef.path,
            operation: 'create',
            requestResourceData: invoiceData
          }));
        }
      })
    
    if (!isDirect && selectedOrder) {
      updateDoc(doc(db, "orders", selectedOrder.id), { status: "Closed" })
        .catch(async (err) => {
          if (isOfflineError(err)) {
            errorEmitter.emit('offline-error', new FirestoreOfflineError({
              path: `orders/${selectedOrder.id}`,
              operation: 'update',
            }));
          } else {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: `orders/${selectedOrder.id}`,
              operation: 'update',
              requestResourceData: { status: 'Closed' }
            }));
          }
        })
    }

    if (isElectronic && typeof navigator !== 'undefined' && navigator.onLine) {
      processElectronicInvoice({
        customerName: customerData.name,
        taxId: customerData.taxId,
        email: customerData.email,
        address: customerData.address,
        items: cartToProcess,
        total: totalToProcess,
        invoiceNumber: invoiceNum
      }).then(aiResult => {
        toast({ title: "Cero: Factura Enviada", description: aiResult.message });
      }).catch(err => console.warn("AI Invoice dispatch deferred (Offline)."));
    }

    toast({ title: "¡Venta Exitosa!", description: "Transacción registrada en local." })
    
    setSelectedOrder(null)
    setDirectCart([])
    setShowCheckoutMobile(false)
    setCashAmount(0)
    setIsElectronic(false)
    setCustomerData({ name: "", taxId: "", email: "", address: "" })
    setIsFinishing(false)
  }

  const currentTotal = directCart.length > 0 
    ? directCart.reduce((acc, i) => acc + (i.price * i.quantity), 0) * 1.15 
    : (selectedOrder?.total || 0)

  const openCierreCaja = () => {
    const openOrdersCount = activeOrders?.length || 0
    if (openOrdersCount > 0) {
      toast({ 
        variant: "destructive", 
        title: "Órdenes Abiertas", 
        description: `Hay ${openOrdersCount} órdenes sin cobrar. Ciérralas antes de hacer el cierre de caja.`
      })
      return
    }
    setCierreStep(1)
    setEfectivoContado("")
    setBaseCaja("")
    setShowCierreCaja(true)
  }

  const finalizeCierreCaja = async () => {
    if (!db || !effectiveBusinessId) return
    setIsCierreLoading(true)

    const reportNumber = (allFiscalReports || []).reduce((max, r) => Math.max(max, Number(r.reportNumber) || 0), 0) + 1

    const reportData = {
      type: 'Z',
      reportNumber,
      timestamp: new Date().toISOString(),
      totalGross: cierreStats.totalSales,
      posCount: cierreStats.salesCount,
      posTotal: cierreStats.totalSales,
      deliveryCount: 0,
      deliveryTotal: 0,
      expensesTotal: cierreStats.expensesTotal,
      breakdown: { cash: cierreStats.cash, card: cierreStats.card, digital: cierreStats.transfer },
      cashBase: Number(baseCaja) || 0,
      actualCashCount: cierreStats.physicalCash,
      discrepancy: cierreDiscrepancy,
      generatedBy: (profile?.displayName || user?.email || 'Cajero').toUpperCase(),
      businessId: effectiveBusinessId,
      assignedVenue: effectiveVenueName,
      id: doc(collection(db, "fiscal_reports")).id,
      equipmentSerial: 'AURORA-POS-' + (effectiveBusinessId || '001').toUpperCase(),
    }

    try {
      await setDoc(doc(db, "fiscal_reports", reportData.id), reportData)
      printCierreReport(reportData)
      setShowCierreCaja(false)
      toast({ title: "Cierre de Caja Completado", description: "Turno cerrado exitosamente." })
    } catch (err: any) {
      if (isOfflineError(err)) {
        errorEmitter.emit('offline-error', new FirestoreOfflineError({ path: `fiscal_reports/${reportData.id}`, operation: 'create' }))
      } else {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `fiscal_reports/${reportData.id}`, operation: 'create', requestResourceData: reportData }))
      }
    } finally {
      setIsCierreLoading(false)
    }
  }

  const printCierreReport = (report: any) => {
    if (typeof window === 'undefined') return
    const w = window.open('', '', 'width=600,height=800')
    if (!w) return

    const expensesRows = sessionExpenses.map((e: any) => 
      `<tr><td>${(e.description || '').toUpperCase()}</td><td align="right">$${Number(e.amount || 0).toLocaleString()}</td></tr>`
    ).join('')

    w.document.write(`
      <html><head><title>Cierre_Caja_${report.reportNumber}</title>
      <style>
        body { font-family: 'Courier New', monospace; padding: 20px; font-size: 11px; color: #000; width: 300px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .section { margin-bottom: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
        .section-title { font-weight: bold; display: block; margin-bottom: 5px; text-transform: uppercase; border-bottom: 1px solid #000; }
        table { width: 100%; border-collapse: collapse; }
        table td { padding: 2px 0; }
        .grand-total { border: 2px solid #000; padding: 10px; text-align: center; margin-top: 15px; }
        .signature { margin-top: 50px; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 10px; }
        .highlight { font-weight: bold; }
      </style></head><body>
        <div class="header">
          <div style="font-weight: bold; font-size: 14px;">AURORA OS</div>
          <div style="font-size: 9px;">REPORTE DE CIERRE DE CAJA</div>
          <div style="font-size: 11px; font-weight: bold; margin-top: 5px;">${effectiveVenueName}</div>
          <div style="font-size: 10px; margin-top: 5px;">Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</div>
          <div style="font-size: 10px;">Reporte #${report.reportNumber}</div>
        </div>
        <div class="section">
          <span class="section-title">VENTAS POR MÉTODO DE PAGO</span>
          <table>
            <tr><td>VENTAS REGISTRADAS:</td><td align="right">${cierreStats.salesCount}</td></tr>
            <tr><td>EFECTIVO:</td><td align="right">$${cierreStats.cash.toLocaleString()}</td></tr>
            <tr><td>DATÁFONO:</td><td align="right">$${cierreStats.card.toLocaleString()}</td></tr>
            <tr><td>TRANSFERENCIA/NEQUI:</td><td align="right">$${cierreStats.transfer.toLocaleString()}</td></tr>
            <tr class="highlight"><td>TOTAL VENTAS:</td><td align="right">$${cierreStats.totalSales.toLocaleString()}</td></tr>
          </table>
        </div>
        ${expensesRows ? `<div class="section">
          <span class="section-title">GASTOS DEL TURNO</span>
          <table>${expensesRows}
            <tr class="highlight"><td>TOTAL GASTOS:</td><td align="right">$${cierreStats.expensesTotal.toLocaleString()}</td></tr>
          </table>
        </div>` : ''}
        <div class="section">
          <span class="section-title">ARQUEO DE CAJA</span>
          <table>
            <tr><td>BASE DE CAJA:</td><td align="right">$${(Number(baseCaja) || 0).toLocaleString()}</td></tr>
            <tr><td>EFECTIVO SISTEMA:</td><td align="right">$${cierreStats.cash.toLocaleString()}</td></tr>
            <tr><td>GASTOS (-):</td><td align="right">-$${cierreStats.expensesTotal.toLocaleString()}</td></tr>
            <tr><td>BASE (-):</td><td align="right">-$${(Number(baseCaja) || 0).toLocaleString()}</td></tr>
            <tr class="highlight"><td>EFECTIVO ESPERADO:</td><td align="right">$${cierreStats.expectedCash.toLocaleString()}</td></tr>
            <tr class="highlight"><td>EFECTIVO CONTADO:</td><td align="right">$${cierreStats.physicalCash.toLocaleString()}</td></tr>
            <tr class="highlight" style="color: ${cierreDiscrepancy < 0 ? 'red' : cierreDiscrepancy > 0 ? 'green' : 'black'};">
              <td>DIFERENCIA:</td><td align="right">$${cierreDiscrepancy.toLocaleString()}</td>
            </tr>
          </table>
        </div>
        <div class="grand-total">
          <div style="font-size: 9px;">VENTAS BRUTAS DEL TURNO</div>
          <div style="font-size: 20px; font-weight: bold;">$${cierreStats.totalSales.toLocaleString()}</div>
        </div>
        <div class="signature">FIRMA DEL CAJERO<br><span style="font-size: 8px;">${(profile?.displayName || user?.email || '').toUpperCase()}</span></div>
        <div class="signature">FIRMA DEL ADMINISTRADOR<br><span style="font-size: 8px;">RECIBIDO Y CONFORME</span></div>
        <div style="text-align: center; margin-top: 30px; font-size: 7px; opacity: 0.5;">Aurora OS • Umbral Cero</div>
      </body></html>
    `)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  const exportCierreExcel = () => {
    const data = [
      { Concepto: 'Ventas Efectivo', Valor: cierreStats.cash },
      { Concepto: 'Ventas Datáfono', Valor: cierreStats.card },
      { Concepto: 'Ventas Transferencia/Nequi', Valor: cierreStats.transfer },
      { Concepto: 'Total Ventas', Valor: cierreStats.totalSales },
      { Concepto: 'Gastos', Valor: cierreStats.expensesTotal },
      { Concepto: 'Base de Caja', Valor: Number(baseCaja) || 0 },
      { Concepto: 'Efectivo Esperado', Valor: cierreStats.expectedCash },
      { Concepto: 'Efectivo Contado', Valor: cierreStats.physicalCash },
      { Concepto: 'Diferencia', Valor: cierreDiscrepancy },
    ]
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Cierre de Caja')
    XLSX.writeFile(wb, `cierre_caja_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`)
    toast({ title: "Exportado", description: "Reporte exportado a Excel." })
  }

  if (!mounted) return null;

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 h-[calc(100svh-2.5rem)] bg-slate-50/50 font-body overflow-hidden">
      
      <div className={cn(
        "lg:col-span-8 flex flex-col h-full overflow-hidden relative",
        showCheckoutMobile ? "hidden lg:flex" : "flex"
      )}>
        <div className="p-3 md:p-4 bg-white border-b shadow-sm shrink-0 flex justify-between items-center gap-2 overflow-x-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="bg-slate-100 rounded-lg p-1 h-9 md:h-10">
              <TabsTrigger value="direct" className="rounded-md font-black text-[7px] md:text-[8px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 md:px-4">
                <ShoppingBag className="mr-1 md:mr-2 h-3 w-3" /> <span className="hidden xs:inline">Venta Rápida</span>
              </TabsTrigger>
              <TabsTrigger value="tables" className="rounded-md font-black text-[7px] md:text-[8px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 md:px-4">
                <LayoutGrid className="mr-1 md:mr-2 h-3 w-3" /> <span className="hidden xs:inline">Plano Salón</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <Button 
              variant="outline" 
              size="icon"
              className="h-8 md:h-9 w-8 md:w-9 rounded-lg md:rounded-xl border-slate-200 text-slate-500 hover:bg-slate-100"
              onClick={openCierreCaja}
              title="Cierre de Caja"
            >
              <Lock className="h-3.5 md:h-4 w-3.5 md:w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              className="h-8 md:h-9 w-8 md:w-9 rounded-lg md:rounded-xl border-slate-200 text-slate-500 hover:bg-slate-100"
              onClick={() => router.push('/fiscal-control')}
              title="Cierre Fiscal (Z)"
            >
              <ShieldCheck className="h-3.5 md:h-4 w-3.5 md:w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              className="h-8 md:h-9 w-8 md:w-9 rounded-lg md:rounded-xl border-primary/30 text-primary hover:bg-primary hover:text-white"
              onClick={() => setIsElectronic(!isElectronic)}
              title={isElectronic ? 'Cambiar a POS' : 'Cambiar a Factura Electrónica'}
            >
              <FileText className="h-3.5 md:h-4 w-3.5 md:w-4" />
            </Button>
            <Badge variant="outline" className="text-[5px] md:text-[6px] font-black uppercase border-primary/20 text-primary hidden lg:flex px-2">{effectiveVenueName}</Badge>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <Tabs value={activeTab} className="h-full">
            <TabsContent value="direct" className="m-0 p-2 md:p-4 space-y-4 md:space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center justify-between">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 w-full md:w-auto">
                  {categories.map(cat => (
                    <Button 
                      key={cat} 
                      variant={activeCategory === cat ? "default" : "outline"} 
                      className={cn(
                        "rounded-full font-black text-[6px] md:text-[7px] uppercase px-3 md:px-4 h-7 md:h-8 whitespace-nowrap border-none",
                        activeCategory === cat ? "bg-primary text-white" : "bg-white text-slate-400"
                      )}
                      onClick={() => setActiveCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
                <div className="relative w-full md:w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                  <Input 
                    placeholder="Buscar..." 
                    className="pl-9 h-9 rounded-lg bg-white border-none font-bold text-[10px] shadow-sm"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3 pb-28 md:pb-32">
                {menuLoading ? (
                  <div className="col-span-full py-16 md:py-20 text-center"><Loader2 className="animate-spin h-5 md:h-6 w-5 md:w-6 mx-auto opacity-20" /></div>
                ) : filteredMenu.map(item => (
                  <Card 
                    key={item.id} 
                    className={cn(
                      "rounded-xl md:rounded-2xl border-none shadow-sm hover:shadow-lg transition-all cursor-pointer group active:scale-95 overflow-hidden bg-white",
                      !item.available && "opacity-40 grayscale pointer-events-none"
                    )}
                    onClick={() => addToDirectCart(item)}
                  >
                    <div className="aspect-square relative overflow-hidden bg-slate-100">
                      <img src={item.imageUrl} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                    </div>
                    <CardContent className="p-2 md:p-3">
                      <p className="font-black text-[8px] md:text-[9px] text-slate-900 uppercase truncate mb-0.5">{item.name}</p>
                      <p className="text-[8px] md:text-[9px] font-black text-primary">{formatCurrencyDetailed(item.price)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="tables" className="m-0 p-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                {tables.map(num => {
                  const order = tableData[num]
                  const status = !order ? 'free' : (order.status === 'Ready' ? 'ready' : 'occupied')
                  return (
                    <Card 
                      key={num} 
                      className={cn(
                        "rounded-[2rem] border-2 transition-all cursor-pointer h-32 flex flex-col justify-center items-center gap-1 group active:scale-95",
                        status === 'free' ? "bg-white border-slate-100" : 
                        status === 'ready' ? "bg-amber-50 border-amber-400 shadow-lg" : 
                        "bg-emerald-50 border-emerald-500 shadow-lg",
                        selectedOrder?.tableNumber === num ? "ring-4 ring-primary/30 border-primary" : ""
                      )}
                      onClick={() => status !== 'free' && selectOrder(order)}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-black",
                        status === 'free' ? "bg-slate-100 text-slate-400" : 
                        status === 'ready' ? "bg-amber-400 text-white" : "bg-emerald-500 text-white"
                      )}>
                        {num}
                      </div>
                      <span className={cn("text-[7px] font-black uppercase tracking-widest", 
                        status === 'free' ? "text-slate-300" : status === 'ready' ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {status === 'free' ? 'Libre' : status === 'ready' ? 'Listo' : 'Ocupada'}
                      </span>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {directCart.length > 0 && !showCheckoutMobile && (
          <div className="lg:hidden fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
            <Button 
              onClick={() => setShowCheckoutMobile(true)}
              className="w-full h-14 bg-slate-900 text-white rounded-xl shadow-2xl flex justify-between px-6"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <div className="flex flex-col items-start">
                  <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">
                    {isElectronic ? "Factura Electrónica" : "Proceder"} · {directCart.reduce((a, i) => a + i.quantity, 0)} items
                  </span>
                  <span className="text-sm font-black text-white">{formatCurrencyDetailed(currentTotal)}</span>
                </div>
              </div>
              <ChevronUp className="h-4 w-4 text-slate-500 animate-bounce" />
            </Button>
          </div>
        )}
      </div>

      <Card className={cn(
        "lg:col-span-4 rounded-none border-none lg:border-l flex flex-col shadow-2xl z-30 min-h-0",
        showCheckoutMobile ? "fixed inset-0 h-full w-full bg-slate-50" : "hidden lg:flex bg-white"
      )}>
        <CardHeader className="bg-slate-900 text-white p-3 md:p-4 flex flex-row justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="h-7 w-7 md:h-8 md:w-8 text-white/70 p-0 mr-1" onClick={() => {
              setShowCheckoutMobile(false)
              if (selectedOrder) {
                setSelectedOrder(null)
                setDirectCart([])
              }
            }}>
              <ArrowLeftRight className="h-3.5 md:h-4 w-3.5 md:w-4" />
            </Button>
            <Receipt className="h-4 md:h-5 w-4 md:w-5 text-primary" />
            <div>
              <CardTitle className="text-xs md:text-sm font-black uppercase tracking-tighter">
                {directCart.length > 0 ? "Venta Rápida" : `Mesa ${selectedOrder?.tableNumber || '?'}`}
              </CardTitle>
              <p className="text-[6px] md:text-[7px] font-black text-slate-400 uppercase tracking-widest italic">Cierre Fiscal</p>
            </div>
          </div>
          <Button variant="ghost" className="text-white/70 font-black text-[7px] md:text-[8px] uppercase tracking-widest h-7 md:h-8 px-2 md:px-3 gap-1" onClick={() => {
            setShowCheckoutMobile(false)
            if (selectedOrder) {
              setSelectedOrder(null)
              setDirectCart([])
            }
          }}>
            <ArrowRight className="h-3 md:h-3.5 w-3 md:w-3.5" /> <span className="hidden sm:inline">Volver</span>
          </Button>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 p-0 overflow-hidden flex flex-col bg-slate-50/20">
          <ScrollArea ref={checkoutScrollRef} className="flex-1 min-h-0">
            <div className="divide-y divide-slate-100">
              <div className="p-4 bg-white space-y-3">
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest border-b pb-1.5 flex justify-between">
                  <span>Productos</span>
                  {directCart.length > 0 && <button onClick={() => setDirectCart([])} className="text-destructive font-black">Vaciar</button>}
                </p>
                
                {(directCart.length === 0 && !selectedOrder) ? (
                  <div className="py-10 text-center opacity-20 flex flex-col items-center gap-2">
                    <Utensils className="h-8 w-8" />
                    <p className="font-black uppercase text-[8px]">Esperando...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(directCart.length > 0 ? directCart : (selectedOrder?.items || [])).map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-slate-50 rounded-md p-0.5 border text-[9px] font-black">
                            <span className="w-5 text-center">{item.quantity}</span>
                          </div>
                          <p className="font-black text-[10px] text-slate-900 uppercase truncate max-w-[120px]">{item.name}</p>
                        </div>
                        <p className="font-black text-slate-900 text-[10px]">{formatCurrencyDetailed(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(directCart.length > 0 || selectedOrder) && (
                <>
                  <div className="p-4 space-y-4 bg-white">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <Label htmlFor="electronic-toggle" className="text-[9px] font-black uppercase tracking-widest text-slate-600">Factura Electrónica</Label>
                      </div>
                      <Switch 
                        id="electronic-toggle"
                        checked={isElectronic}
                        onCheckedChange={setIsElectronic}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    {isElectronic && (
                      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="col-span-2 relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                          <Input 
                            placeholder="Nombre / Razón Social" 
                            className="h-9 pl-9 rounded-lg bg-white border-slate-100 text-[10px] font-bold uppercase"
                            value={customerData.name}
                            onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                          />
                        </div>
                        <div className="relative">
                          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                          <Input 
                            placeholder="NIT / RUT" 
                            className="h-9 pl-9 rounded-lg bg-white border-slate-100 text-[10px] font-bold"
                            value={customerData.taxId}
                            onChange={(e) => setCustomerData({...customerData, taxId: e.target.value})}
                          />
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                          <Input 
                            type="email"
                            placeholder="Email" 
                            className="h-9 pl-9 rounded-lg bg-white border-slate-100 text-[10px] font-bold"
                            value={customerData.email}
                            onChange={(e) => setCustomerData({...customerData, email: e.target.value.toLowerCase()})}
                          />
                        </div>
                        <div className="col-span-2 relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                          <Input 
                            placeholder="Dirección Fiscal" 
                            className="h-9 pl-9 rounded-lg bg-white border-slate-100 text-[10px] font-bold uppercase"
                            value={customerData.address}
                            onChange={(e) => setCustomerData({...customerData, address: e.target.value})}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div ref={paymentSectionRef} className="p-4 space-y-4">
                    {/* Propina */}
                    <div>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest text-center mb-2">Propina</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[0, 2000, 5000, 10000].map(amt => (
                          <button key={amt} onClick={() => { setTipAmount(amt); setCustomTip("") }}
                            className={cn("h-8 rounded-lg text-[8px] font-black border transition-all", tipAmount === amt && !customTip ? "bg-amber-500 text-white border-amber-600" : "bg-white text-slate-500 border-slate-100")}>
                            {amt === 0 ? 'Sin' : `$${(amt/1000)}k`}
                          </button>
                        ))}
                        <input type="number" placeholder="Otro" value={customTip}
                          onChange={e => { setCustomTip(e.target.value); setTipAmount(Number(e.target.value) || 0) }}
                          className="h-8 rounded-lg text-[8px] font-bold text-center bg-white border border-slate-100 w-full" />
                      </div>
                    </div>

                    {/* Pago Mixto Toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-[8px] font-black uppercase text-slate-500">Pago Mixto</span>
                      <button onClick={() => setIsSplitPayment(!isSplitPayment)}
                        className={cn("h-6 w-11 rounded-full transition-all flex items-center px-1", isSplitPayment ? "bg-primary justify-end" : "bg-slate-200 justify-start")}>
                        <div className="h-4 w-4 rounded-full bg-white shadow" />
                      </button>
                    </div>

                    {isSplitPayment ? (
                      <div className="space-y-3">
                        <p className="text-[8px] font-black uppercase text-slate-400 text-center">Parte 1</p>
                        <div className="grid grid-cols-3 gap-2">
                          {['Efectivo', 'Datafono', 'Nequi'].map(m => (
                            <button key={m} onClick={() => setSplitMethod1(m as any)}
                              className={cn("flex items-center justify-center h-9 rounded-lg gap-1 border-2 text-[7px] font-black uppercase transition-all", splitMethod1 === m ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 text-slate-400")}>
                              {m}
                            </button>
                          ))}
                        </div>
                        <Input type="number" value={splitAmount1} onChange={e => setSplitAmount1(e.target.value)}
                          placeholder="Monto parte 1" className="h-10 rounded-xl bg-slate-50 border-slate-100 text-center font-black" />
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 px-2">
                          <span>Parte 2 ({splitMethod2}):</span>
                          <span className="font-black text-slate-900">{formatCurrencyDetailed(currentTotal + tipAmount - (Number(splitAmount1) || 0))}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {['Efectivo', 'Datafono', 'Nequi'].map(m => (
                            <button key={m} onClick={() => setSplitMethod2(m as any)}
                              className={cn("flex items-center justify-center h-7 rounded-lg gap-1 border-2 text-[6px] font-black uppercase transition-all", splitMethod2 === m ? "border-slate-900 bg-slate-100 text-slate-900" : "border-slate-100 text-slate-400")}>
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest text-center">Método de Recaudo</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'Efectivo', icon: Banknote, color: 'bg-emerald-500' },
                            { id: 'Datafono', icon: CreditCard, color: 'bg-blue-500' },
                            { id: 'Nequi', icon: Smartphone, color: 'bg-purple-500' }
                          ].map(m => (
                            <button key={m.id} onClick={() => setPaymentMethod(m.id as any)}
                              className={cn("flex flex-col items-center justify-center h-12 rounded-xl gap-1 border-2 transition-all active:scale-90",
                                paymentMethod === m.id ? `border-slate-900 ${m.color} text-white shadow-lg` : "bg-white text-slate-400 border-slate-100")}>
                              <m.icon className="h-3 w-3" />
                              <span className="font-black text-[7px] uppercase tracking-tighter">{m.id}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {(!isSplitPayment && paymentMethod === 'Efectivo') && (
                    <div className="p-4 space-y-3 bg-emerald-50/30 border-y border-emerald-100">
                      <div className="grid grid-cols-4 gap-1.5">
                        {[10000, 20000, 50000, 100000].map(amt => (
                          <Button key={amt} variant="outline" className="h-8 bg-white border-emerald-100 rounded-md text-[8px] font-black text-emerald-600 p-0" onClick={() => setCashAmount(amt)}>
                            ${(amt/1000)}k
                          </Button>
                        ))}
                      </div>
                      {cashReceived > 0 && (
                        <div className="flex justify-between items-center pt-1.5 border-t border-emerald-100">
                          <span className="text-[8px] font-black uppercase text-slate-400">Vuelto:</span>
                          <span className="text-sm font-black text-emerald-600">{formatCurrencyDetailed(Math.max(0, cashReceived - currentTotal))}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 bg-white border-t flex flex-col gap-4 shrink-0">
          <div className="w-full space-y-1">
            <div className="flex justify-between items-end">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Subtotal</span>
              <span className="text-lg font-black text-slate-400">{formatCurrencyDetailed(currentTotal)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between items-end">
                <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest">Propina</span>
                <span className="text-sm font-black text-amber-600">+{formatCurrencyDetailed(tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-end border-t pt-2">
              <span className="text-[9px] font-black uppercase text-slate-900 tracking-widest">Total a Cobrar</span>
              <span className="text-2xl font-black text-primary tracking-tighter">{formatCurrencyDetailed(currentTotal + tipAmount)}</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 w-full">
            <Button 
              className="col-span-3 h-14 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-300"
              disabled={currentTotal === 0 || isFinishing}
              onClick={handleFinalizeInvoice}
            >
              {isFinishing ? <Loader2 className="animate-spin h-6 w-6" /> : <><CheckCircle2 className="mr-2 h-5 w-5" /> {isElectronic ? "Emitir Electrónica" : "Cobrar"}</>}
            </Button>
            <Button 
              variant="outline"
              className="h-14 border-slate-100 rounded-xl hover:bg-slate-50 transition-all group p-0 flex items-center justify-center"
              disabled={currentTotal === 0}
              onClick={() => toast({ title: "Ticket Fiscal", description: "Imprimiendo copia..." })}
            >
              <Printer className="h-6 w-6 text-slate-300 group-hover:text-primary" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Cierre de Caja Dialog */}
      <Dialog open={showCierreCaja} onOpenChange={setShowCierreCaja}>
        <DialogContent className="max-w-lg rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-secondary/20 flex items-center justify-center border border-white/10">
                <Lock className="h-5 w-5 text-secondary" />
              </div>
              <DialogTitle className="text-lg font-black uppercase tracking-tighter">Cierre de Caja: Paso {cierreStep} de 5</DialogTitle>
            </div>
          </div>
          <div className="p-6">
            {cierreStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black uppercase text-slate-900">1. Resumen de Ventas</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase italic">Totales del turno actual</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-emerald-600" /><span className="text-[10px] font-black uppercase text-emerald-800">Efectivo</span></div>
                    <span className="text-lg font-black text-emerald-900">{formatCurrencyDetailed(cierreStats.cash)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-blue-600" /><span className="text-[10px] font-black uppercase text-blue-800">Datáfono</span></div>
                    <span className="text-lg font-black text-blue-900">{formatCurrencyDetailed(cierreStats.card)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-purple-600" /><span className="text-[10px] font-black uppercase text-purple-800">Transferencia/Nequi</span></div>
                    <span className="text-lg font-black text-purple-900">{formatCurrencyDetailed(cierreStats.transfer)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-red-50 rounded-2xl border border-red-100">
                    <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-red-600" /><span className="text-[10px] font-black uppercase text-red-800">Gastos</span></div>
                    <span className="text-lg font-black text-red-900">{formatCurrencyDetailed(cierreStats.expensesTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-900 rounded-2xl text-white">
                    <span className="text-[10px] font-black uppercase">Total Ventas ({cierreStats.salesCount} transacciones)</span>
                    <span className="text-2xl font-black">{formatCurrencyDetailed(cierreStats.totalSales)}</span>
                  </div>
                </div>
                <Button className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl" onClick={() => setCierreStep(2)}>
                  Conteo de Efectivo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {cierreStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black uppercase text-slate-900">2. Base de Caja</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase italic">Efectivo que se deja para mañana</p>
                </div>
                <Input type="number" value={baseCaja} onChange={e => setBaseCaja(e.target.value)} className="h-20 rounded-2xl bg-slate-50 border-none font-black text-4xl text-primary text-center" placeholder="0" />
                <div className="flex gap-3">
                  <Button variant="ghost" className="flex-1 h-12 font-black text-[9px]" onClick={() => setCierreStep(1)}>Atrás</Button>
                  <Button className="flex-[2] h-12 bg-emerald-600 text-white rounded-xl font-black uppercase text-[9px]" onClick={() => setCierreStep(3)}>Contar Efectivo</Button>
                </div>
              </div>
            )}

            {cierreStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black uppercase text-slate-900">3. Conteo de Efectivo</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase italic">¿Cuánto dinero hay en caja?</p>
                </div>
                <Input type="number" value={efectivoContado} onChange={e => setEfectivoContado(e.target.value)} className="h-24 rounded-[2rem] bg-emerald-50 border-emerald-200 font-black text-4xl text-emerald-900 text-center" placeholder="0" />
                <div className="flex gap-3">
                  {[50000, 100000, 200000, 500000].map(amt => (
                    <Button key={amt} variant="outline" className="flex-1 h-10 rounded-lg border-emerald-200 text-emerald-700 font-black text-[9px]" onClick={() => setEfectivoContado(String(amt))}>
                      ${(amt/1000)}k
                    </Button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" className="flex-1 h-12 font-black text-[9px]" onClick={() => setCierreStep(2)}>Atrás</Button>
                  <Button className="flex-[2] h-12 bg-slate-900 text-white rounded-xl font-black uppercase text-[9px]" onClick={() => setCierreStep(4)}>Comparar</Button>
                </div>
              </div>
            )}

            {cierreStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black uppercase text-slate-900">4. Comparación</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase italic">Sistema vs. Efectivo contado</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4 text-[11px] font-mono uppercase">
                  <div className="flex justify-between"><span>Efectivo sistema:</span><span className="font-black">{formatCurrencyDetailed(cierreStats.cash)}</span></div>
                  <div className="flex justify-between text-red-600"><span>Gastos:</span><span className="font-black">-{formatCurrencyDetailed(cierreStats.expensesTotal)}</span></div>
                  <div className="flex justify-between text-slate-400"><span>Base:</span><span className="font-black">-{formatCurrencyDetailed(Number(baseCaja) || 0)}</span></div>
                  <div className="flex justify-between border-t pt-3"><span>Efectivo esperado:</span><span className="font-black">{formatCurrencyDetailed(cierreStats.expectedCash)}</span></div>
                  <div className="flex justify-between"><span>Efectivo contado:</span><span className="font-black">{formatCurrencyDetailed(cierreStats.physicalCash)}</span></div>
                  <div className={cn("flex justify-between text-2xl font-black pt-3 border-t", cierreDiscrepancy < 0 ? "text-red-600" : cierreDiscrepancy > 0 ? "text-green-600" : "text-emerald-600")}>
                    <span>Diferencia:</span>
                    <span>{formatCurrencyDetailed(cierreDiscrepancy)}</span>
                  </div>
                  {cierreDiscrepancy < 0 && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                      <span className="text-[9px] font-bold text-red-700">Hay un faltante de efectivo. Revisa el conteo.</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" className="flex-1 h-12 font-black text-[9px]" onClick={() => setCierreStep(3)}>Atrás</Button>
                  <Button className="flex-[2] h-12 bg-slate-900 text-white rounded-xl font-black uppercase text-[9px]" onClick={() => setCierreStep(5)}>Confirmar Cierre</Button>
                </div>
              </div>
            )}

            {cierreStep === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black uppercase text-slate-900">5. Entrega de Dinero</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase italic">Cajero entrega efectivo al administrador</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-3 text-center">
                  <Wallet className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-black text-slate-900 uppercase">Efectivo a entregar</p>
                  <p className="text-3xl font-black text-primary">{formatCurrencyDetailed(cierreStats.physicalCash)}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Cajero: {(profile?.displayName || user?.email || '').toUpperCase()}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 border-2 border-dashed rounded-xl border-slate-200 text-center">
                    <PenLine className="h-5 w-5 text-slate-300 mx-auto mb-2" />
                    <p className="text-[8px] font-black uppercase text-slate-400">Firma Cajero</p>
                  </div>
                  <div className="p-4 border-2 border-dashed rounded-xl border-slate-200 text-center">
                    <PenLine className="h-5 w-5 text-slate-300 mx-auto mb-2" />
                    <p className="text-[8px] font-black uppercase text-slate-400">Firma Administrador</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" className="flex-1 h-12 font-black text-[9px]" onClick={() => setCierreStep(4)}>Atrás</Button>
                  <Button variant="outline" className="h-12 px-4 rounded-xl font-black text-[9px] uppercase" onClick={exportCierreExcel}>
                    <Download className="mr-2 h-4 w-4" /> Excel
                  </Button>
                  <Button className="flex-[2] h-12 bg-emerald-600 text-white rounded-xl font-black uppercase text-[9px] shadow-xl" onClick={finalizeCierreCaja} disabled={isCierreLoading}>
                    {isCierreLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <><Printer className="mr-2 h-4 w-4" /> Cerrar e Imprimir</>}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
