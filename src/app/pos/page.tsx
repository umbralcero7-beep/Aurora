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
  Ticket,
  Coffee,
  Pizza,
  GlassWater,
  IceCream,
  Grid,
  AlertCircle,
  DatabaseZap,
  ChevronLeft,
  MoreVertical,
  LogOut,
  ShieldCheck,
  Package,
  ArrowDownToLine,
  LayoutDashboard
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
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
  imageUrl?: string
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

  const categoryOptions = [
    { name: "TODOS", icon: Grid },
    { name: "ENTRADAS", icon: Coffee },
    { name: "PLATOS FUERTES", icon: Pizza },
    { name: "BEBIDAS", icon: GlassWater },
    { name: "POSTRES", icon: IceCream },
  ]
  
  // States
  const [activeTab, setActiveTab] = useState("direct") 
  const [menuSearch, setMenuSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("TODOS")
  const [directCart, setDirectCart] = useState<CartItem[]>([]) 
  const [selectedOrder, setSelectedOrder] = useState<any>(null) 
  const [pendingAccounts, setPendingAccounts] = useState<any[]>([])

  // Checkout Modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Datáfono' | 'Transferencia'>('Efectivo')
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

  const filteredMenu = useMemo(() => {
    if (!dbMenu) return []
    return dbMenu.filter(item => {
      const matchesSearch = item.name?.toLowerCase().includes(menuSearch.toLowerCase())
      const matchesCategory = activeCategory === "TODOS" || item.category?.toUpperCase() === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [dbMenu, menuSearch, activeCategory])

  const tableData = useMemo(() => {
    const map: Record<string, any> = {}
    activeOrders.forEach(order => { map[order.tableNumber] = order })
    return map
  }, [activeOrders])

  // Logic
  const currentTotal = useMemo(() => {
    if (directCart.length > 0) return directCart.reduce((acc, i) => acc + (i.price * i.quantity), 0) * 1.15
    if (selectedOrder) return selectedOrder.total || 0
    return 0
  }, [directCart, selectedOrder])

  const currentSubtotal = useMemo(() => {
    if (directCart.length > 0) return directCart.reduce((acc, i) => acc + (i.price * i.quantity), 0)
    if (selectedOrder) return selectedOrder.total / 1.15
    return 0
  }, [directCart, selectedOrder])

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
      return [...prev, { id: item.id, name: item.name, price: Number(item.price), quantity: 1, imageUrl: item.imageUrl }]
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
      clientName: selectedOrder?.customerName || "Venta Directa",
      items: directCart.length > 0 ? directCart : selectedOrder?.items || [],
      total: currentSubtotal,
      createdAt: Date.now()
    }
    setPendingAccounts([newAccount, ...pendingAccounts])
    setSelectedOrder(null)
    setDirectCart([])
    toast({ title: "En Espera", description: "Comanda guardada en pendientes" })
  }

  const handleFinalizePayment = async () => {
    if (!db || !effectiveBusinessId) return
    const isDirect = directCart.length > 0
    const cartToProcess = isDirect ? directCart : (selectedOrder?.items || [])
    const totalToProcess = currentTotal
    if (cartToProcess.length === 0) return

    setIsFinishing(true)
    const invoiceRef = doc(collection(db, "invoices"))
    const invoiceData = {
      id: invoiceRef.id,
      orderId: isDirect ? "direct-sale" : selectedOrder.id,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
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
      toast({ title: "Venta Exitosa", description: "El pago ha sido registrado." })
      setSelectedOrder(null)
      setDirectCart([])
      setShowCheckoutModal(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo registrar el pago" })
    } finally {
      setIsFinishing(false)
    }
  }

  if (!mounted) return null;

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden text-slate-900">
      
      {/* ═══════════════════════════════════════════════════════════
          HEADER - BLUE & WHITE THEME
      ═══════════════════════════════════════════════════════════ */}
      <header className="h-20 bg-primary border-b border-primary-foreground/10 px-6 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-md">
                <Zap className="h-6 w-6 text-primary" />
             </div>
             <div className="text-white">
               <h1 className="text-lg font-black uppercase tracking-tighter">Aurora POS</h1>
               <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{effectiveVenueName}</p>
             </div>
          </div>

          <div className="h-10 w-px bg-white/20 mx-2 hidden sm:block" />

          {/* View Switcher */}
          <div className="flex bg-white/10 p-1 rounded-xl">
             <button 
               onClick={() => setActiveTab('direct')}
               className={cn(
                 "px-6 h-10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                 activeTab === 'direct' ? "bg-white text-primary shadow-sm" : "text-white/60 hover:text-white"
               )}
             >
               Venta Rápida
             </button>
             <button 
               onClick={() => setActiveTab('tables')}
               className={cn(
                 "px-6 h-10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                 activeTab === 'tables' ? "bg-white text-primary shadow-sm" : "text-white/60 hover:text-white"
               )}
             >
               Mesas
             </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden lg:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input 
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="Buscar producto..." 
              className="w-72 h-12 bg-white/10 border border-white/20 rounded-2xl pl-12 pr-4 text-xs font-bold text-white placeholder:text-white/40 outline-none focus:bg-white/20 transition-all"
            />
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-12 w-12 rounded-2xl bg-white border-none text-primary shadow-md hover:bg-slate-50 relative">
                <Clock className="h-5 w-5" />
                {pendingAccounts.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
                    {pendingAccounts.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-white border-l border-slate-200 w-full sm:max-w-md p-0 flex flex-col">
               <div className="p-8 bg-primary text-white">
                  <SheetHeader>
                    <SheetTitle className="text-white font-black uppercase text-2xl tracking-tighter flex items-center gap-3">
                      <History className="h-6 w-6" /> Pendientes
                    </SheetTitle>
                    <SheetDescription className="text-white/60 font-bold text-[10px] uppercase">Cuentas en espera de pago</SheetDescription>
                  </SheetHeader>
               </div>
               <ScrollArea className="flex-1 p-6">
                  {pendingAccounts.length === 0 ? (
                    <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                      <ShoppingCart className="h-12 w-12" />
                      <p className="text-[12px] font-black uppercase">Sin facturas pendientes</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingAccounts.map((acc, i) => (
                        <div key={i} onClick={() => { setDirectCart(acc.items); setPendingAccounts(prev => prev.filter((_, idx) => idx !== i)) }} className="bg-slate-50 border border-slate-200 rounded-3xl p-5 hover:border-primary/40 cursor-pointer transition-all hover:bg-white group">
                          <div className="flex justify-between items-start mb-4">
                             <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-800 uppercase line-clamp-1">{acc.clientName}</span>
                                {acc.tableNumber && <Badge variant="secondary" className="mt-1 bg-primary/10 text-primary border-none text-[8px] font-black w-fit">MESA {acc.tableNumber}</Badge>}
                             </div>
                             <span className="text-[10px] font-bold text-slate-400">{new Date(acc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex justify-between items-end">
                             <p className="text-[10px] text-slate-400 font-bold uppercase">{acc.items.length} PLATOS</p>
                             <p className="text-xl font-black text-primary tracking-tighter">{formatCurrencyDetailed(acc.total * 1.15)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
               </ScrollArea>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 w-12 rounded-2xl bg-white border-none text-primary shadow-md hover:bg-slate-50">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-slate-100 shadow-2xl">
              <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-4 py-2">Administración</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push('/fiscal-control')} className="h-12 rounded-xl focus:bg-red-50 focus:text-red-600 gap-3 px-4 transition-all cursor-pointer">
                <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center"><LogOut className="h-4 w-4" /></div>
                <span className="text-[11px] font-black uppercase">Cierre de Caja (Z)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem onClick={() => router.push('/reports')} className="h-12 rounded-xl focus:bg-slate-50 gap-3 px-4 transition-all cursor-pointer">
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center"><LayoutDashboard className="h-4 w-4" /></div>
                <span className="text-[11px] font-black uppercase">Reportes Diarios</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* ═══════════════════════════════════════════════════════════
            MAIN AREA - COLOR WHITE/GRAY
        ═══════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          
          {/* Categories Bar */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex gap-4">
              {categoryOptions.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={cn(
                    "flex items-center gap-3 px-6 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                    activeCategory === cat.name 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-slate-100 border border-slate-200 text-slate-500 hover:border-primary/30"
                  )}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 p-6">
            {activeTab === 'tables' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
                {['1','2','3','4','5','6','7','8','9','10','11','12'].map(num => {
                  const order = tableData[num]
                  const hasOrder = !!order
                  return (
                    <Card 
                      key={num} 
                      onClick={() => hasOrder && (setSelectedOrder(order), setDirectCart([]))}
                      className={cn(
                        "aspect-square rounded-[2.5rem] border-2 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 group relative overflow-hidden shadow-sm hover:shadow-xl",
                        hasOrder ? "bg-white border-primary shadow-primary/10" : "bg-white border-dashed border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <span className={cn("text-4xl font-black tracking-tighter", hasOrder ? "text-primary" : "text-slate-200")}>{num}</span>
                      <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] mt-2", hasOrder ? "text-primary/60" : "text-slate-300")}>
                        {hasOrder ? 'OCUPADA' : 'LIBRE'}
                      </span>
                      {hasOrder && (
                        <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-primary animate-pulse" />
                      )}
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-8 pb-20">
                {menuLoading ? (
                  <div className="col-span-full py-40 flex flex-col items-center gap-6 opacity-30">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-[12px] font-black uppercase tracking-widest">Sincronizando Carta...</p>
                  </div>
                ) : filteredMenu.length === 0 ? (
                  <div className="col-span-full py-32 flex flex-col items-center text-center">
                    <div className="h-24 w-24 bg-primary/5 rounded-full flex items-center justify-center mb-8">
                      <Package className="h-10 w-10 text-primary/20" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-400">Sin Productos</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase mt-2 max-w-[240px]">No hay platos registrados en {activeCategory}</p>
                    <Button variant="outline" className="mt-8 border-primary text-primary font-black text-[10px] uppercase tracking-widest px-8 rounded-2xl h-14" onClick={() => router.push('/settings')}>
                      Ir a Configuración
                    </Button>
                  </div>
                ) : filteredMenu.map(item => (
                  <Card 
                    key={item.id}
                    onClick={() => item.available && addToDirectCart(item)}
                    className={cn(
                      "group bg-white rounded-[2.5rem] overflow-hidden border-none shadow-md hover:shadow-2xl hover:shadow-primary/5 transition-all cursor-pointer relative flex flex-col active:scale-95",
                      !item.available && "opacity-40 grayscale pointer-events-none"
                    )}
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-slate-50 relative">
                      <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/500/500`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                      {!item.available && <Badge className="absolute top-5 right-5 bg-red-600 text-white font-black text-[9px] uppercase">AGOTADO</Badge>}
                    </div>
                    <CardContent className="p-6">
                       <span className="text-[8px] font-black text-primary uppercase tracking-widest">{item.category}</span>
                       <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate mt-1">{item.name}</h4>
                       <div className="flex justify-between items-center mt-5">
                         <span className="text-lg font-black text-primary tracking-tighter">{formatCurrencyDetailed(item.price)}</span>
                         <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-primary transition-all shadow-sm">
                           <Plus className="h-5 w-5 text-slate-400 group-hover:text-white" />
                         </div>
                       </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            RIGHT SIDEBAR - TICKET/CART
        ═══════════════════════════════════════════════════════════ */}
        <div className="w-[450px] bg-white border-l border-slate-200 flex flex-col shadow-2xl z-20 font-body">
          
          <div className="p-8 border-b border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                  {selectedOrder ? `Mesa ${selectedOrder.tableNumber}` : "Venta Actual"}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                   <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Canal Directo</p>
                </div>
              </div>
              {(directCart.length > 0 || selectedOrder) && (
                <Button 
                  onClick={() => { setSelectedOrder(null); setDirectCart([]) }}
                  variant="ghost"
                  className="rounded-2xl h-12 w-12 text-slate-300 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 p-8">
            <div className="space-y-6">
              {(directCart.length === 0 && !selectedOrder) ? (
                <div className="py-24 flex flex-col items-center text-center opacity-10">
                   <ShoppingCart className="h-20 w-20 mb-6 text-primary" />
                   <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Esperando Selección...</p>
                </div>
              ) : (
                (directCart.length > 0 ? directCart : (selectedOrder?.items || [])).map((item: any) => (
                  <div key={item.id} className="group flex gap-5 items-center bg-slate-50/50 p-4 rounded-3xl border border-transparent hover:border-slate-100 hover:bg-white transition-all">
                    <div className="h-16 w-16 bg-white rounded-2xl overflow-hidden shadow-sm shrink-0 border border-slate-100">
                      <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/200/200`} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-xs font-black text-slate-800 uppercase truncate mb-1">{item.name}</p>
                       <p className="text-[11px] font-bold text-primary tracking-tighter">{formatCurrencyDetailed(item.price * item.quantity)}</p>
                    </div>
                    {directCart.length > 0 ? (
                       <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                          <button onClick={() => updateQuantity(item.id, -1)} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-50 transition-colors"><Minus className="h-4 w-4 text-slate-400" /></button>
                          <span className="w-8 text-center text-xs font-black text-slate-800">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-50 transition-colors"><Plus className="h-4 w-4 text-slate-400" /></button>
                       </div>
                    ) : (
                       <div className="bg-primary/5 text-primary h-10 px-4 flex items-center justify-center rounded-2xl font-black text-xs">x{item.quantity}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="p-8 bg-slate-50/50 border-t border-slate-100 rounded-t-[3rem] space-y-8">
             <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-black uppercase text-slate-400 tracking-widest">
                   <span>Resumen de Venta</span>
                   <span>Base {formatCurrencyDetailed(currentSubtotal)}</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-primary uppercase">Total a Facturar</span>
                      <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none mt-1">{formatCurrencyDetailed(currentTotal)}</span>
                   </div>
                   <Badge variant="outline" className="border-primary text-primary font-black px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest">IMPOCONSUMO 15%</Badge>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <Button 
                   disabled={directCart.length === 0 && !selectedOrder}
                   onClick={handleEnEspera}
                   variant="outline"
                   className="h-16 rounded-[1.5rem] border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-[12px] uppercase tracking-widest"
                >
                  <Clock className="h-5 w-5 mr-3" /> En Espera
                </Button>
                <Button 
                   disabled={directCart.length === 0 && !selectedOrder}
                   onClick={() => { setCashReceived(0); setShowCheckoutModal(true) }}
                   className="h-16 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white font-black text-[12px] uppercase tracking-widest shadow-xl shadow-primary/20"
                >
                  <Wallet className="h-5 w-5 mr-3" /> Cobrar Ahora
                </Button>
             </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CHECKOUT DIALOG - CLEAR BLUE THEME
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="bg-white border-none text-slate-900 max-w-xl p-0 rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.1)] font-body">
          <div className="p-10 bg-primary text-white flex items-center justify-between">
             <div className="flex items-center gap-5">
                <div className="h-16 w-16 bg-white/20 rounded-3xl flex items-center justify-center border border-white/20">
                   <Receipt className="h-8 w-8 text-white" />
                </div>
                <div>
                   <DialogTitle className="text-3xl font-black uppercase tracking-tighter">Liquidación</DialogTitle>
                   <p className="text-[10px] font-black text-white/60 uppercase tracking-widest italic leading-none mt-1">Sincronización Fiscal Aurora</p>
                </div>
             </div>
             <button onClick={() => setShowCheckoutModal(false)} className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"><X className="h-6 w-6" /></button>
          </div>

          <div className="p-10 space-y-10">
             <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-10 text-center space-y-2">
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Total Recaudado</p>
                <p className="text-7xl font-black text-primary tracking-tighter leading-tight">{formatCurrencyDetailed(currentTotal)}</p>
             </div>

             <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'Efectivo', icon: Banknote, label: 'EFECTIVO' },
                  { id: 'Datáfono', icon: CreditCard, label: 'DATÁFONO' },
                  { id: 'Transferencia', icon: Smartphone, label: 'TRANSFER.' },
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-4 h-32 rounded-[2rem] border-2 transition-all active:scale-95 shadow-sm",
                      paymentMethod === method.id 
                        ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-105" 
                        : "bg-white border-slate-100 text-slate-400 hover:border-primary/20"
                    )}
                  >
                    <method.icon className={cn("h-8 w-8", paymentMethod === method.id ? "text-white" : "text-slate-300")} />
                    <span className="text-[10px] font-black tracking-widest uppercase">{method.label}</span>
                  </button>
                ))}
             </div>

             {paymentMethod === 'Efectivo' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 animate-duration-500">
                   <div className="space-y-3 px-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billete Recibido</label>
                      <input 
                        type="number" 
                        value={cashReceived || ''} 
                        onChange={e => setCashReceived(Number(e.target.value))} 
                        placeholder="0.00"
                        className="w-full h-24 bg-slate-50 border-2 border-slate-100 text-center text-5xl font-black text-slate-900 rounded-[2rem] outline-none focus:border-primary focus:bg-white transition-all placeholder:text-slate-200"
                      />
                   </div>
                   {cashReceived > currentTotal && (
                      <div className="h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-between px-10 shadow-xl shadow-emerald-500/20">
                         <span className="text-[11px] font-black text-emerald-950 uppercase tracking-widest">Cambio Correcto</span>
                         <span className="text-4xl font-black text-emerald-950 tracking-tighter">{formatCurrencyDetailed(cashReceived - currentTotal)}</span>
                      </div>
                   )}
                </div>
             )}
          </div>

          <div className="p-10 pt-0">
             <Button 
               disabled={isFinishing || (paymentMethod === 'Efectivo' && cashReceived < currentTotal)}
               onClick={handleFinalizePayment}
               className="w-full h-20 bg-primary hover:bg-primary/90 text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 group"
             >
                {isFinishing ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                    FINALIZAR Y FACTURAR
                  </div>
                )}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}