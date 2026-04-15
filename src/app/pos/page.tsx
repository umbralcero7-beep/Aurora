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
  Ticket,
  Coffee,
  Pizza,
  GlassWater,
  IceCream,
  Grid,
  AlertCircle,
  DatabaseZap,
  ChevronLeft
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
    toast({ title: "En Espera", description: "Comanda movida a lista de pendientes" })
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
      toast({ title: "✓ Pago Confirmado", description: `Referencia: ${invoiceNum}` })
      setSelectedOrder(null)
      setDirectCart([])
      setShowCheckoutModal(false)
    } catch (err) {
      console.error(err)
      toast({ variant: "destructive", title: "Error Fatal", description: "No se pudo sincronizar la venta" })
    } finally {
      setIsFinishing(false)
    }
  }

  if (!mounted) return null;

  return (
    <div className="h-screen bg-[#07080C] text-slate-200 flex flex-col font-sans overflow-hidden">
      
      {/* ═══ Header Ultrafino ═══ */}
      <div className="h-14 bg-white/5 border-b border-white/5 px-6 flex items-center justify-between backdrop-blur-3xl shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/20">
                <Zap className="h-4 w-4 text-primary" />
             </div>
             <div className="hidden sm:block">
               <h1 className="text-sm font-black uppercase tracking-tighter text-white">Aurora Terminal</h1>
               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{effectiveVenueName}</p>
             </div>
          </div>

          <div className="h-8 w-px bg-white/5 mx-2" />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-transparent">
            <TabsList className="bg-white/5 p-1 rounded-xl h-9">
              <TabsTrigger value="direct" className="rounded-lg font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-950 h-full px-4 transition-all">
                Venta Directa
              </TabsTrigger>
              <TabsTrigger value="tables" className="rounded-lg font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-950 h-full px-4 transition-all">
                Salón (Mesas)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="Buscar en la carta..." 
              className="w-48 xl:w-64 h-9 bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 text-[10px] font-bold outline-none focus:border-primary/50 transition-all placeholder:text-slate-600"
            />
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-9 rounded-xl border-white/10 bg-white/5 text-slate-400">
                <Clock className="h-3 w-3 mr-2 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest">Pendientes</span>
                {pendingAccounts.length > 0 && <span className="ml-2 bg-primary text-white text-[8px] px-1.5 rounded-full">{pendingAccounts.length}</span>}
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-[#0A0B10]/95 backdrop-blur-xl border-white/10 text-white w-full sm:max-w-md p-0">
               <div className="p-8 border-b border-white/5">
                  <SheetTitle className="text-white font-black uppercase tracking-tighter flex items-center gap-3">
                    <History className="h-5 w-5 text-primary" /> Cuentas en Espera
                  </SheetTitle>
               </div>
               <ScrollArea className="h-[calc(100vh-100px)] p-6">
                  {pendingAccounts.length === 0 ? (
                    <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
                      <Ticket className="h-10 w-10" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Pista Limpia</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingAccounts.map((acc, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-primary/50 cursor-pointer transition-all group" onClick={() => {
                          setDirectCart(acc.items)
                          setPendingAccounts(prev => prev.filter((_, idx) => idx !== i))
                        }}>
                          <div className="flex justify-between items-start mb-2">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white uppercase">{acc.clientName}</span>
                                {acc.tableNumber && <Badge variant="secondary" className="mt-1 bg-primary/10 text-primary border-none text-[8px] font-black">Mesa {acc.tableNumber}</Badge>}
                             </div>
                             <span className="text-[8px] font-bold text-slate-500">{new Date(acc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex justify-between items-end mt-4">
                             <p className="text-[9px] text-slate-500 font-bold uppercase">{acc.items.length} PLATOS</p>
                             <p className="text-lg font-black text-primary tracking-tighter">{formatCurrencyDetailed(acc.total * 1.15)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
               </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* ═══ Barra de Categorías (Ultra-Slim) ═══ */}
        <div className="w-16 bg-white/5 border-r border-white/5 flex flex-col items-center py-6 gap-6 shrink-0 z-20">
          {categoryOptions.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={cn(
                "group relative flex flex-col items-center justify-center p-2 rounded-xl transition-all",
                activeCategory === cat.name ? "bg-primary text-white shadow-xl shadow-primary/20" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              <cat.icon className="h-5 w-5" />
              <span className="absolute left-full ml-4 px-3 py-1.5 bg-[#1F2937] text-white text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all scale-95 group-hover:scale-100 z-50 shadow-2xl">
                {cat.name}
              </span>
            </button>
          ))}
          <div className="mt-auto flex flex-col gap-4">
               <button onClick={() => router.push('/settings')} className="p-2 text-slate-600 hover:text-white transition-colors"><Settings className="h-4 w-4" /></button>
          </div>
        </div>

        {/* ═══ Área Principal (Grid) ═══ */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden bg-gradient-to-br from-[#07080C] to-[#0D0F17]">
          
          <ScrollArea className="flex-1 pr-4">
            {activeTab === 'tables' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-5">
                {['1','2','3','4','5','6','7','8','9','10','11','12'].map(num => {
                  const order = tableData[num]
                  const hasOrder = !!order
                  return (
                    <div 
                      key={num} 
                      onClick={() => hasOrder && (setSelectedOrder(order), setDirectCart([]))}
                      className={cn(
                        "aspect-square rounded-[2rem] border-2 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 group relative overflow-hidden",
                        hasOrder ? "bg-primary/5 border-primary/40 shadow-2xl" : "bg-white/5 border-white/5 hover:border-white/10"
                      )}
                    >
                      <span className={cn("text-3xl font-black tracking-tighter", hasOrder ? "text-white" : "text-white/10")}>{num}</span>
                      <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] mt-1", hasOrder ? "text-primary" : "text-slate-700")}>
                        {hasOrder ? 'EN CURSO' : 'VACÍA'}
                      </span>
                      {hasOrder && (
                        <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(59,130,246,1)]" />
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {menuLoading ? (
                  <div className="col-span-full py-40 flex flex-col items-center gap-6 opacity-30">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Archivos...</p>
                  </div>
                ) : filteredMenu.length === 0 ? (
                  <div className="col-span-full py-32 flex flex-col items-center text-center">
                    <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                      <AlertCircle className="h-8 w-8 text-amber-500/50" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white/50">Terminal Vacía</h3>
                    <p className="text-[10px] font-bold text-slate-600 uppercase mt-2 max-w-[200px]">No se encontraron productos en la carta para esta categoría.</p>
                    <Button variant="ghost" className="mt-8 text-primary font-black text-[9px] uppercase tracking-widest" onClick={() => router.push('/settings')}>
                      <DatabaseZap className="h-4 w-4 mr-2" /> Cargar Menú en Ajustes
                    </Button>
                  </div>
                ) : filteredMenu.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => item.available && addToDirectCart(item)}
                    className={cn(
                      "bg-[#0F1119] rounded-[2rem] overflow-hidden border border-white/5 hover:border-primary/50 hover:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.3)] transition-all cursor-pointer group relative flex flex-col active:scale-95",
                      !item.available && "opacity-40 grayscale pointer-events-none"
                    )}
                  >
                    <div className="aspect-[1/1] overflow-hidden bg-slate-800 relative">
                      <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/500/500`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0F1119] via-transparent to-transparent opacity-60" />
                      {!item.available && <Badge className="absolute top-4 right-4 bg-red-600 text-white font-black text-[8px] uppercase">Agotado</Badge>}
                    </div>
                    <div className="p-5 flex flex-col gap-1">
                       <span className="text-[8px] font-black text-primary uppercase tracking-widest">{item.category}</span>
                       <h4 className="text-[13px] font-black text-white uppercase tracking-tight truncate">{item.name}</h4>
                       <div className="flex justify-between items-center mt-3">
                         <span className="text-sm font-black text-white tracking-tighter">{formatCurrencyDetailed(item.price)}</span>
                         <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary transition-all">
                           <Plus className="h-4 w-4 text-slate-600 group-hover:text-white" />
                         </div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ═══ Panel de Comanda (Estilo Moderno) ═══ */}
        <div className="w-[400px] bg-black/40 border-l border-white/5 backdrop-blur-3xl flex flex-col shadow-2xl p-6 gap-6 z-10 shrink-0">
          
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                {selectedOrder ? `Mesa ${selectedOrder.tableNumber}` : "Venta Directa"}
              </h2>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Sesión de Cobro Activa</p>
            </div>
            {(directCart.length > 0 || selectedOrder) && (
              <button 
                onClick={() => { setSelectedOrder(null); setDirectCart([]) }}
                className="p-2 hover:bg-red-500/10 hover:text-red-500 text-slate-600 rounded-lg transition-all"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>

          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="space-y-3">
              {(directCart.length === 0 && !selectedOrder) ? (
                <div className="py-24 flex flex-col items-center text-center opacity-10">
                   <ShoppingCart className="h-16 w-16 mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Esperando Productos...</p>
                </div>
              ) : (
                (directCart.length > 0 ? directCart : (selectedOrder?.items || [])).map((item: any) => (
                  <div key={item.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex gap-4 items-center animate-in slide-in-from-right-4">
                    <div className="h-12 w-12 bg-slate-800 rounded-xl overflow-hidden shadow-lg shrink-0">
                      <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/200/200`} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1">
                       <p className="text-[11px] font-black text-white uppercase truncate">{item.name}</p>
                       <p className="text-[10px] font-bold text-slate-500 mt-1">{formatCurrencyDetailed(item.price)} c/u</p>
                    </div>
                    {directCart.length > 0 ? (
                       <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5">
                          <button onClick={() => updateQuantity(item.id, -1)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/5"><Minus className="h-3 w-3" /></button>
                          <span className="w-6 text-center text-[10px] font-black">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/5"><Plus className="h-3 w-3" /></button>
                       </div>
                    ) : (
                       <span className="font-black text-primary text-xs">x{item.quantity}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="bg-white/5 rounded-[2rem] p-6 space-y-4 border border-white/5">
             <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-black uppercase text-slate-500">
                   <span>Subtotal</span>
                   <span>{formatCurrencyDetailed(currentSubtotal)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-black uppercase text-slate-500">
                   <span>Tax (15%)</span>
                   <span>{formatCurrencyDetailed(currentTotal - currentSubtotal)}</span>
                </div>
                <div className="pt-2 flex justify-between items-end">
                   <span className="text-sm font-black text-white uppercase tracking-tighter">Total Neto</span>
                   <span className="text-4xl font-black text-white tracking-tighter">{formatCurrencyDetailed(currentTotal)}</span>
                </div>
             </div>

             <div className="grid grid-cols-1 gap-3 pt-4">
                <Button 
                  disabled={directCart.length === 0 && !selectedOrder}
                  onClick={() => setShowCheckoutModal(true)}
                  className="h-16 rounded-2xl bg-white hover:bg-white/90 text-[#07080C] font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95"
                >
                  <Wallet className="h-5 w-5 mr-3" /> Ejecutar Cobro
                </Button>
                <Button 
                  disabled={directCart.length === 0 && !selectedOrder}
                  onClick={handleEnEspera}
                  variant="ghost"
                  className="h-12 rounded-2xl text-slate-500 hover:text-white hover:bg-white/5 font-black text-[10px] uppercase tracking-widest"
                >
                  Mover a Pendientes
                </Button>
             </div>
          </div>
        </div>
      </div>

      {/* ═══ Checkout Estético ═══ */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="bg-[#07080C] border-white/10 text-white max-w-xl p-0 rounded-[3rem] overflow-hidden font-body shadow-[0_0_100px_rgba(59,130,246,0.1)]">
          <div className="p-10 border-b border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/20">
                   <Receipt className="h-7 w-7 text-primary" />
                </div>
                <div>
                   <DialogTitle className="text-2xl font-black uppercase tracking-tight">Caja Aurora</DialogTitle>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Confirmación de Recaudo Seguro</p>
                </div>
             </div>
             <button onClick={() => setShowCheckoutModal(false)} className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><X className="h-6 w-6" /></button>
          </div>

          <div className="p-10 space-y-10">
             <div className="text-center space-y-2">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Importe Total</p>
                <p className="text-7xl font-black text-white tracking-widest">{formatCurrencyDetailed(currentTotal)}</p>
             </div>

             <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'Efectivo', icon: Banknote, label: 'EFECTIVO' },
                  { id: 'Tarjeta', icon: CardIcon, label: 'TARJETA' },
                  { id: 'Transferencia', icon: Smartphone, label: 'TRANSF.' },
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-4 h-32 rounded-3xl border-2 transition-all active:scale-95",
                      paymentMethod === method.id ? "bg-primary/5 border-primary text-primary shadow-[0_0_30px_rgba(59,130,246,0.2)]" : "bg-white/5 border-white/5 text-slate-500 hover:border-white/10"
                    )}
                  >
                    <method.icon className={cn("h-8 w-8", paymentMethod === method.id ? "text-primary" : "text-slate-600")} />
                    <span className="text-[10px] font-black tracking-widest">{method.label}</span>
                  </button>
                ))}
             </div>

             {paymentMethod === 'Efectivo' && (
                <div className="bg-white/2 rounded-[2rem] border border-white/5 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Recargo en Efectivo</label>
                      <input 
                        type="number" 
                        value={cashReceived || ''} 
                        onChange={e => setCashReceived(Number(e.target.value))} 
                        placeholder="0.00"
                        className="w-full h-20 bg-white/5 text-center text-5xl font-black text-white rounded-2xl border-none outline-none focus:bg-white/10 transition-all placeholder:text-slate-800"
                      />
                   </div>
                   {cashReceived > currentTotal && (
                      <div className="h-16 bg-emerald-500 rounded-2xl flex items-center justify-between px-8 shadow-[0_10px_30px_rgba(16,185,129,0.35)]">
                         <span className="text-[10px] font-black text-emerald-950 uppercase tracking-widest">Cambio Proyectado</span>
                         <span className="text-3xl font-black text-emerald-950">{formatCurrencyDetailed(cashReceived - currentTotal)}</span>
                      </div>
                   )}
                </div>
             )}
          </div>

          <div className="p-10 pt-0 bg-transparent">
             <Button 
               disabled={isFinishing || (paymentMethod === 'Efectivo' && cashReceived < currentTotal)}
               onClick={handleFinalizePayment}
               className="w-full h-20 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase text-sm tracking-[0.3em] shadow-3xl shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95 group"
             >
                {isFinishing ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="h-6 w-6 group-hover:scale-125 transition-transform" />
                    PROCEDER AL PAGO
                  </div>
                )}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}