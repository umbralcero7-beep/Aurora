
"use client"

import { useState, useMemo, useEffect } from "react"
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  ChefHat, 
  Loader2, 
  UtensilsCrossed, 
  ShoppingCart, 
  X,
  LayoutGrid,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Users,
  Hash,
  Cloud,
  CloudOff,
  WifiOff
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, where, addDoc, doc, orderBy } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { AURORA_TAX_RATE } from "@/lib/constants"

// Carta Aurora Precargada para Respaldo Demo
const DEFAULT_MENU = [
  { id: 'p1', name: 'Hamburguesa Aurora', price: 35000, category: 'Platos Fuertes', available: true, imageUrl: 'https://picsum.photos/seed/aurora_h1/400/400' },
  { id: 'p2', name: 'Empanadas de Carne (3)', price: 15000, category: 'Entradas', available: true, imageUrl: 'https://picsum.photos/seed/aurora_e1/400/400' },
  { id: 'p3', name: 'Limonada de Coco', price: 12000, category: 'Bebidas', available: true, imageUrl: 'https://picsum.photos/seed/aurora_l1/400/400' },
  { id: 'p4', name: 'Cerveza Club Colombia', price: 10000, category: 'Bebidas', available: true, imageUrl: 'https://picsum.photos/seed/aurora_b1/400/400' },
  { id: 'p5', name: 'Torta de Chocolate', price: 14000, category: 'Postres', available: true, imageUrl: 'https://picsum.photos/seed/aurora_c1/400/400' },
]

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export default function ComandasPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState("Todos")
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [guestCount, setGuestCount] = useState<number>(1)
  const [isFinishing, setIsFinishing] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const handleSimulatedOffline = (e: any) => {
      if (e.detail && typeof e.detail.offline === 'boolean') {
        setIsOnline(!e.detail.offline)
      }
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('aurora:toggle-offline' as any, handleSimulatedOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('aurora:toggle-offline' as any, handleSimulatedOffline)
    }
  }, [])
  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => 
      i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    ))
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id))
  }

  const categories = ["Todos", "Entradas", "Platos Fuertes", "Bebidas", "Postres"]

  const emailLower = user?.email?.toLowerCase();
  const isSuperUser = emailLower === 'umbralcero7@gmail.com' || emailLower === 'amaroisaias611@gmail.com';

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);
  
  const isSupport = profile?.role === 'SUPPORT' || isSuperUser;
  const effectiveBusinessId = profile?.businessId || (isSuperUser ? 'matu' : null);
  const effectiveVenueName = isSupport ? 'GLOBAL HQ' : (profile?.assignedVenue || 'Sede Central');

  // Consulta simplificada para evitar errores de índice compuesto
  const ordersQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(
      collection(db, "orders"),
      where("businessId", "==", effectiveBusinessId)
    )
  }, [db, effectiveBusinessId])
  
  const { data: allOrders } = useCollection(ordersQuery)

  const todayOrders = useMemo(() => {
    if (!allOrders) return []
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const todayIso = startOfToday.toISOString()
    return allOrders.filter(o => o.createdAt >= todayIso)
  }, [allOrders])

  const menuQuery = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return collection(db, "menu")
    if (!effectiveBusinessId) return null
    return query(collection(db, "menu"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId, isSupport])

  const { data: menuItems, isLoading: menuLoading } = useCollection(menuQuery)

  const activeMenu = (menuItems && menuItems.length > 0) ? menuItems : DEFAULT_MENU;

  const filteredMenu = activeMenu
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    .filter(item => {
      const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = activeCategory === "Todos" || item.category === activeCategory
      return matchesSearch && matchesCategory
    })

  const addToCart = (item: any) => {
    if (item.available === false) {
      toast({ variant: "destructive", title: "Agotado", description: "Plato no disponible." })
      return
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { id: item.id, name: item.name, price: Number(item.price), quantity: 1 }]
    })
    toast({ title: "Agregado", description: `${item.name}`, duration: 500 })
  }

  const handleSendToKitchen = async () => {
    if (!db || cart.length === 0 || !selectedTable || !effectiveBusinessId) {
      toast({ variant: "destructive", title: "Atención", description: "Selecciona mesa y platos." })
      return
    }
    setIsFinishing(true)
    try {
      const orderNumber = (todayOrders?.length || 0) + 1
      const subtotalVal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0)
      const taxVal = subtotalVal * AURORA_TAX_RATE
      
      await addDoc(collection(db, "orders"), {
        orderNumber: orderNumber,
        tableNumber: selectedTable,
        guestCount: guestCount,
        items: cart,
        subtotal: subtotalVal,
        tax: taxVal,
        total: subtotalVal + taxVal,
        status: "Open",
        createdAt: new Date().toISOString(),
        businessId: effectiveBusinessId,
        venueId: effectiveBusinessId,
        assignedVenue: effectiveVenueName,
        waiterName: (profile?.displayName || user?.email?.split('@')[0] || 'Mesero').toUpperCase()
      })
      toast({ title: "¡Éxito!", description: `Comanda #${orderNumber} enviada.` })
      setCart([])
      setSelectedTable(null)
      setGuestCount(1)
      setIsCartOpen(false)
    } catch (error) {
      console.error(error)
    } finally {
      setIsFinishing(false)
    }
  }

  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0)
  const tax = subtotal * AURORA_TAX_RATE
  const total = subtotal + tax

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 h-svh bg-white font-body overflow-hidden safe-area-bottom">
      
      {/* LEFT COLUMN: Menu & Selection (8 cols on Tablet) */}
      <div className="lg:col-span-8 flex flex-col h-full bg-slate-50/50 overflow-hidden relative border-r border-slate-100">
        
        {/* 1. TOP NAV & SEARCH */}
        <div className="bg-white border-b px-6 py-4 shrink-0 z-20">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
              <span className="font-black text-base uppercase tracking-tighter text-slate-900">Comandas</span>
              <Badge variant="outline" className="text-[9px] border-primary/20 text-primary uppercase font-black px-3">{effectiveVenueName}</Badge>
            </div>
            <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[9px] uppercase px-3 py-1">Orden #{ (todayOrders?.length || 0) + 1 }</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
            <Input 
              placeholder="Buscar en la carta..." 
              className="pl-12 h-14 rounded-2xl bg-slate-50 border-none text-sm font-bold shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* 2. CATEGORIES */}
        <div className="bg-white border-b py-3 px-6 shrink-0 overflow-x-auto no-scrollbar flex gap-3">
          {categories.map(cat => (
            <Button 
              key={cat} 
              variant={activeCategory === cat ? "default" : "ghost"} 
              className={cn(
                "rounded-full font-black text-[10px] uppercase tracking-widest px-6 h-10 whitespace-nowrap border-2 transition-all",
                activeCategory === cat ? "bg-primary border-primary shadow-lg shadow-primary/20 scale-105" : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
              )}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* 3. MENU LIST */}
        <ScrollArea className="flex-1 px-6">
          {menuLoading ? (
            <div className="flex flex-col items-center justify-center py-40">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 py-6 pb-40 lg:pb-10">
              {filteredMenu.map(item => (
                <Card 
                  key={item.id} 
                  className={cn(
                    "flex items-center p-4 gap-4 border-slate-100 rounded-[1.5rem] shadow-sm active:scale-95 transition-all overflow-hidden relative cursor-pointer group hover:border-primary/30 hover:shadow-xl",
                    !item.available && "opacity-40 grayscale pointer-events-none"
                  )} 
                  onClick={() => addToCart(item)}
                >
                  <div className="h-20 w-20 bg-slate-100 rounded-2xl shrink-0 overflow-hidden shadow-inner">
                    <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/200/200`} className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-900 uppercase truncate mb-1">{item.name}</p>
                    <p className="text-[11px] text-primary font-black uppercase tracking-tight">{formatCurrencyDetailed(item.price)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <Plus className="h-5 w-5" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* 4. MOBILE-ONLY BOTTOM BAR (Hidden on LG) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-4 space-y-4">
          <div className="flex gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1 flex items-center gap-2">
                <LayoutGrid className="h-3 w-3" /> Mesa
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(table => (
                  <Button 
                    key={table} 
                    variant={selectedTable === table ? "default" : "outline"} 
                    className={cn(
                      "min-w-[50px] h-11 rounded-xl font-black text-sm transition-all",
                      selectedTable === table ? "bg-primary text-white scale-105 shadow-lg shadow-primary/20" : "bg-slate-50 border-transparent text-slate-400"
                    )}
                    onClick={() => setSelectedTable(table)}
                  >
                    {table}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1 flex items-center gap-2">
                <Users className="h-3 w-3" /> Pax
              </p>
              <div className="flex items-center bg-slate-50 rounded-xl p-1 border h-11">
                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg" onClick={() => setGuestCount(Math.max(1, guestCount - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-sm font-black text-primary">{guestCount}</span>
                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg" onClick={() => setGuestCount(guestCount + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <div className="flex-1 h-16 bg-slate-900 rounded-2xl flex items-center justify-between px-6 shadow-xl active:scale-95 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <ShoppingCart className="h-6 w-6 text-primary" />
                      {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-900">{cart.length}</span>}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Proceder Cobro</span>
                      <span className="text-base font-black text-white tracking-tighter">{formatCurrencyDetailed(total)}</span>
                    </div>
                  </div>
                  <ChevronUp className="h-5 w-5 text-slate-500 animate-bounce" />
                </div>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[90vh] rounded-t-[3rem] p-0 border-none shadow-2xl">
                 <CartContentUI 
                    cart={cart} 
                    selectedTable={selectedTable} 
                    guestCount={guestCount} 
                    total={total} 
                    isFinishing={isFinishing}
                    handleSendToKitchen={handleSendToKitchen}
                    updateQuantity={updateQuantity}
                    removeFromCart={removeFromCart}
                    isOnline={isOnline}
                 />
              </SheetContent>
            </Sheet>
            <Button 
              className={cn(
                "h-16 w-16 rounded-full shadow-2xl transition-all duration-500",
                cart.length > 0 && selectedTable ? "bg-primary scale-110 rotate-0" : "bg-slate-200 scale-100"
              )}
              disabled={cart.length === 0 || !selectedTable || isFinishing}
              onClick={handleSendToKitchen}
            >
              {isFinishing ? <Loader2 className="animate-spin h-7 w-7" /> : <ChefHat className="h-7 w-7" />}
            </Button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Persistent Sidebar (Tablets & Desktop) */}
      <div className="hidden lg:flex lg:col-span-4 h-full bg-white flex-col border-l border-slate-100 shadow-2xl">
        <div className="p-8 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tighter text-xl text-white">Detalle Pedido</h3>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Cero AI: Auditoría en tiempo real</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Mesa Seleccionada</label>
              <div className="grid grid-cols-4 gap-1 h-24 overflow-y-auto no-scrollbar p-1">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(table => (
                  <button 
                    key={table} 
                    onClick={() => setSelectedTable(table)}
                    className={cn(
                      "h-8 rounded-lg font-black text-[10px] transition-all",
                      selectedTable === table ? "bg-primary text-white shadow-lg" : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    {table}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Nº Comensales</label>
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl h-10 px-2">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-white/50 hover:text-white" onClick={() => setGuestCount(Math.max(1, guestCount - 1))}><Minus className="h-3 w-3" /></Button>
                <span className="font-black text-sm text-primary">{guestCount}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-white/50 hover:text-white" onClick={() => setGuestCount(guestCount + 1)}><Plus className="h-3 w-3" /></Button>
              </div>
              <div className="pt-2 text-center">
                 <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[8px] uppercase tracking-widest">Canal: Salón</Badge>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-slate-50/10">
          <CartItemsList 
            items={cart} 
            updateQuantity={updateQuantity} 
            removeFromCart={removeFromCart} 
          />
        </ScrollArea>

        <div className="p-8 border-t bg-white space-y-6 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Base Imponible: {formatCurrencyDetailed(subtotal)}</p>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Impuestos (15%): {formatCurrencyDetailed(tax)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total comanda</p>
              <p className="text-4xl font-black text-primary tracking-tighter leading-none mt-1">{formatCurrencyDetailed(total)}</p>
            </div>
          </div>
          <Button 
            className={cn(
              "w-full h-16 rounded-[1.8rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-300",
              isOnline ? "bg-slate-900 hover:bg-black text-white" : "bg-orange-600 hover:bg-orange-700 text-white"
            )}
            disabled={cart.length === 0 || !selectedTable || isFinishing}
            onClick={handleSendToKitchen}
          >
            {isFinishing ? (
              <Loader2 className="animate-spin h-6 w-6" />
            ) : (
              <div className="flex items-center justify-center gap-3">
                {isOnline ? <ChefHat className="h-6 w-6" /> : <CloudOff className="h-6 w-6 animate-pulse" />}
                <span>{isOnline ? "Despachar a Cocina" : "Despacho Local (Sin Red)"}</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CartItemsList({ items, updateQuantity, removeFromCart }: any) {
  return (
    <div className="divide-y divide-slate-100">
      {items.length === 0 ? (
        <div className="py-20 text-center opacity-10 flex flex-col items-center gap-4">
          <UtensilsCrossed className="h-16 w-16" />
          <p className="font-black uppercase text-sm tracking-widest">Esperando Pedido...</p>
        </div>
      ) : (
        items.map((item: any) => (
          <div key={item.id} className="p-6 bg-white hover:bg-slate-50 transition-colors flex justify-between items-center group">
            <div className="flex-1 min-w-0 pr-4">
              <p className="font-black text-sm text-slate-900 uppercase truncate mb-1">{item.name}</p>
              <p className="text-[10px] text-primary font-black uppercase tracking-tight">{formatCurrencyDetailed(item.price)} C/U</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200">
                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-white" onClick={() => updateQuantity(item.id, -1)}>
                  <Minus className="h-4 w-4 text-slate-400" />
                </Button>
                <span className="w-10 text-center text-sm font-black text-slate-900">{item.quantity}</span>
                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-white" onClick={() => updateQuantity(item.id, 1)}>
                  <Plus className="h-4 w-4 text-slate-400" />
                </Button>
              </div>
              <Button size="icon" variant="ghost" className="text-slate-200 hover:text-destructive transition-colors" onClick={() => removeFromCart(item.id)}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function CartContentUI({ cart, selectedTable, guestCount, total, isFinishing, handleSendToKitchen, updateQuantity, removeFromCart, isOnline }: any) {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-10 bg-slate-900 text-white shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
        <div className="flex justify-between items-start mb-4 relative z-10">
          <SheetTitle className="text-white font-black uppercase tracking-tighter text-3xl flex items-center gap-4">
            <ShoppingCart className="h-8 w-8 text-primary" />
            Revision Comanda
          </SheetTitle>
          <div className="flex gap-2">
            <Badge className="bg-primary text-white font-black text-xs px-4 py-1.5 rounded-xl shadow-lg">Mesa {selectedTable || '?'}</Badge>
            <Badge className="bg-white/10 text-slate-300 font-black text-xs px-4 py-1.5 rounded-xl">{guestCount} Pax</Badge>
          </div>
        </div>
        <p className="text-[11px] font-black uppercase text-slate-500 tracking-widest italic relative z-10">Confirma los platos antes de enviar a cocina.</p>
      </div>
      
      <ScrollArea className="flex-1 bg-slate-50/30">
        <CartItemsList items={cart} updateQuantity={updateQuantity} removeFromCart={removeFromCart} />
      </ScrollArea>

      <div className="p-10 border-t bg-white space-y-6 shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Total a Confirmar</span>
          <span className="text-4xl font-black text-primary tracking-tighter">{formatCurrencyDetailed(total)}</span>
        </div>
        <Button 
          className={cn(
            "w-full h-18 rounded-[2rem] font-black text-base uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex gap-4 items-center justify-center",
            isOnline ? "bg-slate-900 hover:bg-black text-white" : "bg-orange-600 hover:bg-orange-700 text-white"
          )}
          disabled={cart.length === 0 || !selectedTable || isFinishing}
          onClick={handleSendToKitchen}
        >
          {isFinishing ? (
            <Loader2 className="animate-spin h-7 w-7" />
          ) : (
            <div className="flex items-center gap-4">
              {isOnline ? <ChefHat className="h-7 w-7" /> : <CloudOff className="h-7 w-7 animate-pulse" />}
              <span>{isOnline ? "Enviar a Cocina" : "Guardar Localmente"}</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  )
}
