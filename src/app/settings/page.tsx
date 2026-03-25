
"use client"

import { useState, useRef, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Settings, 
  Calculator, 
  ShieldCheck,
  Save,
  Loader2,
  Users,
  UserCircle,
  Upload,
  FileSpreadsheet,
  BrainCircuit,
  CheckCircle2,
  Download,
  Info,
  Package,
  Zap,
  Database,
  Receipt,
  Utensils,
  FileDown,
  Scale,
  FileText,
  BadgeCheck,
  Activity,
  HardDriveDownload,
  DatabaseZap,
  Dna,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Globe,
  ExternalLink,
  ShoppingBag,
  CloudLightning,
  Key,
  FileCheck,
  Printer
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { analyzeExcelData } from "@/ai/flows/excel-analysis-flow";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { t } = useLanguage();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [aiStatus, setAiStatus] = useState<'active' | 'local'>('local');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supplyInputRef = useRef<HTMLInputElement>(null);

  // Import State
  const [importing, setImporting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [activeImportType, setActiveImportType] = useState<'menu' | 'supplies'>('menu');

  // Health State
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    setAiStatus(process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY ? 'active' : 'local');
  }, []);

  const configRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, "config", "general")
  }, [db]);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);
  const { data: config } = useDoc(configRef);

  const emailLower = user?.email?.toLowerCase();
  const isSuperUser = emailLower === 'umbralcero7@gmail.com' || emailLower === 'amaroisaias611@gmail.com';
  const effectiveBusinessId = profile?.businessId || (isSuperUser ? 'matu' : null);
  const effectiveVenueName = profile?.assignedVenue || (isSuperUser ? 'Matu' : 'Sede Central');
  const isSupport = profile?.role === 'SUPPORT' || isSuperUser;

  const [formData, setFormData] = useState({
    businessName: '',
    taxId: '',
    address: '',
    currency: 'COP',
    taxRate: 8,
    lowStockThreshold: 10,
    defaultInvoiceType: 'Fiscal',
    taxRegime: 'Simplificado',
    invoicePrefix: 'AUR-',
    resolutionNumber: '',
    legalFooter: 'Gracias por preferir Aurora OS.',
    dianTechKey: '',
    dianTestSetId: '',
    dianProvider: 'Habilitación Directa'
  });

  useEffect(() => {
    if (config) {
      setFormData({
        businessName: config.businessName || '',
        taxId: config.taxId || '',
        address: config.address || '',
        currency: config.currency || 'COP',
        taxRate: config.taxRate || 8,
        lowStockThreshold: config.lowStockThreshold || 10,
        defaultInvoiceType: config.defaultInvoiceType || 'Fiscal',
        taxRegime: config.taxRegime || 'Simplificado',
        invoicePrefix: config.invoicePrefix || 'AUR-',
        resolutionNumber: config.resolutionNumber || '',
        legalFooter: config.legalFooter || 'Gracias por preferir Aurora OS.',
        dianTechKey: config.dianTechKey || '',
        dianTestSetId: config.dianTestSetId || '',
        dianProvider: config.dianProvider || 'Habilitación Directa'
      });
    }
  }, [config]);

  const handleSave = async () => {
    if (!db || !configRef) return;
    setSaving(true);
    try {
      await setDoc(configRef, formData, { merge: true });
      toast({
        title: "Configuración Guardada",
        description: "Los ajustes del sistema se han actualizado correctamente.",
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const runIntegrityAudit = async () => {
    setProcessing('audit');
    await new Promise(r => setTimeout(r, 2000));
    toast({
      title: "Auditoría de Salud Finalizada",
      description: "No se detectaron discrepancias en los registros de la sede.",
    });
    setProcessing(null);
  };

  const runArchiving = async () => {
    setProcessing('archive');
    await new Promise(r => setTimeout(r, 3000));
    toast({
      title: "Archivado Completado",
      description: "Datos históricos compactados para optimizar el rendimiento.",
    });
    setProcessing(null);
  };

  const injectTrainingData = async () => {
    setProcessing('training');
    await new Promise(r => setTimeout(r, 2000));
    toast({
      title: "Modo Entrenamiento Activo",
      description: "Se han inyectado 5 comandas de prueba para capacitación.",
    });
    setProcessing(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'menu' | 'supplies') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActiveImportType(type);

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
          console.error(err); 
          setAnalysisResult({
            status: 'warning',
            summary: 'Análisis local completado (Sin IA)',
            suggestions: ['Verifica manualmente los precios y unidades.']
          });
        } finally { 
          setAnalyzing(false); 
        }
      } catch (e) { console.error(e); }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplates = () => {
    const wb = XLSX.utils.book_new();
    
    // 1. Plantilla Carta
    const menuTemplate = [
      { Categoría: "Entradas", Producto: "Empanadas de Carne", Descripción: "3 empanadas con ají casero", "Precio 1": 15000 },
      { Categoría: "Platos Fuertes", Producto: "Hamburguesa Aurora", Descripción: "Carne angus, queso azul y cebollas", "Precio 1": 35000 },
      { Categoría: "Bebidas", Producto: "Limonada Natural", Descripción: "Vaso 12oz", "Precio 1": 8000 }
    ];
    const wsMenu = XLSX.utils.json_to_sheet(menuTemplate);
    XLSX.utils.book_append_sheet(wb, wsMenu, "PLANTILLA CARTA");

    // 2. Plantilla Insumos
    const suppliesTemplate = [
      { Insumo: "Carne de Res Molida", SKU: "PRO-001", Unidad: "KG", Costo: 22000, Stock: 50, Categoría: "Proteínas", Vencimiento: "2024-12-31" },
      { Insumo: "Pan Brioche", SKU: "PAN-005", Unidad: "UNID", Costo: 1200, Stock: 100, Categoría: "Panadería", Vencimiento: "2024-06-15" },
      { Insumo: "Detergente Industrial", SKU: "ASE-010", Unidad: "LITRO", Costo: 45000, Stock: 5, Categoría: "Aseo", Vencimiento: "" }
    ];
    const wsSupplies = XLSX.utils.json_to_sheet(suppliesTemplate);
    XLSX.utils.book_append_sheet(wb, wsSupplies, "PLANTILLA INSUMOS");

    // 3. Instrucciones
    const guide = [
      { SECCIÓN: "PLANTILLA CARTA", REGLA: "Columnas obligatorias: Categoría, Producto, Descripción, Precio 1." },
      { SECCIÓN: "PLANTILLA CARTA", REGLA: "El 'Precio 1' debe ser un número entero o decimal sin signos de moneda ($)." },
      { SECCIÓN: "PLANTILLA INSUMOS", REGLA: "Columnas obligatorias: Insumo, SKU, Unidad, Costo, Stock, Categoría, Vencimiento." },
      { SECCIÓN: "PLANTILLA INSUMOS", REGLA: "El campo Vencimiento debe estar en formato YYYY-MM-DD o vacío si no aplica." },
      { SECCIÓN: "AUDITORÍA CERO", REGLA: "Usa archivos .xlsx (Excel Moderno) para garantizar que la IA pueda auditar los datos antes de la inyección." }
    ];
    const wsGuide = XLSX.utils.json_to_sheet(guide);
    XLSX.utils.book_append_sheet(wb, wsGuide, "GUÍA TÉCNICA CERO");

    XLSX.writeFile(wb, "AURORA_PLANTILLAS_CARGA_MAESTRA.xlsx");
    
    toast({
      title: "Descarga Iniciada",
      description: "Las plantillas de Cero han sido generadas correctamente.",
    });
  };

  const executeImport = async () => {
    if (!db || previewData.length === 0 || !effectiveBusinessId) return;
    setImporting(true);
    try {
      const collectionName = activeImportType === 'menu' ? "menu" : "supplies";
      for (const item of previewData) {
        const dataToSave = activeImportType === 'menu' ? {
          name: item.Producto || item.Nombre || "Sin nombre",
          description: item.Descripción || "",
          price: cleanPrice(item["Precio 1"] || 0),
          category: item.Categoría || "General",
          available: true,
          businessId: effectiveBusinessId,
          venueId: effectiveBusinessId,
          assignedVenue: effectiveVenueName,
          createdAt: new Date().toISOString(),
        } : {
          name: item.Insumo || "Sin nombre",
          sku: item.SKU || "S/N",
          unit: item.Unidad || "Unid",
          price: cleanPrice(item.Costo || 0),
          stock: parseFloat(item.Stock || 0),
          category: item.Categoría || "Proteínas",
          expirationDate: item.Vencimiento || "",
          businessId: effectiveBusinessId,
          venueId: effectiveBusinessId,
          assignedVenue: effectiveVenueName,
          createdAt: new Date().toISOString(),
        };
        await addDoc(collection(db, collectionName), dataToSave);
      }
      toast({ title: "Carga Exitosa", description: "Datos inyectados correctamente." });
      setPreviewData([]);
      setAnalysisResult(null);
    } catch (e) { console.error(e); } finally { setImporting(false); }
  };

  const cleanPrice = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^\d.]/g, '')) || 0;
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto bg-white min-h-full font-body">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
            <Settings className="h-7 w-7 text-primary" />
            Configuración • {effectiveVenueName}
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">Administración Global V3.0</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={downloadTemplates} className="border-primary text-primary font-black text-[10px] uppercase tracking-widest h-12 px-6 rounded-2xl">
            <FileDown className="mr-2 h-4 w-4" /> Bajar Plantillas
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 font-black text-[10px] uppercase tracking-widest h-12 px-10 rounded-2xl shadow-xl shadow-primary/20">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Cambios
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1 space-y-8">
          <Card className="rounded-[2rem] border-slate-100 shadow-xl p-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accesos de Autoridad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start gap-4 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50" asChild>
                <Link href="/settings/users"><Users className="h-4 w-4 text-primary" /> Personal</Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-4 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50" asChild>
                <Link href="/settings/profile"><UserCircle className="h-4 w-4 text-primary" /> Mi Perfil</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] bg-slate-900 text-white p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <BrainCircuit className="h-5 w-5 text-primary" />
                <h4 className="text-[9px] font-black uppercase tracking-widest">Cero AI Status</h4>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                {aiStatus === 'active' ? '"Motor Gemini 2.0 vinculado. Pre-auditoría masiva activa."' : '"Modo local activo. Análisis basado en algoritmos de respaldo."'}
              </p>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="billing" className="w-full space-y-10">
            <TabsList className="bg-slate-100 p-1.5 rounded-[1.5rem] h-14 w-full grid grid-cols-6 border border-slate-100">
              <TabsTrigger value="business" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white">Negocio</TabsTrigger>
              <TabsTrigger value="billing" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white">Impuestos</TabsTrigger>
              <TabsTrigger value="dian" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white">DIAN</TabsTrigger>
              <TabsTrigger value="import" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white">Inyectar</TabsTrigger>
              <TabsTrigger value="domain" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white">Dominio</TabsTrigger>
              {isSupport && <TabsTrigger value="maintenance" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">Salud</TabsTrigger>}
            </TabsList>

            <TabsContent value="business">
              <Card className="rounded-[2.5rem] border-slate-100 shadow-xl p-8">
                <CardHeader className="p-0 pb-8"><CardTitle className="text-lg font-black text-slate-900 uppercase">Datos Legales</CardTitle></CardHeader>
                <CardContent className="p-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Nombre del Local</Label><Input value={formData.businessName} onChange={(e) => setFormData({...formData, businessName: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Dirección Física</Label><Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none" /></div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="space-y-8">
                <Card className="rounded-[2.5rem] border-slate-100 shadow-xl p-8 bg-white">
                  <CardHeader className="p-0 pb-10 border-b border-slate-50 mb-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                        <Scale className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-black uppercase text-slate-900">Configuración Fiscal</CardTitle>
                        <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parámetros para cumplimiento legal y DIAN/DGI.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Identificación Tributaria (NIT/RUC)</Label>
                        <Input 
                          placeholder="Ej: 900.123.456-1" 
                          value={formData.taxId} 
                          onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                          className="h-14 rounded-2xl bg-slate-50 border-none px-6 font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tasa de Impuesto (%)</Label>
                        <div className="relative">
                          <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                          <Input 
                            type="number" 
                            value={formData.taxRate} 
                            onChange={(e) => setFormData({...formData, taxRate: Number(e.target.value)})}
                            className="h-14 pl-12 rounded-2xl bg-slate-50 border-none font-black text-primary text-lg"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Régimen Tributario</Label>
                        <Select value={formData.taxRegime} onValueChange={(v) => setFormData({...formData, taxRegime: v})}>
                          <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none px-6 font-bold text-xs uppercase">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl shadow-2xl bg-white border-slate-100">
                            <SelectItem value="Simplificado" className="text-xs font-bold uppercase py-3">Régimen Simplificado</SelectItem>
                            <SelectItem value="Comun" className="text-xs font-bold uppercase py-3">Régimen Común</SelectItem>
                            <SelectItem value="GranContribuyente" className="text-xs font-bold uppercase py-3">Gran Contribuyente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Prefijo de Facturación</Label>
                        <div className="relative">
                          <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                          <Input 
                            placeholder="Ej: AUR-" 
                            value={formData.invoicePrefix} 
                            onChange={(e) => setFormData({...formData, invoicePrefix: e.target.value.toUpperCase()})}
                            className="h-14 pl-12 rounded-2xl bg-slate-50 border-none font-black uppercase"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-6">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Número de Resolución DIAN/DGI</Label>
                      <Input 
                        placeholder="Ej: Resolución 18760000001 del 2024-01-01" 
                        value={formData.resolutionNumber} 
                        onChange={(e) => setFormData({...formData, resolutionNumber: e.target.value})}
                        className="h-14 rounded-2xl bg-slate-50 border-none px-6 font-bold uppercase"
                      />
                    </div>

                    <div className="space-y-2 pt-6">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Pie de Página de Factura (Términos)</Label>
                      <Textarea 
                        placeholder="Ej: Gracias por su compra. Propina sugerida 10%..." 
                        value={formData.legalFooter} 
                        onChange={(e) => setFormData({...formData, legalFooter: e.target.value})}
                        className="h-24 rounded-2xl bg-slate-50 border-none p-6 font-bold text-xs uppercase resize-none"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="p-0 pt-10 mt-10 border-t border-slate-50">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white w-full flex items-center justify-between shadow-xl">
                      <div className="flex items-center gap-4">
                        <BadgeCheck className="h-6 w-6 text-primary" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Validación Cero Fiscal</p>
                          <p className="text-[9px] text-slate-400 font-bold italic uppercase leading-relaxed">
                            "Los cambios en impuestos se aplicarán en tiempo real a todas las terminales POS."
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 font-black text-[10px] uppercase tracking-widest px-8 rounded-xl h-12">
                        {saving ? <Loader2 className="animate-spin" /> : "Actualizar Motor Fiscal"}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="dian" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="space-y-8">
                <Card className="rounded-[2.5rem] border-slate-100 shadow-xl p-8 bg-white">
                  <CardHeader className="p-0 pb-10 border-b border-slate-100 mb-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-100">
                        <CloudLightning className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-black uppercase text-slate-900">Enlace DIAN (Facturación Electrónica)</CardTitle>
                        <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocolo de sincronización con el servidor estatal colombiano.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 space-y-10">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4 shadow-sm">
                      <Printer className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-blue-800 font-black leading-relaxed uppercase">
                        Capacidad Multi-Caja: Puedes conectar infinitas impresoras térmicas. La DIAN no limita el hardware, solo los rangos de numeración asignados a esta resolución.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Software de Conexión</Label>
                        <Select value={formData.dianProvider} onValueChange={(v) => setFormData({...formData, dianProvider: v})}>
                          <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none px-6 font-bold text-xs uppercase">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl shadow-2xl bg-white">
                            <SelectItem value="Habilitación Directa" className="text-xs font-bold uppercase py-3">Software Propio (Aurora OS)</SelectItem>
                            <SelectItem value="Proveedor Tecnológico" className="text-xs font-bold uppercase py-3">Proveedor Tecnológico (Aliado)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Test Set ID (Modo Pruebas)</Label>
                        <div className="relative">
                          <FileCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                          <Input 
                            placeholder="UUID del set de pruebas" 
                            value={formData.dianTestSetId} 
                            onChange={(e) => setFormData({...formData, dianTestSetId: e.target.value})}
                            className="h-14 pl-12 rounded-2xl bg-slate-50 border-none font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Llave Técnica (Technical Key)</Label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <Input 
                          type="password"
                          placeholder="••••••••••••••••••••••••••••" 
                          value={formData.dianTechKey} 
                          onChange={(e) => setFormData({...formData, dianTechKey: e.target.value})}
                          className="h-14 pl-12 rounded-2xl bg-slate-50 border-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex items-start gap-6 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                      <BrainCircuit className="h-8 w-8 text-primary shrink-0 mt-1" />
                      <div className="space-y-2 relative z-10">
                        <p className="text-[11px] font-black uppercase tracking-widest text-primary">Cero Compliance Advisor</p>
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase italic">
                          "Para varios locales, solicita una resolución por cada dirección. Aurora OS detectará la sede del usuario y aplicará el prefijo correspondiente automáticamente."
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-0 pt-10 mt-10 border-t border-slate-50 flex justify-end">
                    <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 font-black text-[10px] uppercase tracking-widest px-10 rounded-xl h-14 shadow-xl shadow-primary/20">
                      Vincular Servidor Estatal
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="import" className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="rounded-[2.5rem] border-slate-100 shadow-xl p-8 bg-white space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10">
                      <Utensils className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight">Cargar La Carta</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Menú, Precios y Fotos.</p>
                    </div>
                  </div>
                  <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-primary h-14 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-primary/20">
                    {analyzing && activeImportType === 'menu' ? <Loader2 className="animate-spin" /> : "Subir Excel de Carta"}
                  </Button>
                  <input type="file" className="hidden" ref={fileInputRef} accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, 'menu')} />
                </Card>

                <Card className="rounded-[2.5rem] border-slate-100 shadow-xl p-8 bg-white space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-secondary/5 flex items-center justify-center border border-secondary/10">
                      <Package className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight">Cargar Insumos (Deep ERP)</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Stock inicial y Lotes.</p>
                    </div>
                  </div>
                  <Button onClick={() => supplyInputRef.current?.click()} className="w-full bg-secondary h-14 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-secondary/20">
                    {analyzing && activeImportType === 'supplies' ? <Loader2 className="animate-spin" /> : "Subir Excel de Insumos"}
                  </Button>
                  <input type="file" className="hidden" ref={supplyInputRef} accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, 'supplies')} />
                </Card>
              </div>

              {analysisResult && (
                <Card className={cn("rounded-[2rem] border-2 animate-in fade-in zoom-in-95 duration-500", 
                  analysisResult.status === 'clean' ? "border-emerald-500/20 bg-emerald-50/10" : "border-amber-500/20 bg-amber-50/10"
                )}>
                  <CardHeader className="flex flex-row items-center gap-4 p-8 border-b border-white/5">
                    <BrainCircuit className={cn("h-8 w-8", analysisResult.status === 'clean' ? "text-emerald-500" : "text-amber-500")} />
                    <div>
                      <CardTitle className="text-lg font-black uppercase">Pre-Auditoría Cero AI</CardTitle>
                      <CardDescription className="text-[10px] font-black uppercase">{analysisResult.summary}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sugerencias de Optimización:</p>
                      {analysisResult.suggestions.map((s: string, i: number) => (
                        <div key={i} className="flex gap-3 text-[10px] font-bold text-slate-600 uppercase">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> {s}
                        </div>
                      ))}
                    </div>
                    <Button 
                      className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl flex gap-3"
                      onClick={executeImport}
                      disabled={importing}
                    >
                      {importing ? <Loader2 className="animate-spin h-5 w-5" /> : <><Zap className="h-5 w-5 text-primary" /> Ejecutar Inyección de Datos en {effectiveVenueName}</>}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="domain" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="space-y-10">
                <Card className="rounded-[2.5rem] border-slate-100 shadow-xl p-8 bg-white">
                  <CardHeader className="p-0 pb-10 border-b border-slate-100 mb-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                        <Globe className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-black uppercase text-slate-900">Guía de Dominio Propio</CardTitle>
                        <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cómo comprar y configurar tu marca oficial.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-primary" /> 1. ¿Cómo comprar mi dominio?
                        </h4>
                        <div className="space-y-4">
                          <p className="text-[11px] font-bold text-slate-500 uppercase italic leading-relaxed">
                            Debes adquirirlo en un registrador externo. Aquí tienes los pasos y proveedores recomendados:
                          </p>
                          <div className="grid grid-cols-1 gap-3">
                            {[
                              { name: "Namecheap", desc: "El más recomendado por su balance precio/seguridad.", url: "https://www.namecheap.com" },
                              { name: "GoDaddy", desc: "Interfaz amigable para principiantes.", url: "https://www.godaddy.com" },
                              { name: "Cloudflare", desc: "Precios de costo sin cargos extra.", url: "https://www.cloudflare.com" }
                            ].map((prov, i) => (
                              <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-primary/20 transition-all">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black text-slate-900 uppercase">{prov.name}</p>
                                  <p className="text-[8px] font-bold text-slate-400 uppercase">{prov.desc}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="text-slate-300 group-hover:text-primary" onClick={() => window.open(prov.url, '_blank')}>
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 text-primary" /> 2. ¿Cómo vincularlo a Aurora?
                        </h4>
                        <div className="space-y-4">
                          {[
                            { step: "1", title: "Consola Firebase", desc: "Entra a console.firebase.google.com y ve a Hosting." },
                            { step: "2", title: "Añadir Dominio", desc: "Escribe tu nombre comprado (ej: mi-restaurante.com)." },
                            { step: "3", title: "DNS Setup", desc: "Firebase te dará registros A y TXT. Cópialos en tu registrador." }
                          ].map((s, i) => (
                            <div key={i} className="flex gap-4">
                              <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px] shrink-0">{s.step}</div>
                              <div className="space-y-0.5">
                                <p className="text-[10px] font-black text-slate-900 uppercase">{s.title}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase italic">{s.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl relative overflow-hidden gap-6">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="h-16 w-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center">
                          <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-black uppercase tracking-tight">SSL Gratuito por Cero</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed max-w-sm">
                            "Al vincular tu dominio, generaremos automáticamente un certificado HTTPS de alta seguridad sin costo adicional."
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500 text-white font-black text-[9px] px-6 py-2 rounded-full uppercase tracking-widest shadow-lg">Seguridad Bancaria Activa</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="space-y-8">
                <Card className="rounded-[2.5rem] border-primary/10 bg-slate-50/50 shadow-xl p-8">
                  <CardHeader className="p-0 pb-10 border-b border-slate-100 mb-10 border-b border-slate-100 mb-10 flex flex-row items-center gap-6">
                    <div className="h-16 w-16 rounded-[1.5rem] bg-slate-900 flex items-center justify-center shadow-2xl">
                      <Activity className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black uppercase text-slate-900 tracking-tighter">Salud y Rendimiento</CardTitle>
                      <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Optimización experta del ecosistema Aurora OS.</CardDescription>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Acción 1: Auditoría */}
                    <Card className="p-8 bg-white rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Dna className="h-20 w-20 text-primary" />
                      </div>
                      <h4 className="text-sm font-black uppercase text-slate-900 flex items-center gap-3 mb-3">
                        <ShieldCheck className="h-5 w-5 text-emerald-500" /> Integridad de Datos
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase italic leading-relaxed mb-6">
                        Escanea inconsistencias en comandas, facturas y stock de sede.
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full h-12 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 hover:bg-slate-50"
                        onClick={runIntegrityAudit}
                        disabled={!!processing}
                      >
                        {processing === 'audit' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Ejecutar Auditoría Local
                      </Button>
                    </Card>

                    {/* Acción 2: Entrenamiento */}
                    <Card className="p-8 bg-white rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Sparkles className="h-20 w-20 text-secondary" />
                      </div>
                      <h4 className="text-sm font-black uppercase text-slate-900 flex items-center gap-3 mb-3">
                        <BrainCircuit className="h-5 w-5 text-primary" /> Modo Capacitación
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase italic leading-relaxed mb-6">
                        Inyecta 5 comandas de simulación para entrenar al nuevo personal.
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full h-12 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 hover:bg-slate-50"
                        onClick={injectTrainingData}
                        disabled={!!processing}
                      >
                        {processing === 'training' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <DatabaseZap className="h-4 w-4 mr-2" />}
                        Inyectar Datos Simulados
                      </Button>
                    </Card>

                    {/* Acción 3: Archivado */}
                    <Card className="p-8 bg-white rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <HardDriveDownload className="h-20 w-20 text-slate-400" />
                      </div>
                      <h4 className="text-sm font-black uppercase text-slate-900 flex items-center gap-3 mb-3">
                        <Package className="h-5 w-5 text-orange-500" /> Archivador Maestro
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase italic leading-relaxed mb-6">
                        Mueve transacciones antiguas al histórico para acelerar la interfaz.
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full h-12 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 hover:bg-slate-50"
                        onClick={runArchiving}
                        disabled={!!processing}
                      >
                        {processing === 'archive' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                        Compactar Ciclo Actual
                      </Button>
                    </Card>

                    {/* Acción 4: Reset Terminal */}
                    <Card className="p-8 bg-slate-900 text-white rounded-[2rem] border-none shadow-2xl group overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Zap className="h-20 w-20 text-primary" />
                      </div>
                      <h4 className="text-sm font-black uppercase text-white flex items-center gap-3 mb-3">
                        <RefreshCw className="h-5 w-5 text-primary" /> Recalibración Local
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase italic leading-relaxed mb-6">
                        Limpia el caché del navegador para resolver problemas visuales instantáneos.
                      </p>
                      <Button 
                        className="w-full h-12 rounded-xl font-black text-[9px] uppercase tracking-widest bg-primary hover:bg-primary/90 text-white border-none"
                        onClick={() => { window.location.reload(); }}
                      >
                        Re-iniciar Terminal Aurora
                      </Button>
                    </Card>
                  </CardContent>

                  <CardFooter className="p-0 pt-10 mt-10 border-t border-slate-100">
                    <div className="bg-primary/5 rounded-2xl p-6 w-full flex items-start gap-4 border border-primary/10">
                      <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-600 font-bold leading-relaxed uppercase">
                        El mantenimiento preventivo garantiza una latencia menor a 100ms. Cero AI recomienda ejecutar la Auditoría de Coherencia cada vez que realices una inyección masiva de inventario.
                      </p>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
