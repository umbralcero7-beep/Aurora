'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '@/context/language-context';
import { isSuperUser } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Building2, 
  Key, 
  Pause, 
  Play, 
  XCircle, 
  Plus, 
  Search, 
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface License {
  id: string;
  businessName: string;
  businessId: string;
  status: 'active' | 'paused' | 'revoked';
  plan: 'basic' | 'premium' | 'enterprise';
  maxUsers: number;
  features: string[];
  startDate: string;
  expirationDate: string;
  createdAt: any;
  notes?: string;
}

export default function LicensesPage() {
  const { t, language } = useLanguage();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isSuper = isSuperUser(user?.email);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewLicenseOpen, setIsNewLicenseOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [updating, setUpdating] = useState(false);

  const [newLicense, setNewLicense] = useState({
    businessName: '',
    businessId: '',
    plan: 'basic',
    maxUsers: 10,
    features: ['pos', 'inventory', 'orders'],
    expirationDate: '',
    notes: ''
  });

  const licensesRef = useMemo(() => {
    if (!db || !isSuper) return null;
    return query(collection(db, 'licenses'));
  }, [db, isSuper]);

  const { data: rawLicenses, isLoading } = useCollection(licensesRef);

  const licenses: License[] = rawLicenses ? rawLicenses.map(doc => ({
    id: doc.id,
    ...doc
  })) : [];

  const filteredLicenses = licenses.filter(l => {
    const matchesSearch = l.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         l.businessId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = licenses.filter(l => l.status === 'active').length;
  const pausedCount = licenses.filter(l => l.status === 'paused').length;
  const revokedCount = licenses.filter(l => l.status === 'revoked').length;

  const handleCreateLicense = async () => {
    if (!db || !newLicense.businessName || !newLicense.businessId) return;
    setUpdating(true);
    try {
      const startDate = new Date().toISOString();
      const expirationDate = newLicense.expirationDate || 
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      await addDoc(collection(db, 'licenses'), {
        ...newLicense,
        status: 'active',
        startDate,
        expirationDate,
        createdAt: serverTimestamp(),
      });

      toast({
        title: language === 'es' ? 'Licencia Creada' : 'License Created',
        description: language === 'es' 
          ? `Licencia activa para ${newLicense.businessName}`
          : `Active license for ${newLicense.businessName}`
      });
      setIsNewLicenseOpen(false);
      setNewLicense({
        businessName: '',
        businessId: '',
        plan: 'basic',
        maxUsers: 10,
        features: ['pos', 'inventory', 'orders'],
        expirationDate: '',
        notes: ''
      });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error' });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (licenseId: string, newStatus: 'active' | 'paused' | 'revoked') => {
    if (!db) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'licenses', licenseId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast({
        title: language === 'es' ? 'Estado Actualizado' : 'Status Updated',
        description: language === 'es' 
          ? `Licencia ${newStatus === 'active' ? 'activada' : newStatus === 'paused' ? 'pausada' : 'revocada'}`
          : `License ${newStatus}`
      });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error' });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-700 font-black text-[8px] uppercase rounded-full px-3"><CheckCircle2 className="h-3 w-3 mr-1" /> Activa</Badge>;
      case 'paused':
        return <Badge className="bg-amber-100 text-amber-700 font-black text-[8px] uppercase rounded-full px-3"><Pause className="h-3 w-3 mr-1" /> Pausada</Badge>;
      case 'revoked':
        return <Badge className="bg-red-100 text-red-700 font-black text-[8px] uppercase rounded-full px-3"><XCircle className="h-3 w-3 mr-1" /> Revocada</Badge>;
      default:
        return null;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return <Badge className="bg-purple-100 text-purple-700 font-black text-[8px] uppercase rounded-full px-3">Enterprise</Badge>;
      case 'premium':
        return <Badge className="bg-secondary/20 text-secondary font-black text-[8px] uppercase rounded-full px-3">Premium</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 font-black text-[8px] uppercase rounded-full px-3">Basic</Badge>;
    }
  };

  if (!isSuper) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-slate-200" />
          <h2 className="text-xl font-black text-slate-400 uppercase">Acceso Restringido</h2>
          <p className="text-[10px] text-slate-300 font-black uppercase mt-2">Solo superusuarios pueden gestionar licencias</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8 bg-white min-h-full font-body">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Centro de Licencias</h1>
            <Badge className="bg-primary/10 text-primary border-none font-black text-[8px] tracking-[0.2em] uppercase px-3 py-1">Super Admin</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">
            Gestión centralizada de establecimientos y acceso
          </p>
        </div>
        <Dialog open={isNewLicenseOpen} onOpenChange={setIsNewLicenseOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-12 px-10 bg-primary hover:bg-primary/90 text-white shadow-xl font-black text-[10px] uppercase tracking-widest">
              <Plus className="mr-2 h-5 w-5" /> Nueva Licencia
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl">
            <DialogHeader className="p-8 bg-slate-900 text-white">
              <DialogTitle className="text-xl font-black uppercase flex items-center gap-3">
                <Key className="h-6 w-6" />
                {language === 'es' ? 'Nueva Licencia' : 'New License'}
              </DialogTitle>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                  {language === 'es' ? 'Nombre del Establecimiento' : 'Establishment Name'}
                </Label>
                <Input 
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                  value={newLicense.businessName}
                  onChange={(e) => setNewLicense({...newLicense, businessName: e.target.value})}
                  placeholder="Restaurante Ejemplo"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">ID de Negocio</Label>
                <Input 
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                  value={newLicense.businessId}
                  onChange={(e) => setNewLicense({...newLicense, businessId: e.target.value.toLowerCase()})}
                  placeholder="restaurante_ejemplo"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Plan</Label>
                  <Select value={newLicense.plan} onValueChange={(v) => setNewLicense({...newLicense, plan: v as any})}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Máx. Usuarios</Label>
                  <Input 
                    type="number"
                    className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                    value={newLicense.maxUsers}
                    onChange={(e) => setNewLicense({...newLicense, maxUsers: parseInt(e.target.value) || 10})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                  {language === 'es' ? 'Fecha de Expiración' : 'Expiration Date'}
                </Label>
                <Input 
                  type="date"
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                  value={newLicense.expirationDate}
                  onChange={(e) => setNewLicense({...newLicense, expirationDate: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter className="p-8 pt-0">
              <Button 
                className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-[10px] uppercase"
                onClick={handleCreateLicense}
                disabled={updating || !newLicense.businessName || !newLicense.businessId}
              >
                {updating ? 'Creando...' : (language === 'es' ? 'Crear Licencia' : 'Create License')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-[2rem] border-slate-100 shadow-lg">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'es' ? 'Activas' : 'Active'}</p>
              <p className="text-2xl font-black text-slate-900">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] border-slate-100 shadow-lg">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Pause className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'es' ? 'Pausadas' : 'Paused'}</p>
              <p className="text-2xl font-black text-slate-900">{pausedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] border-slate-100 shadow-lg">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'es' ? 'Revocadas' : 'Revoked'}</p>
              <p className="text-2xl font-black text-slate-900">{revokedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] border-slate-100 shadow-lg">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'es' ? 'Total' : 'Total'}</p>
              <p className="text-2xl font-black text-slate-900">{licenses.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
          <Input 
            className="h-12 pl-12 rounded-xl bg-slate-50 border-none font-bold"
            placeholder={language === 'es' ? 'Buscar establecimiento...' : 'Search establishment...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-12 w-48 rounded-xl bg-slate-50 border-none font-black text-[10px] uppercase">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'es' ? 'Todas' : 'All'}</SelectItem>
            <SelectItem value="active">{language === 'es' ? 'Activas' : 'Active'}</SelectItem>
            <SelectItem value="paused">{language === 'es' ? 'Pausadas' : 'Paused'}</SelectItem>
            <SelectItem value="revoked">{language === 'es' ? 'Revocadas' : 'Revoked'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-[2.5rem] border border-slate-100 bg-white overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-b border-slate-100">
              <TableHead className="font-black text-[10px] uppercase tracking-widest py-8 px-10">Establecimiento</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">Plan</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">Usuarios</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">Estado</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">Expiración</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-right px-10">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-slate-400 font-black text-xs uppercase">Cargando...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredLicenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                  <Key className="h-12 w-12 mx-auto mb-4 text-slate-200" />
                  <p className="text-slate-300 font-black uppercase text-xs">Sin licencias registradas</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredLicenses.map((license) => (
                <TableRow key={license.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                  <TableCell className="px-10 py-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Key className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-black text-sm uppercase text-slate-900">{license.businessName}</p>
                        <p className="text-[8px] font-mono text-slate-400 uppercase">{license.businessId}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getPlanBadge(license.plan)}</TableCell>
                  <TableCell>
                    <span className="font-black text-sm text-slate-600">{license.maxUsers}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(license.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-300" />
                      <span className="text-[10px] font-black text-slate-500 uppercase">
                        {license.expirationDate ? format(new Date(license.expirationDate), 'dd/MM/yyyy') : 'N/A'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-10">
                    <div className="flex items-center justify-end gap-2">
                      {license.status === 'active' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 rounded-lg font-black text-[8px] uppercase text-amber-600 hover:bg-amber-50"
                          onClick={() => handleUpdateStatus(license.id, 'paused')}
                          disabled={updating}
                        >
                          <Pause className="h-3 w-3 mr-1" /> Pausar
                        </Button>
                      )}
                      {license.status === 'paused' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 rounded-lg font-black text-[8px] uppercase text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleUpdateStatus(license.id, 'active')}
                          disabled={updating}
                        >
                          <Play className="h-3 w-3 mr-1" /> Activar
                        </Button>
                      )}
                      {(license.status === 'active' || license.status === 'paused') && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 rounded-lg font-black text-[8px] uppercase text-red-600 hover:bg-red-50"
                          onClick={() => handleUpdateStatus(license.id, 'revoked')}
                          disabled={updating}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Revocar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}