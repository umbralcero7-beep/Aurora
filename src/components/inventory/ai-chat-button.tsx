
"use client"

import { useState } from "react"
import { 
  Bot, 
  Send, 
  X, 
  Sparkles,
  Loader2,
  BrainCircuit,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLanguage } from "@/context/language-context"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import { analyzeInventory, type InventoryAnalystOutput } from "@/ai/flows/inventory-analyst-flow"
import { cn } from "@/lib/utils"

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestedActions?: string[]
}

export function AIChatButton() {
  const { t } = useLanguage()
  const db = useFirestore()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])

  const suppliesRef = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, "supplies")
  }, [db])

  const { data: supplies } = useCollection(suppliesRef)

  const handleSend = async (customInput?: string) => {
    const messageContent = customInput || input
    if (!messageContent.trim() || loading) return

    const userMessage: Message = { role: 'user', content: messageContent }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const res = await analyzeInventory({
        query: messageContent,
        currentInventory: supplies || []
      })

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: res.response,
        suggestedActions: res.suggestedActions 
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Cero está recalibrando sus algoritmos estratégicos. Por favor, intenta de nuevo." 
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {isOpen ? (
        <Card className="w-[380px] h-[600px] flex flex-col shadow-[0_30px_100px_rgba(0,0,0,0.3)] border-slate-100/50 animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 rounded-[2.5rem] overflow-hidden bg-white/95 backdrop-blur-xl">
          <CardHeader className="bg-slate-900 text-white py-6 px-8 border-b border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-secondary p-0.5 shadow-lg">
                    <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
                </div>
                <div className="flex flex-col">
                  <CardTitle className="text-lg font-black tracking-tighter uppercase leading-none">
                    Cero Help
                  </CardTitle>
                  <p className="text-[7px] uppercase tracking-[0.3em] text-primary font-black mt-1">Soporte Contextual</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)} 
                className="text-slate-400 hover:text-white hover:bg-white/5 rounded-full h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 p-6 overflow-hidden bg-slate-50/10">
            <ScrollArea className="h-full pr-2">
              <div className="space-y-6">
                <div className="bg-white border border-slate-100 p-6 rounded-[1.8rem] text-[11px] font-bold italic leading-relaxed text-slate-500 shadow-sm relative">
                  <p>"Soy Cero. He minimizado mi interfaz para no interrumpir tu flujo. ¿En qué puedo asistirte técnicamente?"</p>
                </div>
                
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex flex-col gap-2 max-w-[90%]",
                      msg.role === 'user' ? "ml-auto items-end" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "p-4 rounded-[1.5rem] text-[13px] font-medium leading-relaxed shadow-md",
                      msg.role === 'user' 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-white border border-slate-100 rounded-tl-none text-slate-700"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-3 text-primary animate-pulse ml-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Analizando...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-6 border-t bg-white">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex w-full items-center gap-3"
            >
              <Input 
                placeholder="Pregunta algo..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="bg-slate-50 border-none h-12 rounded-xl font-bold text-xs shadow-none"
                disabled={loading}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={loading} 
                className="bg-slate-900 hover:bg-primary h-12 w-12 shrink-0 rounded-full transition-all active:scale-90"
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      ) : (
        <div className="relative group">
          {/* Subtle Glow */}
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse blur-xl" />
          
          <button 
            onClick={() => setIsOpen(true)}
            className="h-16 w-16 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.2)] bg-slate-900 hover:bg-slate-800 transition-all hover:scale-110 active:scale-95 flex items-center justify-center relative z-10 border border-white/5"
          >
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary/20 to-secondary/20 flex items-center justify-center backdrop-blur-sm">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div className="absolute top-4 right-4 h-2 w-2 bg-emerald-500 rounded-full border border-slate-900 animate-pulse" />
          </button>
        </div>
      )}
    </div>
  )
}
