"use client"

import { isSuperUser } from '@/lib/constants';
import { useState, useMemo, useEffect } from "react"
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
  Plus,
  Minus,
  Trash2,
  Zap,
  ShoppingBag,
  Clock,
  Wallet,
  Utensils,
  LayoutGrid,
  ChevronRight,
  History,
  ArrowRight,
  CreditCard as CardIcon,
  Ticket
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, where, doc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { useRouter } from "next/navigation"

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

  useEffect(() => {
    setMounted(true)
  }, [])

  const categories = ["TODOS", "ENTRADAS", "PLATOS FUERTES", "BEBIDAS", "POSTRES"]
  
  // States
  const [activeTab, setActiveTab] = useState("direct") 
  const [menuSearch, setMenuSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("TODOS")
  const [directCart, setDirectCart] = useState<CartItem[]>([]) 
  const [selectedOrder, setSelectedOrder] = useState<any>(null) 
  const [pendingAccounts, setPendingAccounts] = useState<any[]>([])

  // Checkout Modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo')
  const [cashReceived, setCashReceived] = useState<number>(0)
  const [isFinishing, setIsFinishing] = useState(false)

  // Database Access
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

  const activeOrders = useMemo(() => {
    if (!allOrders) return []
    return allOrders.filter(o => ["Open", "Preparing", "Ready"].includes(o.status))
  }, [allOrders])

  const filteredMenu = (dbMenu || []).filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(menuSearch.toLowerCase())
    const matchesCategory = activeCategory === "TODOS" || item.category?.toUpperCase() === activeCategory
    return matchesSearch && matchesCategory
  })

  const tableData = useMemo(() => {
    const map: Record<string, any> = {}
    activeOrders.forEach(order => { map[order.tableNumber] = order })
    return map
  }, [activeOrders])

  // Logic
  const currentTotal = directCart.length > 0 
    ? directCart.reduce((acc, i) => acc + (i.price * i.quantity), 0) * 1.15 
    : (selectedOrder?.total || 0)

  const currentSubtotal = directCart.length > 0 
    ? directCart.reduce((acc, i) => acc + (i.price * i.quantity), 0)
    : (selectedOrder?.total / 1.15 || 0)

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
      customerName: "Consumidor Final",
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
    } catch (err) {
      console.error(err)
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la transacción" })
    } finally {
      setIsFinishing(false)
    }
  }

  if (!mounted) return null;

  return (
    <div className="h-screen bg-[#070B14] flex flex-col md:flex-row overflow-hidden text-slate-200 font-sans">
      
      {/* ═══════════════════════════════════════════════════════════
          CENTRAL PANEL - CATALOG & TOOLS (70%)
      ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
        
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter text-white">Terminal Aurora</h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{effectiveVenueName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input 
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="Buscar producto..." 
                className="w-full h-10 bg-slate-900/50 border border-slate-800 rounded-xl pl-10 pr-4 text-xs font-bold focus:border-primary outline-none transition-all"
              />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-10 rounded-xl border-slate-800 bg-slate-900/50 text-slate-400 group">
                  <History className="h-4 w-4 mr-2 group-hover:text-primary transition-colors" />
                  <span className="hidden sm:inline">Espera</span>
                  {pendingAccounts.length > 0 && <Badge className="ml-2 bg-primary h-4 min-w-[1rem] p-0 flex items-center justify-center">{pendingAccounts.length}</Badge>}
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-[#0A0F1A] border-slate-800 text-white w-full sm:max-w-md">
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-white font-black uppercase tracking-tight flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" /> Cuentas en Espera
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] pr-4">
                  <div className="space-y-3">
                    {pendingAccounts.length === 0 ? (
                      <div className="py-20 text-center opacity-20">
                        <Ticket className="h-12 w-12 mx-auto mb-4" />
                        <p className="text-xs font-bold uppercase">Sin pendientes</p>
                      </div>
                    ) : (
                      pendingAccounts.map((acc, i) => (
                        <Card key={i} className="bg-slate-900/50 border-slate-800 p-4 hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => {
                          setDirectCart(acc.items)
                          setPendingAccounts(prev => prev.filter((_, idx) => idx !== i))
                        }}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-black text-white uppercase">{acc.clientName} {acc.tableNumber && `• Mesa ${acc.tableNumber}`}</span>
                            <span className="text-[10px] font-bold text-slate-500">{new Date(acc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{acc.items.length} items</p>
                            <p className="text-sm font-black text-primary">{formatCurrencyDetailed(acc.total * 1.15)}</p>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* View Switcher & Categories */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-slate-900/50 border border-slate-800 p-1 rounded-2xl shrink-0">
            <TabsList className="bg-transparent h-10 gap-1">
              <TabsTrigger value="direct" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white h-full px-6 transition-all">
                <ShoppingBag className="h-3 w-3 mr-2" /> Venta Rápida
              </TabsTrigger>
              <TabsTrigger value="tables" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white h-full px-6 transition-all">
                <LayoutGrid className="h-3 w-3 mr-2" /> Mesas
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                    activeCategory === cat 
                      ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Grid Area */}
        <ScrollArea className="flex-1 bg-slate-900/20 rounded-[2rem] border border-slate-800/50 p-6">
          {activeTab === 'tables' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {['1','2','3','4','5','6','7','8','9','10','11','12'].map(num => {
                const order = tableData[num]
                const hasOrder = !!order
                return (
                  <Card 
                    key={num} 
                    className={cn(
                      "aspect-square rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all cursor-pointer border-2 group relative overflow-hidden",
                      hasOrder 
                        ? "bg-primary/10 border-primary/50 shadow-lg shadow-primary/10" 
                        : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                    )}
                    onClick={() => {
                      if (hasOrder) {
                        setSelectedOrder(order)
                        setDirectCart([])
                      }
                    }}
                  >
                    <div className={cn("text-3xl font-black", hasOrder ? "text-primary" : "text-white/20")}>{num}</div>
                    <span className={cn("text-[9px] font-black uppercase tracking-widest", hasOrder ? "text-primary/70" : "text-slate-600")}>
                      {hasOrder ? 'Ocupada' : 'Libre'}
                    </span>
                    {hasOrder && <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />}
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {menuLoading ? (
                <div className="col-span-full py-20 flex flex-col items-center opacity-30">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-[10px] font-black uppercase">Sincronizando Carta...</p>
                </div>
              ) : filteredMenu.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center opacity-10">
                  <Utensils className="h-16 w-16 mb-4" />
                  <p className="text-[10px] font-black uppercase">Sin Coincidencias</p>
                </div>
              ) : filteredMenu.map(item => (
                <Card 
                  key={item.id}
                  onClick={() => item.available && addToDirectCart(item)}
                  className={cn(
                    "flex flex-col bg-[#0F172A] border-slate-800/80 rounded-[1.5rem] overflow-hidden group cursor-pointer hover:border-primary/50 hover:shadow-2xl transition-all relative active:scale-95",
                    !item.available && "opacity-40 grayscale pointer-events-none"
                  )}
                >
                  <div className="aspect-[4/3] bg-slate-800 relative overflow-hidden">
                    <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/400/300`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-[11px] font-black uppercase truncate">{item.name}</p>
                      <p className="text-[9px] font-bold text-slate-300 opacity-60 uppercase truncate">{item.category}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900/80 flex justify-between items-center">
                    <span className="text-sm font-black text-primary">{formatCurrencyDetailed(item.price)}</span>
                    <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary transition-colors">
                      <Plus className="h-4 w-4 text-primary group-hover:text-white" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          RIGHT PANEL - ORDER / CART (30%)
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full md:w-[380px] bg-[#0A0F1A] border-l border-slate-800/50 flex flex-col shadow-2xl z-10 font-body">
        
        {/* Order Header */}
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                {selectedOrder ? `Mesa ${selectedOrder.tableNumber}` : "Venta Rápida"}
              </h2>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nueva Comanda</p>
            </div>
            {(directCart.length > 0 || selectedOrder) && (
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-slate-600 hover:text-white hover:bg-slate-800" onClick={() => { setSelectedOrder(null); setDirectCart([]) }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Order Items */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {(directCart.length === 0 && !selectedOrder) ? (
              <div className="py-20 flex flex-col items-center opacity-10">
                <ShoppingCart className="h-16 w-16 mb-4" />
                <p className="text-xs font-black uppercase">Carrito Vacío</p>
              </div>
            ) : (
              (directCart.length > 0 ? directCart : (selectedOrder?.items || [])).map((item: any) => (
                <div key={item.id} className="flex gap-4 items-center animate-in slide-in-from-right-4">
                  <div className="h-12 w-12 bg-slate-800 rounded-xl overflow-hidden shrink-0 shadow-lg">
                    <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100/100`} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white uppercase truncate">{item.name}</p>
                    <p className="text-[10px] font-bold text-primary">{formatCurrencyDetailed(item.price * item.quantity)}</p>
                  </div>
                  {directCart.length > 0 && (
                    <div className="flex items-center gap-3 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                      <button onClick={() => updateQuantity(item.id, -1)} className="h-6 w-6 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-colors"><Minus className="h-3 w-3 text-slate-400" /></button>
                      <span className="text-[11px] font-black text-white w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="h-6 w-6 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-colors"><Plus className="h-3 w-3 text-slate-400" /></button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Totals & Primary Actions */}
        <div className="p-6 bg-slate-900/30 border-t border-slate-800/50 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
              <span>Subtotal</span>
              <span>{formatCurrencyDetailed(currentSubtotal)}</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
              <span>Impuestos (15%)</span>
              <span>{formatCurrencyDetailed(currentTotal - currentSubtotal)}</span>
            </div>
            <div className="flex justify-between items-end pt-2">
              <span className="text-xs font-black text-white uppercase">Total</span>
              <span className="text-3xl font-black text-white tracking-tighter">{formatCurrencyDetailed(currentTotal)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              disabled={directCart.length === 0 && !selectedOrder}
              onClick={handleEnEspera}
              className="h-14 rounded-2xl bg-[#CC8822] hover:bg-[#B1761E] text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-orange-950/20"
            >
              <Clock className="h-4 w-4 mr-2" /> Espera
            </Button>
            <Button 
              disabled={directCart.length === 0 && !selectedOrder}
              onClick={() => {
                setCashReceived(0)
                setShowCheckoutModal(true)
              }}
              className="h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20"
            >
              <Wallet className="h-4 w-4 mr-2" /> Cobrar
            </Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CHECKOUT DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="bg-[#0A0F1A] border-slate-800 text-white max-w-lg rounded-[2.5rem] p-0 overflow-hidden shadow-2xl font-body">
          <div className="p-8 bg-slate-900 flex justify-between items-center border-b border-slate-800/50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/20">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight">Finalizar Venta</DialogTitle>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocolo de Facturación</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="flex flex-col items-center justify-center py-6 bg-slate-900/50 rounded-[2rem] border border-slate-800/50 group">
              <p className="text-[10px] font-black text-slate-500 uppercase italic">Total a Recaudar</p>
              <p className="text-5xl font-black text-white mt-2 group-hover:scale-110 transition-transform duration-300">{formatCurrencyDetailed(currentTotal)}</p>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Método de Recaudo</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'Efectivo', icon: Banknote, label: 'Efectivo', color: 'emerald' },
                  { id: 'Tarjeta', icon: CardIcon, label: 'Tarjeta', color: 'blue' },
                  { id: 'Transferencia', icon: Smartphone, label: 'Transf.', color: 'purple' },
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all active:scale-95",
                      paymentMethod === method.id
                        ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10"
                        : "bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700"
                    )}
                  >
                    <method.icon className="h-6 w-6" />
                    <span className="text-[10px] font-black uppercase tracking-tight">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'Efectivo' && (
              <div className="space-y-4 animate-in slide-in-from-top-4">
                <Input 
                  type="number" 
                  value={cashReceived || ''} 
                  onChange={e => setCashReceived(Number(e.target.value))} 
                  placeholder="Monto recibido..."
                  className="h-20 bg-emerald-500/5 border-emerald-500/20 text-center text-4xl font-black text-emerald-500 rounded-2xl focus:border-emerald-500 transition-all"
                />
                {cashReceived > currentTotal && (
                  <div className="bg-emerald-500 p-4 rounded-xl flex justify-between items-center shadow-lg shadow-emerald-500/20">
                    <span className="text-[10px] font-black text-emerald-950 uppercase tracking-widest">Cambio para entregar</span>
                    <span className="text-2xl font-black text-emerald-950">{formatCurrencyDetailed(cashReceived - currentTotal)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="p-8 bg-slate-900/50 border-t border-slate-800/50">
            <Button 
               disabled={isFinishing || (paymentMethod === 'Efectivo' && cashReceived < currentTotal)}
               onClick={handleFinalizePayment}
               className="w-full h-16 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 group"
            >
              {isFinishing ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-3 group-hover:scale-125 transition-transform" /> 
                  Confirmar y Generar Factura
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}