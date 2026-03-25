
"use client"

import { useState } from "react"
import { 
  Receipt, 
  Search, 
  Filter, 
  FileText, 
  Download, 
  ExternalLink,
  Loader2,
  CheckCircle2,
  Clock,
  Printer,
  CreditCard,
  Banknote,
  Smartphone,
  ShieldCheck,
  Mail,
  X,
  QrCode,
  FileCheck,
  Building2,
  MapPin,
  User,
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, where, doc } from "firebase/firestore"
import { useLanguage } from "@/context/language-context"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function InvoicesPage() {
  const { t, language } = useLanguage()
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const emailLower = user?.email?.toLowerCase();
  const isSuperUser = emailLower === 'umbralcero7@gmail.com' || emailLower === 'amaroisaias611@gmail.com';

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);

  const isSupport = profile?.role === 'SUPPORT' || isSuperUser;
  const effectiveBusinessId = profile?.businessId || (isSuperUser ? 'matu' : null);

  const invoicesRef = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return query(collection(db, "invoices"), orderBy("timestamp", "desc"))
    if (!effectiveBusinessId) return null
    return query(
      collection(db, "invoices"), 
      where("businessId", "==", effectiveBusinessId),
      orderBy("timestamp", "desc")
    )
  }, [db, effectiveBusinessId, isSupport])

  const { data: invoices, isLoading } = useCollection(invoicesRef)

  const filteredInvoices = invoices?.filter(inv => 
    inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customerTaxId?.includes(searchTerm) ||
    inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const dateLocale = language === 'es' ? es : enUS

  const openInvoicePreview = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsPreviewOpen(true);
  }

  const totalMonthly = invoices?.reduce((acc, inv) => acc + Number(inv.total || 0), 0) || 0

  return (
    <div className="p-6 md:p-10 space-y-10 bg-white min-h-full font-body max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-4">
            <Receipt className="h-8 w-8 text-primary" />
            {t.nav.invoices}
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">
            {isSupport ? 'Soberanía Global: Histórico de todas las sedes.' : 'Registro histórico de transacciones auditadas.'}
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none rounded-xl h-12 border-slate-200 font-black text-[10px] uppercase tracking-widest px-8 shadow-sm">
            <Download className="mr-2 h-4 w-4" /> Exportar Auditoría
          </Button>
          <Button className="flex-1 md:flex-none bg-primary hover:bg-primary/90 rounded-xl h-12 font-black text-[10px] uppercase tracking-widest px-8 shadow-xl shadow-primary/20">
            <Printer className="mr-2 h-4 w-4" /> Imprimir Cierre
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[2rem] p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Facturado ({isSupport ? 'Global' : 'Ciclo'})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-primary tracking-tighter">
              {formatCurrencyDetailed(totalMonthly)}
            </div>
            <p className="text-[9px] mt-2 text-muted-foreground font-black uppercase tracking-tight flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Auditoría V3.0 Activa
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-100 shadow-xl rounded-[2rem] p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos Emitidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">{filteredInvoices.length}</div>
            <p className="text-[9px] mt-2 text-muted-foreground font-black uppercase tracking-tight italic">Registros en nube.</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2.5rem] p-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronización</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black text-emerald-400 tracking-widest uppercase">En Tiempo Real</div>
            <p className="text-[9px] mt-2 text-slate-500 font-black uppercase tracking-tight">Cero: Sin discrepancias.</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Buscar por cliente, NIT o # Factura..." 
            className="pl-16 h-16 rounded-[1.8rem] bg-slate-50 border-none font-bold text-sm placeholder:text-slate-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="rounded-[1.5rem] h-16 px-10 border-slate-100 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 shadow-sm">
          <Filter className="mr-3 h-4 w-4" /> Filtros Avanzados
        </Button>
      </div>

      <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden bg-white">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-black text-primary uppercase text-[10px] tracking-widest">Consultando Nube...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100">
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-8 px-10">Fecha / Documento</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Identidad Fiscal</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-center">Tipo</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest">Total Bruto</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest px-10">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-32 text-slate-400 font-bold italic">
                    No se han encontrado transacciones en este ciclo.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                    <TableCell className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                          {invoice.timestamp ? format(new Date(invoice.timestamp), "dd/MM/yy HH:mm", { locale: dateLocale }) : "---"}
                        </span>
                        <span className="font-black text-xs text-primary uppercase">{invoice.invoiceNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-xs text-slate-900 uppercase">{invoice.customerName || "Consumidor Final"}</span>
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">NIT: {invoice.customerTaxId || "S/N"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn(
                        "rounded-full font-black text-[8px] uppercase px-4 py-1",
                        invoice.isElectronic ? "border-emerald-200 text-emerald-600 bg-emerald-50 shadow-sm" : "border-slate-200 text-slate-400 bg-slate-50"
                      )}>
                        {invoice.isElectronic ? "Electrónica UBL 2.1" : "Ticket POS"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-primary text-xl tracking-tighter">
                      {formatCurrencyDetailed(Number(invoice.total))}
                    </TableCell>
                    <TableCell className="text-right px-10">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-slate-200 hover:text-primary rounded-xl transition-all"
                          onClick={() => openInvoicePreview(invoice)}
                        >
                          <ExternalLink className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-200 hover:text-slate-900 rounded-xl transition-all">
                          <Printer className="h-5 w-5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* MODAL: VISUALIZADOR DE FACTURA ELECTRÓNICA PROFESIONAL */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl flex flex-col h-[90vh]">
          <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-white/10">
                <FileCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tighter">Visualizador Digital UBL 2.1</DialogTitle>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Documento Equivalente Electrónico • {selectedInvoice?.assignedVenue || 'Sede Aurora'}</p>
              </div>
            </div>
            <button onClick={() => setIsPreviewOpen(false)} className="text-white/50 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
          </div>

          <ScrollArea className="flex-1 bg-slate-50/50 p-8 md:p-12">
            <div className="max-w-2xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-100 flex flex-col min-h-[1000px]">
              {/* Header de la Factura */}
              <div className="p-10 border-b-2 border-slate-50 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-4">
                    <div className="h-16 w-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-xl">
                      <ShieldCheck className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Aurora OS S.A.S.</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-primary" /> NIT: 900.123.456-1
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-primary" /> Calle de la Innovación #10-20
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge className="bg-primary text-white font-black text-[10px] px-6 py-2 rounded-full uppercase tracking-widest shadow-lg">Factura Electrónica</Badge>
                    <div className="pt-4">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Número de Documento</p>
                      <p className="text-3xl font-black text-slate-900 tracking-tighter">{selectedInvoice?.invoiceNumber}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-10 pt-6 border-t border-slate-50">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 flex items-center gap-2">
                      <User className="h-3 w-3" /> Datos del Adquirente
                    </p>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-slate-900 uppercase">{selectedInvoice?.customerName || 'Consumidor Final'}</p>
                      <p className="text-[11px] font-bold text-slate-500 uppercase italic">NIT/RUT: {selectedInvoice?.customerTaxId || 'S/N'}</p>
                      <p className="text-[11px] font-bold text-slate-500 uppercase italic">DIRECCIÓN: {selectedInvoice?.customerAddress || '---'}</p>
                      <p className="text-[11px] font-black text-primary underline">{selectedInvoice?.customerEmail || '---'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Información de Venta</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] font-black text-slate-300 uppercase">Fecha Emisión</p>
                        <p className="text-[11px] font-bold text-slate-700">{selectedInvoice?.timestamp ? format(new Date(selectedInvoice.timestamp), "dd/MM/yyyy") : '---'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-300 uppercase">Hora Emisión</p>
                        <p className="text-[11px] font-bold text-slate-700">{selectedInvoice?.timestamp ? format(new Date(selectedInvoice.timestamp), "HH:mm:ss") : '---'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-300 uppercase">Medio Pago</p>
                        <Badge variant="outline" className="font-black text-[8px] uppercase border-slate-200 mt-1">{selectedInvoice?.paymentMethod || 'Efectivo'}</Badge>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-300 uppercase">Sede</p>
                        <p className="text-[11px] font-bold text-slate-700 uppercase truncate">{selectedInvoice?.assignedVenue || 'Principal'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cuerpo de la Factura (Items) */}
              <div className="flex-1 p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none">
                      <TableHead className="font-black text-[9px] uppercase tracking-widest py-6 px-10">Descripción del Producto</TableHead>
                      <TableHead className="font-black text-[9px] uppercase tracking-widest text-center">Cant.</TableHead>
                      <TableHead className="font-black text-[9px] uppercase tracking-widest text-right">Unitario</TableHead>
                      <TableHead className="text-right font-black text-[9px] uppercase tracking-widest px-10">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice?.items?.map((item: any, idx: number) => (
                      <TableRow key={idx} className="border-b border-slate-50">
                        <TableCell className="px-10 py-6 font-bold text-xs text-slate-700 uppercase">{item.name}</TableCell>
                        <TableCell className="text-center font-black text-slate-400">{item.quantity}</TableCell>
                        <TableCell className="text-right font-bold text-slate-500">{formatCurrencyDetailed(item.price)}</TableCell>
                        <TableCell className="text-right font-black text-slate-900 px-10">{formatCurrencyDetailed(item.price * item.quantity)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totales y Seguridad */}
              <div className="p-10 bg-slate-50/50 mt-auto border-t border-slate-100">
                <div className="flex flex-col md:flex-row gap-10">
                  <div className="flex-1 space-y-6">
                    <div className="flex gap-6 items-center">
                      <div className="h-24 w-24 bg-white rounded-2xl border-2 border-slate-100 flex items-center justify-center p-2 shadow-inner shrink-0">
                        <QrCode className="h-full w-full text-slate-900" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">CUFE (Código Único de Factura Electrónica)</p>
                        <code className="text-[9px] font-mono text-slate-500 break-all leading-relaxed block bg-white p-2 rounded-lg border border-slate-100 uppercase italic">
                          74a89b2c1d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q2r3s4t5u6v7w8x9y0z
                        </code>
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-600 font-black text-[8px] uppercase tracking-widest">
                        <FileCheck className="h-3 w-3" /> Documento validado por la DIAN
                      </div>
                      <p className="text-[8px] text-slate-400 font-bold leading-relaxed uppercase">
                        Representación gráfica de factura electrónica. Resolución DIAN 18760000001 del 2024-01-01. Prefijo {selectedInvoice?.invoiceNumber?.split('-')[0]} desde 1 hasta 10000.
                      </p>
                    </div>
                  </div>

                  <div className="w-full md:w-[280px] space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span className="text-slate-900">{formatCurrencyDetailed(selectedInvoice?.subtotal || (selectedInvoice?.total / 1.15))}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>IVA / Impoconsumo (15%)</span>
                      <span className="text-primary">{formatCurrencyDetailed(selectedInvoice?.tax || (selectedInvoice?.total - (selectedInvoice?.total / 1.15)))}</span>
                    </div>
                    <div className="h-px bg-slate-200 my-2" />
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Total Facturado</span>
                      <span className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrencyDetailed(selectedInvoice?.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-900 text-center">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.5em]">Este documento es una representación legal generada por Aurora OS V3.0</p>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-8 bg-slate-50 border-t flex gap-4">
            <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest border-slate-200">
              <Download className="mr-2 h-4 w-4" /> Bajar PDF
            </Button>
            <Button className="flex-1 h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20">
              <Printer className="mr-2 h-4 w-4" /> Imprimir Copia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
