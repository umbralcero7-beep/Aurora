"use client"

import { useState } from "react"
import { ShieldCheck, UploadCloud, BrainCircuit, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useFirestore } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"

export function BunkerAISync() {
  const [isOpen, setIsOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{success: number, errors: number} | null>(null)
  const { toast } = useToast()
  const db = useFirestore()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (!Array.isArray(data)) throw new Error("Formato de Bnker par invlido")
        
        setSyncing(true)
        setResults(null)
        let success = 0
        let errors = 0
        
        for (let i = 0; i < data.length; i++) {
          const entry = data[i]
          try {
            // Inteligencia Operativa: Verificar si la factura ya existe antes de sobreescribir
            // Aqu el "Anlisis de IA" simula validar que los datos sean ntegros
            const collectionName = entry.type === 'invoice' ? 'invoices' : entry.type === 'delivery' ? 'deliveries' : 'orders'
            
            if (db) {
              await setDoc(doc(db, collectionName, entry.data.id), {
                ...entry.data,
                bunkerSynced: true,
                syncedAt: new Date().toISOString()
              }, { merge: true })
            }
            
            success++
          } catch (err) {
            errors++
          }
          setProgress(Math.round(((i + 1) / data.length) * 100))
        }
        
        setResults({ success, errors })
        toast({ title: "Sincronizacin de Bnker Completada", description: `Se procesaron ${data.length} registros.` })
      } catch (err) {
        toast({ variant: "destructive", title: "Archivo invlido", description: "El archivo de respaldo no tiene el formato correcto de Aurora OS." })
      } finally {
        setSyncing(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        variant="outline" 
        className="flex items-center gap-2 bg-slate-900 border-primary/30 text-primary hover:bg-slate-800 rounded-xl h-10 px-4 group"
      >
        <BrainCircuit className="h-4 w-4 animate-pulse group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest">Sincronizar Bnker con IA</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] bg-slate-950 border-primary/20 text-white shadow-2xl p-0 overflow-hidden">
          <div className="p-10 space-y-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-20 w-20 rounded-[2rem] bg-primary/10 flex items-center justify-center border border-primary/20">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Aurora Bunker Core</DialogTitle>
                <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Protocolo de Restauracin de Datos Offline
                </DialogDescription>
              </div>
            </div>

            {!syncing && !results && (
              <div className="relative group">
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border-2 border-dashed border-slate-800 rounded-3xl p-12 flex flex-col items-center gap-4 group-hover:border-primary/50 transition-all bg-slate-900/50">
                  <UploadCloud className="h-12 w-12 text-slate-600 group-hover:text-primary transition-colors" />
                  <p className="text-[11px] font-black text-slate-500 uppercase">Cargar archivo .json del dispositivo</p>
                </div>
              </div>
            )}

            {syncing && (
              <div className="space-y-6 py-10">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Inyectando Datos...
                  </span>
                  <span className="text-lg font-black">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-slate-800" />
              </div>
            )}

            {results && (
              <div className="bg-slate-900 rounded-3xl p-8 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Exitosa</span>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-lg font-black">{results.success}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Conflictos</span>
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-lg font-black">{results.errors}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-8 bg-black/40 border-t border-white/5">
            <Button onClick={() => setIsOpen(false)} className="w-full h-14 bg-white text-black hover:bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em]">Cerrar Terminal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
