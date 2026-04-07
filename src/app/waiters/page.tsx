"use client"

import { isSuperUser } from '@/lib/constants';
import { useState, useMemo, useEffect } from "react"
import { 
  Users, 
  Search, 
  TrendingUp,
  Utensils,
  Wine,
  DollarSign,
  Clock,
  Hash,
  Calendar,
  FileSpreadsheet,
  Printer,
  Loader2,
  Download,
  ChevronDown,
  BarChart3,
  User,
  Coffee,
  Beef,
  IceCreamCone,
  Soup,
  GlassWater
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, where, orderBy, doc, setDoc, getDocs, limit } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import * as XLSX from 'xlsx'

interface WaiterStats {
  waiterName: string
  tablesAttended: number
  guestsServed: number
  totalSales: number
  itemsSold: Record<string, { name: string, quantity: number, category: string, total: number }>
  ordersCount: number
}

export default function WaitersPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedWaiter, setSelectedWaiter] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary')

  useEffect(() => { setMounted(true) }, [])

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);

  const isSuper = isSuperUser(user?.email);
  const effectiveBusinessId = profile?.businessId || (isSuper ? 'matu' : null);

  const ordersRef = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(
      collection(db, "orders"),
      where("businessId", "==", effectiveBusinessId),
      orderBy("createdAt", "desc")
    )
  }, [db, effectiveBusinessId])

  const invoicesRef = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(
      collection(db, "invoices"),
      where("businessId", "==", effectiveBusinessId),
      orderBy("timestamp", "desc")
    )
  }, [db, effectiveBusinessId])

  const { data: allOrders } = useCollection(ordersRef)
  const { data: allInvoices } = useCollection(invoicesRef)

  const waiterLogsRef = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(
      collection(db, "waiter_logs"),
      where("businessId", "==", effectiveBusinessId),
      orderBy("date", "desc"),
      limit(100)
    )
  }, [db, effectiveBusinessId])

  const { data: waiterLogs } = useCollection(waiterLogsRef)

  const monthRange = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)
    return { start, end }
  }, [selectedMonth])

  const sessionOrders = useMemo(() => {
    if (!allOrders) return []
    return allOrders.filter(o => {
      if (!o.createdAt) return false
      const d = new Date(o.createdAt)
      return d >= monthRange.start && d <= monthRange.end && o.status !== 'Cancelled'
    })
  }, [allOrders, monthRange])

  const sessionInvoices = useMemo(() => {
    if (!allInvoices) return []
    return allInvoices.filter(inv => {
      if (!inv.timestamp) return false
      const d = new Date(inv.timestamp)
      return d >= monthRange.start && d <= monthRange.end
    })
  }, [allInvoices, monthRange])

  const waiterStats = useMemo(() => {
    const map: Record<string, WaiterStats> = {}

    sessionOrders.forEach(order => {
      const name = order.waiterName || 'SIN ASIGNAR'
      if (!map[name]) {
        map[name] = { waiterName: name, tablesAttended: 0, guestsServed: 0, totalSales: 0, itemsSold: {}, ordersCount: 0 }
      }
      map[name].tablesAttended += 1
      map[name].guestsServed += Number(order.guestCount || 0)
      map[name].ordersCount += 1

      order.items?.forEach((item: any) => {
        const key = item.id
        if (!map[name].itemsSold[key]) {
          map[name].itemsSold[key] = { name: item.name, quantity: 0, category: item.category || 'General', total: 0 }
        }
        map[name].itemsSold[key].quantity += Number(item.quantity || 0)
        map[name].itemsSold[key].total += Number(item.price || 0) * Number(item.quantity || 0)
      })
    })

    sessionInvoices.forEach(inv => {
      const name = inv.cashierName || 'SIN ASIGNAR'
      if (!map[name]) {
        map[name] = { waiterName: name, tablesAttended: 0, guestsServed: 0, totalSales: 0, itemsSold: {}, ordersCount: 0 }
      }
      map[name].totalSales += Number(inv.total || 0)

      inv.items?.forEach((item: any) => {
        const key = item.id
        if (!map[name].itemsSold[key]) {
          map[name].itemsSold[key] = { name: item.name, quantity: 0, category: item.category || 'General', total: 0 }
        }
        map[name].itemsSold[key].quantity += Number(item.quantity || 0)
        map[name].itemsSold[key].total += Number(item.price || 0) * Number(item.quantity || 0)
      })
    })

    return Object.values(map).sort((a, b) => b.totalSales - a.totalSales)
  }, [sessionOrders, sessionInvoices])

  const filteredWaiters = useMemo(() => {
    if (!searchTerm) return waiterStats
    return waiterStats.filter(w => w.waiterName.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [waiterStats, searchTerm])

  const selectedWaiterData = useMemo(() => {
    if (!selectedWaiter) return null
    return waiterStats.find(w => w.waiterName === selectedWaiter)
  }, [selectedWaiter, waiterStats])

  const exportToExcel = () => {
    const data = waiterStats.map(w => ({
      'Mesero': w.waiterName,
      'Mesas Atendidas': w.tablesAttended,
      'Comensales': w.guestsServed,
      'Órdenes': w.ordersCount,
      'Ventas Totales': w.totalSales,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bitácora Meseros')
    XLSX.writeFile(wb, `bitacora_meseros_${selectedMonth}.xlsx`)
    toast({ title: "Exportado", description: "Bitácora exportada a Excel." })
  }

  const exportWaiterDetail = (waiter: WaiterStats) => {
    const items = Object.values(waiter.itemsSold).map(i => ({
      'Producto': i.name,
      'Categoría': i.category,
      'Cantidad': i.quantity,
      'Total': i.total,
    }))
    const ws = XLSX.utils.json_to_sheet(items)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, waiter.waiterName)
    XLSX.writeFile(wb, `detalle_${waiter.waiterName.replace(/\s/g, '_')}_${selectedMonth}.xlsx`)
    toast({ title: "Exportado", description: `Detalle de ${waiter.waiterName} exportado.` })
  }

  const printWaiterDetail = (waiter: WaiterStats) => {
    if (typeof window === 'undefined') return
    const w = window.open('', '', 'width=600,height=800')
    if (!w) return
    const items = Object.values(waiter.itemsSold).sort((a, b) => b.quantity - a.quantity)
    const drinks = items.filter(i => i.category === 'Bebidas' || i.category === 'Postres')
    const dishes = items.filter(i => i.category !== 'Bebidas' && i.category !== 'Postres')

    w.document.write(`
      <html><head><title>Bitacora_${waiter.waiterName}</title>
      <style>
        body { font-family: 'Courier New', monospace; padding: 20px; font-size: 11px; color: #000; width: 300px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .section { margin-bottom: 15px; }
        .section-title { font-weight: bold; display: block; margin-bottom: 5px; text-transform: uppercase; border-bottom: 1px solid #000; }
        table { width: 100%; border-collapse: collapse; }
        table td { padding: 2px 0; border-bottom: 1px dotted #ccc; }
        .footer { text-align: center; margin-top: 30px; font-size: 8px; opacity: 0.5; border-top: 1px dashed #000; padding-top: 10px; }
      </style></head><body>
        <div class="header">
          <div style="font-weight: bold; font-size: 14px;">AURORA OS</div>
          <div style="font-size: 10px;">BITÁCORA DE SERVICIO</div>
          <div style="font-size: 12px; font-weight: bold; margin-top: 5px;">${waiter.waiterName}</div>
          <div style="font-size: 10px;">${format(new Date(), 'MMMM yyyy', { locale: es })}</div>
        </div>
        <div class="section">
          <span class="section-title">RESUMEN</span>
          <table>
            <tr><td>Mesas atendidas:</td><td align="right">${waiter.tablesAttended}</td></tr>
            <tr><td>Comensales:</td><td align="right">${waiter.guestsServed}</td></tr>
            <tr><td>Órdenes:</td><td align="right">${waiter.ordersCount}</td></tr>
            <tr><td>Ventas totales:</td><td align="right">$${waiter.totalSales.toLocaleString()}</td></tr>
          </table>
        </div>
        ${dishes.length > 0 ? `<div class="section">
          <span class="section-title">PLATOS Y FUERTES (${dishes.reduce((a, i) => a + i.quantity, 0)} unidades)</span>
          <table>${dishes.map(i => `<tr><td>${i.quantity}x ${i.name}</td><td align="right">$${i.total.toLocaleString()}</td></tr>`).join('')}</table>
        </div>` : ''}
        ${drinks.length > 0 ? `<div class="section">
          <span class="section-title">BEBIDAS Y POSTRES (${drinks.reduce((a, i) => a + i.quantity, 0)} unidades)</span>
          <table>${drinks.map(i => `<tr><td>${i.quantity}x ${i.name}</td><td align="right">$${i.total.toLocaleString()}</td></tr>`).join('')}</table>
        </div>` : ''}
        <div class="footer">AURORA OS • Umbral Cero<br>${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
      </body></html>
    `)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  const categoryTotals = useMemo(() => {
    if (!selectedWaiterData) return {}
    const cats: Record<string, { quantity: number, total: number }> = {}
    Object.values(selectedWaiterData.itemsSold).forEach(item => {
      if (!cats[item.category]) cats[item.category] = { quantity: 0, total: 0 }
      cats[item.category].quantity += item.quantity
      cats[item.category].total += item.total
    })
    return cats
  }, [selectedWaiterData])

  const categoryIcons: Record<string, any> = {
    'Entradas': Soup,
    'Platos Fuertes': Beef,
    'Bebidas': GlassWater,
    'Postres': IceCreamCone,
    'Guarniciones': Utensils,
    'Sopas': Coffee,
  }

  if (!mounted) return null

  return (
    <div className="p-4 md:p-10 space-y-8 bg-white min-h-full max-w-[1600px] mx-auto font-body">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-4">
            <Users className="h-8 w-8 text-primary" />
            Bitácora de Meseros
          </h1>
          <p className="text-[9px] md:text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic hidden md:block">
            Rendimiento individual por mesero • {format(monthRange.start, 'MMMM yyyy', { locale: es })}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 items-start sm:items-center w-full sm:w-auto">
          <Input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="w-full sm:w-40 h-9 md:h-10 rounded-xl bg-slate-50 border-slate-100 text-[9px] md:text-[10px] font-bold"
          />
          <Button variant="outline" className="w-full sm:w-auto h-9 md:h-10 rounded-xl border-slate-200 font-black text-[8px] md:text-[9px] uppercase" onClick={exportToExcel}>
            <FileSpreadsheet className="mr-1 md:mr-2 h-3 md:h-4 w-3 md:w-4 text-emerald-500" /> <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-slate-900 text-white border-none shadow-xl rounded-[1.5rem] md:rounded-[2rem] p-1.5 md:p-2">
          <CardHeader className="pb-0.5 md:pb-1"><CardTitle className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Meseros</CardTitle></CardHeader>
          <CardContent><div className="text-2xl md:text-3xl font-black">{waiterStats.length}</div></CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[1.5rem] md:rounded-[2rem] p-1.5 md:p-2">
          <CardHeader className="pb-0.5 md:pb-1"><CardTitle className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Mesas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl md:text-3xl font-black text-slate-900">{waiterStats.reduce((a, w) => a + w.tablesAttended, 0)}</div></CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[1.5rem] md:rounded-[2rem] p-1.5 md:p-2">
          <CardHeader className="pb-0.5 md:pb-1"><CardTitle className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Comensales</CardTitle></CardHeader>
          <CardContent><div className="text-2xl md:text-3xl font-black text-slate-900">{waiterStats.reduce((a, w) => a + w.guestsServed, 0)}</div></CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[1.5rem] md:rounded-[2rem] p-1.5 md:p-2">
          <CardHeader className="pb-0.5 md:pb-1"><CardTitle className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Ventas Equipo</CardTitle></CardHeader>
          <CardContent><div className="text-lg md:text-2xl font-black text-primary">{formatCurrencyDetailed(waiterStats.reduce((a, w) => a + w.totalSales, 0))}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
        <div className="lg:col-span-5">
          <Card className="rounded-[1.5rem] md:rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 md:py-6 px-4 md:px-8">
              <div className="flex justify-between items-center gap-2">
                <CardTitle className="text-xs md:text-sm font-black uppercase tracking-tighter flex items-center gap-1.5 md:gap-2">
                  <BarChart3 className="h-3 md:h-4 w-3 md:w-4 text-primary" /> Ranking del Mes
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                  <Input placeholder="Buscar..." className="pl-8 h-8 w-24 md:w-32 rounded-lg bg-white border-slate-100 text-[9px] md:text-[10px]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[350px] md:h-[500px]">
                <div className="p-2 md:p-4 space-y-1.5 md:space-y-2">
                  {filteredWaiters.length === 0 ? (
                    <div className="text-center py-16 md:py-20 opacity-20 text-xs font-black uppercase">Sin datos</div>
                  ) : (
                    filteredWaiters.map((w, idx) => (
                      <button
                        key={w.waiterName}
                        onClick={() => { setSelectedWaiter(w.waiterName); setViewMode('detail') }}
                        className={cn(
                          "w-full p-3 md:p-4 rounded-xl md:rounded-2xl text-left transition-all flex items-center gap-3 md:gap-4",
                          selectedWaiter === w.waiterName ? "bg-primary text-white shadow-lg" : "bg-slate-50 hover:bg-slate-100"
                        )}
                      >
                        <div className={cn(
                          "h-8 md:h-10 w-8 md:w-10 rounded-full flex items-center justify-center font-black text-xs md:text-sm shrink-0",
                          selectedWaiter === w.waiterName ? "bg-white/20 text-white" : idx === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-500"
                        )}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-[10px] md:text-xs uppercase truncate">{w.waiterName}</p>
                          <div className="flex gap-2 md:gap-3 mt-0.5 md:mt-1">
                            <span className={cn("text-[8px] md:text-[9px] font-bold", selectedWaiter === w.waiterName ? "text-white/70" : "text-slate-400")}>
                              {w.tablesAttended} mesas
                            </span>
                            <span className={cn("text-[8px] md:text-[9px] font-bold", selectedWaiter === w.waiterName ? "text-white/70" : "text-slate-400")}>
                              {w.guestsServed} personas
                            </span>
                          </div>
                        </div>
                        <span className={cn("font-black text-sm shrink-0", selectedWaiter === w.waiterName ? "text-white" : "text-primary")}>
                          {formatCurrencyDetailed(w.totalSales)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7">
          {!selectedWaiterData ? (
            <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl h-full flex items-center justify-center">
              <CardContent className="text-center py-20">
                <User className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-black text-slate-300 uppercase">Selecciona un mesero</p>
                <p className="text-[10px] text-slate-300 mt-1">Haz clic en un mesero para ver su detalle</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden">
              <CardHeader className="bg-slate-900 text-white py-6 px-8">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tighter">{selectedWaiterData.waiterName}</CardTitle>
                    <CardDescription className="text-[9px] font-black text-slate-400 uppercase mt-1">
                      {selectedWaiterData.tablesAttended} mesas • {selectedWaiterData.guestsServed} comensales • {selectedWaiterData.ordersCount} órdenes
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="h-9 text-white/70 hover:text-white text-[9px] uppercase" onClick={() => printWaiterDetail(selectedWaiterData)}>
                      <Printer className="mr-2 h-4 w-4" /> Imprimir
                    </Button>
                    <Button variant="ghost" className="h-9 text-white/70 hover:text-white text-[9px] uppercase" onClick={() => exportWaiterDetail(selectedWaiterData)}>
                      <Download className="mr-2 h-4 w-4" /> Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(categoryTotals).map(([cat, data]) => {
                    const Icon = categoryIcons[cat] || Utensils
                    return (
                      <div key={cat} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-3 w-3 text-primary" />
                          <span className="text-[8px] font-black uppercase text-slate-400">{cat}</span>
                        </div>
                        <p className="text-lg font-black text-slate-900">{data.quantity}</p>
                        <p className="text-[9px] font-bold text-primary">{formatCurrencyDetailed(data.total)}</p>
                      </div>
                    )
                  })}
                </div>

                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead className="font-black text-[9px] uppercase">Producto</TableHead><TableHead className="font-black text-[9px] uppercase">Categoría</TableHead><TableHead className="text-right font-black text-[9px] uppercase">Cant.</TableHead><TableHead className="text-right font-black text-[9px] uppercase">Total</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.values(selectedWaiterData.itemsSold)
                        .sort((a, b) => b.quantity - a.quantity)
                        .map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-black text-[10px] uppercase">{item.name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[8px] font-bold">{item.category}</Badge></TableCell>
                          <TableCell className="text-right font-black text-[10px]">{item.quantity}</TableCell>
                          <TableCell className="text-right font-black text-[10px] text-primary">{formatCurrencyDetailed(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
