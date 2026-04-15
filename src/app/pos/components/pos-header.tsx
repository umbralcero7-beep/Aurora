"use client"

import { Clock, Bell, User, LayoutGrid, ShoppingBag, Pause } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface POSHeaderProps {
  venueName: string
  cashierName: string
  pendingCount: number
  onShowPending: () => void
  hasUrgentPending: boolean
}

export function POSHeader({
  venueName,
  cashierName,
  pendingCount,
  onShowPending,
  hasUrgentPending
}: POSHeaderProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-10 transition-all duration-500">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <h1 className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <span className="text-primary tracking-widest">AURORA</span> 
            <span className="text-slate-500">OS</span>
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{venueName}</p>
        </div>

        <div className="h-8 w-px bg-slate-800" />

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">DIAN ONLINE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">CAJA ABIERTA</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={onShowPending}
          className={cn(
            "group flex items-center gap-3 h-10 px-4 rounded-full font-black text-[9px] uppercase tracking-widest transition-all relative overflow-hidden",
            pendingCount === 0 
              ? "bg-slate-900 text-slate-600 opacity-50 cursor-not-allowed border border-slate-800" 
              : hasUrgentPending
                ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse"
                : "bg-amber-500 text-white hover:bg-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          )}
          disabled={pendingCount === 0}
        >
          <Pause className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
          <span>En Espera</span>
          {pendingCount > 0 && (
            <Badge className="h-5 w-5 rounded-full bg-white text-slate-900 border-none text-[10px] font-black flex items-center justify-center p-0">
              {pendingCount}
            </Badge>
          )}
          {hasUrgentPending && <Bell className="h-3.5 w-3.5 animate-bounce" />}
        </button>

        <div className="flex items-center gap-4 text-slate-300">
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black uppercase tracking-widest text-white">{cashierName}</span>
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em]">Cajero Activo</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-primary shadow-inner">
            <User className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800/50 px-4 py-2 rounded-xl">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-black text-white tabular-nums tracking-widest">
            {format(time, 'HH:mm:ss')}
          </span>
        </div>
      </div>
    </header>
  )
}
