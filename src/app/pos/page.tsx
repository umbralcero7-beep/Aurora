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
  PlusCircle,
  Clock,
  Bell,
  Pause,
  Play,
  Settings,
  GripHorizontal,
  ScanLine,
  WalletCards,
  Building2,
  Users,
  BarChart3,
  TrendingDown,
  ArrowDownLeft,
  Clock3
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet"
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

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

type NavSection = 'pos' | 'tables' | 'reports' | 'settings'

export default function POSPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const router = useRouter()
  
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const categories = ["TODOS", "ENTRADAS", "PLATOS FUERTES", "BEBIDAS", "POSTRES"]
  
  // Navigation
  const [activeNav, setActiveNav] = useState<NavSection>('pos')

  // Panel Izquierdo - Catálogo
  const [activeTab, setActiveTab] = useState("direct") 
  const [menuSearch, setMenuSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("TODOS")

  // Panel Central - Comanda
  const [selectedOrder, setSelectedOrder] = useState<any>(null) 
  const [directCart, setDirectCart] = useState<CartItem[]>([]) 
  
  // Panel Derecho - Cuentas en espera
  const [pendingAccounts, setPendingAccounts] = useState<any[]>([])
  const [selectedPendingAccount, setSelectedPendingAccount] = useState<any>(null)

  // Checkout Modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo')
  const [cashReceived, setCashReceived] = useState<number>(0)
  const [isFinishing, setIsFinishing] = useState(false)

  // Customer Data para factura electrónica
  const [customerData, setCustomerData] = useState({
    name: "",
    taxId: "",
    email: "",
    address: ""
  })
  const [isElectronic, setIsElectronic] = useState(false)

  // Modifier Modal
  const [showModifierModal, setShowModifierModal] = useState(false)
  const [selectedProductForModifier, setSelectedProductForModifier] = useState<any>(null)
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([])

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

  const { data: allInvoices } = useCollection(invoicesQuery)

  const activeOrders = useMemo(() => {
    if (!allOrders) return []
    return allOrders.filter(o => ["Open", "Preparing", "Ready"].includes(o.status))
  }, [allOrders])

  const activeMenu = dbMenu || [];

  const filteredMenu = activeMenu.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(menuSearch.toLowerCase())
    const matchesCategory = activeCategory === "TODOS" || item.category?.toUpperCase() === activeCategory
    return matchesSearch && matchesCategory
  })

  const tableData = useMemo(() => {
    const map: Record<string, any> = {}
    activeOrders.forEach(order => { map[order.tableNumber] = order })
    return map
  }, [activeOrders])

  const isAdmin = profile?.role === 'ADMIN' || isSuper

  const currentTotal = directCart.length > 0 
    ? directCart.reduce((acc, i) => acc + (i.price * i.quantity), 0) * 1.15 
    : (selectedOrder?.total || 0)

  const currentSubtotal = directCart.length > 0 
    ? directCart.reduce((acc, i) => acc + (i.price * i.quantity), 0)
    : 0

  // Funciones
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
    toast({ title: "+1", description: item.name, duration: 500 })
  }

  const updateQuantity = (itemId: string, delta: number) => {
    setDirectCart(prev => prev.map(i => {
      if (i.id === itemId) {
        const newQty = Math.max(0, i.quantity + delta)
        return newQty === 0 ? null : { ...i, quantity: newQty }
      }
      return i
    }).filter(Boolean) as CartItem[])
  }

  const handleEnEspera = () => {
    if (directCart.length === 0 && !selectedOrder) return
    
    const newAccount = {
      id: `pending_${Date.now()}`,
      tableNumber: selectedOrder?.tableNumber || null,
      clientName: selectedOrder?.customerName || "Cliente",
      items: directCart.length > 0 ? directCart : selectedOrder?.items || [],
      total: currentSubtotal,
      createdAt: Date.now()
    }
    
    setPendingAccounts([...pendingAccounts, newAccount])
    setSelectedOrder(null)
    setDirectCart([])
    toast({ title: "En Espera", description: "Comanda movida a cuentas pendientes" })
  }

  const handleCobrar = () => {
    if (directCart.length === 0 && !selectedOrder) {
      toast({ variant: "destructive", title: "Caja Vacía", description: "Selecciona productos primero" })
      return
    }
    setCashReceived(0)
    setShowCheckoutModal(true)
  }

  const selectPendingAccount = (account: any) => {
    setSelectedPendingAccount(account)
    setSelectedOrder(null)
    if (account.items) {
      setDirectCart(account.items)
    }
    setPendingAccounts(prev => prev.filter(p => p.id !== account.id))
    toast({ title: "Comanda retomada", description: account.tableNumber ? `Mesa ${account.tableNumber}` : "Venta directa" })
  }

  const handleFinalizePayment = async () => {
    if (!db || !effectiveBusinessId) return

    const isDirect = directCart.length > 0
    const cartToProcess = isDirect ? directCart : (selectedOrder?.items || [])
    const totalToProcess = currentTotal

    if (cartToProcess.length === 0) return

    setIsFinishing(true)
    
    const invoiceRef = doc(collection(db, "invoices"))
    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;

    const invoiceData = {
      id: invoiceRef.id,
      orderId: isDirect ? "direct-sale" : selectedOrder.id,
      orderNumber: isDirect ? `DIR-${Date.now().toString().slice(-4)}` : (selectedOrder?.orderNumber || 'S/N'),
      invoiceNumber: invoiceNum,
      tableNumber: isDirect ? "PARA LLEVAR" : selectedOrder?.tableNumber,
      customerName: isElectronic ? customerData.name : "Consumidor Final",
      customerTaxId: isElectronic ? customerData.taxId : "S/N",
      customerEmail: isElectronic ? customerData.email : "",
      isElectronic: isElectronic,
      items: cartToProcess,
      subtotal: totalToProcess / 1.15,
      tax: totalToProcess - (totalToProcess / 1.15),
      total: totalToProcess,
      paymentMethod: paymentMethod,
      timestamp: new Date().toISOString(),
      businessId: effectiveBusinessId,
      venueId: effectiveBusinessId,
      assignedVenue: effectiveVenueName,
      cashierName: (profile?.displayName || user?.email?.split('@')[0] || 'CAJERO').toUpperCase()
    }

    try {
      await setDoc(invoiceRef, invoiceData)
      toast({ title: "✓ Pago Confirmado", description: `Total: ${formatCurrencyDetailed(totalToProcess)}` })
      
      setSelectedOrder(null)
      setDirectCart([])
      setShowCheckoutModal(false)
      setCustomerData({ name: "", taxId: "", email: "", address: "" })
      setIsElectronic(false)
    } catch (err) {
      console.error(err)
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la transacción" })
    } finally {
      setIsFinishing(false)
    }
  }

  const change = paymentMethod === 'Efectivo' ? Math.max(0, cashReceived - currentTotal) : 0

  // Render del componente
  return (
    <div className="h-screen bg-[#0B1220] flex overflow-hidden text-slate-200 font-sans">
      {/* ═══════════════════════════════════════════════════════════
          1. SIDEBAR IZQUIERDO - NAVEGACIÓN
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-[70px] bg-[#0B1220] flex flex-col items-center py-6 border-r border-slate-800/50">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-black text-lg">A</span>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col gap-2 w-full px-2">
          <button
            onClick={() => setActiveNav('pos')}
            className={cn(
              "w-full aspect-square rounded-xl flex items-center justify-center transition-all relative group",
              activeNav === 'pos' ? "bg-[#2563EB] text-white shadow-lg shadow-blue-500/30" : "hover:bg-slate-800 text-slate-400"
            )}
          >
            <Receipt className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-[10px] font-bold uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Ventas
            </span>
          </button>

          <button
            onClick={() => setActiveNav('tables')}
            className={cn(
              "w-full aspect-square rounded-xl flex items-center justify-center transition-all relative group",
              activeNav === 'tables' ? "bg-[#2563EB] text-white shadow-lg shadow-blue-500/30" : "hover:bg-slate-800 text-slate-400"
            )}
          >
            <Utensils className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-[10px] font-bold uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Mesas
            </span>
          </button>

          <button
            onClick={() => setActiveNav('reports')}
            className={cn(
              "w-full aspect-square rounded-xl flex items-center justify-center transition-all relative group",
              activeNav === 'reports' ? "bg-[#2563EB] text-white shadow-lg shadow-blue-500/30" : "hover:bg-slate-800 text-slate-400"
            )}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-[10px] font-bold uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Reportes
            </span>
          </button>

          <button
            onClick={() => setActiveNav('settings')}
            className={cn(
              "w-full aspect-square rounded-xl flex items-center justify-center transition-all relative group",
              activeNav === 'settings' ? "bg-[#2563EB] text-white shadow-lg shadow-blue-500/30" : "hover:bg-slate-800 text-slate-400"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-[10px] font-bold uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Configuración
            </span>
          </button>
        </nav>

        {/* Nueva Venta - Floating Button */}
        <button
          onClick={() => { setSelectedOrder(null); setDirectCart([]) }}
          className="mt-auto w-12 h-12 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          2. PANEL CENTRO - CATÁLOGO DE PRODUCTOS (70%)
      ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col bg-[#111827] border-r border-slate-800/50">
        {/* Header con Tabs y Buscador */}
        <div className="p-4 border-b border-slate-800/50 space-y-4">
          {/* Tabs Mesas / Venta */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('tables')}
              className={cn(
                "px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all",
                activeTab === 'tables' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              Mesas
            </button>
            <button
              onClick={() => setActiveTab('direct')}
              className={cn(
                "px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all",
                activeTab === 'direct' ? "bg-[#2563EB] text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-white"
              )}
            >
              Venta
            </button>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full h-12 pl-12 pr-4 bg-[#1F2937] border-2 border-transparent focus:border-[#2563EB] rounded-xl text-sm font-medium placeholder:text-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Categorías Pills */}
        <div className="px-4 py-3 border-b border-slate-800/50 flex gap-2 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all",
                activeCategory === cat 
                  ? "bg-[#2563EB] text-white shadow-md" 
                  : "bg-[#1F2937] text-slate-400 hover:bg-slate-700 hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid de Productos */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'tables' ? (
            /* Vista de Mesas */
            <div className="grid grid-cols-3 gap-3">
              {['1','2','3','4','5','6','7','8','9','10','11','12'].map(num => {
                const order = tableData[num]
                const hasOrder = !!order
                return (
                  <button
                    key={num}
                    onClick={() => {
                      if (hasOrder) {
                        setSelectedOrder(order)
                        setDirectCart([])
                      }
                    }}
                    className={cn(
                      "aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                      hasOrder 
                        ? "bg-[#1E3A5F] border-2 border-[#2563EB]/50" 
                        : "bg-[#1F2937] border-2 border-slate-700/50 hover:border-slate-600"
                    )}
                  >
                    <span className="text-2xl font-black text-white">{num}</span>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-wider",
                      hasOrder ? "text-[#2563EB]" : "text-slate-500"
                    )}>
                      {hasOrder ? 'Ocupada' : 'Libre'}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            /* Vista de Productos */
            <div className="grid grid-cols-3 gap-3">
              {menuLoading ? (
                <div className="col-span-full py-20 text-center">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#2563EB]" />
                  <p className="mt-2 text-[10px] font-bold text-slate-500 uppercase">Cargando...</p>
                </div>
              ) : filteredMenu.length === 0 ? (
                <div className="col-span-full py-20 text-center opacity-40">
                  <Utensils className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-[10px] font-bold uppercase">Sin productos</p>
                </div>
              ) : filteredMenu.map(item => (
                <button
                  key={item.id}
                  onClick={() => item.available && addToDirectCart(item)}
                  disabled={!item.available}
                  className={cn(
                    "group relative bg-[#1F2937] rounded-2xl overflow-hidden transition-all active:scale-95 hover:shadow-xl hover:shadow-black/30",
                    !item.available && "opacity-50 grayscale"
                  )}
                >
                  {/* Imagen */}
                  <div className="aspect-square bg-slate-800 relative overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Utensils className="w-8 h-8 text-slate-600" />
                      </div>
                    )}
                    {!item.available && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-[8px] font-black uppercase text-red-400">Agotado</span>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-2 text-center">
                    <p className="text-[9px] font-black uppercase text-white truncate">{item.name}</p>
                    <p className="text-[10px] font-bold text-[#2563EB] mt-0.5">{formatCurrencyDetailed(item.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          3. PANEL COMANDA - CENTRO (15%)
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-[320px] bg-[#0F172A] flex flex-col border-r border-slate-800/50">
        {/* Header Comanda */}
        <div className="p-4 border-b border-slate-800/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase text-white tracking-tight">
                {selectedOrder ? `Mesa ${selectedOrder.tableNumber}` : directCart.length > 0 ? "Venta Rápida" : "Comanda"}
              </h2>
              <p className="text-[9px] font-medium text-slate-400 mt-0.5">{effectiveVenueName}</p>
            </div>
            {(directCart.length > 0 || selectedOrder) && (
              <button
                onClick={() => { setSelectedOrder(null); setDirectCart([]) }}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {(directCart.length === 0 && !selectedOrder) ? (
            <div className="py-16 text-center opacity-30">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2" />
              <p className="text-[10px] font-bold uppercase">Agrega productos</p>
            </div>
          ) : (
            (directCart.length > 0 ? directCart : (selectedOrder?.items || [])).map((item: any) => (
              <div key={item.id} className="bg-[#1F2937] rounded-xl p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">{item.name}</p>
                  <p className="text-[10px] font-black text-[#2563EB]">{formatCurrencyDetailed(item.price * item.quantity)}</p>
                </div>
                {/* Controles de cantidad */}
                {directCart.length > 0 && (
                  <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-2 py-1">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 transition-colors"
                    >
                      <Minus className="w-3 h-3 text-slate-400" />
                    </button>
                    <span className="w-5 text-center text-[11px] font-black text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Total y Botones */}
        <div className="p-4 border-t border-slate-800/50 space-y-3">
          <div className="text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Total</p>
            <p className="text-3xl font-black text-white">{formatCurrencyDetailed(currentTotal)}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Botón En Espera */}
            <button
              onClick={handleEnEspera}
              disabled={directCart.length === 0 && !selectedOrder}
              className="h-14 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Clock3 className="w-4 h-4" />
              En Espera
            </button>

            {/* Botón Cobrar */}
            <button
              onClick={handleCobrar}
              disabled={directCart.length === 0 && !selectedOrder}
              className="h-14 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 transition-all"
            >
              <Wallet className="w-4 h-4" />
              Cobrar
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          4. PANEL DERECHO - CUENTAS EN ESPERA (15%)
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-[280px] bg-[#0F172A] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black uppercase text-white tracking-tight">Cuentas en Espera</h2>
            <p className="text-[9px] font-medium text-slate-400 mt-0.5">{pendingAccounts.length} cuentas</p>
          </div>
          {pendingAccounts.length > 0 && (
            <button
              onClick={() => setPendingAccounts([])}
              className="text-[10px] font-bold text-slate-500 hover:text-white uppercase"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Lista de Cuentas */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {pendingAccounts.length === 0 ? (
            <div className="py-12 text-center opacity-30">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p className="text-[10px] font-bold uppercase">Sin cuentas pendientes</p>
            </div>
          ) : (
            pendingAccounts.map(account => {
              const elapsed = Math.floor((Date.now() - account.createdAt) / 60000)
              return (
                <button
                  key={account.id}
                  onClick={() => selectPendingAccount(account)}
                  className="w-full bg-[#1F2937] hover:bg-[#374151] rounded-xl p-3 text-left transition-all active:scale-95"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black text-white uppercase">
                      {account.tableNumber ? `Mesa ${account.tableNumber}` : account.clientName || 'Cliente'}
                    </span>
                    <span className={cn(
                      "text-[8px] font-bold px-2 py-0.5 rounded-full",
                      elapsed > 15 ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-400"
                    )}>
                      {elapsed}m
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 line-clamp-1">
                    {account.items?.length || 0} productos
                  </p>
                  <p className="text-[12px] font-black text-[#2563EB] mt-1">
                    {formatCurrencyDetailed(account.total || 0)}
                  </p>
                </button>
              )
            })
          )}
        </div>

        {/* Botón Cobrar Selección */}
        {pendingAccounts.length > 0 && (
          <div className="p-4 border-t border-slate-800/50">
            <button
              onClick={() => {
                if (pendingAccounts.length > 0) {
                  selectPendingAccount(pendingAccounts[0])
                }
              }}
              className="w-full h-12 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-[11px] uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all"
            >
              Cobrar Selección
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          5. MODAL DE COBRO
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="bg-[#0F172A] border-slate-800 text-white max-w-md rounded-3xl">
          <DialogHeader className="border-b border-slate-800 pb-4">
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center justify-between">
              Cobrar Comanda
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Total a Cobrar */}
            <div className="text-center py-4 bg-[#1F2937] rounded-2xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total a Cobrar</p>
              <p className="text-4xl font-black text-white mt-1">{formatCurrencyDetailed(currentTotal)}</p>
            </div>

            {/* Métodos de Pago */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Efectivo', icon: Banknote, label: 'Efectivo' },
                { id: 'Tarjeta', icon: CreditCard, label: 'Tarjeta' },
                { id: 'Transferencia', icon: Smartphone, label: 'Transferencia' },
              ].map(method => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={cn(
                    "p-4 rounded-xl flex flex-col items-center gap-2 transition-all border-2",
                    paymentMethod === method.id
                      ? "bg-[#2563EB] border-[#2563EB] shadow-lg shadow-blue-500/30"
                      : "bg-[#1F2937] border-transparent hover:border-slate-600"
                  )}
                >
                  <method.icon className={cn("w-6 h-6", paymentMethod === method.id ? "text-white" : "text-slate-400")} />
                  <span className={cn("text-[10px] font-bold uppercase", paymentMethod === method.id ? "text-white" : "text-slate-400")}>
                    {method.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Si es Efectivo - Mostrar Input de Recibido */}
            {paymentMethod === 'Efectivo' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Recibido</label>
                <input
                  type="number"
                  value={cashReceived || ''}
                  onChange={(e) => setCashReceived(Number(e.target.value))}
                  placeholder="0"
                  className="w-full h-14 bg-[#1F2937] border-2 border-slate-700 rounded-xl text-center text-2xl font-black text-white placeholder:text-slate-600 focus:border-[#2563EB] outline-none"
                />
                {cashReceived > 0 && (
                  <div className="flex justify-between items-center p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Vuelto</span>
                    <span className="text-lg font-black text-emerald-400">{formatCurrencyDetailed(change)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-800 pt-4">
            <button
              onClick={handleFinalizePayment}
              disabled={isFinishing || (paymentMethod === 'Efectivo' && cashReceived < currentTotal)}
              className="w-full h-14 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl font-black text-[12px] uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isFinishing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Confirmar Pago
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}