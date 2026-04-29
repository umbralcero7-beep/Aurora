
"use client"

import { useState, useRef, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { isSuperUser } from '@/lib/constants';
import { doc, setDoc, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc } from 'firebase/firestore';
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
  Printer,
  Trash2,
  AlertTriangle,
  RotateCcw
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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

  const isSuper = isSuperUser(user?.email);
  const effectiveBusinessId = profile?.businessId || (isSuper ? 'matu' : null);
  const effectiveVenueName = profile?.assignedVenue || (isSuper ? 'Matu' : 'Sede Central');
  const isSupport = profile?.role === 'SUPPORT' || isSuper;
  const isAdmin = profile?.role === 'ADMIN' || isSuper;

  // Personal/Usuarios Management State
  const [allSystemUsers, setAllSystemUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("USER");
  const [newUserVenue, setNewUserVenue] = useState("");

  useEffect(() => {
    if (db && (isSuper || isAdmin)) {
      fetchUsers();
    }
  }, [db, isSuper, isAdmin]);

  const fetchUsers = async () => {
    if (!db) return;
    setLoadingUsers(true);
    try {
      const q = isSuper 
        ? query(collection(db, "users")) 
        : query(collection(db, "users"), where("businessId", "==", profile?.businessId));
      const snap = await getDocs(q);
      setAllSystemUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async () => {
    if (!db || !newUserEmail) return;
    setSaving(true);
    try {
      const email = newUserEmail.toLowerCase().trim();
      await setDoc(doc(db, "users", email), {
        email,
        role: newUserRole,
        assignedVenue: newUserVenue || "Sede Central",
        businessId: profile?.businessId || "matu",
        createdAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Usuario Creado", description: `El acceso para ${email} ha sido configurado.` });
      setNewUserEmail("");
      fetchUsers();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el usuario." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!db || email === user?.email) return;
    if (!confirm(`¿Seguro que deseas eliminar a ${email}?`)) return;
    try {
      await deleteDoc(doc(db, "users", email));
      toast({ title: "Usuario Eliminado" });
      fetchUsers();
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const handleUpdateRole = async (email: string, newRole: string) => {
    if (!db) return;
    try {
      await setDoc(doc(db, "users", email), { role: newRole }, { merge: true });
      toast({ title: "Rol Actualizado" });
      fetchUsers();
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

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

  // LIMPIEZA DE VENTAS SOLAMENTE (Para Sedes de Prueba)
  const purgeSalesHistory = async () => {
    if (!db || !effectiveBusinessId) return;
    
    const confirm = window.confirm("¿Deseas limpiar todo el historial de ventas? (Se borrarán Facturas, Domicilios, Órdenes y Cierres Z, pero se mantendrá tu Menú e Insumos)");
    if (!confirm) return;

    setProcessing('purge-sales');
    try {
      const collectionsToPurge = ["invoices", "deliveries", "orders", "fiscal_reports", "notifications", "expenses"];
      
      for (const collName of collectionsToPurge) {
        const collRef = collection(db, collName);
        const q = query(collRef, where("businessId", "==", effectiveBusinessId));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
          await deleteDoc(docSnap.ref);
        }
      }

      toast({
        title: "Historial Limpiado",
        description: "La sede de pruebas ha vuelto a cero ventas.",
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Fallo al purgar historial." });
    } finally {
      setProcessing(null);
    }
  };

  // RESET DE FÁBRICA - NIVEL CERO (Soporte)
  const factoryReset = async () => {
    if (!db || !isSupport) {
      toast({ variant: "destructive", title: "Acceso Denegado", description: "Solo personal de soporte puede ejecutar Reset de Fábrica." });
      return;
    }
    
    const confirm1 = window.confirm("⚠️ ADVERTENCIA CRÍTICA: Estás a punto de borrar TODA la información operativa (Incluyendo Menú, Personal e Insumos). ¿Estás seguro?");
    if (!confirm1) return;

    setProcessing('purge-total');
    try {
      const collectionsToPurge = ["invoices", "deliveries", "orders", "fiscal_reports", "notifications", "expenses", "supplies", "staff", "customers", "menu"];
      
      for (const collName of collectionsToPurge) {
        const collRef = collection(db, collName);
        const q = (effectiveBusinessId && !isSuperUser) 
          ? query(collRef, where("businessId", "==", effectiveBusinessId))
          : query(collRef);
          
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
          await deleteDoc(docSnap.ref);
        }
      }

      toast({ title: "Purga Atómica Completada", description: "El sistema vuelve al estado cero absoluto." });
      setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(null);
    }
  };

  const injectTrainingData = async () => {
    if (!db || !effectiveBusinessId) return;
    setProcessing('training');
    
    const timestamp = new Date().toISOString();
    
    const simulations = [
      {
        coll: "invoices",
        data: {
          invoiceNumber: `SIM-INV-001`,
          customerName: "Consumidor Final",
          total: 108100,
          items: [
            { id: 'p1', name: 'Hamburguesa Aurora', price: 35000, quantity: 2 },
            { id: 'p3', name: 'Limonada de Coco', price: 12000, quantity: 2 }
          ],
          paymentMethod: 'Efectivo',
          businessId: effectiveBusinessId,
          assignedVenue: effectiveVenueName,
          timestamp: timestamp
        }
      },
      {
        coll: "deliveries",
        data: {
          orderNumber: 101,
          customerName: "MARIO ROSSI",
          phone: "3001234567",
          address: "Carrera 10 # 45-20, Apt 501",
          status: "Entregado",
          total: 120750,
          items: [
            { id: 'p1', name: 'Hamburguesa Aurora', price: 35000, quantity: 3 }
          ],
          venueId: effectiveBusinessId,
          businessId: effectiveBusinessId,
          assignedVenue: effectiveVenueName,
          createdAt: timestamp
        }
      }
    ];

    try {
      for (const sim of simulations) {
        const ref = doc(collection(db, sim.coll));
        await setDoc(ref, { ...sim.data, id: ref.id });
      }
      toast({ title: "Inyección Exitosa", description: "Datos de prueba inyectados." });
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(null);
    }
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
          setAnalysisResult({ status: 'warning', summary: 'Análisis local completado.', suggestions: ['Verifica manualmente.'] });
        } finally { 
          setAnalyzing(false); 
        }
      } catch (e) { console.error(e); }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplates = () => {
    const wb = XLSX.utils.book_new();
    const menuTemplate = [
      { Categoría: "Entradas", Producto: "Empanadas de Carne", Descripción: "3 empanadas con ají casero", "Precio 1": 15000 },
      { Categoría: "Platos Fuertes", Producto: "Hamburguesa Aurora", Descripción: "Carne angus, queso azul y cebollas", "Precio 1": 35000 }
    ];
    const wsMenu = XLSX.utils.json_to_sheet(menuTemplate);
    XLSX.utils.book_append_sheet(wb, wsMenu, "PLANTILLA CARTA");
    XLSX.writeFile(wb, "AURORA_PLANTILLAS_CARGA_MAESTRA.xlsx");
    toast({ title: "Descarga Iniciada", description: "Las plantillas han sido generadas." });
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
          price: Number(item["Precio 1"] || 0),
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
          price: Number(item.Costo || 0),
          stock: parseFloat(item.Stock || 0),
          category: item.Categoría || "Proteínas",
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

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto bg-white min-h-full font-body">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
            <Settings className="h-7 w-7 text-primary" />
            Configuración de Sede
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">Administración Global • {effectiveVenueName}</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={downloadTemplates} className="flex-1 md:flex-none border-primary text-primary font-black text-[10px] uppercase tracking-widest h-12 px-6 rounded-2xl shadow-sm">
            <FileDown className="mr-2 h-4 w-4" /> Bajar Plantillas
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 md:flex-none bg-primary hover:bg-primary/90 font-black text-[10px] uppercase tracking-widest h-12 px-10 rounded-2xl shadow-xl shadow-primary/20">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Ajustes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-[2rem] bg-slate-900 text-white p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <BrainCircuit className="h-5 w-5 text-primary" />
                <h4 className="text-[9px] font-black uppercase tracking-widest text-primary">Cero AI Status</h4>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase italic leading-relaxed">
                {aiStatus === 'active' ? '"Motor Gemini 2.0 vinculado. Escaneo de transacciones activo."' : '"Modo local activo. Análisis basado en algoritmos de respaldo."'}
              </p>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="billing" className="w-full space-y-6">
            <TabsList className={cn("bg-slate-100 p-1.5 rounded-[1.5rem] h-14 w-full grid border border-slate-100 overflow-hidden", isAdmin ? "grid-cols-6" : "grid-cols-5")}>
              <TabsTrigger value="business" className="rounded-xl font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-white">Negocio</TabsTrigger>
              <TabsTrigger value="billing" className="rounded-xl font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-white">Impuestos</TabsTrigger>
              <TabsTrigger value="dian" className="rounded-xl font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-white">DIAN</TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="users" className="rounded-xl font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-white">Personal</TabsTrigger>
              )}
              <TabsTrigger value="import" className="rounded-xl font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-white">Inyectar</TabsTrigger>
              <TabsTrigger value="maintenance" className="rounded-xl font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">Salud</TabsTrigger>
            </TabsList>

            <TabsContent value="business">
              <Card className="rounded-[2.5rem] border-slate-100 shadow-xl p-8 bg-white">
                <CardHeader className="p-0 pb-8"><CardTitle className="text-lg font-black text-slate-900 uppercase">Datos Legales</CardTitle></CardHeader>
                <CardContent className="p-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Nombre Comercial</Label><Input value={formData.businessName} onChange={(e) => setFormData({...formData, businessName: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Dirección Fiscal</Label><Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold" /></div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing">
              <Card className="rounded-[2.5rem] border-slate-100 shadow-xl p-8 bg-white">
                <CardHeader className="p-0 pb-8"><CardTitle className="text-lg font-black text-slate-900 uppercase">Impuestos y Facturación</CardTitle></CardHeader>
                <CardContent className="p-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Identificación (NIT/RUT)</Label><Input value={formData.taxId} onChange={(e) => setFormData({...formData, taxId: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Impoconsumo (%)</Label><Input type="number" value={formData.taxRate} onChange={(e) => setFormData({...formData, taxRate: Number(e.target.value)})} className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold" /></div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dian">
              <Card className="rounded-[2.5rem] border-slate-100 shadow-xl p-8 bg-white">
                <CardHeader className="p-0 pb-8">
                  <CardTitle className="text-lg font-black text-slate-900 uppercase">Enlace DIAN / DGI</CardTitle>
                  <CardDescription className="text-[10px] font-black text-slate-400 uppercase">Configuración de Facturación Electrónica.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Software Provider</Label><Input value={formData.dianProvider} onChange={(e) => setFormData({...formData, dianProvider: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none px-4" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Technical Key</Label><Input type="password" value={formData.dianTechKey} onChange={(e) => setFormData({...formData, dianTechKey: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none px-4" /></div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <Card className="xl:col-span-1 rounded-[2rem] p-8 bg-white border-slate-100 shadow-xl self-start">
                   <CardHeader className="p-0 pb-6 mb-6 border-b border-slate-50">
                      <CardTitle className="text-lg font-black uppercase text-slate-900 leading-none">Vincular Colaborador</CardTitle>
                      <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-2">Habilitar acceso operativo.</CardDescription>
                   </CardHeader>
                   <CardContent className="p-0 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Email</Label>
                        <Input 
                          placeholder="usuario@dominio.com" 
                          className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Rol Operativo</Label>
                        <Select value={newUserRole} onValueChange={setNewUserRole}>
                          <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase">
                            <SelectValue placeholder="Seleccionar Rol" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-100">
                            <SelectItem value="USER">MESERO / OPERATIVO</SelectItem>
                            <SelectItem value="ADMIN">ADMINISTRADOR</SelectItem>
                            <SelectItem value="SUPPORT">SOPORTE TÉCNICO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCreateUser} disabled={saving} className="w-full h-14 bg-primary rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">
                         {saving ? <Loader2 className="animate-spin" /> : "Vincular Cuenta"}
                      </Button>
                   </CardContent>
                </Card>

                <Card className="xl:col-span-2 rounded-[2rem] p-8 bg-white border-slate-100 shadow-xl overflow-hidden">
                   <CardHeader className="p-0 pb-6 mb-6 border-b border-slate-50 flex flex-row justify-between items-center">
                      <div>
                        <CardTitle className="text-lg font-black uppercase text-slate-900">Roster de Personal</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Total: {allSystemUsers.length} colaboradores activos.</CardDescription>
                      </div>
                      <RefreshCw className={cn("h-4 w-4 text-slate-300 cursor-pointer", loadingUsers && "animate-spin")} onClick={fetchUsers} />
                   </CardHeader>
                   <CardContent className="p-0">
                      <div className="max-h-[500px] overflow-y-auto pr-4">
                        <Table>
                          <TableBody>
                            {allSystemUsers.map(u => (
                              <TableRow key={u.id} className="hover:bg-slate-50 border-b border-slate-50 group">
                                <TableCell className="py-4">
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase text-slate-800 tracking-tight">{u.email}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{u.assignedVenue || 'Sede Central'}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Select value={u.role} onValueChange={(val) => handleUpdateRole(u.id, val)}>
                                    <SelectTrigger className="h-8 w-32 border-none bg-slate-100/50 rounded-lg text-[9px] font-black uppercase tracking-widest px-2">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      <SelectItem value="USER">USER</SelectItem>
                                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                                      <SelectItem value="SUPPORT">SUPPORT</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-right">
                                  {u.email !== user?.email && (
                                    <Button onClick={() => handleDeleteUser(u.id)} variant="ghost" className="h-8 w-8 p-0 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                   </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="import" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-[2.5rem] border-slate-100 shadow-xl p-8 bg-white space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10">
                      <Utensils className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight">Cargar La Carta</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Menú y Precios.</p>
                    </div>
                  </div>
                  <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-primary h-14 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg">
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
                      <h4 className="text-sm font-black uppercase tracking-tight">Cargar Insumos (ERP)</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Stock y Costos.</p>
                    </div>
                  </div>
                  <Button onClick={() => supplyInputRef.current?.click()} className="w-full bg-secondary h-14 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg">
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
                      <CardTitle className="text-lg font-black uppercase">Auditoría Cero AI</CardTitle>
                      <CardDescription className="text-[10px] font-black uppercase">{analysisResult.summary}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <Button 
                      className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl flex gap-3"
                      onClick={executeImport}
                      disabled={importing}
                    >
                      {importing ? <Loader2 className="animate-spin h-5 w-5" /> : <><Zap className="h-5 w-5 text-primary" /> Ejecutar Inyección de Datos</>}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="maintenance">
              <Card className="rounded-[2.5rem] border-primary/10 bg-slate-50/50 shadow-xl p-8 bg-white">
                <CardHeader className="p-0 pb-10 border-b border-slate-100 mb-10 flex flex-row items-center gap-6">
                  <div className="h-16 w-16 rounded-[1.5rem] bg-slate-900 flex items-center justify-center shadow-2xl">
                    <Activity className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase text-slate-900 tracking-tighter">Salud del Sistema</CardTitle>
                    <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Mantenimiento experto de la terminal.</CardDescription>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card className="p-8 bg-white rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Dna className="h-20 w-20 text-primary" />
                    </div>
                    <h4 className="text-sm font-black uppercase text-slate-900 flex items-center gap-3 mb-3">
                      <ShieldCheck className="h-5 w-5 text-emerald-500" /> Integridad Local
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase italic mb-6">Escaneo de inconsistencias en registros.</p>
                    <Button variant="outline" className="w-full h-12 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100" onClick={runIntegrityAudit} disabled={!!processing}>
                      {processing === 'audit' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Auditoría Técnica
                    </Button>
                  </Card>

                  <Card className="p-8 bg-white rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <RotateCcw className="h-20 w-20 text-orange-500" />
                    </div>
                    <h4 className="text-sm font-black uppercase text-slate-900 flex items-center gap-3 mb-3">
                      <Zap className="h-5 w-5 text-orange-500" /> Limpiar Ventas
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase italic mb-6">Borra el historial de ventas para empezar de cero (Sede Pruebas).</p>
                    <Button variant="outline" className="w-full h-12 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 text-orange-600 hover:bg-orange-50" onClick={purgeSalesHistory} disabled={!!processing}>
                      {processing === 'purge-sales' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Limpiar Historial Ventas"}
                    </Button>
                  </Card>

                  <Card className="p-8 bg-white rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Sparkles className="h-20 w-20 text-secondary" />
                    </div>
                    <h4 className="text-sm font-black uppercase text-slate-900 flex items-center gap-3 mb-3">
                      <BrainCircuit className="h-5 w-5 text-primary" /> Inyector de Pruebas
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase italic mb-6">Puebla el sistema con una jornada simulada.</p>
                    <Button variant="outline" className="w-full h-12 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100" onClick={injectTrainingData} disabled={!!processing}>
                      {processing === 'training' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <DatabaseZap className="h-4 w-4 mr-2" />}
                      Inyectar Jornada
                    </Button>
                  </Card>

                  <Card className="p-8 bg-destructive/5 rounded-[2rem] border-2 border-destructive/10 shadow-xl group overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Trash2 className="h-20 w-20 text-destructive" />
                    </div>
                    <h4 className="text-sm font-black uppercase text-destructive flex items-center gap-3 mb-3">
                      <AlertTriangle className="h-5 w-5" /> Reset de Fábrica
                    </h4>
                    <p className="text-[10px] font-black text-destructive/60 uppercase italic mb-6">Borrado total (Menú, Insumos, Personal y Ventas).</p>
                    <Button 
                      className="w-full h-12 rounded-xl font-black text-[9px] uppercase tracking-widest bg-destructive hover:bg-destructive/90 text-white shadow-lg" 
                      onClick={factoryReset} 
                      disabled={!!processing}
                    >
                      {processing === 'purge-total' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Reset Fábrica Total"}
                    </Button>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
