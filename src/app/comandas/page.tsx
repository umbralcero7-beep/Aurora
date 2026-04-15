
"use client"

import { isSuperUser } from '@/lib/constants';
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
  Hash
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
import { collection, query, where, orderBy, limit, doc, setDoc, getDocs, addDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { useBunker } from "@/components/services/offline-bunker-service"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError, FirestoreOfflineError, isOfflineError } from "@/firebase/errors"

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
  
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState("Todos")
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [guestCount, setGuestCount] = useState<number>(1)
  const [isFinishing, setIsFinishing] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)

  const categories = ["Todos", "Entradas", "Platos Fuertes", "Bebidas", "Postres"]
  const tables = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]

  useEffect(() => {
    setMounted(true)
  }, [])

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);
  
  const isSuper = isSuperUser(user?.email);
  const isSupport = profile?.role === 'SUPPORT' || isSuper;
  const effectiveBusinessId = profile?.businessId || (isSuper ? 'matu' : null);
  const effectiveVenueName = isSupport ? 'GLOBAL HQ' : (profile?.assignedVenue || 'Sede Central');

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(
      collection(db, "orders"),
      where("businessId", "==", effectiveBusinessId),
      where("createdAt", ">=", new Date(Date.now() - 24 * 60 * 60 * 1000)), // Solo últimas 24 horas
      orderBy("createdAt", "desc"),
      limit(100) // Límite para rendimiento
    )
  }, [db, effectiveBusinessId])
  
  const { data: allOrders } = useCollection(ordersQuery)

  const todayOrders = useMemo(() => {
    if (!allOrders || !mounted) return []
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const todayIso = startOfToday.toISOString()
    return allOrders.filter(o => o.createdAt >= todayIso)
  }, [allOrders, mounted])

  const menuQuery = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return collection(db, "menu")
    if (!effectiveBusinessId) return null
    return query(collection(db, "menu"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId, isSupport])

  const { data: menuItems, isLoading: menuLoading } = useCollection(menuQuery)

  const activeMenu = menuItems || [];

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

  const handleSendToKitchen = () => {
    if (!db || cart.length === 0 || !selectedTable || !effectiveBusinessId) {
      toast({ variant: "destructive", title: "Atención", description: "Selecciona mesa y platos." })
      return
    }
    setIsFinishing(true)
    
    const orderNumber = (todayOrders?.length || 0) + 1
    const orderRef = doc(collection(db, "orders"))
    const orderData = {
      id: orderRef.id,
      orderNumber: orderNumber,
      tableNumber: selectedTable,
      guestCount: guestCount,
      items: cart,
      total: cart.reduce((acc, i) => acc + (i.price * i.quantity), 0) * 1.15,
      status: "Open",
      createdAt: new Date().toISOString(),
      businessId: effectiveBusinessId,
      venueId: effectiveBusinessId,
      assignedVenue: effectiveVenueName,
      waiterName: (profile?.displayName || user?.email?.split('@')[0] || 'Mesero').toUpperCase()
    }

    const { captureInBunker } = useBunker();
    captureInBunker('order', orderData);

    setDoc(orderRef, orderData)
      .then(() => {
        toast({ title: "¡Éxito!", description: `Comanda #${orderNumber} enviada.` })
      })
    setCart([])
    setSelectedTable(null)
    setGuestCount(1)
    setIsCartOpen(false)
    setIsFinishing(false)
  }

  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0)
  const total = subtotal * 1.15

  function updateQuantity(id: string, delta: number) {
    setCart(prev => prev.map(i => 
      i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    ))
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(i => i.id !== id))
  }

  // Mapa de mesa -> minutos transcurridos desde su orden más antigua activa
  const tableTimings = useMemo(() => {
    const map: Record<string, { minutes: number; urgent: boolean }> = {}
    if (!allOrders) return map
    const now = Date.now()
    allOrders.filter(o => ['Open', 'Preparing', 'Ready'].includes(o.status) && o.tableNumber).forEach(o => {
      const elapsed = Math.floor((now - new Date(o.createdAt).getTime()) / 60000)
      if (!map[o.tableNumber] || elapsed < map[o.tableNumber].minutes) {
        map[o.tableNumber] = { minutes: elapsed, urgent: elapsed > 20 }
      }
    })
    return map
  }, [allOrders])

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-svh bg-white font-body overflow-hidden safe-area-bottom">
      
      {/* 1. TOP NAV & SEARCH */}
      <div className="bg-white border-b px-4 py-3 shrink-0 z-20">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            <span className="font-black text-sm uppercase tracking-tighter text-slate-900">Comandas</span>
            <Badge variant="outline" className="text-[7px] border-primary/20 text-primary uppercase font-black">{effectiveVenueName}</Badge>
          </div>
          <Badge className="bg-slate-100 text-slate-400 border-none font-black text-[7px] uppercase">Orden #{ (todayOrders?.length || 0) + 1 }</Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
          <Input 
            placeholder="Buscar en la carta..." 
            className="pl-11 h-12 rounded-xl bg-slate-50 border-none text-xs font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 2. CATEGORIES */}
      <div className="bg-white border-b py-2 px-4 shrink-0 overflow-x-auto no-scrollbar flex gap-2">
        {categories.map(cat => (
          <Button 
            key={cat} 
            variant={activeCategory === cat ? "default" : "ghost"} 
            className={cn(
              "rounded-full font-black text-[9px] uppercase tracking-widest px-5 h-9 whitespace-nowrap border",
              activeCategory === cat ? "bg-primary border-primary shadow-lg" : "bg-slate-50 border-transparent text-slate-400"
            )}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* 3. MENU LIST */}
      <ScrollArea className="flex-1 px-4">
        {menuLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 py-4 pb-64">
            {filteredMenu.map(item => (
              <Card 
                key={item.id} 
                className={cn(
                  "flex items-center p-3 gap-4 border-slate-100 rounded-2xl shadow-sm active:scale-95 transition-all overflow-hidden relative",
                  !item.available && "opacity-40 grayscale"
                )} 
                onClick={() => addToCart(item)}
              >
                <div className="h-16 w-16 bg-slate-100 rounded-xl shrink-0 overflow-hidden">
                  <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/200/200`} className="object-cover w-full h-full" alt={item.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs text-slate-900 uppercase truncate mb-1">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{formatCurrencyDetailed(item.price)}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* 4. BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-4 space-y-4">
        
        {/* Guest & Table Selectors */}
        <div className="flex gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1 flex items-center gap-1">
              <LayoutGrid className="h-2 w-2" /> Mesa
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {tables.map(table => {
                const timing = tableTimings[table]
                return (
                <Button 
                  key={table} 
                  variant={selectedTable === table ? "default" : "outline"} 
                  className={cn(
                    "min-w-[48px] h-10 rounded-xl font-black text-xs transition-all relative",
                    selectedTable === table ? "bg-primary text-white scale-105 shadow-lg shadow-primary/20" : 
                    timing?.urgent ? "bg-red-50 border-red-300 text-red-600 animate-pulse" : 
                    timing ? "bg-amber-50 border-amber-200 text-amber-600" : 
                    "bg-slate-50 border-transparent text-slate-400"
                  )}
                  onClick={() => setSelectedTable(table)}
                >
                  {table}
                  {timing && (
                    <span className={cn("absolute -top-1 -right-1 text-[6px] font-black h-3.5 w-3.5 rounded-full flex items-center justify-center border-2",
                      timing.urgent ? "bg-red-500 text-white border-white" : "bg-amber-400 text-white border-white")}>
                      {timing.minutes}
                    </span>
                  )}
                </Button>
              )})}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1 flex items-center gap-1">
              <Users className="h-2 w-2" /> Clientes
            </p>
            <div className="flex items-center bg-slate-50 rounded-xl p-1 border h-10">
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => setGuestCount(Math.max(1, guestCount - 1))}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-xs font-black text-primary">{guestCount}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => setGuestCount(guestCount + 1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Cart Bar & FAB */}
        <div className="flex items-center gap-3">
          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild>
              <div className="flex-1 h-14 bg-slate-900 rounded-2xl flex items-center justify-between px-5 shadow-xl active:scale-95 transition-all">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-primary text-white text-[8px] font-black h-4 w-4 rounded-full flex items-center justify-center border-2 border-slate-900">{cart.length}</span>}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">Total Pedido</span>
                    <span className="text-sm font-black text-primary tracking-tighter">{formatCurrencyDetailed(total)}</span>
                  </div>
                </div>
                <ChevronUp className="h-4 w-4 text-slate-500 animate-bounce" />
              </div>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-[2.5rem] p-0 border-none">
              <div className="h-full flex flex-col bg-white">
                <div className="p-8 bg-slate-900 text-white shrink-0">
                  <div className="flex justify-between items-center mb-2">
                    <SheetTitle className="text-white font-black uppercase tracking-tighter text-2xl flex items-center gap-3">
                      <ShoppingCart className="h-6 w-6 text-primary" />
                      Detalle Pedido
                    </SheetTitle>
                    <div className="flex gap-2">
                      <Badge className="bg-primary text-white font-black text-[10px] rounded-lg">Mesa {selectedTable || '?'}</Badge>
                      <Badge className="bg-slate-800 text-slate-400 font-black text-[10px] rounded-lg">{guestCount} Pax</Badge>
                    </div>
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Confirmar comanda para despacho.</p>
                </div>
                
                <ScrollArea className="flex-1 bg-slate-50/30">
                  {cart.length === 0 ? (
                    <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
                      <UtensilsCrossed className="h-12 w-12" />
                      <p className="font-black uppercase text-xs">Vacio</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {cart.map(item => (
                        <div key={item.id} className="p-6 bg-white flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-black text-xs text-slate-900 uppercase">{item.name}</p>
                            <p className="text-[10px] text-primary font-bold">{formatCurrencyDetailed(item.price)} c/u</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center bg-slate-50 rounded-xl p-1 border">
                              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(item.id, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(item.id, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button size="icon" variant="ghost" className="text-slate-300 hover:text-destructive" onClick={() => removeFromCart(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-8 border-t space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase text-slate-400">Total con Impuestos</span>
                    <span className="text-4xl font-black text-primary tracking-tighter">{formatCurrencyDetailed(total)}</span>
                  </div>
                  <Button 
                    className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl"
                    disabled={cart.length === 0 || !selectedTable || isFinishing}
                    onClick={handleSendToKitchen}
                  >
                    {isFinishing ? <Loader2 className="animate-spin" /> : <><ChefHat className="mr-2 h-5 w-5" /> Enviar Comanda a Cocina</>}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button 
            className={cn(
              "h-16 w-16 rounded-full shadow-2xl transition-all duration-500",
              cart.length > 0 && selectedTable ? "bg-primary scale-110" : "bg-slate-200 scale-100"
            )}
            disabled={cart.length === 0 || !selectedTable || isFinishing}
            onClick={handleSendToKitchen}
          >
            {isFinishing ? <Loader2 className="animate-spin h-6 w-6" /> : <ChefHat className="h-6 w-6" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
