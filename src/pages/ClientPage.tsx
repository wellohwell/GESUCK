import React, { useState, useEffect, useMemo } from 'react';
import { AuthGuard } from '../components/AuthGuard';
import { 
  useCurrentUser, 
  useUserProfile,
  subscribeClientsByStage,
  subscribeClientHistory
} from '../lib/services';
import { 
  Users, 
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Search,
  History as HistoryIcon,
  MapPin,
  ChevronRight,
  Package,
  Truck,
  Archive,
  ClipboardList,
  Edit,
  MessageCircle,
  ChevronDown,
  X,
  Phone,
  UserCheck,
  Wallet,
  Building2,
  ArrowLeft
} from 'lucide-react';
import { cn, calculateEstimasiLunas, formatWhatsApp, formatCurrency } from '../lib/utils';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'motion/react';
import { NewClientDialog } from '../features/client/dialogs/NewClientDialog';
import { RepeatOrderDialog } from '../features/client/dialogs/RepeatOrderDialog';
import { EditClientDialog } from '../features/client/dialogs/EditClientDialog';
import { SkeletonFeed } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../firebase/config';
import { doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { OperationalCard, DetailCard, Card } from '../components/ui/FintechCard';

type Stage = 'pipeline' | 'client' | 'arsip';

function getNormalizedClient(client: any) {
  if (!client) return client;
  
  const orderStatus = client.orderStatus || (
    client.status === 'survey' ? 'submitted' :
    client.status === 'acc' ? 'approved' :
    client.status === 'pending' ? 'pending' :
    client.status === 'reject' ? 'rejected' :
    client.status === 'pending_gudang' ? 'approved' :
    client.status === 'terkirim' ? 'completed' :
    'submitted'
  );
  
  const currentStep = client.currentStep || (
    ['survey', 'submitted'].includes(client.status) ? 'survey' :
    ['pending_gudang', 'acc', 'approved'].includes(client.status) ? 'warehouse' :
    'done'
  );

  const survey = client.survey || {
    status: client.status === 'survey' ? 'submitted' : (['reject', 'rejected'].includes(client.status) ? 'rejected' : 'approved'),
    note: client.note || client.pendingNote || '',
    updatedAt: client.updatedAt || client.createdAt || null,
    updatedBy: client.updatedBy || ''
  };

  const warehouse = client.warehouse || {
    status: client.status === 'terkirim' ? 'completed' : 'pending',
    updatedAt: client.updatedAt || client.createdAt || null,
    updatedBy: client.updatedBy || ''
  };

  return {
    ...client,
    orderStatus,
    currentStep,
    survey,
    warehouse,
    archiveReason: client.archiveReason || client.note || ''
  };
}

export default function ClientPage() {
  const user = useCurrentUser();
  const { profile } = useUserProfile();
  const [activeTab, setActiveTab] = useState<Stage>('pipeline');
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Selection and Detail View
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);
  
  // Dialog States
  const [showNewClient, setShowNewClient] = useState(false);
  const [showRepeatOrder, setShowRepeatOrder] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const normalizedClient = useMemo(() => getNormalizedClient(selectedClient), [selectedClient]);
  const normalizedHistory = useMemo(() => clientHistory.map(getNormalizedClient), [clientHistory]);

  const isSurveyor = () => {
    const role = profile?.role?.toUpperCase();
    return role === 'SURVEY' || role === 'STAFF' || role === 'SPV' || role === 'ADMIN' || role === 'OWNER';
  };
  
  const isGudang = () => {
    const role = profile?.role?.toUpperCase();
    return role === 'GUDANG' || role === 'STAFF' || role === 'SPV' || role === 'ADMIN' || role === 'OWNER';
  };

  useEffect(() => {
    if (!profile?.role || !user?.uid) return;
    setLoading(true);
    const unsub = subscribeClientsByStage(activeTab, profile.role, user.uid, (data) => {
      const normalizedData = data.map(getNormalizedClient);
      
      // Role queue isolation filter
      let filtered = normalizedData;
      if (activeTab === 'pipeline') {
        const userRole = profile.role.toUpperCase();
        if (userRole === 'SURVEY') {
          filtered = normalizedData.filter(c => c.currentStep === 'survey');
        } else if (userRole === 'GUDANG') {
          filtered = normalizedData.filter(c => c.currentStep === 'warehouse');
        }
      }
      
      setClients(filtered);
      setLoading(false);
    }, profile.branchId);
    return () => unsub();
  }, [profile?.role, user?.uid, activeTab, profile?.branchId]);

  // Subscribe to history when client selected
  useEffect(() => {
    if (!selectedClient?.nomor || !profile?.role) {
      setClientHistory([]);
      return;
    }
    const unsub = subscribeClientHistory(
      selectedClient.nomor, 
      profile.role, 
      user.uid,
      setClientHistory, 
      profile.branchId
    );
    return () => unsub();
  }, [selectedClient?.nomor, profile?.role, profile?.branchId]);

  // Keep selectedClient updated with live data
  useEffect(() => {
    if (selectedClient && clients.length > 0) {
      const updated = clients.find(c => c.id === selectedClient.id);
      if (updated) {
        setSelectedClient(updated);
      }
    }
  }, [clients]);

  const canAction = () => {
    const role = profile?.role?.toUpperCase();
    return role === 'STAFF' || role === 'SURVEY' || role === 'GUDANG' || role === 'OWNER' || role === 'ADMIN';
  };

  const handleUpdateStatus = async (
    clientId: string, 
    stage: 'pipeline' | 'client' | 'arsip', 
    orderStatus: string, 
    currentStep: string, 
    note?: string
  ) => {
    setIsUpdating(true);
    try {
      const emailOrUid = user?.email || user?.uid || '';
      
      const updates: any = {
        stage,
        orderStatus,
        currentStep,
        updatedAt: serverTimestamp()
      };
      
      if (orderStatus === 'approved') {
        updates.survey = {
          status: 'approved',
          note: note || '',
          updatedAt: serverTimestamp(),
          updatedBy: emailOrUid
        };
        updates.warehouse = {
          status: 'pending',
          updatedAt: serverTimestamp(),
          updatedBy: ''
        };
      } else if (orderStatus === 'rejected') {
        updates.survey = {
          status: 'rejected',
          note: note || '',
          updatedAt: serverTimestamp(),
          updatedBy: emailOrUid
        };
        updates.archiveReason = note || '';
        
        const deleteDate = new Date();
        deleteDate.setDate(deleteDate.getDate() + 14);
        updates.autoDeleteAt = deleteDate.toISOString();
      } else if (orderStatus === 'pending') {
        updates.survey = {
          status: 'pending',
          note: note || '',
          updatedAt: serverTimestamp(),
          updatedBy: emailOrUid
        };
        updates.archiveReason = note || '';
        
        const deleteDate = new Date();
        deleteDate.setDate(deleteDate.getDate() + 14);
        updates.autoDeleteAt = deleteDate.toISOString();
      } else if (orderStatus === 'completed') {
        updates.warehouse = {
          status: 'completed',
          updatedAt: serverTimestamp(),
          updatedBy: emailOrUid
        };
      }
      
      // Legacy status syncing
      updates.status = (
        orderStatus === 'submitted' ? 'survey' :
        orderStatus === 'approved' ? 'pending_gudang' :
        orderStatus === 'pending' ? 'pending' :
        orderStatus === 'rejected' ? 'reject' :
        orderStatus === 'completed' ? 'terkirim' :
        orderStatus
      );

      await updateDoc(doc(db, "clients", clientId), updates);
      toast.success(`Berhasil update status menjadi ${orderStatus.toUpperCase()}`);
      setSelectedClient(null);
      setShowNoteDialog(false);
      setNoteContent('');
    } catch (err) {
      console.error(err);
      toast.error("Gagal update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadgeProps = (status: string, step?: string) => {
    const map: Record<string, { label: string, color: string }> = {
      submitted: { label: 'Survey', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
      approved: { label: 'Gudang', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20' },
      pending: { label: 'Pending', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20' },
      rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' },
      completed: { label: 'Selesai', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
      cancelled: { label: 'Batal', color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20' },
      
      survey: { label: 'Survey', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
      acc: { label: 'ACC', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
      reject: { label: 'Reject', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' },
      pending_gudang: { label: 'Gudang', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20' },
      terkirim: { label: 'Selesai', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
    };
    return map[status] || { label: status, color: 'bg-secondary/50 text-text-secondary border border-border/50' };
  };

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(c => 
      c.nama?.toLowerCase().includes(q) || 
      c.nomor?.includes(q) ||
      c.usaha?.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-32">
        {/* TOP BAR & SEARCH */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-4 pb-4 px-4">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                type="text" 
                placeholder="Cari nama, usaha, nomor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-card border border-border/60 rounded-full text-sm font-medium text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              />
            </div>

            {/* FLOATING TABS */}
            <div className="flex bg-card p-1 rounded-full border border-border/40 shadow-sm mx-auto w-full md:w-3/4">
              {[
                { id: 'pipeline', label: 'Pipeline', icon: ClipboardList },
                { id: 'client', label: 'Proses', icon: Users },
                { id: 'arsip', label: 'Arsip', icon: Archive },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Stage)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95",
                    activeTab === tab.id 
                      ? 'bg-white text-black shadow-sm' 
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  <tab.icon className={cn("w-3.5 h-3.5", activeTab === tab.id ? 'text-black' : 'text-text-muted opacity-70')} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* LIST AREA */}
        <div className="max-w-3xl mx-auto px-4 mt-6">
          <div className="space-y-3">
            {loading ? (
              <SkeletonFeed count={5} />
            ) : filteredClients.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Data Tidak Ditemukan"
                description="Belum ada data pada tahap ini."
              />
            ) : (
              filteredClients.map(client => {
                const norm = getNormalizedClient(client);
                const badge = getStatusBadgeProps(norm.orderStatus, norm.currentStep);
                return (
                  <OperationalCard
                    key={client.id}
                    title={norm.nama}
                    subtitle={`${norm.usaha || 'Personal'} • ${norm.nomor}`}
                    icon={UserCheck}
                    onClick={() => setSelectedClient(client)}
                    status={
                      <span className={cn("text-[10px] px-2.5 py-1 rounded-lg uppercase font-bold tracking-wider", badge.color)}>
                        {badge.label}
                      </span>
                    }
                  />
                );
              })
            )}
          </div>
        </div>

        {/* FAB */}
        <AnimatePresence>
          {!selectedClient && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.8 }}
               className="fixed bottom-[calc(90px+env(safe-area-inset-bottom))] right-5 z-[50] group"
            >
              <button 
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="w-14 h-14 flex items-center justify-center bg-primary text-primary-foreground shadow-depth hover:scale-105 active:scale-95 transition-all rounded-full"
              >
                <Plus className={cn("w-7 h-7 stroke-[3] transition-transform", showAddMenu && "rotate-45")} />
              </button>
              
              {/* Floating Menu */}
              {showAddMenu && (
                <div className="absolute bottom-16 right-0 flex flex-col gap-2 min-w-[200px] items-end">
                   <Card depth="medium" interactive onClick={() => { setShowAddMenu(false); setShowNewClient(true); }} className="px-4 py-3 flex items-center gap-3 w-full border-border/80 text-text-primary">
                     <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                       <Plus className="w-4 h-4" />
                     </div>
                     <div>
                       <p className="text-xs font-bold">Konsumen Baru</p>
                       <p className="text-[10px] text-text-muted">Daftar & Request</p>
                     </div>
                   </Card>
                   <Card depth="medium" interactive onClick={() => { setShowAddMenu(false); setShowRepeatOrder(true); }} className="px-4 py-3 flex items-center gap-3 w-full border-border/80 text-text-primary">
                     <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                       <HistoryIcon className="w-4 h-4" />
                     </div>
                     <div>
                       <p className="text-xs font-bold">Repeat Order</p>
                       <p className="text-[10px] text-text-muted">Order tambahan</p>
                     </div>
                   </Card>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* FULLSCREEN DETAIL VIEW */}
        <AnimatePresence>
          {selectedClient && (
            <motion.div 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-0 z-[9999] bg-background flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-4 flex items-center justify-between border-b border-border/40 bg-card/85 backdrop-blur-xl z-20 shrink-0">
                 <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedClient(null)} className="p-2 -ml-2 rounded-full hover:bg-secondary/50 text-text-primary transition-colors">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">{normalizedClient.nama}</h2>
                      <p className="text-[10px] text-text-muted uppercase tracking-widest">{normalizedClient.usaha || 'Personal Unit'}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setShowEditClient(true)} className="p-2 rounded-full hover:bg-primary/10 text-primary transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                 </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain bg-background pb-32">
                 <div className="max-w-2xl mx-auto p-4 space-y-4">
                    
                    {/* Status & Contact Card */}
                    <Card className="p-5 flex flex-col gap-5">
                       <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                             <div className="w-12 h-12 rounded-2xl bg-secondary/30 flex items-center justify-center text-text-primary">
                               <UserCheck className="w-6 h-6" />
                             </div>
                             <div>
                                <span className={cn("text-[9px] px-2 py-0.5 rounded-lg uppercase font-bold tracking-widest", getStatusBadgeProps(normalizedClient.orderStatus, normalizedClient.currentStep).color)}>
                                   {getStatusBadgeProps(normalizedClient.orderStatus, normalizedClient.currentStep).label}
                                </span>
                                <h3 className="text-lg font-black text-text-primary uppercase tracking-tight mt-1">{normalizedClient.nama}</h3>
                                <p className="text-xs text-text-muted font-medium flex items-center gap-1 mt-1">
                                   <Phone className="w-3 h-3" /> {normalizedClient.nomor}
                                </p>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <a href={`https://wa.me/${formatWhatsApp(normalizedClient.nomor)}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all">
                               <MessageCircle className="w-5 h-5" />
                             </a>
                             <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizedClient.alamat)}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all">
                               <MapPin className="w-5 h-5 pointer-events-none" />
                             </a>
                          </div>
                       </div>
                       
                       <div className="pt-4 border-t border-border/40">
                          <p className="text-[11px] text-text-primary font-medium leading-relaxed uppercase">
                             <MapPin className="w-3.5 h-3.5 inline-block mr-1.5 text-text-muted -mt-0.5" />
                             {normalizedClient.alamat}
                          </p>
                       </div>
                    </Card>

                    {/* Active Workflows/Orders */}
                    <DetailCard title={`Active Orders (${normalizedHistory.filter(h => h.stage === 'pipeline').length})`} icon={Activity}>
                      <div className="space-y-3">
                         {normalizedHistory.filter(h => h.stage === 'pipeline').length === 0 ? (
                           <p className="text-xs text-text-muted italic text-center py-4">Tidak ada order aktif.</p>
                         ) : (
                           normalizedHistory.filter(h => h.stage === 'pipeline').map(order => (
                             <OperationalCard
                               key={order.id}
                               title={order.produk}
                               subtitle={formatCurrency(order.omset)}
                               icon={Package}
                               expandableContent={
                                 <div className="grid grid-cols-2 gap-4 text-left">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-text-muted uppercase">Skema Bayar</p>
                                    <p className="text-xs font-bold text-text-primary">{formatCurrency(order.angsuran)} / {order.tenorType}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-text-muted uppercase">Masa Tenor</p>
                                    <p className="text-xs font-bold text-text-primary">{order.tenor} {order.tenorType}</p>
                                  </div>
                                </div>
                               }
                             />
                           ))
                         )}
                      </div>
                    </DetailCard>

                    {/* History */}
                    <DetailCard title="Riwayat Lunas" icon={Archive}>
                       <div className="space-y-3">
                          {normalizedHistory.filter(h => h.stage === 'client' && calculateEstimasiLunas(h.updatedAt || h.createdAt, h.tenor || 30, h.tenorType || 'hari') <= new Date()).length === 0 ? (
                            <p className="text-xs text-text-muted italic text-center py-4">Belum ada riwayat lunas.</p>
                          ) : (
                            normalizedHistory.filter(h => h.stage === 'client' && calculateEstimasiLunas(h.updatedAt || h.createdAt, h.tenor || 30, h.tenorType || 'hari') <= new Date()).map(order => (
                              <OperationalCard
                                key={order.id}
                                title={order.produk}
                                subtitle="Status: LUNAS"
                                icon={CheckCircle2}
                                className="border-emerald-500/20"
                              />
                            ))
                          )}
                       </div>
                    </DetailCard>

                 </div>
              </div>

              {/* ACTION FOOTER */}
              {canAction() && (
                 <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border/50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-30 shadow-2xl">
                    {normalizedClient.stage === 'pipeline' && (
                      <div className="max-w-2xl mx-auto">
                        {normalizedClient.currentStep === 'survey' ? (
                          isSurveyor() ? (
                            <div className="grid grid-cols-3 gap-2">
                              <button 
                                onClick={() => handleUpdateStatus(normalizedClient.id, 'pipeline', 'approved', 'warehouse')}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm active:scale-95"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                ACC
                              </button>
                              <button 
                                onClick={() => { setPendingAction({ stage: 'arsip', orderStatus: 'pending', currentStep: 'done' }); setShowNoteDialog(true); }}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-1 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm active:scale-95"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                Pending
                              </button>
                              <button 
                                onClick={() => { setPendingAction({ stage: 'arsip', orderStatus: 'rejected', currentStep: 'done' }); setShowNoteDialog(true); }}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-1 h-12 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm active:scale-95"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <div className="w-full h-12 bg-secondary/50 rounded-full flex items-center justify-center gap-2 text-text-muted font-bold text-xs uppercase tracking-widest cursor-not-allowed">
                              Menunggu Survey (Akses Terbatas)
                            </div>
                          )
                        ) : normalizedClient.currentStep === 'warehouse' ? (
                          isGudang() ? (
                            <button 
                              onClick={() => handleUpdateStatus(normalizedClient.id, 'client', 'completed', 'done')}
                              disabled={isUpdating}
                              className="w-full flex items-center justify-center gap-2 h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-bold text-xs uppercase tracking-wider shadow-depth transition-all active:scale-95"
                            >
                              <Truck className="w-4 h-4" />
                              Konfirmasi Barang Diterima
                            </button>
                          ) : (
                            <div className="w-full h-12 bg-secondary/50 rounded-full flex items-center justify-center gap-2 text-text-muted font-bold text-xs uppercase tracking-widest cursor-not-allowed">
                              Menunggu Pengiriman (Akses Terbatas)
                            </div>
                          )
                        ) : null}
                      </div>
                    )}
                    {normalizedClient.stage === 'client' && (
                      <div className="max-w-2xl mx-auto">
                        <div className="w-full h-12 bg-secondary/50 rounded-full flex items-center justify-center gap-2 text-text-muted font-bold text-xs uppercase tracking-widest cursor-not-allowed">
                          <CheckCircle2 className="w-4 h-4" />
                          Order Selesai
                        </div>
                      </div>
                    )}
                    {normalizedClient.stage === 'arsip' && (
                      <div className="max-w-2xl mx-auto">
                         <button 
                          onClick={() => {
                            if (confirm("Hapus data dari arsip?")) {
                              deleteDoc(doc(db, "clients", normalizedClient.id));
                              setSelectedClient(null);
                            }
                          }}
                          className="w-full h-12 bg-destructive/5 hover:bg-destructive/10 text-destructive rounded-full font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                        >
                          Hapus Permanen
                        </button>
                      </div>
                    )}
                 </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Note Dialog */}
        <AnimatePresence>
          {showNoteDialog && (
            <div className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm bg-background border border-border/50 rounded-3xl p-6 shadow-2xl"
              >
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                      <Edit className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight">Keterangan Wajib</h3>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Alasan Status: {pendingAction?.orderStatus?.toUpperCase()}</p>
                    </div>
                 </div>
                 <textarea 
                    autoFocus
                    placeholder="Tulis alasan atau catatan operasional di sini..."
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                    className="w-full h-32 bg-card border border-border/50 rounded-2xl p-4 text-sm text-text-primary outline-none focus:border-primary/50 resize-none font-medium mb-4"
                 />
                 <div className="flex gap-2">
                    <button onClick={() => setShowNoteDialog(false)} className="flex-1 py-3 bg-secondary/50 rounded-full text-xs font-bold text-text-primary hover:bg-secondary transition-colors active:scale-95">Batal</button>
                    <button onClick={() => handleUpdateStatus(selectedClient.id, pendingAction.stage, pendingAction.orderStatus, pendingAction.currentStep, noteContent)} disabled={isUpdating || !noteContent.trim()} className="flex-1 py-3 bg-primary rounded-full text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-sm transition-all active:scale-95">Simpan</button>
                 </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <NewClientDialog isOpen={showNewClient} onClose={() => setShowNewClient(false)} />
        <RepeatOrderDialog isOpen={showRepeatOrder} onClose={() => setShowRepeatOrder(false)} />
        {selectedClient && <EditClientDialog isOpen={showEditClient} onClose={() => setShowEditClient(false)} client={selectedClient} />}
      </div>
    </AuthGuard>
  );
}

