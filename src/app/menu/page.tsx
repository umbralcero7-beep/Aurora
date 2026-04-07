
"use client"

import { isSuperUser } from '@/lib/constants';
import { useState } from "react"
import { 
  Search, 
  UtensilsCrossed, 
  Info, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Filter,
  ArrowRight,
  ImageIcon,
  Sparkles
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
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/context/language-context"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, limit, where, doc } from "firebase/firestore"
import { formatCurrencyDetailed, cn } from "@/lib/utils"

// Carta Aurora Precargada para Respaldo Demo
const DEFAULT_MENU = [
  { id: 'p1', name: 'Hamburguesa Aurora', price: 35000, category: 'Platos Fuertes', available: true, description: 'Carne Angus 200g, queso azul, cebolla caramelizada y pan brioche.', imageUrl: 'https://picsum.photos/seed/aurora_h1/600/400' },
  { id: 'p2', name: 'Empanadas de Carne (3)', price: 15000, category: 'Entradas', available: true, description: 'Crujientes empanadas tradicionales con ají de la casa.', imageUrl: 'https://picsum.photos/seed/aurora_e1/600/400' },
  { id: 'p3', name: 'Limonada de Coco', price: 12000, category: 'Bebidas', available: true, description: 'Refrescante mezcla de limón y crema de coco natural.', imageUrl: 'https://picsum.photos/seed/aurora_l1/600/400' },
  { id: 'p4', name: 'Cerveza Club Colombia', price: 10000, category: 'Bebidas', available: true, description: 'Cerveza nacional tipo Lager.', imageUrl: 'https://picsum.photos/seed/aurora_b1/600/400' },
  { id: 'p5', name: 'Torta de Chocolate', price: 14000, category: 'Postres', available: true, description: 'Húmeda y deliciosa con fudge de chocolate 70% cacao.', imageUrl: 'https://picsum.photos/seed/aurora_c1/600/400' },
]

export default function MenuPage() {
  const { t } = useLanguage()
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("Todos")

  const categories = ["Todos", "Entradas", "Platos Fuertes", "Bebidas", "Postres", "Otros"]

  const isSuper = isSuperUser(user?.email);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);

  const isSupport = profile?.role === 'SUPPORT' || isSuper;
  const effectiveBusinessId = profile?.businessId || (isSuper ? 'matu' : null);
  const effectiveVenueName = isSupport ? 'TODAS LAS SEDES' : (profile?.assignedVenue || 'Sede Central');

  const menuRef = useMemoFirebase(() => {
    if (!db) return null
    if (isSupport) return query(
      collection(db, "menu"), 
      orderBy("name"),
      limit(500)
    )
    if (!effectiveBusinessId) return null
    return query(
      collection(db, "menu"), 
      where("businessId", "==", effectiveBusinessId),
      orderBy("name"),
      limit(500)
    )
  }, [db, effectiveBusinessId, isSupport])

  const { data: menuItems, isLoading } = useCollection(menuRef)

  // Lógica de Mezcla: Usar precargada si el restaurante está vacío
  const activeMenu = (menuItems && menuItems.length > 0) ? menuItems : DEFAULT_MENU;

  const filteredMenu = activeMenu.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = activeCategory === "Todos" || item.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="p-4 md:p-6 lg:p-10 space-y-6 md:space-y-10 bg-white min-h-full max-w-[1400px] mx-auto font-body">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
        <div>
          <div className="flex items-center gap-2 md:gap-3">
            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 uppercase">La Carta • {effectiveVenueName}</h1>
            {(!menuItems || menuItems.length === 0) && (
              <Badge className="bg-primary/10 text-primary border-none font-black text-[7px] md:text-[8px] tracking-[0.2em] uppercase px-2 md:px-3 py-0.5 md:py-1">Carta Precargada</Badge>
            )}
          </div>
          <p className="text-[9px] md:text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic hidden md:block">
            {isSupport ? 'Soberanía Global: Gestión centralizada de platos.' : 'Consulta visual de platos y disponibilidad en tiempo real.'}
          </p>
        </div>
        <div className="flex gap-1 bg-slate-50 p-1 rounded-[1.5rem] border border-slate-100 overflow-x-auto max-w-full">
          {categories.map(cat => (
            <Button 
              key={cat} 
              variant={activeCategory === cat ? "default" : "ghost"} 
              size="sm" 
              className="text-[8px] md:text-[9px] font-black uppercase tracking-widest h-9 md:h-10 px-4 md:px-6 rounded-[1rem] whitespace-nowrap" 
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 h-4 md:h-5 w-4 md:w-5 text-slate-400" />
        <Input 
          placeholder="¿Qué estás buscando?"
          className="pl-12 md:pl-16 h-12 md:h-16 rounded-[1.5rem] md:rounded-[1.8rem] bg-slate-50 border-none text-xs md:text-sm font-bold placeholder:text-slate-300 shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 md:py-40 gap-4">
          <Loader2 className="h-8 md:h-10 w-8 md:w-10 animate-spin text-primary" />
          <p className="font-black text-primary uppercase text-[9px] md:text-[10px] tracking-widest">Sincronizando Carta...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {filteredMenu.length === 0 ? (
            <div className="col-span-full py-20 md:py-40 text-center border-4 border-dashed rounded-[2rem] md:rounded-[2.5rem] bg-slate-50/50">
              <UtensilsCrossed className="h-12 md:h-16 w-12 md:w-16 mx-auto mb-4 md:mb-6 opacity-10 text-slate-400" />
              <p className="text-slate-300 font-black uppercase text-xs tracking-widest">No hay platos registrados</p>
            </div>
          ) : (
            filteredMenu.map((item) => (
              <Card key={item.id} className="rounded-[1.5rem] md:rounded-[2rem] border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col bg-white group">
                <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 md:h-12 w-8 md:h-12 text-slate-200" />
                    </div>
                  )}
                  <div className="absolute top-2 md:top-4 right-2 md:right-4 flex flex-col gap-1.5 md:gap-2 items-end">
                    <Badge className={cn("px-3 md:px-4 py-1 md:py-1.5 rounded-full font-black text-[8px] md:text-[10px] uppercase shadow-lg border-none", item.available ? "bg-white text-emerald-600" : "bg-white text-slate-400")}>
                      {item.available ? "Disponible" : "Agotado"}
                    </Badge>
                    {isSupport && (
                      <Badge variant="outline" className="bg-slate-900/80 text-white border-none font-black text-[6px] md:text-[7px] uppercase px-2 md:px-3 py-0.5 md:py-1">
                        {item.assignedVenue || 'Sede Central'}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardHeader className="p-4 md:p-8 pb-2 md:pb-4">
                  <div className="flex justify-between items-start mb-1 md:mb-2">
                    <CardTitle className="text-sm md:text-lg font-black uppercase tracking-tight text-slate-900 group-hover:text-primary transition-colors">{item.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className="w-fit text-[7px] md:text-[8px] font-black uppercase tracking-widest border-slate-200 text-slate-400 px-2 md:px-3 py-0.5 rounded-full">
                    {item.category}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 md:p-8 pt-0 flex-1 flex flex-col justify-between">
                  <p className="text-[10px] md:text-xs font-bold text-slate-500 leading-relaxed italic line-clamp-2 md:line-clamp-3 mt-2 md:mt-4">
                    "{item.description || "Sin descripción disponible para este plato."}"
                  </p>
                  <div className="mt-4 md:mt-8 pt-4 md:pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest">Precio</span>
                      <span className="text-lg md:text-2xl font-black text-primary tracking-tighter">{formatCurrencyDetailed(item.price)}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-xl h-8 md:h-10 w-8 md:w-10 text-slate-200 group-hover:text-primary transition-all">
                      <Info className="h-4 md:h-5 w-4 md:w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <div className="pt-16 md:pt-20 pb-8 md:pb-10 text-center opacity-30">
        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
          AURORA OS • PROTOCOLO {isSupport ? 'GLOBAL' : effectiveVenueName.toUpperCase()}
        </p>
      </div>
    </div>
  )
}
