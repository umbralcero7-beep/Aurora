
"use client"

import { useState, useMemo, useRef } from "react"
import { 
  Clock, 
  Search, 
  UtensilsCrossed, 
  Loader2,
  ChefHat,
  CheckCircle2,
  User,
  ShieldCheck,
  Bell,
  Utensils,
  Users,
  Hash
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, updateDoc, doc, where, addDoc } from "firebase/firestore"
import { useLanguage } from "@/context/language-context"
import { formatDistanceToNow } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export default function OrdersPage() {
  const { t, language } = useLanguage()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [audioEnabled, setAudioEnabled] = useState(false)
  const lastOrderCount = useRef(0)

  const emailLower = user?.email?.toLowerCase();
  const isSuperUser = emailLower === 'umbralcero7@gmail.com' || emailLower === 'amaroisaias611@gmail.com';

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);

  const isSupport = profile?.role === 'SUPPORT' || isSuperUser;
  const effectiveBusinessId = profile?.businessId || (isSuperUser ? 'matu' : null);
  const effectiveVenueName = profile?.assignedVenue || 'Sede Central';

  const ordersRef = useMemoFirebase(() => {
    if (!db) return null
    const baseQuery = collection(db, "orders");
    
    // Consulta simplificada: quitamos el orderBy de Firestore para evitar requisito de índices compuestos
    if (isSupport) {
      return query(baseQuery, where("status", "in", ["Open", "Preparing"]))
    }
    
    if (!effectiveBusinessId) return null
    return query(
      baseQuery, 
      where("businessId", "==", effectiveBusinessId),
      where("status", "in", ["Open", "Preparing"])
    )
  }, [db, effectiveBusinessId, isSupport])

  const { data: orders, isLoading } = useCollection(ordersRef)

  // Ordenamos en memoria para asegurar que las más recientes aparezcan primero sin fallos de índice
  const sortedOrders = useMemo(() => {
    if (!orders) return []
    return [...orders].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })
  }, [orders])

  // Sistema de Alerta Sonora por Nueva Comanda
  useMemo(() => {
    if (!orders || !audioEnabled) return;
    const currentNewOrders = orders.filter(o => o.status === 'Open').length;
    if (currentNewOrders > lastOrderCount.current) {
      // Beep de alta frecuencia para cocina
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // La natural
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      
      toast({ title: "¡NUEVA ORDEN!", description: "Se ha recibido una comanda en cocina.", variant: "default" });
    }
    lastOrderCount.current = currentNewOrders;
  }, [orders, audioEnabled, toast]);

  const filteredOrders = sortedOrders.filter(order => 
    order.tableNumber?.toString().includes(searchTerm) ||
    order.waiterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.assignedVenue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.orderNumber?.toString().includes(searchTerm)
  )

  const updateOrderStatus = async (order: any) => {
    if (!db) return
    
    let newStatus = "Preparing"
    if (order.status === "Preparing") newStatus = "Ready"
    if (order.status === "Ready" || order.status === "Closed") return

    try {
      await updateDoc(doc(db, "orders", order.id), { status: newStatus })
      
      if (newStatus === "Ready") {
        await addDoc(collection(db, "notifications"), {
          businessId: order.businessId || 'global',
          type: 'ORDER_READY',
          message: `¡Mesa #${order.tableNumber} está lista!`,
          tableNumber: order.tableNumber,
          status: 'unread',
          createdAt: new Date().toISOString(),
          assignedVenue: order.assignedVenue || 'Sede Aurora'
        })
        toast({ title: "Notificación Enviada", description: `Mesa ${order.tableNumber} lista para servir.` })
      } else {
        toast({ title: "Comanda en Marcha", description: `Preparando Mesa ${order.tableNumber}.` })
      }
    } catch (error) {
      console.error(error)
    }
  }

  const dateLocale = language === 'es' ? es : enUS

  return (
    <div className="p-6 md:p-10 space-y-10 bg-white min-h-full font-body max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-4">
            <ChefHat className="h-8 w-8 text-primary" />
            Monitor de Cocina • {isSupport ? 'Soberanía Global' : effectiveVenueName}
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">
            Visualización de comandas en tiempo real por # de orden.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!audioEnabled ? (
            <Button variant="outline" className="rounded-xl h-12 bg-orange-50 text-orange-600 border-orange-200 font-black text-[9px] uppercase" onClick={() => setAudioEnabled(true)}>
              <Bell className="mr-2 h-4 w-4 animate-ring" /> Activar Alerta Sonora
            </Button>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-600 border-emerald-200 font-black text-[9px] uppercase px-4 h-12 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Audio Activo
            </Badge>
          )}
          <div className="bg-primary/10 px-6 py-3 rounded-[1.2rem] border border-primary/20 flex items-center gap-3">
            {isSupport ? <ShieldCheck className="h-5 w-5 text-secondary" /> : <Utensils className="h-5 w-5 text-primary" />}
            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Producción Activa</span>
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Filtrar por comanda, mesa o mesero..." 
          className="pl-12 h-14 rounded-[1.5rem] bg-slate-50 border-none text-xs font-bold"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="font-black text-primary uppercase text-[10px] tracking-widest">Sincronizando Comandas...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-32">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full py-40 text-center border-4 border-dashed rounded-[2.5rem] bg-slate-50/50">
              <UtensilsCrossed className="h-16 w-16 mx-auto mb-6 opacity-10 text-slate-400" />
              <p className="text-slate-300 font-black uppercase text-xs tracking-widest px-10">Sin órdenes pendientes en cocina</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id} className="rounded-[2rem] border-slate-100 shadow-xl flex flex-col hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 pb-6 pt-8 px-8 border-b border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary text-white font-black text-[10px] rounded-lg px-2">#{order.orderNumber || '?'}</Badge>
                        <CardTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Mesa {order.tableNumber}</CardTitle>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                          <User className="h-3 w-3 text-primary" />
                          {order.waiterName || "Anónimo"}
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                          <Users className="h-3 w-3 text-secondary" />
                          {order.guestCount || 1} Clientes
                        </div>
                      </div>
                    </div>
                    <Badge className={cn("border-none rounded-full font-black text-[8px] uppercase px-3 py-1 shadow-sm", 
                      order.status === 'Open' ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
                    )}>
                      {order.status === 'Open' ? 'NUEVA' : 'EN PROCESO'}
                    </Badge>
                  </div>
                  <div className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {order.createdAt ? formatDistanceToNow(new Date(order.createdAt), { locale: dateLocale, addSuffix: true }) : '---'}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pt-8 px-8">
                  <ScrollArea className="h-48 pr-4">
                    <ul className="space-y-4">
                      {order.items?.map((item: any, idx: number) => (
                        <li key={idx} className="flex items-center gap-3">
                          <span className="h-6 w-6 rounded-lg bg-slate-900 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                            {item.quantity}
                          </span>
                          <span className="text-xs font-black text-slate-700 uppercase tracking-tight line-clamp-2">{item.name}</span>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="border-t border-slate-50 bg-slate-50/20 p-8">
                  <Button 
                    className={cn(
                      "w-full h-12 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg transition-all",
                      order.status === 'Open' ? "bg-slate-900 hover:bg-slate-800" : "bg-emerald-600 hover:bg-emerald-700"
                    )}
                    onClick={() => updateOrderStatus(order)}
                  >
                    {order.status === 'Open' ? 'Comenzar Preparación' : 'Marcar como Lista'}
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
