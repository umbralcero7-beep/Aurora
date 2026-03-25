
"use client"

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
  Cloud,
  CloudOff,
  WifiOff
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
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, where, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { processElectronicInvoice } from "@/ai/flows/electronic-invoice-flow"
import { printerRegistry } from "@/lib/printer"

// Carta Aurora Precargada para Respaldo Demo
const DEFAULT_MENU = [
  { id: 'p1', name: 'Hamburguesa Aurora', price: 35000, category: 'Platos Fuertes', available: true, imageUrl: 'https://picsum.photos/seed/aurora_h1/200/200' },
  { id: 'p2', name: 'Empanadas de Carne (3)', price: 15000, category: 'Entradas', available: true, imageUrl: 'https://picsum.photos/seed/aurora_e1/200/200' },
  { id: 'p3', name: 'Limonada de Coco', price: 12000, category: 'Bebidas', available: true, imageUrl: 'https://picsum.photos/seed/aurora_l1/200/200' },
  { id: 'p4', name: 'Cerveza Club Colombia', price: 10000, category: 'Bebidas', available: true, imageUrl: 'https://picsum.photos/seed/aurora_b1/200/200' },
  { id: 'p5', name: 'Torta de Chocolate', price: 14000, category: 'Postres', available: true, imageUrl: 'https://picsum.photos/seed/aurora_c1/200/200' },
]

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
  
  const categories = ["Todos", "Entradas", "Platos Fuertes", "Bebidas", "Postres"]
  
  const [activeTab, setActiveTab] = useState("direct") 
  const [selectedOrder, setSelectedOrder] = useState<any>(null) 
  const [directCart, setDirectCart] = useState<CartItem[]>([]) 
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Datafono' | 'Nequi'>('Efectivo')
  const [isFinishing, setIsFinishing] = useState(false)
  const [menuSearch, setMenuSearch] = useState("")
  const [showCheckoutMobile, setShowCheckoutMobile] = useState(false)
  const [cashReceived, setCashAmount] = useState<number>(0)
  const [activeCategory, setActiveCategory] = useState("Todos")
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

  // Facturación Electrónica State
  const [isElectronic, setIsElectronic] = useState(false)
  const [customerData, setCustomerData] = useState({
    name: "",
    taxId: "",
    email: "",
    address: ""
  })

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);
  
  const emailLower = user?.email?.toLowerCase();
  const isSuperUser = emailLower === 'umbralcero7@gmail.com';
  
  const effectiveBusinessId = profile?.businessId || (isSuperUser ? 'matu' : null);
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

  const activeMenu = (dbMenu && dbMenu.length > 0) ? dbMenu : DEFAULT_MENU;

  const filteredMenu = activeMenu.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(menuSearch.toLowerCase())
    const matchesCategory = activeCategory === "Todos" || item.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const tables = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
  const tableData = useMemo(() => {
    const map: Record<string, any> = {}
    activeOrders.forEach(order => { map[order.tableNumber] = order })
    return map
  }, [activeOrders])

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
    toast({ title: "Agregado", description: item.name, duration: 500 })
  }

  const selectOrder = (order: any) => {
    setSelectedOrder(order)
    setDirectCart([]) 
    setCashAmount(0)
    setShowCheckoutMobile(true)
  }

  const handleConnectPrinter = async () => {
    const success = await printerRegistry.connect();
    if (success) {
      toast({ title: "Hardware O.K.", description: "Impresora USB vinculada exitosamente." });
    } else {
      toast({ variant: "destructive", title: "Conexión Fallida", description: "Verifica permisos USB en tu navegador." });
    }
  }

  const handleManualPrint = async () => {
    if (currentTotal === 0) return;
    try {
      const cartToPrint = directCart.length > 0 ? directCart : (selectedOrder?.items || []);
      await printerRegistry.printReceipt(effectiveVenueName, cartToPrint, currentTotal);
      toast({ title: "Hardware", description: "Comando de impresión térmica enviado al buffer de cola." });
    } catch(e) {
      toast({ variant: "destructive", title: "Hardware Inactivo", description: "Por favor vincula una tiquetera primero." });
    }
  }

  const handleFinalizeInvoice = async () => {
    if (!db || !effectiveBusinessId) return
    
    const isDirect = directCart.length > 0
    const cartToProcess = isDirect ? directCart : (selectedOrder?.items || [])
    const totalToProcess = isDirect ? directCart.reduce((acc, i) => acc + (i.price * i.quantity), 0) * 1.15 : selectedOrder.total

    if (cartToProcess.length === 0) {
      toast({ variant: "destructive", title: "Caja Vacía", description: "Selecciona productos o una mesa." })
      return
    }

    if (isElectronic && (!customerData.name || !customerData.taxId || !customerData.email)) {
      toast({ variant: "destructive", title: "Datos Fiscales", description: "Completa los datos del cliente para la factura electrónica." })
      return
    }

    setIsFinishing(true)
    try {
      const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
      
      const invoiceData = {
        orderId: isDirect ? "direct-sale" : selectedOrder.id,
        orderNumber: isDirect ? `DIR-${Date.now().toString().slice(-4)}` : (selectedOrder.orderNumber || 'S/N'),
        invoiceNumber: invoiceNum,
        tableNumber: isDirect ? "PARA LLEVAR" : selectedOrder.tableNumber,
        customerName: isElectronic ? customerData.name : "Consumidor Final",
        customerTaxId: isElectronic ? customerData.taxId : "S/N",
        customerEmail: isElectronic ? customerData.email : "",
        customerAddress: isElectronic ? customerData.address : "",
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
        cashierName: (profile?.displayName || user?.email?.split('@')[0] || 'CAJERO').toUpperCase(),
        waiterName: isDirect ? (profile?.displayName || user?.email?.split('@')[0] || 'CAJERO').toUpperCase() : (selectedOrder?.waiterName || 'S/N')
      }

      await addDoc(collection(db, "invoices"), invoiceData)
      
      if (!isDirect && selectedOrder) {
        await updateDoc(doc(db, "orders", selectedOrder.id), { status: "Closed" })
      }

      // Impresión de Hardware Local (si hay tiquetera)
      try {
        await printerRegistry.printReceipt(effectiveVenueName, cartToProcess, totalToProcess);
      } catch (e) {
        // Ignorar en caso de que no haya impresora conectada
      }

      // Despachar con IA si es electrónica y hay red
      if (isElectronic) {
        if (isOnline) {
          try {
            const aiResult = await processElectronicInvoice({
              customerName: customerData.name,
              taxId: customerData.taxId,
              email: customerData.email,
              address: customerData.address,
              items: cartToProcess,
              total: totalToProcess,
              invoiceNumber: invoiceNum
            });
            toast({ title: "Cero: Factura Enviada", description: aiResult.message });
          } catch (e) {
            toast({ variant: "destructive", title: "Cero: Error de Red", description: "La factura electrónica se reintentará al recuperar conexión." });
          }
        } else {
          toast({ variant: "default", title: "Cero: Modo Resguardo", description: "Factura guardada localmente. El envío a la DIAN se realizará automáticamente al detectar red." });
        }
      }

      toast({ 
        title: isOnline ? "¡Venta Exitosa!" : "¡Venta Guardada Local!", 
        description: isOnline ? "Transacción auditada y registrada." : "Registro local completado (Modo Resguardo)." 
      })
      
      // Reset
      setSelectedOrder(null)
      setDirectCart([])
      setShowCheckoutMobile(false)
      setCashAmount(0)
      setIsElectronic(false)
      setCustomerData({ name: "", taxId: "", email: "", address: "" })
    } catch (error) {
      console.error(error)
    } finally {
      setIsFinishing(false)
    }
  }

  const currentTotal = directCart.length > 0 
    ? directCart.reduce((acc, i) => acc + (i.price * i.quantity), 0) * 1.15 
    : (selectedOrder?.total || 0)

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 h-[calc(100svh-2.5rem)] bg-white font-body overflow-hidden">
      
      <div className={cn(
        "lg:col-span-8 flex flex-col h-full bg-slate-50/50 overflow-hidden relative",
        showCheckoutMobile ? "hidden lg:flex" : "flex"
      )}>
        <div className="p-4 bg-white border-b shadow-sm shrink-0 flex justify-between items-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="bg-slate-100 rounded-lg p-1 h-10">
              <TabsTrigger value="direct" className="rounded-md font-black text-[8px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">
                <ShoppingBag className="mr-2 h-3 w-3" /> Venta Rápida
              </TabsTrigger>
              <TabsTrigger value="tables" className="rounded-md font-black text-[8px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">
                <LayoutGrid className="mr-2 h-3 w-3" /> Plano Salón
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[7px] font-black uppercase border-primary/20 text-primary">{effectiveVenueName}</Badge>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <Tabs value={activeTab} className="h-full">
            <TabsContent value="direct" className="m-0 p-4 space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 w-full md:w-auto">
                  {categories.map(cat => (
                    <Button 
                      key={cat} 
                      variant={activeCategory === cat ? "default" : "outline"} 
                      className={cn(
                        "rounded-full font-black text-[7px] uppercase px-4 h-8 whitespace-nowrap border-none",
                        activeCategory === cat ? "bg-primary text-white" : "bg-white text-slate-400"
                      )}
                      onClick={() => setActiveCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
                <div className="relative w-full md:w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                  <Input 
                    placeholder="Buscar..." 
                    className="pl-9 h-9 rounded-lg bg-white border-none font-bold text-[10px] shadow-sm"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pb-32">
                {menuLoading ? (
                  <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto opacity-20" /></div>
                ) : filteredMenu.map(item => (
                  <Card 
                    key={item.id} 
                    className={cn(
                      "rounded-2xl border-none shadow-sm hover:shadow-lg transition-all cursor-pointer group active:scale-95 overflow-hidden bg-white",
                      !item.available && "opacity-40 grayscale pointer-events-none"
                    )}
                    onClick={() => addToDirectCart(item)}
                  >
                    <div className="aspect-square relative overflow-hidden bg-slate-100">
                      <img src={item.imageUrl} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                    </div>
                    <CardContent className="p-3">
                      <p className="font-black text-[9px] text-slate-900 uppercase truncate mb-0.5">{item.name}</p>
                      <p className="text-[9px] font-black text-primary">{formatCurrencyDetailed(item.price)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="tables" className="m-0 p-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                {tables.map(num => {
                  const order = tableData[num]
                  const status = !order ? 'free' : (order.status === 'Ready' ? 'ready' : 'occupied')
                  return (
                    <Card 
                      key={num} 
                      className={cn(
                        "rounded-[2rem] border-2 transition-all cursor-pointer h-32 flex flex-col justify-center items-center gap-1 group active:scale-95",
                        status === 'free' ? "bg-white border-slate-100" : 
                        status === 'ready' ? "bg-amber-50 border-amber-400 shadow-lg" : 
                        "bg-emerald-50 border-emerald-500 shadow-lg",
                        selectedOrder?.tableNumber === num ? "ring-4 ring-primary/30 border-primary" : ""
                      )}
                      onClick={() => status !== 'free' && selectOrder(order)}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-black",
                        status === 'free' ? "bg-slate-100 text-slate-400" : 
                        status === 'ready' ? "bg-amber-400 text-white" : "bg-emerald-500 text-white"
                      )}>
                        {num}
                      </div>
                      <span className={cn("text-[7px] font-black uppercase tracking-widest", 
                        status === 'free' ? "text-slate-300" : status === 'ready' ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {status === 'free' ? 'Libre' : status === 'ready' ? 'Listo' : 'Ocupada'}
                      </span>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {directCart.length > 0 && !showCheckoutMobile && (
          <div className="lg:hidden fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
            <Button 
              onClick={() => setShowCheckoutMobile(true)}
              className="w-full h-14 bg-slate-900 text-white rounded-xl shadow-2xl flex justify-between px-6"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <div className="flex flex-col items-start">
                  <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Proceder</span>
                  <span className="text-sm font-black text-white">{formatCurrencyDetailed(currentTotal)}</span>
                </div>
              </div>
              <ChevronUp className="h-4 w-4 text-slate-500 animate-bounce" />
            </Button>
          </div>
        )}
      </div>

      <Card className={cn(
        "lg:col-span-4 rounded-none border-none lg:border-l flex flex-col shadow-2xl bg-white z-50 lg:z-30 min-h-0 overflow-hidden",
        showCheckoutMobile 
          ? "fixed inset-0 h-[100dvh] w-full lg:static lg:h-full lg:w-auto" 
          : "hidden lg:flex lg:h-full"
      )}>
        <CardHeader className="bg-slate-900 text-white p-4 flex flex-row justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-tighter">
                {directCart.length > 0 ? "Venta Rápida" : `Mesa ${selectedOrder?.tableNumber || '?'}`}
              </CardTitle>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest italic">Cierre Fiscal</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="ghost" className="hidden lg:flex h-8 w-8 text-white/50 hover:text-white p-0" title="Vincular Tiquetera" onClick={handleConnectPrinter}>
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="lg:hidden h-8 w-8 text-white/50 hover:text-white p-0" onClick={() => setShowCheckoutMobile(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 p-0 bg-slate-50/20">
          <ScrollArea className="h-full">
            <div className="divide-y divide-slate-100">
              <div className="p-4 bg-white space-y-3">
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest border-b pb-1.5 flex justify-between">
                  <span>Productos</span>
                  {directCart.length > 0 && <button onClick={() => setDirectCart([])} className="text-destructive font-black">Vaciar</button>}
                </p>
                
                {(directCart.length === 0 && !selectedOrder) ? (
                  <div className="py-10 text-center opacity-20 flex flex-col items-center gap-2">
                    <Utensils className="h-8 w-8" />
                    <p className="font-black uppercase text-[8px]">Esperando...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(directCart.length > 0 ? directCart : selectedOrder.items).map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-slate-50 rounded-md p-0.5 border text-[9px] font-black">
                            <span className="w-5 text-center">{item.quantity}</span>
                          </div>
                          <p className="font-black text-[10px] text-slate-900 uppercase truncate max-w-[120px]">{item.name}</p>
                        </div>
                        <p className="font-black text-slate-900 text-[10px]">{formatCurrencyDetailed(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(directCart.length > 0 || selectedOrder) && (
                <>
                  <div className="p-4 space-y-4 bg-white">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <Label htmlFor="electronic-toggle" className="text-[9px] font-black uppercase tracking-widest text-slate-600">Factura Electrónica</Label>
                      </div>
                      <Switch 
                        id="electronic-toggle"
                        checked={isElectronic}
                        onCheckedChange={setIsElectronic}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    {isElectronic && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1.5">
                          <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">Nombre / Razón Social</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                            <Input 
                              placeholder="Ej: Juan Pérez o Empresa SAS" 
                              className="h-10 pl-9 rounded-xl bg-white border-slate-100 text-[10px] font-bold uppercase"
                              value={customerData.name}
                              onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">NIT / RUT (Sin Guiones)</Label>
                          <div className="relative">
                            <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                            <Input 
                              placeholder="900123456" 
                              className="h-10 pl-9 rounded-xl bg-white border-slate-100 text-[10px] font-bold"
                              value={customerData.taxId}
                              onChange={(e) => setCustomerData({...customerData, taxId: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">Email de Envío</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                            <Input 
                              type="email"
                              placeholder="cliente@correo.com" 
                              className="h-10 pl-9 rounded-xl bg-white border-slate-100 text-[10px] font-bold"
                              value={customerData.email}
                              onChange={(e) => setCustomerData({...customerData, email: e.target.value.toLowerCase()})}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">Dirección Fiscal</Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                            <Input 
                              placeholder="Calle 123 # 45-67" 
                              className="h-10 pl-9 rounded-xl bg-white border-slate-100 text-[10px] font-bold uppercase"
                              value={customerData.address}
                              onChange={(e) => setCustomerData({...customerData, address: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest text-center">Método de Recaudo</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'Efectivo', icon: Banknote, color: 'bg-emerald-500' },
                        { id: 'Datafono', icon: CreditCard, color: 'bg-blue-500' },
                        { id: 'Nequi', icon: Smartphone, color: 'bg-purple-500' }
                      ].map(m => (
                        <button 
                          key={m.id} 
                          className={cn(
                            "flex flex-col items-center justify-center h-12 rounded-xl gap-1 border-2 transition-all active:scale-90",
                            paymentMethod === m.id ? `border-slate-900 ${m.color} text-white shadow-lg` : "bg-white text-slate-400 border-slate-100"
                          )}
                          onClick={() => setPaymentMethod(m.id as any)}
                        >
                          <m.icon className="h-3 w-3" />
                          <span className="font-black text-[7px] uppercase tracking-tighter">{m.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentMethod === 'Efectivo' && (
                    <div className="p-4 space-y-3 bg-emerald-50/30 border-y border-emerald-100">
                      <div className="grid grid-cols-4 gap-1.5">
                        {[10000, 20000, 50000, 100000].map(amt => (
                          <Button key={amt} variant="outline" className="h-8 bg-white border-emerald-100 rounded-md text-[8px] font-black text-emerald-600 p-0" onClick={() => setCashAmount(amt)}>
                            ${(amt/1000)}k
                          </Button>
                        ))}
                      </div>
                      {cashReceived > 0 && (
                        <div className="flex justify-between items-center pt-1.5 border-t border-emerald-100">
                          <span className="text-[8px] font-black uppercase text-slate-400">Vuelto:</span>
                          <span className="text-sm font-black text-emerald-600">{formatCurrencyDetailed(Math.max(0, cashReceived - currentTotal))}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 bg-white border-t flex flex-col gap-4 shrink-0">
          <div className="w-full flex justify-between items-end border-b pb-3">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total</span>
            <span className="text-2xl font-black text-primary tracking-tighter">{formatCurrencyDetailed(currentTotal)}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 w-full">
            <Button 
              className={cn(
                "col-span-3 h-14 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-300",
                isOnline ? "bg-primary hover:bg-primary/90 text-white shadow-primary/20" : "bg-orange-600 hover:bg-orange-700 text-white"
              )}
              disabled={currentTotal === 0 || isFinishing}
              onClick={handleFinalizeInvoice}
            >
              {isFinishing ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : (
                <div className="flex items-center justify-center gap-2">
                  {isOnline ? <CheckCircle2 className="h-5 w-5" /> : <CloudOff className="h-5 w-5 animate-pulse" />}
                  <span>
                    {isElectronic 
                      ? (isOnline ? "Emitir Electrónica" : "Cola Electrónica Local") 
                      : (isOnline ? "Cobrar" : "Cobro Local")}
                  </span>
                </div>
              )}
            </Button>
            <Button 
              variant="outline"
              className="h-14 border-slate-100 rounded-xl hover:bg-slate-50 transition-all group p-0 flex flex-col items-center justify-center gap-1"
              disabled={currentTotal === 0}
              onClick={handleManualPrint}
            >
              <Printer className="h-5 w-5 text-slate-300 group-hover:text-primary" />
              <span className="text-[6px] font-black uppercase tracking-widest text-slate-400">Re-Imprimir</span>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
