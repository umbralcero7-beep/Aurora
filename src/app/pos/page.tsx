
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
  PenLine,
  PlusCircle
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
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [tables, setTables] = useState<string[]>(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"])
  const [showAddTable, setShowAddTable] = useState(false)
  const [newTableNumber, setNewTableNumber] = useState("")

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
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [customerSearchTerm, setCustomerSearchTerm] = useState("")

  // Product Modifier Modal State
  const [showModifierModal, setShowModifierModal] = useState(false)
  const [selectedProductForModifier, setSelectedProductForModifier] = useState<any>(null)
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([])

  // Cierre de Caja State
  const [showCierreCaja, setShowCierreCaja] = useState(false)
  const [cierreStep, setCierreStep] = useState(1)
  const [efectivoContado, setEfectivoContado] = useState("")
  const [baseCaja, setBaseCaja] = useState("")
  const [isCierreLoading, setIsCierreLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Update time every minute for table timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 60000) // Update every minute
    return () => clearInterval(interval)
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

  const customersQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "customers"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const { data: allCustomers } = useCollection(customersQuery)

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

  const tableData = useMemo(() => {
    const map: Record<string, any> = {}
    activeOrders.forEach(order => { map[order.tableNumber] = order })
    return map
  }, [activeOrders])

  const handleAddTable = () => {
    const num = newTableNumber.trim()
    if (!num) {
      toast({ variant: "destructive", title: "Error", description: "Ingresa un número de mesa" })
      return
    }
    if (tables.includes(num)) {
      toast({ variant: "destructive", title: "Error", description: "La mesa ya existe" })
      return
    }
    setTables(prev => [...prev, num].sort((a, b) => Number(a) - Number(b)))
    setNewTableNumber("")
    setShowAddTable(false)
    toast({ title: "Mesa agregada", description: `Mesa ${num} añadida` })
  }

  const handleRemoveTable = (num: string) => {
    const hasOrder = tableData[num]
    if (hasOrder) {
      toast({ variant: "destructive", title: "Error", description: "No puedes eliminar una mesa con orden activa" })
      return
    }
    setTables(prev => prev.filter(t => t !== num))
    toast({ title: "Mesa eliminada", description: `Mesa ${num} eliminada` })
  }

  const isAdmin = profile?.role === 'ADMIN' || isSuper

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
    <div className="flex h-[calc(100svh-2.5rem)] bg-slate-900 font-body overflow-hidden">
      {/* PANEL IZQUIERDO: Control + Menú Unificado (40%) */}
      <div className="w-[40%] min-w-[320px] max-w-[480px] bg-slate-950 border-r border-slate-800 flex flex-col overflow-hidden">
        {/* Selector de Modo */}
        <div className="p-3 border-b border-slate-800 shrink-0">
          <div className="flex gap-2">
            <Button 
              variant={activeTab === 'tables' ? 'default' : 'ghost'}
              className={cn(
                "flex-1 h-10 justify-center px-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all",
                activeTab === 'tables' ? "bg-primary text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
              onClick={() => setActiveTab('tables')}
            >
              <LayoutGrid className="mr-2 h-4 w-4" /> Mesas
            </Button>
            <Button 
              variant={activeTab === 'direct' ? 'default' : 'ghost'}
              className={cn(
                "flex-1 h-10 justify-center px-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all",
                activeTab === 'direct' ? "bg-primary text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
              onClick={() => setActiveTab('direct')}
            >
              <ShoppingBag className="mr-2 h-4 w-4" /> Venta
            </Button>
          </div>
        </div>

        {/* Estado del Sistema */}
        <div className="px-3 py-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-black text-slate-400 uppercase">DIAN</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[8px] font-black text-slate-400 uppercase">Caja</span>
              <span className="text-[7px] font-black text-blue-400">Abierta</span>
            </div>
          </div>
        </div>

        {/* Buscador Global */}
        <div className="p-3 border-b border-slate-800 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
            <Input 
              placeholder="Buscar producto..." 
              className="pl-9 h-10 bg-slate-900 border-slate-700 text-slate-200 font-bold text-xs placeholder:text-slate-600 rounded-lg"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
            />
          </div>
          {menuSearch && filteredMenu.length > 0 && (
            <div className="mt-2 bg-slate-800 rounded-lg overflow-hidden max-h-32 overflow-y-auto">
              {filteredMenu.slice(0, 4).map(item => (
                <button 
                  key={item.id} 
                  className="w-full p-2 flex items-center justify-between hover:bg-slate-700 border-b border-slate-700 last:border-0"
                  onClick={() => { 
                    setSelectedProductForModifier(item)
                    setSelectedModifiers([])
                    setShowModifierModal(true)
                    setMenuSearch('') 
                  }}
                >
                  <span className="text-[9px] font-bold text-slate-200 uppercase truncate">{item.name}</span>
                  <span className="text-[9px] font-black text-primary">{formatCurrencyDetailed(item.price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Categorías */}
        <div className="px-3 py-2 border-b border-slate-800 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-2 py-1.5 rounded-md text-[7px] font-black uppercase transition-all",
                  activeCategory === cat ? "bg-primary text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Área de Contenido: Mesas o Productos */}
        <div className="flex-1 overflow-y-auto p-3">
          <Tabs value={activeTab} className="h-full">
            <TabsContent value="tables" className="m-0 animate-in fade-in duration-300">
              {isAdmin && (
                <div className="mb-3 flex justify-end">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddTable(true)}
                    className="h-8 text-[8px] font-black uppercase rounded-lg"
                  >
                    <PlusCircle className="h-3 w-3 mr-1" /> Agregar Mesa
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {tables.map(num => {
                  const order = tableData[num]
                  const status = !order ? 'free' : (order.status === 'Ready' ? 'ready' : 'occupied')
                  const elapsedMin = order?.createdAt ? Math.floor((currentTime - new Date(order.createdAt).getTime()) / 60000) : 0
                  const isUrgent = elapsedMin > 20
                  return (
                    <Card 
                      key={num} 
                      className={cn(
                        "rounded-xl border-2 transition-all h-20 flex flex-col items-center justify-center gap-1 group relative",
                        status === 'free' ? "bg-white border-slate-200" : 
                        status === 'ready' ? "bg-amber-50 border-amber-400 shadow-md cursor-pointer hover:scale-105" : 
                        isUrgent ? "bg-red-50 border-red-400 shadow-md animate-pulse cursor-pointer hover:scale-105" :
                        "bg-blue-50 border-blue-400 shadow-md cursor-pointer hover:scale-105",
                        selectedOrder?.tableNumber === num ? "ring-2 ring-primary/30 border-primary" : ""
                      )}
                      onClick={() => status !== 'free' && selectOrder(order)}
                    >
                      {isAdmin && status === 'free' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRemoveTable(num) }}
                          className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-2 w-2 text-white" />
                        </button>
                      )}
                      {status !== 'free' && elapsedMin > 0 && (
                        <div className={cn(
                          "absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[6px] font-black",
                          isUrgent ? "bg-red-500 text-white" : "bg-slate-900 text-white"
                        )}>
                          {elapsedMin}m
                        </div>
                      )}
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-black",
                        status === 'free' ? "bg-slate-100 text-slate-400" : 
                        status === 'ready' ? "bg-amber-400 text-white" : isUrgent ? "bg-red-500 text-white" : "bg-blue-500 text-white"
                      )}>
                        {num}
                      </div>
                      <span className={cn("text-[7px] font-black uppercase tracking-wider text-center", 
                        status === 'free' ? "text-slate-300" : status === 'ready' ? "text-amber-600" : "text-blue-600"
                      )}>
                        {status === 'free' ? 'Libre' : status === 'ready' ? 'Lista' : 'Ocup'}
                      </span>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="direct" className="m-0 animate-in fade-in duration-300">
              <div className="grid grid-cols-3 gap-2">
                {menuLoading ? (
                  <div className="col-span-full py-10 text-center">
                    <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary opacity-50" />
                  </div>
                ) : filteredMenu.map(item => (
                  <Card 
                    key={item.id} 
                    className={cn(
                      "rounded-xl border-none shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-95 overflow-hidden bg-white",
                      !item.available && "opacity-50 grayscale"
                    )}
                    onClick={() => {
                      if (item.available) {
                        setSelectedProductForModifier(item)
                        setSelectedModifiers([])
                        setShowModifierModal(true)
                      }
                    }}
                  >
                    <div className="aspect-square relative overflow-hidden bg-slate-100">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300" alt={item.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Utensils className="h-6 w-6 text-slate-200" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-1.5">
                      <p className="font-black text-[7px] text-slate-800 uppercase truncate">{item.name}</p>
                      <p className="text-[8px] font-black text-primary mt-0.5">{formatCurrencyDetailed(item.price)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* PANEL DERECHO: Checkout (60%) */}
      <div className="flex-1 bg-white border-l border-slate-200 flex flex-col shadow-2xl">
        <CardHeader className="bg-slate-900 text-white shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-tighter">
                {directCart.length > 0 ? "Venta Rápida" : selectedOrder ? `Mesa ${selectedOrder.tableNumber}` : "Comanda"}
              </CardTitle>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{effectiveVenueName}</p>
            </div>
            {(directCart.length > 0 || selectedOrder) && (
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={() => { setSelectedOrder(null); setDirectCart([]) }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col bg-slate-50">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {(directCart.length === 0 && !selectedOrder) ? (
                <div className="py-16 text-center opacity-30">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4" />
                  <p className="font-black uppercase text-[9px]">Agrega productos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(directCart.length > 0 ? directCart : (selectedOrder?.items || [])).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => {
                              if (directCart.length > 0) {
                                setDirectCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))
                              }
                            }}
                            className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center"
                          >
                            <Minus className="h-3 w-3 text-slate-500" />
                          </button>
                          <span className="w-6 text-center text-[10px] font-black">{item.quantity}</span>
                          <button 
                            onClick={() => {
                              if (directCart.length > 0) {
                                setDirectCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
                              }
                            }}
                            className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center"
                          >
                            <Plus className="h-3 w-3 text-slate-500" />
                          </button>
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 uppercase truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-900">{formatCurrencyDetailed(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 bg-white border-t space-y-4 shrink-0">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              <Label htmlFor="electronic-toggle" className="text-xs font-black uppercase cursor-pointer">Factura Electrónica</Label>
            </div>
            <Switch 
              id="electronic-toggle" 
              checked={isElectronic} 
              onCheckedChange={(checked) => {
                setIsElectronic(checked)
                if (!checked) {
                  setCustomerData({ name: "", taxId: "", email: "", address: "" })
                } else {
                  setShowCustomerSearch(true)
                }
              }}
            />
          </div>
          
          {isElectronic && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-blue-600">Cliente</span>
                <button onClick={() => setShowCustomerSearch(true)} className="text-[8px] font-bold text-blue-600 underline">
                  {customerData.name ? "Cambiar" : "Buscar"}
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">{customerData.name || "Sin seleccionar"}</p>
                {customerData.taxId && <p className="text-[9px] font-black text-slate-400 uppercase">NIT: {customerData.taxId}</p>}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-black uppercase text-slate-900">Total a Pagar</span>
            <span className="text-2xl font-black text-primary">{formatCurrencyDetailed(currentTotal * 1.15)}</span>
          </div>
          
          <Button 
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20"
            disabled={currentTotal === 0 || isFinishing || (isElectronic && (!customerData.name || !customerData.taxId))}
            onClick={handleFinalizeInvoice}
          >
            {isFinishing ? <Loader2 className="animate-spin h-5 w-5" /> : "Cobrar"}
          </Button>
        </CardFooter>
      </div>

      {/* Product Modifier Modal */}
      <Dialog open={showModifierModal} onOpenChange={setShowModifierModal}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase">Agregar: {selectedProductForModifier?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Modificadores disponibles</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'sin_cebolla', label: 'Sin Cebolla' },
                { id: 'sin_tomate', label: 'Sin Tomate' },
                { id: 'sin_lechuga', label: 'Sin Lechuga' },
                { id: 'termo_medio', label: 'Término Medio' },
                { id: 'tres_cuartos', label: 'Tres Cuartos' },
                { id: 'bien_cocido', label: 'Bien Cocido' },
                { id: 'con_queso', label: 'Con Queso Extra' },
                { id: 'sin_salsa', label: 'Sin Salsa' },
              ].map(mod => (
                <button
                  key={mod.id}
                  onClick={() => {
                    setSelectedModifiers(prev => 
                      prev.includes(mod.id) 
                        ? prev.filter(m => m !== mod.id)
                        : [...prev, mod.id]
                    )
                  }}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    selectedModifiers.includes(mod.id)
                      ? "border-primary bg-primary/10"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <span className="text-xs font-black uppercase">{mod.label}</span>
                </button>
              ))}
            </div>
            {selectedModifiers.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[9px] font-black uppercase text-slate-400">Seleccionados:</p>
                <p className="text-[10px] font-bold text-slate-700 mt-1">
                  {selectedModifiers.map(m => m.replace(/_/g, ' ')).join(', ')}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 rounded-xl font-black text-xs uppercase" onClick={() => { setShowModifierModal(false); setSelectedModifiers([]) }}>
              Cancelar
            </Button>
            <Button className="flex-1 h-12 rounded-xl font-black text-xs uppercase bg-primary hover:bg-primary/90" onClick={() => {
              if (selectedProductForModifier) {
                addToDirectCart({
                  ...selectedProductForModifier,
                  modifiers: selectedModifiers
                })
              }
              setShowModifierModal(false)
              setSelectedModifiers([])
            }}>
              Agregar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Search Dialog for Electronic Invoice */}
      <Dialog open={showCustomerSearch} onOpenChange={setShowCustomerSearch}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase">Buscar Cliente (NIT)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input 
              placeholder="Buscar por nombre o NIT..." 
              value={customerSearchTerm}
              onChange={(e) => setCustomerSearchTerm(e.target.value)}
              className="h-12 rounded-xl"
            />
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {(allCustomers || []).filter(c => {
                if (!customerSearchTerm) return true
                const search = customerSearchTerm.toLowerCase()
                return (c.name || "").toLowerCase().includes(search) || (c.taxId || "").toLowerCase().includes(search)
              }).slice(0, 10).map((customer: any) => (
                <button
                  key={customer.id}
                  onClick={() => {
                    setCustomerData({
                      name: customer.name || "",
                      taxId: customer.taxId || "",
                      email: customer.email || "",
                      address: customer.address || ""
                    })
                    setShowCustomerSearch(false)
                    setCustomerSearchTerm("")
                  }}
                  className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <p className="text-sm font-bold text-slate-700">{customer.name}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase">NIT: {customer.taxId || "S/N"}</p>
                </button>
              ))}
              {(allCustomers || []).filter(c => {
                if (!customerSearchTerm) return true
                const search = customerSearchTerm.toLowerCase()
                return (c.name || "").toLowerCase().includes(search) || (c.taxId || "").toLowerCase().includes(search)
              }).length === 0 && customerSearchTerm && (
                <p className="text-center text-[10px] text-slate-400 py-4">No se encontraron clientes</p>
              )}
            </div>
            <div className="pt-2 border-t">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">O ingresa manualmente:</p>
              <div className="space-y-2">
                <Input 
                  placeholder="Nombre del cliente"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                  className="h-10 rounded-lg text-xs"
                />
                <Input 
                  placeholder="NIT/RUT"
                  value={customerData.taxId}
                  onChange={(e) => setCustomerData({...customerData, taxId: e.target.value})}
                  className="h-10 rounded-lg text-xs"
                />
                <Input 
                  placeholder="Email"
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                  className="h-10 rounded-lg text-xs"
                />
                <Input 
                  placeholder="Dirección"
                  value={customerData.address}
                  onChange={(e) => setCustomerData({...customerData, address: e.target.value})}
                  className="h-10 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 rounded-xl font-black text-xs uppercase" onClick={() => { setShowCustomerSearch(false); setCustomerSearchTerm("") }}>
              Cancelar
            </Button>
            <Button className="flex-1 h-12 rounded-xl font-black text-xs uppercase bg-primary hover:bg-primary/90" onClick={() => {
              if (customerData.name && customerData.taxId) {
                setShowCustomerSearch(false)
                setCustomerSearchTerm("")
              }
            }}>
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Table Dialog - Admin Only */}
      <Dialog open={showAddTable} onOpenChange={setShowAddTable}>
        <DialogContent className="max-w-sm rounded-2xl p-6 bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase">Agregar Mesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input 
              placeholder="Número de mesa (ej: 13)"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
              className="h-12 rounded-xl font-black text-center text-lg"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 rounded-xl font-black text-xs uppercase" onClick={() => { setShowAddTable(false); setNewTableNumber("") }}>
              Cancelar
            </Button>
            <Button className="flex-1 h-12 rounded-xl font-black text-xs uppercase bg-primary hover:bg-primary/90" onClick={handleAddTable}>
              Agregar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
