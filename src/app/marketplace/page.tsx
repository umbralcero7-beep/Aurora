
"use client"

import { useState } from "react"
import { 
  Puzzle, 
  Globe, 
  MessageSquare, 
  Zap, 
  ShieldCheck, 
  Lock,
  Bot,
  FileText,
  TrendingUp,
  Monitor,
  Sparkles,
  Clock,
  Mail,
  X,
  Copy,
  Check,
  Info
} from "lucide-react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/context/language-context"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export default function MarketplacePage() {
  const { t } = useLanguage()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null
    return doc(db, "users", user.email.toLowerCase())
  }, [db, user?.email])

  const { data: profile } = useDoc(userProfileRef)
  
  const emailLower = user?.email?.toLowerCase()
  const isSuperUser = emailLower === 'umbralcero7@gmail.com' || emailLower === 'amaroisaias611@gmail.com'
  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPPORT' || isSuperUser

  const extensions = [
    {
      id: "qr-menu",
      title: "Menú Digital QR",
      description: "Visualización de carta en tiempo real sincronizada con el módulo de Insumos.",
      icon: Globe,
      category: "Ventas",
      price: "GRATIS",
      tag: "PRÓXIMAMENTE",
      tagColor: "bg-slate-400",
      roi: "Aumentará la rotación de mesas en un 15%."
    },
    {
      id: "whatsapp-lite",
      title: "WhatsApp Bot Lite",
      description: "Recibe pedidos directamente en tu POS Aurora. Gestión de respuesta manual.",
      icon: MessageSquare,
      category: "Ventas",
      price: "GRATIS",
      tag: "PRÓXIMAMENTE",
      tagColor: "bg-slate-400",
      roi: "Reducirá errores de digitación en pedidos externos."
    },
    {
      id: "pdf-reports",
      title: "Reportes Auto-PDF",
      description: "Cierres de caja y balances diarios enviados automáticamente a tu correo.",
      icon: FileText,
      category: "Admin",
      price: "GRATIS",
      tag: "PRÓXIMAMENTE",
      tagColor: "bg-slate-400",
      roi: "Control total del dueño sin estar en el local."
    },
    {
      id: "forecasting-pro",
      title: "Cero AI: Forecasting",
      description: "Predicción avanzada de compras y ventas. Evita el sobrestock y las mermas.",
      icon: TrendingUp,
      category: "ERP",
      price: "$ 15/mes",
      tag: "PRÓXIMAMENTE",
      tagColor: "bg-slate-400",
      roi: "Ahorro proyectado del 5% en mermas críticas.",
      isPremium: true
    },
    {
      id: "whatsapp-full",
      title: "WhatsApp Full AI",
      description: "La IA toma el pedido, sugiere platos (upselling) y confirma el pago sola.",
      icon: Bot,
      category: "Ventas",
      price: "$ 20/mes",
      tag: "PRÓXIMAMENTE",
      tagColor: "bg-slate-400",
      roi: "Incrementará el ticket promedio automáticamente.",
      isPremium: true
    },
    {
      id: "kds-pro",
      title: "KDS Pro (Kitchen Display)",
      description: "Sustituye el papel por pantallas inteligentes con cronómetros de eficiencia.",
      icon: Monitor,
      category: "Producción",
      price: "$ 25/mes",
      tag: "PRÓXIMAMENTE",
      tagColor: "bg-slate-400",
      roi: "Reducirá los tiempos de entrega en un 30%."
    }
  ]

  const copyEmail = () => {
    navigator.clipboard.writeText("umbralcero7@gmail.com")
    setCopied(true)
    toast({ title: "Copiado", description: "Correo copiado al portapapeles." })
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isAdmin) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-20 gap-6 bg-slate-50/30 font-body">
        <div className="h-24 w-24 bg-white rounded-[2.5rem] flex items-center justify-center shadow-xl border border-slate-100">
          <Lock className="h-10 w-10 text-slate-300" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900">Acceso Denegado</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">{t.marketplace.onlyAdmin}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-10 space-y-10 bg-white min-h-full max-w-[1600px] mx-auto font-body">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase flex items-center gap-4">
            <Puzzle className="h-10 w-10 text-primary" />
            {t.marketplace.title}
          </h1>
          <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">Escala tu negocio con herramientas de precisión quirúrgica.</p>
        </div>
        <div className="bg-primary/10 px-6 py-3 rounded-[1.2rem] border border-primary/20 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Centro de Innovación Aurora</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {extensions.map((ext) => (
          <Card key={ext.id} className="rounded-[2.5rem] border-slate-100 shadow-xl transition-all duration-500 overflow-hidden bg-white flex flex-col group relative opacity-80">
            <Badge className={cn(
              "absolute top-6 right-6 font-black text-[7px] uppercase tracking-widest px-3 py-1 border-none text-white shadow-sm",
              ext.tagColor
            )}>
              {ext.tag}
            </Badge>

            <CardHeader className="p-10 pb-4">
              <div className="h-16 w-16 rounded-3xl flex items-center justify-center transition-all duration-700 border border-slate-100 mb-6 shadow-sm bg-slate-50 text-slate-400">
                <ext.icon className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight line-clamp-1">{ext.title}</CardTitle>
              <CardDescription className="text-xs text-slate-500 leading-relaxed font-bold italic mt-3 h-12 line-clamp-3">
                "{ext.description}"
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 px-10 py-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{ext.price}</span>
                  <Badge variant="outline" className="rounded-full border-slate-100 text-[7px] font-black uppercase px-2 text-slate-300">{ext.category}</Badge>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase leading-relaxed italic">
                    <Sparkles className="h-3 w-3 inline mr-2 text-slate-300" />
                    {ext.roi}
                  </p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-10 pt-4 bg-slate-50/30 border-t border-slate-50">
              <Button 
                disabled
                className="w-full rounded-2xl font-black text-[10px] uppercase tracking-widest h-14 bg-slate-200 text-slate-400 border-none shadow-none cursor-not-allowed"
              >
                <Clock className="mr-2 h-4 w-4" /> En Desarrollo
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-10 mt-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4">
            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">¿Necesitas una integración a medida?</h3>
            <p className="text-sm text-slate-400 font-bold italic max-w-xl uppercase tracking-widest">
              Obtén soporte directo del equipo de ingeniería para desarrollar módulos específicos para tus flujos.
            </p>
          </div>
          
          <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-widest h-16 px-10 rounded-2xl shadow-2xl flex gap-3 transition-all active:scale-95 border-none">
                <Mail className="h-5 w-5" /> Ver Canal de Soporte
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-white/10">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tighter">Asistencia Aurora</DialogTitle>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Canal de Ingeniería Directo</p>
                  </div>
                </div>
                <button onClick={() => setIsContactOpen(false)} className="text-white/50 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
              </div>

              <div className="p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex gap-4 items-start">
                  <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] font-black italic text-slate-500 leading-relaxed uppercase">
                    "Soy Cero. He calibrado el acceso directo. Copia el correo oficial de Umbral Cero para enviarnos tus requerimientos técnicos o de integración."
                  </p>
                </div>
                
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Correo de Soporte Oficial</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center px-6 font-black text-slate-900 text-sm overflow-hidden truncate">
                      umbralcero7@gmail.com
                    </div>
                    <Button 
                      onClick={copyEmail}
                      className={cn(
                        "h-14 w-14 rounded-2xl transition-all active:scale-90 shrink-0",
                        copied ? "bg-emerald-500 hover:bg-emerald-600" : "bg-primary hover:bg-primary/90"
                      )}
                    >
                      {copied ? <Check className="h-5 w-5 text-white" /> : <Copy className="h-5 w-5 text-white" />}
                    </Button>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-50 text-center">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Soberanía Tecnológica por Umbral Cero</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="text-center pt-20 pb-10 opacity-30 border-t border-slate-50 mt-20">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
          AURORA OS • EL STANDARD GLOBAL PARA GASTRONOMÍA DE ÉLITE
        </p>
      </div>
    </div>
  )
}
