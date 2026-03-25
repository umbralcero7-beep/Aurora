
"use client"

import { useState, useMemo, useEffect } from "react"
import { 
  Truck, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  User, 
  Clock, 
  CheckCircle2, 
  Loader2,
  Navigation,
  UtensilsCrossed,
  X,
  Minus,
  Printer,
  Hash,
  TrendingUp,
  Eye,
  Receipt,
  Edit2,
  Check,
  History,
  Bot,
  SearchCode,
  DatabaseZap,
  Globe,
  XCircle,
  RotateCcw,
  AlertTriangle,
  ClipboardList
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLanguage } from "@/context/language-context"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, addDoc, updateDoc, doc, where, getDocs, setDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"
import { es, enUS } from "date-fns/locale"

// Carta Aurora Precargada para Respaldo Demo
const DEFAULT_MENU = [
  { id: 'p1', name: 'Hamburguesa Aurora', price: 35000, category: 'Platos Fuertes', available: true },
  { id: 'p2', name: 'Empanadas de Carne (3)', price: 15000, category: 'Entradas', available: true },
  { id: 'p3', name: 'Limonada de Coco', price: 12000, category: 'Bebidas', available: true },
  { id: 'p4', name: 'Cerveza Club Colombia', price: 10000, category: 'Bebidas', available: true },
  { id: 'p5', name: 'Torta de Chocolate', price: 14000, category: 'Postres', available: true },
]

interface DeliveryItem {
  id: string
  name: string
  price: number
  quantity: number
}

