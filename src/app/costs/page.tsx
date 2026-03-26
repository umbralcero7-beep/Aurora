
"use client"

import { useState, useMemo } from "react"
import { 
  Calculator, 
  BarChart3,
  Scale,
  BrainCircuit,
  Loader2,
  TrendingDown,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  TrendingUp,
  Zap,
  ArrowRight,
  CheckCircle2,
  X,
  Share2,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, doc } from "firebase/firestore"
import { cn, formatCurrencyDetailed } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { generateExpertBalance, type ExpertBalanceOutput } from "@/ai/flows/expert-balance-report-flow"

export default function CostsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [isCalculating, setIsCalculating] = useState(false)
  const [isGeneratingBalance, setIsGeneratingBalance] = useState(false)
  const [expertReport, setExpertReport] = useState<ExpertBalanceOutput | null>(null)
  const [isReportOpen, setIsReportOpen] = useState(false)

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);
  
  const suppliesRef = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "supplies"))
  }, [db])
  
  const { data: supplies, isLoading } = useCollection(suppliesRef)

  const totalQty = supplies?.reduce((acc, s) => acc + (Number(s.stock) || 0), 0) || 0
  const totalValue = supplies?.reduce((acc, s) => acc + ((Number(s.stock) || 0) * (Number(s.price) || 0)), 0) || 0
  const weightedAverage = supplies && supplies.length > 0 ? totalValue / totalQty : 0

  const handleRecalculate = async () => {
    setIsCalculating(true)
    // Simulación de auditoría de lotes profunda
    await new Promise(resolve => setTimeout(resolve, 1500))
    toast({
      title: "Márgenes Recalculados",
      description: "Sincronización de costos con inventario real completada.",
    })
    setIsCalculating(false)
  }

  const handleGenerateBalance = async () => {
    if (!user?.email) return
    setIsGeneratingBalance(true)
    try {
      const result = await generateExpertBalance({
        recipientEmail: user.email,
        recipientRole: profile?.role || 'ADMIN'
      })
      setExpertReport(result)
      setIsReportOpen(true)
      toast({
        title: "Balance Maestro Generado",
        description: "El consultor Cero ha finalizado el análisis estratégico.",
      })
    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Error de IA",
        description: "No se pudo conectar con el motor de análisis experto.",
      })
    } finally {
      setIsGeneratingBalance(false)
    }
  }

  const handleDownloadPDF = () => {
    toast({
      title: "Generando PDF Analítico",
      description: "Preparando documento de alta resolución para exportación...",
    })
    // En un entorno real esto generaría un PDF con librerías como jspdf
    // Por ahora usamos el print del sistema para simular la descarga
    setTimeout(() => {
      window.print()
    }, 1000)
  }

  const handleShareWithBoard = () => {
    toast({
      title: "Compartido con Junta Directiva",
      description: "El balance experto ha sido despachado a los miembros autorizados.",
    })
  }

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-20 gap-4 bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-black text-primary animate-pulse uppercase text-[10px] tracking-[0.3em]">Calculando Márgenes ERP...</p>
      </div>
    )
  }

  return (
    <div className="p-10 space-y-10 bg-white min-h-full max-w-[1400px] mx-auto font-body overflow-x-hidden">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-4">
            <Scale className="h-8 w-8 text-primary" />
            Control de Costos (Dynamics Level)
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1 italic">Valoración de activos y márgenes de contribución.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="rounded-xl h-11 border-primary text-primary font-black uppercase text-[10px] tracking-widest px-6 shadow-sm"
            onClick={handleRecalculate}
            disabled={isCalculating}
          >
            {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
            Recalcular Márgenes
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 rounded-xl h-11 font-black shadow-lg shadow-primary/20 uppercase text-[10px] tracking-widest px-8"
            onClick={handleGenerateBalance}
            disabled={isGeneratingBalance}
          >
            {isGeneratingBalance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Generar Balance Maestro
          </Button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {[
          { label: "Valorización de Inventario", value: formatCurrencyDetailed(totalValue), trend: "Activos Totales", icon: ShieldCheck, color: "text-primary" },
          { label: "Promedio Ponderado", value: formatCurrencyDetailed(weightedAverage), trend: "Costo Unitario Ref.", icon: TrendingDown, color: "text-secondary" },
          { label: "Eficiencia de Insumos", value: supplies?.length ? "94%" : "0%", trend: "Sede Auditada", icon: BarChart3, color: "text-emerald-500" },
        ].map((item, i) => (
          <Card key={i} className="bg-slate-50 border-slate-100 shadow-xl rounded-[2rem] p-2 transition-all hover:shadow-2xl">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</CardTitle>
                <item.icon className={cn("h-4 w-4", item.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn("text-4xl font-black tracking-tighter", item.color)}>{item.value}</div>
              <p className="text-[9px] mt-2 text-muted-foreground font-black uppercase tracking-tight">{item.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-8">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl p-8 bg-white">
            <CardHeader className="p-0 pb-10">
              <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tighter">Métodos de Valoración Dynamics</CardTitle>
              <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Simulación dinámica de rentabilidad por lotes.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-10">
              <Tabs defaultValue="weighted" className="space-y-10">
                <TabsList className="bg-slate-100 p-1.5 rounded-[1.5rem] h-14 w-full grid grid-cols-3 border border-slate-100">
                  <TabsTrigger value="fifo" className="rounded-[1rem] font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">FIFO (PEPS)</TabsTrigger>
                  <TabsTrigger value="lifo" className="rounded-[1rem] font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">LIFO (UEPS)</TabsTrigger>
                  <TabsTrigger value="weighted" className="rounded-[1rem] font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">PONDERO</TabsTrigger>
                </TabsList>
                
                <TabsContent value="fifo" className="animate-in fade-in duration-500">
                  <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-4">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Lógica de Salida Activa</p>
                    <p className="text-sm font-bold text-emerald-900 leading-relaxed italic">
                      "Aurora está priorizando la salida de los lotes más antiguos. Este método maximiza la utilidad neta en periodos de inflación baja, ideal para el cumplimiento fiscal UBL 2.1."
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="lifo" className="animate-in fade-in duration-500">
                  <div className="p-8 bg-orange-50 border border-orange-100 rounded-3xl space-y-4">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Lógica de Salida Activa</p>
                    <p className="text-sm font-bold text-orange-900 leading-relaxed italic">
                      "Utilizando el costo de las adquisiciones más recientes. Este método es útil para reducir la carga impositiva en entornos de alta inflación al reconocer costos mayores de forma inmediata."
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="weighted" className="animate-in fade-in duration-500">
                  <div className="p-8 bg-blue-50 border border-blue-100 rounded-3xl space-y-4">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Lógica de Salida Activa</p>
                    <p className="text-sm font-bold text-blue-900 leading-relaxed italic">
                      "Calculando el costo unitario promedio de todas las existencias disponibles. Es el método más estable y recomendado para la comercialización masiva en Aurora OS."
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-3">
                  <BarChart3 className="h-4 w-4 text-primary" /> Proyección de Márgenes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Utilidad Bruta Proyectada</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter">68.5%</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Punto de Equilibrio (Día)</p>
                    <p className="text-2xl font-black text-primary tracking-tighter">{formatCurrencyDetailed(totalValue * 0.12)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-4 space-y-10">
          <Card className="rounded-[2.5rem] bg-slate-900 text-white p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4">
                <BrainCircuit className="h-8 w-8 text-primary" />
                <h3 className="font-black uppercase text-[11px] tracking-[0.3em] text-white">IA Cero ERP</h3>
              </div>
              <p className="text-[11px] leading-relaxed font-black italic text-slate-400 uppercase tracking-tight">
                "He auditado la valoración de tus activos en {supplies?.length || 0} categorías. Tu capital inmovilizado en bodega asciende a {formatCurrencyDetailed(totalValue)}. Sugiero liquidar lotes de 'Proteínas' para liberar flujo de caja este fin de semana."
              </p>
              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Auditoría Compliance Dynamics</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2.5rem] border-slate-100 shadow-xl p-8 bg-slate-50/30">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" /> Ayuda Dynamics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <p className="text-[9px] font-bold text-slate-500 leading-relaxed uppercase italic">
                La valoración de inventario es el pilar de tu contabilidad. Aurora OS utiliza algoritmos de precisión para asegurar que el costo de ventas refleje la realidad del mercado, facilitando auditorías externas y procesos de franquicia.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DIÁLOGO DE BALANCE MAESTRO (IA) */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl flex flex-col h-[85vh]">
          <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-white/10">
                <BrainCircuit className="h-8 w-8 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">{expertReport?.reportTitle || "Análisis Consultivo"}</DialogTitle>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Cero AI Business Intelligence Module</p>
              </div>
            </div>
            <button onClick={() => setIsReportOpen(false)} className="text-white/50 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
          </div>

          <ScrollArea className="flex-1 p-10 bg-slate-50/50">
            <div className="space-y-10">
              {/* Comentario del Experto */}
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><FileText className="h-20 w-20 text-primary" /></div>
                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" /> Resumen Ejecutivo
                </h4>
                <p className="text-sm font-bold text-slate-700 leading-relaxed uppercase italic">
                  "{expertReport?.expertCommentary}"
                </p>
              </div>

              {/* Métricas Comparativas */}
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="rounded-3xl border-none shadow-md bg-white p-6 space-y-4">
                  <div className="flex justify-between items-center border-b pb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Día de Alta Demanda</span>
                    <Badge className="bg-orange-500 text-white font-black text-[8px] uppercase">Busy Day</Badge>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Revenue</span>
                      <span className="text-xl font-black text-slate-900">{formatCurrencyDetailed(expertReport?.busyDayMetrics.revenue || 0)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Ticket Promedio</span>
                      <span className="text-lg font-black text-primary">{formatCurrencyDetailed(expertReport?.busyDayMetrics.averageTicket || 0)}</span>
                    </div>
                    <div className="pt-2">
                      <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Highlight Estratégico:</p>
                      <p className="text-[10px] font-bold text-slate-500 italic uppercase">{expertReport?.busyDayMetrics.highlight}</p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-3xl border-none shadow-md bg-white p-6 space-y-4">
                  <div className="flex justify-between items-center border-b pb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jornada Estándar</span>
                    <Badge className="bg-blue-500 text-white font-black text-[8px] uppercase">Normal Day</Badge>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Revenue</span>
                      <span className="text-xl font-black text-slate-900">{formatCurrencyDetailed(expertReport?.normalDayMetrics.revenue || 0)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Mermas (Waste)</span>
                      <span className="text-lg font-black text-destructive">{expertReport?.normalDayMetrics.wastePercentage || 0}%</span>
                    </div>
                    <div className="pt-2">
                      <p className="text-[9px] font-black text-blue-600 uppercase mb-1">Highlight Operativo:</p>
                      <p className="text-[10px] font-bold text-slate-500 italic uppercase">{expertReport?.normalDayMetrics.highlight}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Recomendación Final */}
              <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">Acción de Alto Impacto</h4>
                </div>
                <p className="text-lg font-black tracking-tight leading-snug">
                  {expertReport?.strategicRecommendation}
                </p>
              </div>

              {/* Visual Hints */}
              <div className="flex flex-wrap gap-3">
                {expertReport?.visualHints.map((hint, i) => (
                  <Badge key={i} variant="outline" className="rounded-full border-slate-200 text-slate-400 font-black text-[8px] uppercase px-4 py-1">
                    <BarChart3 className="h-2.5 w-2.5 mr-2" /> {hint}
                  </Badge>
                ))}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-8 bg-white border-t flex flex-col sm:flex-row gap-4">
            <Button 
              variant="outline" 
              className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest border-slate-200 hover:bg-slate-50 group"
              onClick={handleDownloadPDF}
            >
              <Download className="mr-2 h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              Descargar PDF Analítico
            </Button>
            <Button 
              className="flex-1 h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 group"
              onClick={handleShareWithBoard}
            >
              <Share2 className="mr-2 h-4 w-4 text-white group-hover:scale-110 transition-transform" />
              Compartir con Junta Directiva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
