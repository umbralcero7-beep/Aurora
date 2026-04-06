'use client';

import { useState, useEffect } from 'react';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { isSuperUser } from '@/lib/constants';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Package, 
  Bell, 
  X, 
  ShoppingCart,
  RefreshCw,
  BellOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StockAlert {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  unit: string;
  businessId: string;
}

export function StockAlerts() {
  const { t, language } = useLanguage();
  const db = useFirestore();
  const { user } = useUser();
  const isSuper = isSuperUser(user?.email);

  const [dismissed, setDismissed] = useState<string[]>([]);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, "users", user.email.toLowerCase());
  }, [db, user?.email]);

  const { data: profile } = useDoc(userProfileRef);

  const effectiveBusinessId = profile?.businessId || (isSuper ? 'matu' : null);
  const isSupport = profile?.role === 'SUPPORT' || isSuper;

  const suppliesRef = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "supplies"));
  }, [db]);

  const { data: rawSupplies } = useCollection(suppliesRef);

  const lowStockItems: StockAlert[] = rawSupplies
    ?.filter((item: any) => {
      const threshold = item.minStock || 10;
      return Number(item.stock) <= threshold;
    })
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      stock: Number(item.stock),
      minStock: item.minStock || 10,
      unit: item.unit,
      businessId: item.businessId
    }))
    .filter(item => !dismissed.includes(item.id)) || [];

  const criticalItems = lowStockItems.filter(item => item.stock === 0);
  const warningItems = lowStockItems.filter(item => item.stock > 0);

  const handleDismiss = (id: string) => {
    setDismissed([...dismissed, id]);
  };

  const handleDismissAll = () => {
    setDismissed([...dismissed, ...lowStockItems.map(i => i.id)]);
  };

  if (lowStockItems.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-[2.5rem] border border-amber-100 bg-amber-50/30 overflow-hidden shadow-lg">
      <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Bell className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
              {language === 'es' ? 'Alertas de Inventario' : 'Inventory Alerts'}
              <Badge className="bg-amber-500 text-white font-black text-[8px] uppercase rounded-full px-2">
                {lowStockItems.length}
              </Badge>
            </CardTitle>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600"
          onClick={handleDismissAll}
        >
          <BellOff className="h-3 w-3 mr-1" />
          {language === 'es' ? 'Ocultar' : 'Dismiss All'}
        </Button>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-3 max-h-80 overflow-y-auto">
        {criticalItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-[8px] font-black uppercase text-red-500 tracking-wider flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {language === 'es' ? 'CRÍTICO - AGOTADO' : 'CRITICAL - OUT OF STOCK'}
            </p>
            {criticalItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-red-400" />
                  <div>
                    <p className="text-xs font-black uppercase text-slate-900">{item.name}</p>
                    <p className="text-[8px] font-mono text-slate-400">{item.sku}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-600 font-black text-[8px] uppercase rounded-full">
                    0 {item.unit}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-100"
                    onClick={() => handleDismiss(item.id)}
                  >
                    <X className="h-3 w-3 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {warningItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-[8px] font-black uppercase text-amber-500 tracking-wider flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {language === 'es' ? 'ADVERTENCIA - STOCK BAJO' : 'WARNING - LOW STOCK'}
            </p>
            {warningItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-xs font-black uppercase text-slate-900">{item.name}</p>
                    <p className="text-[8px] font-mono text-slate-400">{item.sku}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-600 font-black text-[8px] uppercase rounded-full">
                    {item.stock} {item.unit}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-amber-100"
                    onClick={() => handleDismiss(item.id)}
                  >
                    <X className="h-3 w-3 text-amber-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}