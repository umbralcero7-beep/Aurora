"use client"

import { isSuperUser } from '@/lib/constants';
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
  Bot,
  XCircle,
  AlertTriangle,
  Lock,
  FileText
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
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
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLanguage } from "@/context/language-context"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, limit, updateDoc, doc, where, getDocs, getDoc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError, FirestoreOfflineError, isOfflineError } from "@/firebase/errors"

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
  
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [menuSearch, setMenuSearch] = useState("")
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancellingDelivery, setCancellingDelivery] = useState<any>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [confirmOrderNum, setConfirmOrderNum] = useState("")
  
  const [isFinishing, setIsFinishing] = useState(false)
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false)
  const [customerRecognized, setCustomerRecognized] = useState(false)
  const [viewMode, setViewMode] = useState<'active' | 'cancelled'>('active')

  // Password verification for printing
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [printingOrder, setPrintingOrder] = useState<any>(null)
  const [adminPassword, setAdminPassword] = useState("")
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [deliveryData, setDeliveryData] = useState({
    customerName: "",
    phone: "",
    address: "",
    notes: ""
  })
  const [isElectronic, setIsElectronic] = useState(false)
  const [shippingCost, setShippingCost] = useState("")
  const [selectedItems, setSelectedItems] = useState<DeliveryItem[]>([])

  const ADMIN_PIN = "2025" // PIN de Auditoría Maestro Aurora

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
  const effectiveVenueName = isSupport ? 'AURORA GLOBAL HQ' : (profile?.assignedVenue || 'Sede Central');

  const deliveriesRef = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return query(
      collection(db, "deliveries"), 
      orderBy("createdAt", "desc"),
      limit(100)
    )
    if (!effectiveBusinessId) return null
    return query(
      collection(db, "deliveries"), 
      where("venueId", "==", effectiveBusinessId),
      orderBy("createdAt", "desc"),
      limit(100)
    )
  }, [db, effectiveBusinessId, isSupport])

  const menuRef = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return query(collection(db, "menu"), where("available", "==", true))
    if (!effectiveBusinessId) return null
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
    if (!deliveries || !mounted) return 0
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    return deliveries.filter(d => d.createdAt && new Date(d.createdAt) >= startOfToday && d.status !== 'Anulado').length
  }, [deliveries, mounted])

  const cancelledCount = useMemo(() => {
    if (!deliveries || !mounted) return 0
    return deliveries.filter(d => d.status === 'Anulado').length
  }, [deliveries, mounted])

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
            toast({ title: "Reconocimiento Exitoso", description: `Datos cargados de ${customer.name}.` })
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
  }, [deliveryData.phone, db, effectiveBusinessId, toast])

  const activeMenu = menuItems || [];

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

  const subtotal = selectedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0)
  const shipping = Number(shippingCost) || 0
  const total = subtotal + shipping

  const handlePrint = (order: any) => {
    if (profile?.role !== 'ADMIN' && profile?.role !== 'SUPPORT' && !isSuper) {
      setPrintingOrder(order)
      setShowPasswordDialog(true)
      return
    }
    executePrint(order)
  }

  const executePrint = (order: any) => {
    if (typeof window === 'undefined') return;
    const windowPrint = window.open('', '', 'width=600,height=800');
    if (windowPrint) {
      const ticketContent = (title: string) => `
        <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; text-align: center;">
          <div style="font-size: 10px; font-weight: bold; margin-bottom: 5px;">*** ${title} ***</div>
          <div style="font-size: 24px; font-weight: bold;">#DOM-${order.orderNumber}</div>
          <div style="text-transform: uppercase; font-weight: bold; margin-top: 5px;">${order.assignedVenue || effectiveVenueName}</div>
          <div style="font-size: 10px; margin-top: 2px;">FECHA: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
        </div>
        <div style="margin-bottom: 15px; font-size: 13px; line-height: 1.4;">
          <strong>CLIENTE:</strong> ${order.customerName.toUpperCase()}<br>
          <strong>TELÉFONO:</strong> ${order.phone}<br>
          <strong>DIRECCIÓN:</strong> ${order.address.toUpperCase()}
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          ${order.items.map((i: any) => `
            <tr>
              <td style="padding: 5px 0; font-size: 12px;">${i.quantity}x ${i.name.toUpperCase()}</td>
              <td align="right">$${(i.price * i.quantity).toLocaleString()}</td>
            </tr>
          `).join('')}
        </table>
        <div style="text-align: right; font-size: 18px; font-weight: bold; border-top: 1px dashed #000; padding-top: 10px;">
          TOTAL: $${order.total.toLocaleString()}
        </div>
      `;

      windowPrint.document.write(`
        <html>
          <body style="font-family: monospace; width: 300px;">
            ${ticketContent("COPIA DOMICILIARIO")}
            <div style="border-top: 2px dashed #000; margin: 40px 0;"></div>
            ${ticketContent("COPIA RECEPCIÓN")}
          </body>
        </html>
      `);
      windowPrint.document.close();
      windowPrint.focus();
      setTimeout(() => { windowPrint.print(); windowPrint.close(); }, 500);
    }
  }

  const handlePasswordVerify = async () => {
    if (!adminPassword || !printingOrder) {
      setPrintError(language === 'es' ? "Ingresa el PIN" : "Enter the PIN")
      return
    }
    setIsVerifyingPassword(true)
    setPrintError(null)

    try {
      if (adminPassword === ADMIN_PIN) {
        executePrint(printingOrder)
        setShowPasswordDialog(false)
        setAdminPassword("")
        setPrintingOrder(null)
      } else {
        setPrintError(language === 'es' ? "PIN Incorrecto" : "Incorrect PIN")
      }
    } catch (err) {
      setPrintError(language === 'es' ? "Error al verificar" : "Error verifying")
    } finally {
      setIsVerifyingPassword(false)
    }
  }

  const handleRegister = () => {
    if (!db || !deliveryData.customerName || !deliveryData.phone || !deliveryData.address || !effectiveBusinessId) {
      toast({ variant: "destructive", title: "Campos Incompletos", description: "Verifica los datos del cliente." })
      return
    }

    if (selectedItems.length === 0) {
      toast({ variant: "destructive", title: "Comanda Vacía", description: "Añade platos al pedido." })
      return
    }
    
    setIsFinishing(true)
    const orderNumber = todayCount + 1;
    
    const deliveryRef = doc(collection(db, "deliveries"));
    const orderData = {
      ...deliveryData,
      id: deliveryRef.id,
      orderNumber: orderNumber,
      items: selectedItems,
      subtotal: subtotal,
      shippingCost: shipping,
      total: total,
      status: "Pendiente",
      venueId: effectiveBusinessId,
      businessId: effectiveBusinessId,
      assignedVenue: effectiveVenueName,
      isElectronic: isElectronic, // Flag DIAN
      createdAt: new Date().toISOString(),
      registeredBy: user?.email || "System"
    };

    setDoc(deliveryRef, orderData)
      .then(() => {
        handlePrint(orderData);
        setIsRegisterOpen(false)
        setDeliveryData({ customerName: "", phone: "", address: "", notes: "" })
        setSelectedItems([])
        setIsElectronic(false)
        setCustomerRecognized(false)
        setIsFinishing(false)
        toast({ title: "Despacho Iniciado", description: `Comanda #${orderNumber} enviada.` })
      })
      .catch(async (err) => {
        setIsFinishing(false);
        if (isOfflineError(err)) {
          errorEmitter.emit('offline-error', new FirestoreOfflineError({
            path: deliveryRef.path,
            operation: 'create',
          }));
        } else {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: deliveryRef.path,
            operation: 'create',
            requestResourceData: orderData
          }));
        }
      })
  }

  const updateStatus = (deliveryId: string, newStatus: string, extraData: any = {}) => {
    if (!db) return
    const updatePayload = { 
      status: newStatus,
      ...extraData,
      updatedAt: new Date().toISOString()
    }

    updateDoc(doc(db, "deliveries", deliveryId), updatePayload)
      .catch(async (err) => {
        if (isOfflineError(err)) {
          errorEmitter.emit('offline-error', new FirestoreOfflineError({
            path: `deliveries/${deliveryId}`,
            operation: 'update',
          }));
        } else {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `deliveries/${deliveryId}`,
            operation: 'update',
            requestResourceData: updatePayload
          }));
        }
      })
    toast({ title: "Estado Actualizado", description: `Pedido marcado como ${newStatus}.` })
  }

  const confirmCancellation = () => {
    if (!cancellingDelivery || !cancelReason.trim() || confirmOrderNum !== cancellingDelivery.orderNumber.toString()) {
      toast({ variant: "destructive", title: "Error de Validación", description: "Verifica el número de domicilio." })
      return
    }

    updateStatus(cancellingDelivery.id, "Anulado", {
      cancellationReason: cancelReason.trim(),
      cancelledAt: new Date().toISOString(),
      cancelledBy: user?.email || "System"
    })
    setIsCancelDialogOpen(false)
    setCancellingDelivery(null)
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

  if (!mounted) return null;

  return (
    <div className="p-4 md:p-6 lg:p-10 space-y-6 md:space-y-8 bg-white min-h-full max-w-[1400px] mx-auto font-body">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-3 md:gap-4">
            <Truck className="h-6 md:h-8 w-6 md:w-8 text-primary" />
            {t.deliveries.title} • {effectiveVenueName}
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic hidden md:block">Gestión de Domicilios y Control de Despacho.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Button 
            variant={viewMode === 'cancelled' ? "secondary" : "outline"}
            className={cn("rounded-xl h-11 md:h-12 px-4 md:px-6 font-black text-[10px] uppercase tracking-widest", 
              viewMode === 'cancelled' && "bg-slate-900 text-white hover:bg-slate-800"
            )}
            onClick={() => setViewMode(viewMode === 'active' ? 'cancelled' : 'active')}
          >
            <XCircle className="mr-2 h-4 w-4" /> 
            {viewMode === 'active' ? `Anulados (${cancelledCount})` : "Ver Activos"}
          </Button>
          <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 rounded-xl h-11 md:h-12 px-6 md:px-8 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20">
                <Plus className="mr-2 h-5 w-5" /> {t.deliveries.register}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-2xl rounded-[2rem] p-0 overflow-hidden bg-white border-none shadow-2xl">
              <div className="flex flex-col md:flex-row h-auto md:h-[600px] max-h-[85vh] md:max-h-none">
                <div className="flex-1 p-4 md:p-10 space-y-4 md:space-y-6 border-r border-slate-50 overflow-y-auto">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <DialogTitle className="text-lg md:text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                        <Hash className="h-5 w-5 text-primary" />
                        Comanda #{todayCount + 1}
                      </DialogTitle>
                      {customerRecognized && <Badge className="bg-emerald-50 text-emerald-600 font-black text-[7px] uppercase">Cero: Conocido</Badge>}
                    </div>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Teléfono</Label>
                        <div className="relative">
                          <Phone className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4", isSearchingCustomer ? "animate-pulse text-primary" : "text-slate-300")} />
                          <Input 
                            type="tel"
                            className="h-12 pl-12 rounded-xl bg-slate-50 border-none font-black text-sm"
                            value={deliveryData.phone}
                            onChange={(e) => setDeliveryData({...deliveryData, phone: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Nombre</Label>
                        <Input 
                          className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase"
                          value={deliveryData.customerName}
                          onChange={(e) => setDeliveryData({...deliveryData, customerName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Dirección de Entrega</Label>
                      <Input 
                        className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase"
                        value={deliveryData.address}
                        onChange={(e) => setDeliveryData({...deliveryData, address: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Instrucciones</Label>
                      <Textarea 
                        className="h-20 rounded-xl bg-slate-50 border-none font-bold text-xs pt-3 uppercase resize-none"
                        value={deliveryData.notes}
                        onChange={(e) => setDeliveryData({...deliveryData, notes: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Costo de Envío</Label>
                      <Input 
                        type="number"
                        placeholder="0"
                        className="h-12 rounded-xl bg-slate-50 border-none font-black text-sm"
                        value={shippingCost}
                        onChange={(e) => setShippingCost(e.target.value)}
                      />
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                       <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                             <p className="text-[10px] font-black uppercase text-slate-900">Factura Electrónica DIAN</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase">Habilitar protocolo legal</p>
                          </div>
                       </div>
                       <Switch checked={isElectronic} onCheckedChange={setIsElectronic} />
                    </div>
                  </div>
                </div>
                
                <div className="w-full md:w-[320px] bg-slate-50/50 flex flex-col border-t md:border-t-0 max-h-[40vh] md:max-h-none">
                  <div className="p-4 md:p-8 pb-4 space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-primary flex items-center gap-2"><UtensilsCrossed className="h-3 w-3" /> Añadir Platos</h4>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                      <Input 
                        placeholder="Buscar..."
                        className="pl-9 h-10 rounded-xl bg-white border-slate-100 text-xs font-bold"
                        value={menuSearch}
                        onChange={(e) => setMenuSearch(e.target.value)}
                      />
                      {filteredMenuItems.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 max-h-48 overflow-y-auto">
                          {filteredMenuItems.map(item => (
                            <button key={item.id} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex justify-between items-center border-b last:border-none" onClick={() => addItem(item)}>
                              <div className="text-[10px] font-black uppercase">{item.name}</div>
                              <Plus className="h-3 w-3 text-slate-300" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <ScrollArea className="flex-1 px-4 md:px-8">
                    <div className="space-y-4 py-4">
                      {selectedItems.map(item => (
                        <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm space-y-2">
                          <div className="flex justify-between items-start">
                            <p className="text-[10px] font-black uppercase text-slate-700 leading-tight">{item.name}</p>
                            <button onClick={() => removeItem(item.id)}><X className="h-3 w-3 text-slate-300" /></button>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQuantity(item.id, -1)} className="h-6 w-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400"><Minus className="h-3 w-3" /></button>
                              <span className="text-[10px] font-black text-primary w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="h-6 w-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400"><Plus className="h-3 w-3" /></button>
                            </div>
                            <p className="text-[10px] font-black text-slate-900">{formatCurrencyDetailed(item.price * item.quantity)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="p-4 md:p-8 bg-white border-t border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase text-slate-400">Total</span>
                      <span className="text-xl font-black text-primary tracking-tighter">{formatCurrencyDetailed(total)}</span>
                    </div>
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 h-12 md:h-14 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg" 
                      onClick={handleRegister} 
                      disabled={isFinishing || selectedItems.length === 0}
                    >
                      {isFinishing ? <Loader2 className="animate-spin h-4 w-4" /> : <><Printer className="h-4 w-4" /> Despachar e Imprimir (x2)</>}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 h-4 md:h-5 w-4 md:w-5 text-slate-400" />
        <Input 
          placeholder="Buscar domicilio..."
          className="pl-12 md:pl-16 h-12 md:h-16 rounded-[1.5rem] md:rounded-[1.8rem] bg-slate-50 border-none text-sm font-bold placeholder:text-slate-300"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 md:py-40 gap-4">
          <Loader2 className="h-8 md:h-10 w-8 md:h-10 animate-spin text-primary" />
          <p className="font-black text-primary uppercase text-[10px] tracking-widest">Consultando Flujo...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 pb-24 md:pb-32">
          {filteredDeliveries.map((delivery) => (
            <Card key={delivery.id} className={cn(
              "rounded-[1.5rem] md:rounded-[2rem] border-slate-100 shadow-xl overflow-hidden flex flex-col bg-white",
              delivery.status === 'Anulado' && "opacity-70 grayscale-[0.5]"
            )}>
              <CardHeader className="bg-slate-50/50 p-6 md:p-8 border-b border-slate-100">
                <div className="flex justify-between items-start mb-3 md:mb-4">
                  <Badge className={cn("font-black text-[9px] md:text-[10px] px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase tracking-widest border-none shadow-sm", 
                    delivery.status === 'Pendiente' ? "bg-orange-500 text-white" : 
                    delivery.status === 'En Camino' ? "bg-primary text-white" : 
                    delivery.status === 'Anulado' ? "bg-slate-900 text-white" : "bg-emerald-500 text-white"
                  )}>
                    #DOM-{delivery.orderNumber} • {delivery.status}
                  </Badge>
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 md:gap-2">
                    <Clock className="h-3 w-3" />
                    {delivery.createdAt ? formatDistanceToNow(new Date(delivery.createdAt), { locale: dateLocale }) : "---"}
                  </span>
                </div>
                <CardTitle className="text-base md:text-lg font-black uppercase tracking-tight text-slate-900 line-clamp-1">{delivery.customerName}</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 flex items-center gap-2 mt-1 md:mt-2">
                  <Phone className="h-3 w-3 text-primary" /> {delivery.phone}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8 flex-1 space-y-4 md:space-y-6">
                <div className="space-y-1 md:space-y-2">
                  <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Dirección de Entrega</p>
                  <p className="text-xs md:text-sm font-bold text-slate-700 leading-relaxed uppercase italic">"{delivery.address}"</p>
                </div>
                
                {delivery.status === 'Anulado' && (
                  <div className="p-3 md:p-4 bg-destructive/5 rounded-xl border border-destructive/10 space-y-1 md:space-y-2">
                    <p className="text-[7px] md:text-[8px] font-black text-destructive uppercase tracking-widest flex items-center gap-1 md:gap-2"><AlertTriangle className="h-2.5 w-2.5" /> Motivo</p>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-600 uppercase italic">"{delivery.cancellationReason || "Sin motivo"}"</p>
                  </div>
                )}

                <div className="flex justify-between items-end border-t border-slate-50 pt-4 md:pt-6">
                  <div className="space-y-1">
                    {delivery.shippingCost > 0 && (
                      <p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase">Envío: {formatCurrencyDetailed(delivery.shippingCost)}</p>
                    )}
                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                    <p className="text-xl md:text-2xl font-black text-primary tracking-tighter">{formatCurrencyDetailed(delivery.total)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-xl h-9 md:h-10 w-9 md:w-10 text-slate-200" onClick={() => handlePrint(delivery)}>
                    <Printer className="h-4 md:h-5 w-4 md:w-5" />
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="p-6 md:p-8 pt-0 bg-white">
                <div className="grid grid-cols-2 gap-2 md:gap-3 w-full">
                  {delivery.status === 'Pendiente' && (
                    <>
                      <Button className="w-full bg-primary h-10 md:h-11 rounded-xl font-black text-[8px] md:text-[9px] uppercase tracking-widest" onClick={() => updateStatus(delivery.id, "En Camino")}>En Camino</Button>
                      <Button variant="outline" className="w-full border-destructive text-destructive h-10 md:h-11 rounded-xl font-black text-[8px] md:text-[9px] uppercase tracking-widest" onClick={() => { setCancellingDelivery(delivery); setIsCancelDialogOpen(true); }}>Anular</Button>
                    </>
                  )}
                  {delivery.status === 'En Camino' && (
                    <Button className="col-span-2 w-full bg-emerald-500 h-10 md:h-11 rounded-xl font-black text-[8px] md:text-[9px] uppercase tracking-widest" onClick={() => updateStatus(delivery.id, "Entregado")}>Entregado</Button>
                  )}
                  {delivery.status !== 'Entregado' && delivery.status !== 'Anulado' && (
                    <Button variant="outline" className="col-span-2 w-full border-slate-100 h-10 md:h-11 rounded-xl font-black text-[8px] md:text-[9px] uppercase tracking-widest" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.address)}`, '_blank')}>
                      <Navigation className="h-3 w-3 mr-1 md:mr-2" /> Ver Ruta
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="max-w-[90vw] md:max-w-md rounded-[2rem] p-6 md:p-10 bg-white">
          <DialogHeader className="space-y-3 md:space-y-4">
            <DialogTitle className="text-lg md:text-2xl font-black uppercase tracking-tighter text-slate-900">Protocolo de Anulación</DialogTitle>
          </DialogHeader>
          <div className="py-4 md:py-8 space-y-4 md:space-y-6">
            <div className="space-y-2">
              <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Confirmar # de Domicilio</Label>
              <Input placeholder={`Escribe ${cancellingDelivery?.orderNumber} para confirmar`} value={confirmOrderNum} onChange={(e) => setConfirmOrderNum(e.target.value)} className="h-12 md:h-14 rounded-2xl bg-slate-50 border-none font-black text-sm uppercase" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Motivo</Label>
              <Textarea placeholder="Motivo de la baja..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="h-24 md:h-32 rounded-2xl bg-slate-50 border-none font-bold text-xs uppercase" />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 md:h-16 bg-destructive hover:bg-destructive/90 text-white rounded-2xl font-black text-[9px] md:text-[10px] uppercase" onClick={confirmCancellation} disabled={!cancelReason.trim() || confirmOrderNum !== cancellingDelivery?.orderNumber.toString()}>
              Ejecutar Anulación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog for Printing */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-[90vw] md:max-w-sm rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl">
          <DialogHeader className="p-6 md:p-8 bg-slate-900 text-white">
            <DialogTitle className="text-base md:text-lg font-black uppercase flex items-center gap-2 md:gap-3">
              <Printer className="h-4 md:h-5 w-4 md:w-5" />
              {language === 'es' ? 'Impresión Restringida' : 'Restricted Printing'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 md:p-8 space-y-4 md:space-y-6">
            <p className="text-xs md:text-sm text-slate-500 text-center">
              {language === 'es' 
                ? 'Ingresa tu contraseña de ADMIN para imprimir este domicilio.'
                : 'Enter your ADMIN password to print this delivery.'}
            </p>
            <div className="space-y-2">
              <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                {language === 'es' ? 'Contraseña' : 'Password'}
              </Label>
              <Input 
                type="password"
                className="h-12 rounded-xl bg-slate-50 border-none font-black text-center text-xl tracking-widest"
                placeholder="****"
                maxLength={4}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordVerify()}
              />
              {printError && (
                <p className="text-xs text-destructive font-bold text-center">{printError}</p>
              )}
            </div>
          </div>
          <DialogFooter className="p-6 md:p-8 pt-0">
            <Button 
              className="w-full h-12 md:h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-[9px] md:text-[10px] uppercase" 
              onClick={handlePasswordVerify}
              disabled={isVerifyingPassword || !adminPassword}
            >
              {isVerifyingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'es' ? 'Imprimir' : 'Print')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
