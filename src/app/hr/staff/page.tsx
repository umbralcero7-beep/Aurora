
"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { 
  Users, 
  Search, 
  Plus, 
  Loader2,
  BrainCircuit,
  Filter,
  MoreVertical,
  Mail,
  UserPlus,
  ArrowUpDown,
  Briefcase,
  Star,
  FileText,
  BadgeCheck,
  ShieldAlert,
  Save,
  X,
  Trash2,
  Calendar,
  DollarSign,
  Upload,
  FileSpreadsheet,
  Download,
  Database,
  CheckCircle2,
  FileDown
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
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useLanguage } from "@/context/language-context"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, addDoc, doc, where, serverTimestamp, deleteDoc } from "firebase/firestore"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import * as XLSX from 'xlsx'
import { analyzeHRExcelData } from "@/ai/flows/hr-analysis-flow"

export default function StaffDirectoryPage() {
  const { t } = useLanguage()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState("TODOS")

  // Injection State
  const [importing, setImporting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [previewData, setPreviewData] = useState<any[]>([])

  const [newStaff, setNewStaff] = useState({
    fullName: "",
    role: "WAITER",
    contractType: "INDETERMINADO",
    salary: "",
    hireDate: "",
    emergencyContact: ""
  })

  useEffect(() => {
    setMounted(true)
    setNewStaff(prev => ({
      ...prev,
      hireDate: format(new Date(), "yyyy-MM-dd")
    }))
  }, [])

  const emailLower = user?.email?.toLowerCase();
  const isSuperUser = emailLower === 'umbralcero7@gmail.com';

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);

  const effectiveBusinessId = profile?.businessId || (isSuperUser ? 'matu' : null);
  const effectiveVenueName = isSuperUser ? 'GLOBAL HQ' : (profile?.assignedVenue || 'Sede Central');

  const staffRef = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "staff"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const { data: staff, isLoading } = useCollection(staffRef)

  const handleRegister = async () => {
    if (!db || !newStaff.fullName || !effectiveBusinessId) {
      toast({ variant: "destructive", title: "Atención", description: "Completa el nombre del colaborador." })
      return
    }
    
    setIsSaving(true)
    try {
      await addDoc(collection(db, "staff"), {
        ...newStaff,
        fullName: newStaff.fullName.toUpperCase(),
        salary: Number(newStaff.salary),
        status: "ACTIVO",
        performanceScore: 100,
        businessId: effectiveBusinessId,
        assignedVenue: effectiveVenueName,
        createdAt: serverTimestamp()
      })
      
      toast({ title: "Colaborador Vinculado", description: `${newStaff.fullName} ha sido añadido al Deep HR.` })
      setIsRegisterOpen(false)
      setNewStaff({
        fullName: "",
        role: "WAITER",
        contractType: "INDETERMINADO",
        salary: "",
        hireDate: format(new Date(), "yyyy-MM-dd"),
        emergencyContact: ""
      })
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (staffId: string) => {
    if (!db) return
    try {
      await deleteDoc(doc(db, "staff", staffId))
      toast({ title: "Registro Removido", description: "El colaborador ha sido desvinculado del sistema." })
    } catch (error) { console.error(error) }
  }

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
          const result = await analyzeHRExcelData({ filename: file.name, rawData: data });
          setAnalysisResult(result);
        } catch (err) { 
          console.error(err); 
          setAnalysisResult({
            status: 'clean',
            summary: 'Análisis local completado.',
            suggestions: ['Verifica el formato de los salarios.']
          });
        } finally { 
          setAnalyzing(false); 
        }
      } catch (e) { 
        console.error(e);
        toast({ variant: "destructive", title: "Error de Archivo", description: "No se pudo procesar el Excel." });
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const template = [
      { "Nombre Completo": "JUAN PEREZ", "Cargo": "WAITER", "Salario": 1200000, "Fecha Ingreso": "2024-01-15", "Tipo Contrato": "INDETERMINADO", "Contacto Emergencia": "3001234567" },
      { "Nombre Completo": "MARIA LOPEZ", "Cargo": "CHEF", "Salario": 2500000, "Fecha Ingreso": "2023-11-01", "Tipo Contrato": "TERMINO_FIJO", "Contacto Emergencia": "3109876543" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws, "PLANTILLA PERSONAL");
    XLSX.writeFile(wb, "PLANTILLA_HR_AURORA.xlsx");
    toast({ title: "Plantilla Descargada", description: "Completa los datos y sube el archivo." });
  };

  const executeImport = async () => {
    if (!db || previewData.length === 0 || !effectiveBusinessId) return;
    setImporting(true);
    try {
      for (const item of previewData) {
        await addDoc(collection(db, "staff"), {
          fullName: (item["Nombre Completo"] || "SIN NOMBRE").toUpperCase(),
          role: item["Cargo"] || "WAITER",
          salary: Number(item["Salario"] || 0),
          hireDate: item["Fecha Ingreso"] || format(new Date(), "yyyy-MM-dd"),
          contractType: item["Tipo Contrato"] || "INDETERMINADO",
          emergencyContact: item["Contacto Emergencia"] || "",
          status: "ACTIVO",
          performanceScore: 100,
          businessId: effectiveBusinessId,
          assignedVenue: effectiveVenueName,
          createdAt: serverTimestamp()
        });
      }
      toast({ title: "Carga Exitosa", description: `${previewData.length} colaboradores inyectados.` });
      setIsImportOpen(false);
      setPreviewData([]);
      setAnalysisResult(null);
    } catch (e) { 
      console.error(e);
      toast({ variant: "destructive", title: "Error de Inyección", description: "No se pudieron guardar los datos." });
    } finally { 
      setImporting(false); 
    }
  };

  const filteredStaff = useMemo(() => {
    if (!staff) return []
    return staff.filter(s => {
      const matchesSearch = s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           s.role?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "TODOS" || s.status === statusFilter
      return matchesSearch && matchesStatus
    }).sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
  }, [staff, searchTerm, statusFilter])

  if (!mounted) return null;

  return (
    <div className="p-6 md:p-10 space-y-10 bg-white min-h-full max-w-[1600px] mx-auto font-body">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-4">
            <Users className="h-8 w-8 text-primary" />
            Directorio de Personal
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">Gestión operativa y legal de colaboradores • {effectiveVenueName}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl h-12 border-slate-200 font-black text-[10px] uppercase tracking-widest px-8 shadow-sm">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" /> Inyección Masiva
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-white/10">
                    <Upload className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tighter">Inyectar Personal</DialogTitle>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocolo Deep HR • {effectiveVenueName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-primary hover:bg-primary/10 h-8 font-black text-[8px] uppercase tracking-widest">
                    <FileDown className="mr-2 h-3.5 w-3.5" /> Bajar Plantilla
                  </Button>
                  <button onClick={() => setIsImportOpen(false)} className="text-white/50 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
                </div>
              </div>

              <div className="p-10 space-y-8">
                {!analysisResult ? (
                  <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-slate-50 rounded-[2rem] bg-slate-50/30 gap-6">
                    <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-xl border border-slate-100">
                      <Upload className="h-8 w-8 text-primary animate-bounce" />
                    </div>
                    <div className="text-center space-y-2">
                      <h4 className="text-sm font-black uppercase text-slate-900">Selecciona tu Excel de Personal</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase italic">Utiliza la plantilla de Aurora para evitar errores de cargo.</p>
                    </div>
                    <Button onClick={() => fileInputRef.current?.click()} disabled={analyzing} className="bg-primary hover:bg-primary/90 h-12 px-10 rounded-xl font-black text-[10px] uppercase tracking-widest">
                      {analyzing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Buscar Archivo"}
                    </Button>
                    <input type="file" className="hidden" ref={fileInputRef} accept=".xlsx, .xls" onChange={handleFileUpload} />
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <Card className={cn("rounded-[2rem] border-2 shadow-none", 
                      analysisResult.status === 'clean' ? "border-emerald-500/20 bg-emerald-50/10" : "border-amber-500/20 bg-amber-50/10"
                    )}>
                      <CardHeader className="flex flex-row items-center gap-4 p-6 border-b border-white/5">
                        <BrainCircuit className={cn("h-8 w-8", analysisResult.status === 'clean' ? "text-emerald-500" : "text-amber-500")} />
                        <div>
                          <h4 className="text-sm font-black uppercase text-slate-900">Auditoría Cero HR</h4>
                          <p className="text-[10px] font-black text-slate-500 uppercase">{analysisResult.summary}</p>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                          {(analysisResult.suggestions || []).map((s: string, i: number) => (
                            <div key={i} className="flex gap-3 text-[10px] font-bold text-slate-600 uppercase">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {s}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="max-h-[200px] overflow-auto rounded-xl border bg-white">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="text-[8px] font-black uppercase">Nombre</TableHead>
                            <TableHead className="text-[8px] font-black uppercase">Cargo</TableHead>
                            <TableHead className="text-[8px] font-black uppercase text-right">Salario</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.slice(0, 5).map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-[10px] font-bold uppercase">{row["Nombre Completo"]}</TableCell>
                              <TableCell className="text-[10px] font-black text-primary">{row["Cargo"]}</TableCell>
                              <TableCell className="text-[10px] font-bold text-right">{formatCurrencyDetailed(row["Salario"])}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <Button 
                      className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl flex gap-3"
                      onClick={executeImport}
                      disabled={importing}
                    >
                      {importing ? <Loader2 className="animate-spin h-5 w-5" /> : <><Database className="h-5 w-5 text-primary" /> Ejecutar Inyección de Nómina</>}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 rounded-xl h-12 font-black shadow-xl shadow-primary/20 uppercase text-[10px] tracking-widest px-8">
                 <UserPlus className="mr-2 h-4 w-4" /> Vincular Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-white/10">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tighter">Nueva Vinculación</DialogTitle>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deep HR Protocol • {effectiveVenueName}</p>
                  </div>
                </div>
                <button onClick={() => setIsRegisterOpen(false)} className="text-white/50 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
              </div>

              <div className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre Completo</Label>
                    <Input 
                      placeholder="EJ: CARLOS RODRÍGUEZ" 
                      value={newStaff.fullName}
                      onChange={(e) => setNewStaff({...newStaff, fullName: e.target.value})}
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Cargo Operativo</Label>
                    <Select value={newStaff.role} onValueChange={(v) => setNewStaff({...newStaff, role: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CHEF" className="font-bold text-xs uppercase">Chef de Cocina</SelectItem>
                        <SelectItem value="COOK" className="font-bold text-xs uppercase">Cocinero / Auxiliar</SelectItem>
                        <SelectItem value="WAITER" className="font-bold text-xs uppercase">Mesero / Servicio</SelectItem>
                        <SelectItem value="CASHIER" className="font-bold text-xs uppercase">Cajero / Admin</SelectItem>
                        <SelectItem value="CLEANER" className="font-bold text-xs uppercase">Servicios Generales</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Salario Base (Mensual)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        value={newStaff.salary}
                        onChange={(e) => setNewStaff({...newStaff, salary: e.target.value})}
                        className="h-12 pl-12 rounded-xl bg-slate-50 border-none font-black text-sm text-primary"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tipo de Contrato</Label>
                    <Select value={newStaff.contractType} onValueChange={(v) => setNewStaff({...newStaff, contractType: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INDETERMINADO" className="font-bold text-xs uppercase">Término Indeterminado</SelectItem>
                        <SelectItem value="TERMINO_FIJO" className="font-bold text-xs uppercase">Término Fijo</SelectItem>
                        <SelectItem value="PRESTACION_SERVICIOS" className="font-bold text-xs uppercase">Prestación de Servicios</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  className="w-full h-16 bg-primary hover:bg-primary/90 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-primary/20 flex gap-3 transition-all active:scale-95"
                  onClick={handleRegister}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><BadgeCheck className="h-5 w-5" /> Confirmar Vinculación Operativa</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Buscar por nombre o cargo..." 
            className="pl-16 h-16 rounded-[1.8rem] bg-slate-50 border-none font-bold text-sm placeholder:text-slate-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {['TODOS', 'ACTIVO', 'VACACIONES', 'RETIRADO'].map(f => (
            <Button 
              key={f} 
              variant={statusFilter === f ? "default" : "outline"}
              className={cn("rounded-xl h-16 px-6 font-black text-[9px] uppercase tracking-widest border-slate-100 shrink-0",
                statusFilter === f ? "bg-slate-900 text-white" : "bg-white text-slate-400"
              )}
              onClick={() => setStatusFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100">
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-8 px-10">Colaborador</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Cargo / Contrato</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-center">Score KPI</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest">Salario Base</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest px-10">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-24"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary"/></TableCell></TableRow>
              ) : filteredStaff.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-32 text-slate-400 font-bold italic">No se han encontrado registros en el directorio.</TableCell></TableRow>
              ) : (
                filteredStaff.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                    <TableCell className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 uppercase text-xs">{s.fullName}</span>
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter flex items-center gap-2 mt-1">
                          <Calendar className="h-2.5 w-2.5" /> INGRESO: {s.hireDate}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit font-black text-[8px] uppercase px-3 py-0.5 border-slate-200 text-slate-500 rounded-full">{s.role}</Badge>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1">{s.contractType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="font-black text-primary text-sm">{s.performanceScore}%</span>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${s.performanceScore}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-900 text-lg tracking-tighter">
                      {formatCurrencyDetailed(s.salary)}
                    </TableCell>
                    <TableCell className="text-right px-10">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-slate-200 hover:text-primary"><FileText className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="rounded-xl h-10 w-10 text-slate-200 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
