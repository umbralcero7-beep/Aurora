
"use client"

import { isSuperUser } from '@/lib/constants';
import { useState, useMemo, useRef } from "react"
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Upload,
  BrainCircuit,
  Loader2,
  Utensils,
  Package,
  Image as ImageIcon,
  Receipt,
  Wrench,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Filter,
  ArrowDownToLine,
  History,
  ShieldAlert,
  Zap,
  Camera,
  FileSpreadsheet,
  Download,
  Database,
  X,
  FileDown,
  Truck,
  Star,
  FileText
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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
  DialogTrigger, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, addDoc, serverTimestamp, where, doc } from "firebase/firestore"
import { useLanguage } from "@/context/language-context"
import { useRouter } from "next/navigation"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx'
import { analyzeExcelData } from "@/ai/flows/excel-analysis-flow"

export default function InventoryPage() {
  const { t } = useLanguage()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const router = useRouter()
  const supplyInputRef = useRef<HTMLInputElement>(null)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("menu")
  const [categoryFilter, setCategoryFilter] = useState("Todas")
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [isAddingExpense, setIsAddingExpense] = useState(false)
  
  // Injection State
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importType, setImportType] = useState<'supplies' | 'menu'>('supplies')
  const [importing, setImporting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [previewData, setPreviewData] = useState<any[]>([])

  const [expenseData, setExpenseData] = useState({
    description: "",
    amount: "",
    category: "Insumos"
  })

  const isSuper = isSuperUser(user?.email);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);

  const isSupport = profile?.role === 'SUPPORT' || isSuper;
  const effectiveBusinessId = profile?.businessId || (isSuper ? 'matu' : null);
  const effectiveVenueName = isSupport ? 'GESTIÓN GLOBAL' : (profile?.assignedVenue || 'Sede Central');

  const suppliesRef = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return query(collection(db, "supplies"))
    if (!effectiveBusinessId) return null
    return query(collection(db, "supplies"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId, isSupport])

  const menuRef = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return query(collection(db, "menu"))
    if (!effectiveBusinessId) return null
    return query(collection(db, "menu"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId, isSupport])

  const vendorsRef = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return query(collection(db, "vendors"))
    if (!effectiveBusinessId) return null
    return query(collection(db, "vendors"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId, isSupport])

  const { data: rawSupplies, isLoading: suppliesLoading } = useCollection(suppliesRef)
  const { data: rawMenu, isLoading: menuLoading } = useCollection(menuRef)
  const { data: vendors, isLoading: vendorsLoading } = useCollection(vendorsRef)

  const supplies = rawSupplies ? [...rawSupplies].sort((a, b) => (a.name || "").localeCompare(b.name || "")) : [];
  const menuItems = rawMenu ? [...rawMenu].sort((a, b) => (a.name || "").localeCompare(b.name || "")) : [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setPreviewData(JSON.parse(JSON.stringify(data)));
        
        setAnalyzing(true);
        try {
          const result = await analyzeExcelData({ filename: file.name, rawData: data });
          setAnalysisResult(result);
        } catch (err) { 
          setAnalysisResult({ status: 'warning', summary: 'Análisis local completado (Sin IA)', suggestions: ['Verifica manualmente.'] });
        } finally { setAnalyzing(false); }
      } catch (e) { console.error(e); }
    };
    reader.readAsBinaryString(file);
  };

  const executeImport = async () => {
    if (!db || previewData.length === 0 || !effectiveBusinessId) return;
    setImporting(true);
    try {
      const collectionName = importType === 'supplies' ? "supplies" : "menu";
      
      for (const item of previewData) {
        if (importType === 'supplies') {
          await addDoc(collection(db, "supplies"), {
            name: item.Insumo || item.Nombre || "Sin nombre",
            sku: item.SKU || "S/N",
            unit: item.Unidad || "Unid",
            price: parseFloat(String(item.Costo || 0).replace(/[^\d.]/g, '')) || 0,
            stock: parseFloat(item.Stock || 0),
            category: item.Categoría || "Proteínas",
            businessId: effectiveBusinessId,
            venueId: effectiveBusinessId,
            assignedVenue: effectiveVenueName,
            createdAt: new Date().toISOString(),
          });
        } else {
          // Motor de Inyección de Menú
          await addDoc(collection(db, "menu"), {
            name: item.Nombre || item.Plato || "Sin nombre",
            code: item.Código || item.Codigo || item.SKU || "",
            category: item.Categoría || item.Categoria || "Otros",
            description: item.Descripción || item.Descripcion || "",
            price: parseFloat(String(item.Precio || 0).replace(/[^\d.]/g, '')) || 0,
            stock: parseFloat(item.Stock || 100),
            available: String(item.Disponibilidad || 'TRUE').toUpperCase() === 'TRUE',
            imageUrl: item.Imagen_URL || item.Imagen || "",
            businessId: effectiveBusinessId,
            venueId: effectiveBusinessId,
            assignedVenue: effectiveVenueName,
            createdAt: new Date().toISOString(),
          });
        }
      }
      toast({ title: "Inyección Exitosa", description: `${importType === 'supplies' ? 'Insumos' : 'Platos'} sincronizados con el ecosistema.` });
      setIsImportOpen(false);
      setPreviewData([]);
      setAnalysisResult(null);
    } catch (e) { 
      toast({ variant: "destructive", title: "Falla de Inyección", description: "Verifica el formato del archivo." });
    } finally { setImporting(false); }
  };

  const filteredSupplies = supplies?.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "Todas" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || []

  return (
    <div className="p-6 md:p-10 space-y-8 bg-white min-h-full font-body overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Unified Supply Chain • {effectiveVenueName}</h1>
            <Badge className="bg-secondary/10 text-secondary border-none font-black text-[8px] tracking-[0.2em] uppercase px-3 py-1">NetSuite Engine</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">Gestión de Proveedores y Cadena de Suministro Unificada.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" className="rounded-xl h-12 px-8 border-slate-200 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 shadow-sm" onClick={() => router.push('/costs')}>
            <TrendingUp className="mr-2 h-4 w-4 text-emerald-500" /> Ver Márgenes ERP
          </Button>
          <Button className="flex-1 md:flex-none rounded-xl h-12 px-10 bg-slate-900 hover:bg-slate-800 text-white shadow-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95" onClick={() => { setImportType('supplies'); setIsImportOpen(true); }}>
            <Plus className="mr-2 h-5 w-5" /> Inyectar Insumo
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none rounded-xl h-12 px-8 border-slate-900 border-2 text-slate-900 shadow-sm font-black text-[10px] uppercase tracking-widest transition-all active:scale-95" onClick={() => { setImportType('menu'); setIsImportOpen(true); }}>
            <Utensils className="mr-2 h-5 w-5" /> Inyectar Menú
          </Button>
          <Button className="flex-1 md:flex-none rounded-xl h-12 px-8 bg-primary text-white shadow-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95" onClick={() => setIsImportOpen(true)}>
            <BrainCircuit className="mr-2 h-5 w-5" /> Cero AI Importer (PDF)
          </Button>
        </div>
      </div>

      <Tabs defaultValue="menu" className="w-full space-y-10" onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 p-1.5 rounded-[1.8rem] h-16 w-full max-w-3xl grid grid-cols-4 border border-slate-100 overflow-hidden">
          <TabsTrigger value="menu" className="rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">La Carta</TabsTrigger>
          <TabsTrigger value="supplies" className="rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">Insumos ERP</TabsTrigger>
          <TabsTrigger value="vendors" className="rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">Proveedores</TabsTrigger>
          <TabsTrigger value="logistics" className="rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">Logística</TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="rounded-[2.5rem] border border-slate-100 bg-white overflow-hidden shadow-2xl">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest py-8 px-10">Imagen</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Código</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Plato</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Precio</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest px-10">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                    <TableCell className="px-10 py-6">
                      {item.imageUrl ? <img src={item.imageUrl} className="h-14 w-14 rounded-2xl object-cover shadow-md" /> : <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center"><ImageIcon className="h-6 w-6 text-slate-200" /></div>}
                    </TableCell>
                    <TableCell><code className="font-mono text-[10px] font-black text-slate-400 uppercase">{item.code || '---'}</code></TableCell>
                    <TableCell className="font-black text-slate-900 uppercase text-xs">{item.name}</TableCell>
                    <TableCell className="text-right font-black text-primary text-xl tracking-tighter">{formatCurrencyDetailed(Number(item.price))}</TableCell>
                    <TableCell className="text-right px-10">
                      <Badge className={cn("text-[8px] font-black uppercase px-3 py-1 rounded-full", item.available ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                        {item.available ? "Activo" : "Agotado"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="supplies" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="rounded-[2.5rem] border border-slate-100 bg-white overflow-hidden shadow-2xl">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest py-8 px-10">SKU</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Insumo</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest px-10">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSupplies.map((p) => {
                  const isLowStock = Number(p.stock) <= (p.minStock || 10)
                  return (
                  <TableRow key={p.id} className={cn("hover:bg-slate-50/50 border-b border-slate-50", isLowStock && "bg-red-50/50")}>
                    <TableCell className="px-10 py-6"><code className="font-mono text-[10px] font-black text-slate-400 uppercase">{p.sku}</code></TableCell>
                    <TableCell className="font-black text-xs uppercase text-slate-700">
                      {p.name}
                      {isLowStock && <Badge className="ml-2 bg-red-100 text-red-600 font-black text-[7px] uppercase">BAJO</Badge>}
                    </TableCell>
                    <TableCell className="text-right px-10">
                      <div className="flex items-center justify-end gap-2">
                        {isLowStock && <AlertCircle className="h-4 w-4 text-red-500" />}
                        <span className={cn("font-black text-lg tracking-tighter", isLowStock ? "text-destructive" : "text-emerald-600")}>
                          {p.stock} {p.unit}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vendorsLoading ? <div className="col-span-full text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div> : 
             !vendors || vendors.length === 0 ? (
               <div className="col-span-full py-20 text-center border-4 border-dashed rounded-[2.5rem] bg-slate-50/50">
                 <Truck className="h-12 w-12 mx-auto mb-4 opacity-10 text-slate-400" />
                 <p className="text-slate-300 font-black uppercase text-xs">Sin proveedores vinculados</p>
               </div>
             ) : vendors.map(v => (
               <Card key={v.id} className="rounded-[2rem] border-slate-100 shadow-xl p-6 bg-white space-y-4">
                 <div className="flex justify-between items-start">
                   <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center"><Truck className="h-6 w-6 text-primary" /></div>
                   <div className="flex items-center gap-1">
                     <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                     <span className="text-[10px] font-black text-slate-900">{v.rating || '5.0'}</span>
                   </div>
                 </div>
                 <div>
                   <h4 className="font-black text-sm uppercase text-slate-900">{v.name}</h4>
                   <p className="text-[9px] font-bold text-slate-400 uppercase">{v.category}</p>
                 </div>
                 <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lead Time: {v.leadTime || '2'} Días</span>
                   <Button variant="ghost" size="sm" className="h-8 font-black text-[8px] uppercase text-primary">Gestionar Orden</Button>
                 </div>
               </Card>
             ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-secondary/20 flex items-center justify-center border border-white/10">
                {importType === 'supplies' ? <Database className="h-6 w-6 text-secondary" /> : <Utensils className="h-6 w-6 text-secondary" />}
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase">
                  {importType === 'supplies' ? 'Inyección de Insumos' : 'Cero AI Importer (PDF/Excel)'}
                </DialogTitle>
                <p className="text-[9px] font-black text-slate-400 uppercase">Protocolo de Carga Inteligente - {effectiveVenueName}</p>
              </div>
            </div>
            <button onClick={() => setIsImportOpen(false)} className="text-white/50 hover:text-white"><X className="h-6 w-6" /></button>
          </div>
          <div className="p-10 space-y-8">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
               <button 
                 onClick={() => { setImportType('supplies'); setAnalysisResult(null); }}
                 className={cn("flex-1 h-10 rounded-xl text-[9px] font-black uppercase transition-all", importType === 'supplies' ? "bg-white text-primary shadow-sm" : "text-slate-400")}
               >
                 Insumos ERP
               </button>
               <button 
                 onClick={() => { setImportType('menu'); setAnalysisResult(null); }}
                 className={cn("flex-1 h-10 rounded-xl text-[9px] font-black uppercase transition-all", importType === 'menu' ? "bg-white text-primary shadow-sm" : "text-slate-400")}
               >
                 Platos / Carta
               </button>
            </div>

            {!analysisResult ? (
              <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-slate-50 rounded-[2rem] bg-slate-50/30 gap-6">
                <div className="flex gap-4">
                  <FileSpreadsheet className="h-10 w-10 text-emerald-500 opacity-40" />
                  <FileText className="h-10 w-10 text-primary opacity-40" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-black uppercase">Arrastra tu PDF o Excel de Precios</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Cero AI extraerá nombres, códigos y categorías</p>
                </div>
                <Button onClick={() => supplyInputRef.current?.click()} className="bg-primary h-12 px-10 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-primary/20 transition-all active:scale-95">Seleccionar Archivo</Button>
                <input type="file" className="hidden" ref={supplyInputRef} accept=".xlsx, .xls, .pdf" onChange={handleFileUpload} />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-2">
                  <p className="text-[10px] font-black text-emerald-600 uppercase">Auditoría Cero BI</p>
                  <p className="text-xs font-bold text-emerald-900 italic">"Los datos son coherentes con la estructura UDM. Inyección segura para {effectiveVenueName}."</p>
                </div>
                <Button className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px]" onClick={executeImport} disabled={importing}>
                  {importing ? <Loader2 className="animate-spin" /> : "Ejecutar Sincronización Global"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
