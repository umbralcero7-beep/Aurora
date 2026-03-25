
"use client"

import { 
  CheckCircle2, 
  Zap, 
  BrainCircuit, 
  ShieldCheck, 
  Rocket,
  Scale,
  TrendingUp,
  FileSpreadsheet,
  Cpu,
  Layers,
  MousePointer2
} from "lucide-react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { useLanguage } from "@/context/language-context"

export default function PhilosophyPage() {
  const { t } = useLanguage();

  const features = [
    {
      icon: MousePointer2,
      title: "Intuición Invisible",
      description: "Eliminamos la complejidad de SAP y Odoo. La interfaz solo muestra lo necesario, reduciendo la fatiga cognitiva del staff."
    },
    {
      icon: Cpu,
      title: "IA Cero Estratégica",
      description: "Un cerebro que conecta el costo de insumos (Deep ERP) con los hábitos de tus clientes en tiempo real."
    },
    {
      icon: Layers,
      title: "Contextual UX",
      description: "Diseño basado en el rol actual. El sistema se adapta al usuario, no el usuario al sistema."
    },
    {
      icon: Scale,
      title: "Escandallos Dinámicos",
      description: "Si el proveedor sube sus precios, Aurora recalcula el margen de cada plato al instante."
    },
    {
      icon: ShieldCheck,
      title: "Cero Trust Security",
      description: "Logs de actividad inalterables y acceso por White-list. Auditoría total de cada centavo."
    },
    {
      icon: Rocket,
      title: "Velocidad Aurora",
      description: "Infraestructura serverless de ultra-respuesta para operaciones de alto rendimiento."
    }
  ]

  return (
    <div className="p-10 space-y-12 max-w-6xl mx-auto bg-white min-h-full font-body">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
          <Rocket className="h-3 w-3" /> Aurora V3.0 • Standard Global
        </div>
        <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">La Filosofía Aurora</h1>
        <p className="text-sm text-muted-foreground font-bold italic max-w-2xl mx-auto">Venciendo la complejidad para alcanzar el alto rendimiento gastronómico.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Card key={i} className="border-slate-100 shadow-xl bg-white hover:-translate-y-1 transition-all duration-300 rounded-[2rem] p-4">
            <CardHeader>
              <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center mb-4 border border-primary/10">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900">{f.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 leading-relaxed font-bold italic">
                "{f.description}"
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-2xl bg-slate-900 text-white overflow-hidden relative rounded-[2.5rem]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <CardHeader className="p-10 relative z-10">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">La Ventaja Estratégica V3.0</CardTitle>
          <CardDescription className="text-slate-400 font-bold text-sm uppercase tracking-widest">
            Tecnología de precisión por Umbral Cero.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-10 pt-0 relative z-10 grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="font-black uppercase tracking-widest text-[10px] text-primary">Suministros (Deep ERP)</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="font-bold text-xs text-slate-300">Control de mermas asistido por visión artificial.</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="font-bold text-xs text-slate-300">Auto-Stock basado en forecasting de demanda.</span>
              </li>
            </ul>
          </div>
          <div className="space-y-6">
            <h3 className="font-black uppercase tracking-widest text-[10px] text-secondary">Finanzas (Fiscal Auto-Pilot)</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="font-bold text-xs text-slate-300">Conciliación bancaria automática por Cero.</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="font-bold text-xs text-slate-300">Tax Compliance instantáneo (DGI/DIAN).</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center pb-12 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
          AURORA OS — EL STANDARD GLOBAL DE PRECISIÓN
        </p>
      </div>
    </div>
  )
}
