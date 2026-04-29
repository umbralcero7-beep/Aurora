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
  FileText,
  User,
  Mail,
  Building2,
  Fingerprint,
  LayoutDashboard
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, where, doc, setDoc, orderBy, limit, getDocs, addDoc, updateDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useBunker } from "@/components/services/offline-bunker-service"

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

  // Electronic Invoicing States (DIAN Colombia)
  const [isElectronicEnabled, setIsElectronicEnabled] = useState(false)
  const [customerData, setCustomerData] = useState({
    taxId: "",
    name: "",
    email: "",
    address: ""
  })

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

  const { captureInBunker } = useBunker()
  const openOrdersQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "orders"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const deliveriesQuery = useMemoFirebase(() => {
     if (!db || !effectiveBusinessId) return null
     return query(
       collection(db, "deliveries"), 
       where("businessId", "==", effectiveBusinessId),
       where("status", "!=", "Anulado"),
       orderBy("createdAt", "desc"),
       limit(10)
     )
  }, [db, effectiveBusinessId])

  const menuQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "menu"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const { data: allOrders } = useCollection(openOrdersQuery)
  const { data: allDeliveries } = useCollection(deliveriesQuery)
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
    toast({ title: "En Espera", description: "Comanda guardada" })
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
      customerName: isElectronicEnabled ? customerData.name : "Consumidor Final",
      items: cartToProcess,
      subtotal: totalToProcess / 1.15,
      tax: totalToProcess - (totalToProcess / 1.15),
      total: totalToProcess,
      paymentMethod: paymentMethod,
      timestamp: new Date().toISOString(),
      businessId: effectiveBusinessId,
      venueId: effectiveBusinessId,
      assignedVenue: effectiveVenueName,
      cashierName: (profile?.displayName || user?.email?.split('@')[0] || 'CAJERO').toUpperCase(),
      // DIAN Fields
      isElectronic: isElectronicEnabled,
      taxId: isElectronicEnabled ? customerData.taxId : null,
      customerEmail: isElectronicEnabled ? customerData.email : null,
      legalStatus: isElectronicEnabled ? 'PENDING_DIAN' : 'SIMPLIFIED'
    }


    try {
      captureInBunker('invoice', invoiceData)
      await setDoc(invoiceRef, invoiceData)
      toast({ title: "PAGO EXITOSO", description: "Venta registrada correctamente" })
      setSelectedOrder(null)
      setDirectCart([])
      setShowCheckoutModal(false)
      setIsElectronicEnabled(false)
      setCustomerData({ taxId: "", name: "", email: "", address: "" })
    } catch (err) {
      toast({ variant: "destructive", title: "ERROR", description: "No se pudo sincronizar" })
    } finally {
      setIsFinishing(false)
    }
  }

  if (!mounted) return null;

  return (
    <div className="h-screen bg-white flex flex-col font-sans overflow-hidden text-slate-800">
      
      {/* ═══ Header Compacto (fit focus) ═══ */}
      <header className="h-16 bg-primary border-b border-primary-foreground/10 px-4 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="h-9 w-9 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <Zap className="h-5 w-5 text-primary" />
             </div>
             <div className="flex flex-col leading-none">
               <span className="text-[10px] font-black text-white uppercase tracking-tighter">{effectiveVenueName}</span>
               <span className="text-[7px] font-bold text-white/50 uppercase tracking-[0.2em] mt-0.5">Terminal Live</span>
             </div>
          </div>

          <div className="h-6 w-px bg-white/20 mx-1 hidden sm:block" />

          {/* View Switcher Compact */}
          <div className="flex bg-white/10 p-1 rounded-lg">
             <button onClick={() => setActiveTab('direct')} className={cn("px-4 h-8 rounded-md text-[9px] font-black uppercase tracking-widest transition-all", activeTab === 'direct' ? "bg-white text-primary shadow-sm" : "text-white/60 hover:text-white")}>
               Directa
             </button>
             <button onClick={() => setActiveTab('tables')} className={cn("px-4 h-8 rounded-md text-[9px] font-black uppercase tracking-widest transition-all", activeTab === 'tables' ? "bg-white text-primary shadow-sm" : "text-white/60 hover:text-white")}>
               Mesas
             </button>
             <button onClick={() => setActiveTab('waitlist')} className={cn("px-4 h-8 rounded-md text-[9px] font-black uppercase tracking-widest transition-all relative", activeTab === 'waitlist' ? "bg-white text-primary shadow-sm" : "text-white/60 hover:text-white")}>
               Espera
               {(allDeliveries?.length || 0) > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 bg-secondary rounded-full border-2 border-primary animate-pulse" />}
             </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <input 
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="Buscar..." 
              className="w-48 xl:w-60 h-9 bg-white/10 border border-white/10 rounded-xl pl-9 pr-4 text-[10px] font-bold text-white placeholder:text-white/40 outline-none focus:bg-white/20 transition-all"
            />
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-9 px-3 rounded-xl bg-white border-none text-primary shadow-sm hover:bg-slate-50 relative gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-[9px] font-black uppercase">Espera ({pendingAccounts.length})</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-white border-l border-slate-200 p-0 flex flex-col sm:max-w-md">
               <div className="p-6 bg-primary text-white">
                  <SheetTitle className="text-white font-black uppercase text-xl flex items-center gap-2">
                    <History className="h-5 w-5" /> Cuentas Pendientes
                  </SheetTitle>
               </div>
               <ScrollArea className="flex-1 p-4">
                  {pendingAccounts.length === 0 ? (
                    <div className="py-20 text-center opacity-20 flex flex-col items-center gap-2">
                      <ShoppingCart className="h-10 w-10" />
                      <p className="text-[10px] font-black uppercase">Vacío</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingAccounts.map((acc, i) => (
                        <div key={i} onClick={() => { setDirectCart(acc.items); setPendingAccounts(prev => prev.filter((_, idx) => idx !== i)) }} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-primary transition-all">
                          <div className="flex justify-between items-start mb-2">
                             <span className="text-xs font-black text-slate-800 uppercase">{acc.clientName}</span>
                             <span className="text-[9px] font-bold text-slate-400">{new Date(acc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex justify-between items-end">
                             {acc.tableNumber && <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[7px] font-black">Mesa {acc.tableNumber}</Badge>}
                             <p className="text-lg font-black text-primary tracking-tighter ml-auto">{formatCurrencyDetailed(acc.total * 1.15)}</p>
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
              <Button variant="outline" className="h-9 w-9 p-0 rounded-xl bg-white border-none text-primary shadow-sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl border-slate-100 shadow-xl">
              <DropdownMenuItem onClick={() => router.push('/fiscal-control')} className="h-10 rounded-lg focus:bg-red-50 focus:text-red-600 gap-3 px-3 transition-all cursor-pointer">
                <LogOut className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase">Cierre Z</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/reports')} className="h-10 rounded-lg gap-3 px-3 transition-all cursor-pointer">
                <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] font-black uppercase">Reportes</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* ═══ Área Principal (fit viewport) ═══ */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          
          {/* Categorías Slim */}
          <div className="bg-slate-50/50 border-b border-slate-100 px-4 py-2 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex gap-2">
              {categoryOptions.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={cn(
                    "flex items-center gap-2 px-4 h-9 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    activeCategory === cat.name 
                      ? "bg-primary text-white shadow-md shadow-primary/20" 
                      : "bg-white border border-slate-200 text-slate-500 hover:border-primary/20"
                  )}
                >
                  <cat.icon className="h-3 w-3" />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            {activeTab === 'tables' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 pb-4">
                {['1','2','3','4','5','6','7','8','9','10','11','12','13','14'].map(num => {
                  const order = tableData[num]
                  const hasOrder = !!order
                  return (
                    <div key={num} onClick={() => hasOrder && (setSelectedOrder(order), setDirectCart([]), setIsElectronicEnabled(false))} className={cn("aspect-square rounded-[1.5rem] border-2 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 shadow-sm", hasOrder ? "bg-white border-primary shadow-primary/5" : "bg-white border-dashed border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-300")}>
                      <span className={cn("text-2xl font-black tracking-tight", hasOrder ? "text-primary" : "text-slate-200")}>{num}</span>
                      <span className={cn("text-[8px] font-black uppercase mt-1", hasOrder ? "text-primary/60" : "text-slate-200")}>{hasOrder ? 'OCUPADA' : 'LIBRE'}</span>
                    </div>
                  )
                })}
              </div>
            ) : activeTab === 'waitlist' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {/* Domicilios en Espera */}
                 {(allDeliveries || []).map(del => (
                   <Card key={del.id} onClick={() => {
                     setSelectedOrder(null);
                     setDirectCart(del.items || []);
                     setIsElectronicEnabled(del.isElectronic || false);
                     if (del.isElectronic) {
                        setCustomerData({
                           taxId: del.phone || "",
                           name: del.customerName || "",
                           email: del.email || "",
                           address: del.address || ""
                        });
                     }
                     toast({ title: "Cargado", description: `Pedido de ${del.customerName} listo para cobro.` });
                   }} className="bg-white rounded-2xl border-slate-100 shadow-xl overflow-hidden cursor-pointer hover:border-primary transition-all">
                      <CardContent className="p-6 space-y-3">
                         <div className="flex justify-between items-start">
                             <Badge className="bg-orange-500 text-white font-black text-[8px] uppercase">DOMICILIO #{del.orderNumber}</Badge>
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{del.status}</span>
                         </div>
                         <h4 className="font-black text-slate-900 uppercase text-sm">{del.customerName}</h4>
                         <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                            <span className="text-xl font-black text-primary">{formatCurrencyDetailed(del.total)}</span>
                            {del.isElectronic && <Badge className="bg-primary/10 text-primary border-none rounded-lg font-black text-[7px] uppercase tracking-tighter">DIAN: REQUERIDO</Badge>}
                         </div>
                      </CardContent>
                   </Card>
                 ))}
                 {(allDeliveries?.length === 0) && (
                   <div className="col-span-full py-20 text-center border-4 border-dashed rounded-[2rem] bg-slate-50/20">
                     <Clock className="h-10 w-10 mx-auto mb-4 opacity-10" />
                     <p className="text-slate-300 font-black uppercase text-xs tracking-widest">Sin solicitudes externas</p>
                   </div>
                 )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
                {menuLoading ? (
                  <div className="col-span-full py-40 flex flex-col items-center gap-4 opacity-30">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase">Cargando...</p>
                  </div>
                ) : filteredMenu.length === 0 ? (
                  <div className="col-span-full py-20 flex flex-col items-center text-center opacity-40">
                    <Package className="h-10 w-10 mb-4" />
                    <p className="text-[10px] font-black uppercase">Sin productos en {activeCategory}</p>
                  </div>
                ) : filteredMenu.map(item => (
                  <Card key={item.id} onClick={() => item.available && addToDirectCart(item)} className={cn("group bg-white rounded-[1.5rem] overflow-hidden border-slate-100/50 shadow-sm hover:shadow-lg transition-all cursor-pointer active:scale-95", !item.available && "opacity-40 grayscale pointer-events-none")}>
                    <div className="aspect-[5/4] overflow-hidden bg-slate-50 relative">
                      <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/400/320`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                    </div>
                    <CardContent className="p-3">
                       <h4 className="text-[10px] font-black text-slate-800 uppercase truncate mb-2">{item.name}</h4>
                       <div className="flex justify-between items-center">
                         <span className="text-xs font-black text-primary">{formatCurrencyDetailed(item.price)}</span>
                         <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary transition-all">
                           <Plus className="h-3.5 w-3.5 text-slate-400 group-hover:text-white" />
                         </div>
                       </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ═══ Lateral de Comanda Slim (320px) ═══ */}
        <div className="w-[320px] bg-slate-50/30 border-l border-slate-100 flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-100">
             <div className="flex justify-between items-start">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  {selectedOrder ? `Mesa ${selectedOrder.tableNumber}` : "Venta"}
                </h2>
                {(directCart.length > 0 || selectedOrder) && (
                  <Button onClick={() => { setSelectedOrder(null); setDirectCart([]) }} variant="ghost" className="h-8 w-8 p-0 text-slate-300 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
             </div>
          </div>

          <ScrollArea className="flex-1 p-4">
              {(directCart.length === 0 && !selectedOrder) ? (
                <div className="py-20 flex flex-col items-center opacity-10">
                   <ShoppingCart className="h-10 w-10 mb-2" />
                   <p className="text-[9px] font-black uppercase">Vacío</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(directCart.length > 0 ? directCart : (selectedOrder?.items || [])).map((item: any) => (
                    <div key={item.id} className="bg-white border border-slate-100 p-3 rounded-xl flex gap-3 items-center">
                      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                         <p className="text-[10px] font-bold text-slate-800 uppercase truncate">{item.name}</p>
                         <p className="text-[10px] font-black text-primary">{formatCurrencyDetailed(item.price * item.quantity)}</p>
                      </div>
                      <div className="flex items-center bg-slate-50 rounded-lg p-0.5">
                        <button onClick={() => updateQuantity(item.id, -1)} className="h-6 w-6 flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                        <span className="w-5 text-center text-[9px] font-black">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="h-6 w-6 flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </ScrollArea>

          <div className="p-5 bg-white border-t border-slate-100 space-y-4">
             <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                   <span>Subtotal</span>
                   <span>{formatCurrencyDetailed(currentSubtotal)}</span>
                </div>
                <div className="flex justify-between items-end pt-1">
                   <span className="text-[10px] font-black text-primary uppercase leading-none">Total</span>
                   <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{formatCurrencyDetailed(currentTotal)}</span>
                </div>
             </div>

             <div className="grid grid-cols-1 gap-2">
                <Button disabled={directCart.length === 0 && !selectedOrder} onClick={() => { setCashReceived(0); setShowCheckoutModal(true) }} className="h-12 rounded-xl bg-primary text-white font-black text-[10px] uppercase shadow-lg shadow-primary/10">
                  <Wallet className="h-4 w-4 mr-2" /> Cobrar ahora
                </Button>
                <Button disabled={directCart.length === 0 && !selectedOrder} onClick={handleEnEspera} variant="ghost" className="h-9 text-[9px] text-slate-400 font-bold uppercase">
                  Poner en Espera
                </Button>
             </div>
          </div>
        </div>
      </div>

      {/* ═══ Modal de Liquidación con Facturación Electrónica DIAN ═══ */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="p-0 bg-white border-none max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl font-body">
          <div className="p-6 bg-primary text-white flex items-center justify-between shrink-0">
             <div className="flex items-center gap-4">
                <Receipt className="h-6 w-6" />
                <div>
                   <DialogTitle className="text-xl font-black uppercase tracking-tight">Checkout Aurora</DialogTitle>
                   <p className="text-[10px] font-black text-white/60 uppercase">Protocolo Legal Vigente Col.</p>
                </div>
             </div>
          </div>

          <ScrollArea className="max-h-[85vh]">
            <div className="p-8 space-y-8">
               {/* Selector de Tipo de Documento */}
               <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button 
                    onClick={() => setIsElectronicEnabled(false)}
                    className={cn(
                      "flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all",
                      !isElectronicEnabled ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <Ticket className="h-4 w-4" /> Remisión / POS
                  </button>
                  <button 
                    onClick={() => setIsElectronicEnabled(true)}
                    className={cn(
                      "flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all",
                      isElectronicEnabled ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <FileText className="h-4 w-4" /> Factura Electrónica
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* Columna Izquierda: Información de Pago */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-100">
                       <p className="text-[10px] font-black text-slate-400 uppercase">Total a Pagar</p>
                       <p className="text-4xl font-black text-primary tracking-tighter">{formatCurrencyDetailed(currentTotal)}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                       {[{ id:'Efectivo', icon: Banknote }, { id:'Datáfono', icon: CreditCard }, { id:'Transferencia', icon: Smartphone }].map(m => (
                         <button key={m.id} onClick={() => setPaymentMethod(m.id as any)} className={cn("p-4 rounded-xl flex flex-col items-center gap-2 border-2 transition-all", paymentMethod === m.id ? "bg-primary text-white border-primary shadow-lg shadow-primary/10" : "bg-white border-slate-100 text-slate-400 hover:border-primary/20")}>
                           <m.icon className="h-5 w-5" />
                           <span className="text-[8px] font-black uppercase">{m.id}</span>
                         </button>
                       ))}
                    </div>

                    {paymentMethod === 'Efectivo' && (
                       <div className="space-y-4 pt-2">
                          <Input type="number" value={cashReceived || ''} onChange={e => setCashReceived(Number(e.target.value))} placeholder="Monto Recibido" className="h-14 text-center text-xl font-black rounded-xl bg-slate-50 border-none px-6" />
                          {cashReceived > currentTotal && (
                             <div className="h-14 bg-emerald-500 text-white rounded-xl flex items-center justify-between px-6 shadow-xl shadow-emerald-500/20">
                                <span className="text-[10px] font-black uppercase">Cambio:</span>
                                <span className="text-xl font-black">{formatCurrencyDetailed(cashReceived - currentTotal)}</span>
                             </div>
                          )}
                       </div>
                    )}
                  </div>

                  {/* Columna Derecha: Facturación Electrónica DIAN */}
                  <div className={cn("space-y-4 p-6 rounded-2xl border-2 transition-all h-full", isElectronicEnabled ? "bg-slate-50 border-primary" : "bg-slate-50/30 border-dashed border-slate-100 opacity-20")}>
                     <div className="flex items-center gap-2 mb-2">
                        <Fingerprint className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase text-slate-600">Requerimientos DIAN</span>
                     </div>
                     
                     <div className="grid gap-3">
                        <div className="space-y-1">
                           <Label className="text-[8px] font-black uppercase opacity-60">NIT / Cédula</Label>
                           <Input disabled={!isElectronicEnabled} value={customerData.taxId} onChange={e => setCustomerData({...customerData, taxId: e.target.value})} className="h-9 text-[10px] font-bold rounded-lg border-slate-200" placeholder="000000000" />
                        </div>
                        <div className="space-y-1">
                           <Label className="text-[8px] font-black uppercase opacity-60">Razón Social</Label>
                           <Input disabled={!isElectronicEnabled} value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="h-9 text-[10px] font-bold rounded-lg border-slate-200" placeholder="Nombre completo" />
                        </div>
                        <div className="space-y-1">
                           <Label className="text-[8px] font-black uppercase opacity-60">Email Notificación</Label>
                           <Input disabled={!isElectronicEnabled} value={customerData.email} onChange={e => setCustomerData({...customerData, email: e.target.value})} className="h-9 text-[10px] font-bold rounded-lg border-slate-200" placeholder="correo@ejemplo.com" />
                        </div>
                        <div className="space-y-1">
                           <Label className="text-[8px] font-black uppercase opacity-60">Dirección</Label>
                           <Input disabled={!isElectronicEnabled} value={customerData.address} onChange={e => setCustomerData({...customerData, address: e.target.value})} className="h-9 text-[10px] font-bold rounded-lg border-slate-200" placeholder="Dirección física" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-slate-100 bg-slate-50">
             <Button 
               disabled={isFinishing || (paymentMethod === 'Efectivo' && cashReceived < currentTotal) || (isElectronicEnabled && (!customerData.taxId || !customerData.name || !customerData.email))}
               onClick={handleFinalizePayment}
               className="w-full h-16 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-4"
             >
                {isFinishing ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    PROCEDER AL CIERRE FISCAL {isElectronicEnabled ? 'CON DIAN' : ''}
                  </>
                )}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}