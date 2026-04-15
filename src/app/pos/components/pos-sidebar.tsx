"use client"

import { 
  LayoutGrid, 
  ShoppingBag, 
  Settings, 
  Lock, 
  LogOut, 
  PieChart, 
  Users, 
  Truck,
  PlusCircle,
  LucideIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface POSSidebarProps {
  activeTab: 'tables' | 'direct'
  setActiveTab: (tab: 'tables' | 'direct') => void
  onAddTable: () => void
  onCierreCaja: () => void
  isAdmin: boolean
  categories: string[]
  activeCategory: string
  setActiveCategory: (cat: string) => void
}

interface NavButtonProps {
  icon: LucideIcon
  label: string
  isActive?: boolean
  onClick: () => void
  variant?: 'nav' | 'action' | 'danger'
  tooltip?: string
}

function NavButton({ icon: Icon, label, isActive, onClick, variant = 'nav', tooltip }: NavButtonProps) {
  const content = (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center w-full py-4 transition-all duration-300",
        variant === 'nav' && (
          isActive 
            ? "text-primary bg-primary/5 border-r-2 border-primary" 
            : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"
        ),
        variant === 'action' && "text-slate-400 hover:text-white hover:bg-slate-800",
        variant === 'danger' && "text-red-400/50 hover:text-red-500 hover:bg-red-500/10"
      )}
    >
      <Icon className={cn(
        "h-5 w-5 mb-1.5 transition-transform duration-300",
        isActive ? "scale-110" : "group-hover:scale-110"
      )} />
      <span className="text-[8px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
        {label}
      </span>
    </button>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-900 border-slate-800 text-[10px] font-black uppercase tracking-wider">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}

export function POSSidebar({
  activeTab,
  setActiveTab,
  onAddTable,
  onCierreCaja,
  isAdmin,
  categories,
  activeCategory,
  setActiveCategory
}: POSSidebarProps) {
  return (
    <aside className="w-20 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-4 shrink-0 transition-all duration-500 hover:w-24 overflow-y-auto no-scrollbar">
      <div className="flex flex-col w-full gap-2">
        <NavButton 
          icon={LayoutGrid} 
          label="Mesas" 
          isActive={activeTab === 'tables'} 
          onClick={() => setActiveTab('tables')} 
          tooltip="Gestión de Mesas"
        />
        <NavButton 
          icon={ShoppingBag} 
          label="Venta" 
          isActive={activeTab === 'direct'} 
          onClick={() => setActiveTab('direct')} 
          tooltip="Venta Directa"
        />
      </div>

      <div className="w-8 h-px bg-slate-800 my-6" />

      <div className="flex flex-col w-full gap-1 flex-1">
        <div className="px-2 mb-2">
           <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest flex justify-center">Categorías</span>
        </div>
        {categories.map((cat) => (
           <button
             key={cat}
             onClick={() => setActiveCategory(cat)}
             className={cn(
               "w-full py-3 flex flex-col items-center justify-center transition-all group",
               activeCategory === cat ? "text-primary" : "text-slate-500 hover:text-slate-300"
             )}
           >
             <span className={cn(
               "text-[7px] font-black uppercase tracking-widest text-center transition-transform",
               activeCategory === cat ? "scale-110" : "group-hover:scale-110"
             )}>
               {cat}
             </span>
             {activeCategory === cat && (
               <div className="mt-1 h-0.5 w-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
             )}
           </button>
        ))}
      </div>

      <div className="w-8 h-px bg-slate-800 my-6" />

      <div className="flex flex-col w-full gap-2">
        {isAdmin && (
          <NavButton 
            icon={PlusCircle} 
            label="Mesa+" 
            onClick={onAddTable} 
            variant="action"
            tooltip="Agregar Nueva Mesa"
          />
        )}
        <NavButton 
          icon={Lock} 
          label="Cierre" 
          onClick={onCierreCaja} 
          variant="action"
          tooltip="Corte de Caja"
        />
        <NavButton 
          icon={LogOut} 
          label="Salir" 
          onClick={() => window.location.href = '/'} 
          variant="danger"
          tooltip="Cerrar Sesión"
        />
      </div>
    </aside>
  )
}