export default function DeliveriesPage() {
  const { t, language } = useLanguage()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [menuSearch, setMenuSearch] = useState("")
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancellingDelivery, setCancellingDelivery] = useState<any>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [confirmOrderNum, setConfirmOrderNum] = useState("")
  
  const [loading, setLoading] = useState(false)
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false)
  const [customerRecognized, setCustomerRecognized] = useState(false)
  const [viewMode, setViewMode] = useState<'active' | 'cancelled'>('active')

  const [deliveryData, setDeliveryData] = useState({
    customerName: "",
    phone: "",
    address: "",
    notes: ""
  })
  const [selectedItems, setSelectedItems] = useState<DeliveryItem[]>([])

  const emailLower = user?.email?.toLowerCase();
  const isSuperUser = emailLower === 'umbralcero7@gmail.com';

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);

  const isSupport = profile?.role === 'SUPPORT' || isSuperUser;
  const effectiveBusinessId = profile?.businessId || (isSuperUser ? 'matu' : null);
  const effectiveVenueName = isSupport ? 'AURORA GLOBAL HQ' : (profile?.assignedVenue || 'Sede Central');

  const deliveriesRef = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return query(collection(db, "deliveries"), orderBy("createdAt", "desc"))
    return query(
      collection(db, "deliveries"), 
      where("venueId", "==", effectiveBusinessId),
      orderBy("createdAt", "desc")
    )
  }, [db, effectiveBusinessId, isSupport])

  const menuRef = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return query(collection(db, "menu"), where("available", "==", true))
    return query(
      collection(db, "menu"), 
      where("businessId", "==", effectiveBusinessId),
      where("available", "==", true)
    )
  }, [db, effectiveBusinessId, isSupport])

  const { data: deliveries, isLoading } = useCollection(deliveriesRef)
  const { data: menuItems } = useCollection(menuRef)

  const dateLocale = language === 'es' ? es : enUS

  const todayCount = useMemo(() => {
    if (!deliveries) return 0
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    return deliveries.filter(d => new Date(d.createdAt) >= startOfToday && d.status !== 'Anulado').length
  }, [deliveries])

  const cancelledCount = useMemo(() => {
    if (!deliveries) return 0
    return deliveries.filter(d => d.status === 'Anulado').length
  }, [deliveries])

  useEffect(() => {
    const fetchCustomer = async () => {
      if (deliveryData.phone.length >= 7 && db && effectiveBusinessId) {
        setIsSearchingCustomer(true)
        try {
          const q = query(
            collection(db, "customers"), 
            where("phone", "==", deliveryData.phone),
            where("businessId", "==", effectiveBusinessId)
          )
          const snap = await getDocs(q)
          if (!snap.empty) {
            const customer = snap.docs[0].data()
            setDeliveryData(prev => ({
              ...prev,
              customerName: customer.name || prev.customerName,
              address: customer.address || prev.address
            }))
            setCustomerRecognized(true)
            toast({
              title: "Cero: Reconocimiento Exitoso",
              description: `Datos cargados de ${customer.name}.`,
              duration: 2500
            })
          } else {
            setCustomerRecognized(false)
          }
        } catch (error) {
          console.error("Error reconociendo cliente:", error)
        } finally {
          setIsSearchingCustomer(false)
        }
      } else {
        setCustomerRecognized(false)
      }
    }

    const timer = setTimeout(fetchCustomer, 800)
    return () => clearTimeout(timer)
  }, [deliveryData.phone, db, effectiveBusinessId])

  const activeMenu = (menuItems && menuItems.length > 0) ? menuItems : DEFAULT_MENU;

  const filteredMenuItems = useMemo(() => {
    if (!menuSearch) return []
    return activeMenu?.filter(item => 
      item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
      item.category?.toLowerCase().includes(menuSearch.toLowerCase())
    ).slice(0, 5) || []
  }, [activeMenu, menuSearch])

  const addItem = (item: any) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { id: item.id, name: item.name, price: Number(item.price), quantity: 1 }]
    })
    setMenuSearch("")
  }

  const removeItem = (id: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== id))
  }

  const updateQuantity = (id: string, delta: number) => {
    setSelectedItems(prev => prev.map(i => 
      i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    ))
  }

  const total = selectedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0)

  const handlePrint = (order: any) => {
    const windowPrint = window.open('', '', 'width=600,height=600');
    if (windowPrint) {
      windowPrint.document.write(`
        <html>
          <head>
            <title>Ticket Domicilio Fiscal</title>
            <style>
              body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; width: 300px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
              .order-num { font-size: 24px; font-weight: bold; }
              .details { margin-bottom: 15px; font-size: 13px; line-height: 1.4; }
              .items { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              .items td { padding: 5px 0; font-size: 12px; vertical-align: top; }
              .total { text-align: right; font-size: 18px; font-weight: bold; border-top: 1px dashed #000; padding-top: 10px; }
              .footer { text-align: center; margin-top: 25px; font-size: 10px; opacity: 0.7; border-top: 1px solid #eee; padding-top: 10px; }
              @media print { body { margin: 0; padding: 10px; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="order-num">#DOM-${order.orderNumber}</div>
              <div style="text-transform: uppercase; font-weight: bold; margin-top: 5px;">${order.assignedVenue || effectiveVenueName}</div>
              <div style="font-size: 10px; margin-top: 2px;">FECHA: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
              <div style="font-size: 8px; opacity: 0.6; margin-top: 4px;">CONTROL FISCAL AURORA V4.0</div>
            </div>
            <div class="details">
              <strong>CLIENTE:</strong> ${order.customerName.toUpperCase()}<br>
              <strong>TELÉFONO:</strong> ${order.phone}<br>
              <strong>DIRECCIÓN:</strong> ${order.address.toUpperCase()}<br>
              ${order.notes ? `<strong>NOTAS:</strong> ${order.notes.toUpperCase()}` : ''}
            </div>
            <div style="border-bottom: 1px dashed #000; margin-bottom: 5px; font-weight: bold; font-size: 11px;">DETALLE DE COMANDA</div>
            <table class="items">
              ${order.items.map((i: any) => `
                <tr>
                  <td>${i.quantity}x ${i.name.toUpperCase()}</td>
                  <td align="right">$${(i.price * i.quantity).toLocaleString()}</td>
                </tr>
              `).join('')}
            </table>
            <div class="total">
              TOTAL A COBRAR: $${order.total.toLocaleString()}
            </div>
            <div class="footer">
              AURORA OS — PROTOCOLO DE DESPACHO<br>
              Soberanía Tecnológica por Umbral Cero
            </div>
          </body>
        </html>
      `);
      windowPrint.document.close();
      windowPrint.focus();
      setTimeout(() => {
        windowPrint.print();
        windowPrint.close();
      }, 500);
    }
  }

  const handleRegister = async () => {
    if (!db || !deliveryData.customerName || !deliveryData.phone || !deliveryData.address || !effectiveBusinessId) {
      toast({ variant: "destructive", title: "Campos Incompletos", description: "Verifica los datos del cliente." })
      return
    }

    if (selectedItems.length === 0) {
      toast({ variant: "destructive", title: "Comanda Vacía", description: "Añade platos al pedido." })
      return
    }
    
    setLoading(true)
    try {
      const orderNumber = todayCount + 1;
      const orderData = {
        ...deliveryData,
        orderNumber: orderNumber,
        items: selectedItems,
        total: total,
        status: "Pendiente",
        venueId: effectiveBusinessId,
        assignedVenue: effectiveVenueName,
        createdAt: new Date().toISOString(),
        registeredBy: user?.email || "System"
      };

      const docRef = await addDoc(collection(db, "deliveries"), orderData)
      
      const customerId = deliveryData.phone.replace(/\s+/g, '');
      const customerRef = doc(db, "customers", `${effectiveBusinessId}_${customerId}`);
      await setDoc(customerRef, {
        name: deliveryData.customerName,
        phone: deliveryData.phone,
        address: deliveryData.address,
        businessId: effectiveBusinessId,
        assignedVenue: effectiveVenueName,
        lastVisit: new Date().toISOString(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast({ title: "Despacho Iniciado", description: `Comanda #${orderNumber} enviada. CRM actualizado.` })
      
      handlePrint({ id: docRef.id, ...orderData });

      setIsRegisterOpen(false)
      setDeliveryData({ customerName: "", phone: "", address: "", notes: "" })
      setSelectedItems([])
      setCustomerRecognized(false)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (deliveryId: string, newStatus: string, extraData: any = {}) => {
    if (!db) return
    try {
      await updateDoc(doc(db, "deliveries", deliveryId), { 
        status: newStatus,
        ...extraData,
        updatedAt: new Date().toISOString()
      })
      toast({ title: "Estado Actualizado", description: `Pedido marcado como ${newStatus}.` })
    } catch (error) {
      console.error(error)
    }
  }

  const handleOpenCancelDialog = (delivery: any) => {
    setCancellingDelivery(delivery)
    setCancelReason("")
    setConfirmOrderNum("")
    setIsCancelDialogOpen(true)
  }

  const confirmCancellation = async () => {
    if (!cancellingDelivery || !cancelReason.trim() || confirmOrderNum !== cancellingDelivery.orderNumber.toString()) {
      toast({ variant: "destructive", title: "Error de Validación", description: "Verifica el número de domicilio y el motivo." })
      return
    }

    setLoading(true)
    try {
      await updateStatus(cancellingDelivery.id, "Anulado", {
        cancellationReason: cancelReason.trim(),
        cancelledAt: new Date().toISOString(),
        cancelledBy: user?.email || "System"
      })
      setIsCancelDialogOpen(false)
      setCancellingDelivery(null)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDeliveries = useMemo(() => {
    const list = deliveries?.filter(d => 
      d.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone?.includes(searchTerm) ||
      d.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.orderNumber?.toString().includes(searchTerm)
    ) || []

    if (viewMode === 'active') {
      return list.filter(d => d.status !== 'Anulado')
    } else {
      return list.filter(d => d.status === 'Anulado')
    }
  }, [deliveries, searchTerm, viewMode])

  return (
    <div className="p-6 md:p-10 space-y-8 bg-white min-h-full max-w-[1400px] mx-auto font-body">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-4">
            <Truck className="h-8 w-8 text-primary" />
            {t.deliveries.title} • {effectiveVenueName}
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">Gestión de Domicilios y CRM Invisible de Alta Escala.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button 
            variant={viewMode === 'cancelled' ? "secondary" : "outline"}
            className={cn("rounded-xl h-12 px-6 font-black text-[10px] uppercase tracking-widest transition-all", 
              viewMode === 'cancelled' && "bg-slate-900 text-white hover:bg-slate-800"
            )}
            onClick={() => setViewMode(viewMode === 'active' ? 'cancelled' : 'active')}
          >
            <XCircle className="mr-2 h-4 w-4" /> 
            {viewMode === 'active' ? `Domicilios Anulados (${cancelledCount})` : "Ver Domicilios Activos"}
          </Button>
          <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 md:flex-none bg-primary hover:bg-primary/90 rounded-xl h-12 px-8 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
                <Plus className="mr-2 h-5 w-5" /> {t.deliveries.register}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-2xl rounded-[2rem] md:rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl">
              <div className="flex flex-col md:flex-row h-auto md:h-[600px]">
                <div className="flex-1 p-6 md:p-10 space-y-6 border-r border-slate-50 overflow-y-auto">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                        <Hash className="h-5 w-5 text-primary" />
                        Comanda #{todayCount + 1}
                      </DialogTitle>
                      {customerRecognized && (
                        <Badge className="bg-emerald-500 text-white font-black text-[7px] uppercase tracking-widest animate-in fade-in zoom-in-95 duration-500">
                          <Bot className="h-2.5 w-2.5 mr-1" /> Cero: Conocido
                        </Badge>
                      )}
                    </div>
                    <DialogDescription className="text-xs font-bold italic text-slate-400">Reconocimiento automático de clientes (Escala Masiva).</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Teléfono (Búsqueda CRM)</Label>
                        <div className="relative">
                          <Phone className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", isSearchingCustomer ? "animate-pulse text-primary" : customerRecognized ? "text-emerald-500" : "text-slate-300")} />
                          <Input 
                            type="tel"
                            placeholder="300 000 0000"
                            className={cn("h-12 pl-12 rounded-xl bg-slate-50 border-none font-black text-sm", customerRecognized && "ring-2 ring-emerald-500/20 bg-emerald-50/10")}
                            value={deliveryData.phone}
                            onChange={(e) => setDeliveryData({...deliveryData, phone: e.target.value})}
                          />
                          {customerRecognized && <Check className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 animate-in zoom-in duration-300" />}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre del Cliente</Label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                          <Input 
                            className="h-12 pl-12 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase"
                            value={deliveryData.customerName}
                            onChange={(e) => setDeliveryData({...deliveryData, customerName: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center ml-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Dirección de Entrega</Label>
                        {customerRecognized && (
                          <span className="text-[7px] font-black text-primary uppercase flex items-center gap-1 animate-pulse">
                            <History className="h-2 w-2" /> Última registrada
                          </span>
                        )}
                      </div>
                      <div className="relative group">
                        <MapPin className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4", customerRecognized ? "text-primary" : "text-slate-300")} />
                        <Input 
                          className={cn("h-12 pl-12 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase transition-all", customerRecognized && "bg-white border-2 border-primary/10 shadow-inner")}
                          value={deliveryData.address}
                          onChange={(e) => setDeliveryData({...deliveryData, address: e.target.value})}
                        />
                        <button className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit2 className="h-3 w-3 text-slate-300 hover:text-primary" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Instrucciones Especiales</Label>
                      <Textarea 
                        className="h-20 rounded-xl bg-slate-50 border-none font-bold text-xs pt-3 uppercase resize-none"
                        placeholder="Ej: Portería, apto 201..."
                        value={deliveryData.notes}
                        onChange={(e) => setDeliveryData({...deliveryData, notes: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="w-full md:w-[320px] bg-slate-50/50 flex flex-col border-t md:border-t-0">
                  <div className="p-6 md:p-8 pb-4 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <UtensilsCrossed className="h-3 w-3" /> Añadir Platos
                    </h4>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                      <Input 
                        placeholder="Buscar en la carta..."
                        className="pl-9 h-10 rounded-xl bg-white border-slate-100 text-xs font-bold"
                        value={menuSearch}
                        onChange={(e) => setMenuSearch(e.target.value)}
                      />
                      {filteredMenuItems.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                          {filteredMenuItems.map(item => (
                            <button 
                              key={item.id}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none flex justify-between items-center"
                              onClick={() => addItem(item)}
                            >
                              <div>
                                <p className="text-[10px] font-black uppercase text-slate-900">{item.name}</p>
                                <p className="text-[8px] font-bold text-primary">{formatCurrencyDetailed(item.price)}</p>
                              </div>
                              <Plus className="h-3 w-3 text-slate-300" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <ScrollArea className="flex-1 px-6 md:px-8 max-h-[200px] md:max-h-none">
                    <div className="space-y-4 py-4">
                      {selectedItems.length === 0 ? (
                        <div className="py-10 text-center opacity-20">
                          <p className="text-[8px] font-black uppercase tracking-widest">Sin platos</p>
                        </div>
                      ) : (
                        selectedItems.map(item => (
                          <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm space-y-2">
                            <div className="flex justify-between items-start">
                              <p className="text-[10px] font-black uppercase text-slate-700 leading-tight">{item.name}</p>
                              <button onClick={() => removeItem(item.id)}><X className="h-3 w-3 text-slate-300 hover:text-destructive" /></button>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateQuantity(item.id, -1)} className="h-6 w-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90"><Minus className="h-3 w-3" /></button>
                                <span className="text-[10px] font-black text-primary w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="h-6 w-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90"><Plus className="h-3 w-3" /></button>
                              </div>
                              <p className="text-[10px] font-black text-slate-900">{formatCurrencyDetailed(item.price * item.quantity)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <div className="p-6 md:p-8 bg-white border-t border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase text-slate-400">Total Pedido</span>
                      <span className="text-xl font-black text-primary tracking-tighter">{formatCurrencyDetailed(total)}</span>
                    </div>
                    <Button className="w-full bg-primary hover:bg-primary/90 h-14 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 flex gap-2 active:scale-95" onClick={handleRegister} disabled={loading}>
                      {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <><Printer className="h-4 w-4" /> Despachar e Imprimir</>}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[2rem] p-2 transition-all hover:shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Domicilios de Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-primary tracking-tighter">{todayCount}</div>
            <p className="text-[9px] mt-2 text-muted-foreground font-black uppercase tracking-tight flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" /> Trazabilidad Activa
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[2rem] p-2 transition-all hover:shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado de Bajas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              {cancelledCount}
            </div>
            <p className="text-[9px] mt-2 text-muted-foreground font-black uppercase tracking-tight flex items-center gap-1">
              <XCircle className="h-3 w-3 text-destructive" /> Registros Anulados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Buscar por # Comanda, teléfono o nombre..."
          className="pl-16 h-16 rounded-[1.8rem] bg-slate-50 border-none text-sm font-bold placeholder:text-slate-300 shadow-none focus:ring-2 focus:ring-primary/10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="font-black text-primary uppercase text-[10px] tracking-widest">Consultando Flujo Externo...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDeliveries.length === 0 ? (
            <div className="col-span-full py-40 text-center border-4 border-dashed rounded-[2.5rem] bg-slate-50/50">
              <Truck className="h-16 w-16 mx-auto mb-6 opacity-10 text-slate-400" />
              <p className="text-slate-300 font-black uppercase text-xs tracking-widest">
                {viewMode === 'active' ? "No hay domicilios activos" : "No hay domicilios anulados"}
              </p>
            </div>
          ) : (
            filteredDeliveries.map((delivery) => (
              <Card key={delivery.id} className={cn(
                "rounded-[2rem] border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col bg-white",
                delivery.status === 'Anulado' && "opacity-70 grayscale-[0.5]"
              )}>
                <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-2">
                      <Badge className={cn("font-black text-[10px] px-4 py-1.5 rounded-full uppercase tracking-widest border-none shadow-sm", 
                        delivery.status === 'Pendiente' ? "bg-orange-500 text-white" : 
                        delivery.status === 'En Camino' ? "bg-primary text-white" : 
                        delivery.status === 'Anulado' ? "bg-slate-900 text-white" : "bg-emerald-500 text-white"
                      )}>
                        #DOM-{delivery.orderNumber} • {delivery.status}
                      </Badge>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {delivery.createdAt ? formatDistanceToNow(new Date(delivery.createdAt), { locale: dateLocale }) : "---"}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 line-clamp-1">{delivery.customerName}</CardTitle>
                  <CardDescription className="text-xs font-bold text-slate-400 flex items-center gap-2 mt-2">
                    <Phone className="h-3 w-3 text-primary" /> {delivery.phone}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 flex-1 space-y-6">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dirección de Entrega</p>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed uppercase italic">"{delivery.address}"</p>
                  </div>
                  
                  {delivery.status === 'Anulado' && (
                    <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/10 space-y-2">
                      <p className="text-[8px] font-black text-destructive uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle className="h-2.5 w-2.5" /> Motivo de Anulación
                      </p>
                      <p className="text-[10px] font-bold text-slate-600 uppercase italic leading-relaxed">
                        "{delivery.cancellationReason || "Sin motivo registrado"}"
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Comanda</p>
                    <ul className="space-y-2">
                      {delivery.items?.map((item: any, idx: number) => (
                        <li key={idx} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="h-5 w-5 rounded-md bg-slate-50 flex items-center justify-center text-[9px] font-black text-slate-500">{item.quantity}</span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase truncate max-w-[1400px]">{item.name}</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-400">{formatCurrencyDetailed(item.price * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-50 pt-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total recaudado</p>
                      <p className="text-2xl font-black text-primary tracking-tighter">{formatCurrencyDetailed(delivery.total)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-slate-200 hover:text-primary transition-all" onClick={() => handlePrint(delivery)}>
                        <Printer className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-8 pt-0 bg-white">
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {delivery.status === 'Pendiente' && (
                      <>
                        <Button className="w-full bg-primary h-11 rounded-xl font-black text-[9px] uppercase tracking-widest" onClick={() => updateStatus(delivery.id, "En Camino")}>
                          Marcar en Camino
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full border-destructive text-destructive h-11 rounded-xl font-black text-[9px] uppercase tracking-widest"
                          onClick={() => handleOpenCancelDialog(delivery)}
                        >
                          Anular Pedido
                        </Button>
                      </>
                    )}
                    {delivery.status === 'En Camino' && (
                      <>
                        <Button className="w-full bg-emerald-500 h-11 rounded-xl font-black text-[9px] uppercase tracking-widest" onClick={() => updateStatus(delivery.id, "Entregado")}>
                          Confirmar Entrega
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full border-destructive text-destructive h-11 rounded-xl font-black text-[9px] uppercase tracking-widest" 
                          onClick={() => handleOpenCancelDialog(delivery)}
                        >
                          Anular
                        </Button>
                      </>
                    )}
                    {delivery.status === 'Entregado' && (
                      <div className="col-span-2 flex items-center justify-center gap-2 py-3 bg-emerald-50 rounded-xl text-emerald-600 font-black text-[9px] uppercase">
                        <CheckCircle2 className="h-4 w-4" /> Entrega Exitosa
                      </div>
                    )}
                    {delivery.status === 'Anulado' && (
                      <>
                        <div className="col-span-1 flex items-center justify-center gap-2 py-3 bg-slate-900 rounded-xl text-white font-black text-[9px] uppercase">
                          <XCircle className="h-4 w-4" /> Anulado
                        </div>
                        <Button variant="outline" className="w-full border-primary text-primary h-11 rounded-xl font-black text-[9px] uppercase tracking-widest" onClick={() => updateStatus(delivery.id, "Pendiente")}>
                          <RotateCcw className="h-3 w-3 mr-2" /> Restaurar
                        </Button>
                      </>
                    )}
                    {delivery.status !== 'Entregado' && delivery.status !== 'Anulado' && (
                      <Button variant="outline" className="col-span-2 w-full border-slate-100 h-11 rounded-xl font-black text-[9px] uppercase tracking-widest" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.address)}`, '_blank')}>
                        <Navigation className="h-3 w-3 mr-2" /> Ver Ruta en Mapas
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}

      {/* DIÁLOGO DE ANULACIÓN MAESTRO */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-10 bg-white border-none shadow-2xl">
          <DialogHeader className="space-y-4">
            <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-[1.5rem] flex items-center justify-center shadow-inner">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900">Protocolo de Anulación</DialogTitle>
              <DialogDescription className="text-xs font-bold text-slate-400 italic">
                Sede: {effectiveVenueName} • Auditoría Obligatoria
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="py-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Confirmar # de Domicilio</Label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                <Input 
                  placeholder={`Escribe ${cancellingDelivery?.orderNumber} para confirmar`}
                  value={confirmOrderNum}
                  onChange={(e) => setConfirmOrderNum(e.target.value)}
                  className="h-14 pl-12 rounded-2xl bg-slate-50 border-none font-black text-sm uppercase focus:ring-2 focus:ring-destructive/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Motivo de la Anulación</Label>
              <div className="relative">
                <ClipboardList className="absolute left-4 top-6 h-4 w-4 text-slate-300" />
                <Textarea 
                  placeholder="Ej: Cliente no respondió, error en dirección, pedido duplicado..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="h-32 pl-12 pt-5 rounded-2xl bg-slate-50 border-none font-bold text-xs uppercase resize-none focus:ring-2 focus:ring-destructive/20"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-3">
            <Button 
              className="w-full h-16 bg-destructive hover:bg-destructive/90 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-destructive/20 transition-all active:scale-95 disabled:opacity-30"
              onClick={confirmCancellation}
              disabled={loading || !cancelReason.trim() || confirmOrderNum !== cancellingDelivery?.orderNumber.toString()}
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Ejecutar Anulación de Registro"}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full h-12 font-black text-[10px] uppercase text-slate-400"
              onClick={() => setIsCancelDialogOpen(false)}
            >
              Mantener Pedido Activo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
