import React, { useState, useEffect } from 'react';
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
  Briefcase,
  MapPin,
  ChevronRight,
  Package,
  Truck,
  Archive,
  ClipboardList,
  Edit,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { cn, calculateEstimasiLunas, formatWhatsApp } from '../lib/utils';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'motion/react';
import { openModal, closeModal } from '../hooks/use-modal';
import { NewClientDialog } from '../features/client/dialogs/NewClientDialog';
import { RepeatOrderDialog } from '../features/client/dialogs/RepeatOrderDialog';
import { EditClientDialog } from '../features/client/dialogs/EditClientDialog';
import { SkeletonFeed } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../firebase/config';
import { doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';

type Stage = 'pipeline' | 'client' | 'arsip';

export default function ClientPage() {
  const user = useCurrentUser();
  const { profile } = useUserProfile();
  const [activeTab, setActiveTab] = useState<Stage>('pipeline');
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Drawer & Modal States
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);
  
  // New Dialog States
  const [showNewClient, setShowNewClient] = useState(false);
  const [showRepeatOrder, setShowRepeatOrder] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);

  useEffect(() => {
    if (!profile?.role || !user?.uid) return;
    setLoading(true);
    const unsub = subscribeClientsByStage(activeTab, profile.role, user.uid, (data) => {
      setClients(data);
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

  // Hide bottom navbar and lockout scrolling when detail modal is active
  useEffect(() => {
    if (selectedClient) {
      document.body.classList.add('overflow-hidden', 'market-modal-active');
    } else {
      document.body.classList.remove('overflow-hidden', 'market-modal-active');
    }
    return () => {
      document.body.classList.remove('overflow-hidden', 'market-modal-active');
    };
  }, [selectedClient]);

  // Keep selectedClient updated with live data from the clients list
  useEffect(() => {
    if (selectedClient && clients.length > 0) {
      const updated = clients.find(c => c.id === selectedClient.id);
      if (updated) {
        setSelectedClient(updated);
      }
    }
  }, [clients]);

  // Clean up global modal on page unmount
  useEffect(() => {
    return () => {
      closeModal('client-detail-modal');
    };
  }, []);

  // Synchronize global modal with selectedClient state
  useEffect(() => {
    if (selectedClient) {
      openModal({
        id: 'client-detail-modal',
        title: '',
        size: 'md',
        content: (
          <ClientDetailModalContent 
            selectedClient={selectedClient} 
            clientHistory={clientHistory}
            isUpdating={isUpdating}
            pendingAction={pendingAction}
            setPendingAction={setPendingAction}
            setShowNoteDialog={setShowNoteDialog}
            canAction={canAction}
            handleUpdateStatus={handleUpdateStatus}
            db={db}
            setSelectedClient={setSelectedClient}
            expandedOrderIds={expandedOrderIds}
            setExpandedOrderIds={setExpandedOrderIds}
            profile={profile}
            user={user}
            onEditClick={() => setShowEditClient(true)}
          />
        ),
        onClose: () => {
          setSelectedClient(null);
        }
      });
    } else {
      closeModal('client-detail-modal');
    }
  }, [selectedClient, clientHistory, isUpdating, pendingAction, expandedOrderIds, profile, user]);

  const canAction = () => {
    const role = profile?.role?.toUpperCase();
    return role === 'STAFF' || role === 'SURVEY' || role === 'GUDANG' || role === 'OWNER' || role === 'ADMIN';
  };

  const handleUpdateStatus = async (clientId: string, stage: Stage, status: string, note?: string) => {
    setIsUpdating(true);
    try {
      const updates: any = {
        stage,
        status,
        updatedAt: serverTimestamp()
      };
      if (note !== undefined) updates.note = note;
      
      // Auto delete in 14 days if reject
      if (status === 'reject') {
        const deleteDate = new Date();
        deleteDate.setDate(deleteDate.getDate() + 14);
        updates.autoDeleteAt = deleteDate.toISOString();
      }

      await updateDoc(doc(db, "clients", clientId), updates);
      toast.success(`Berhasil update status menjadi ${status.replace('_', ' ')}`);
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

  const getStatusBadge = (status: string, isCompact = false) => {
    const styles: Record<string, string> = {
      survey: "bg-amber-500 dark:bg-amber-600 text-black font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-[9px]",
      acc: "bg-emerald-500 dark:bg-emerald-600 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-[9px]",
      pending: "bg-orange-500 dark:bg-orange-600 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-[9px]",
      reject: "bg-red-500 dark:bg-red-600 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-[9px]",
      pending_gudang: "bg-sky-500 dark:bg-sky-600 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-[9px]",
      terkirim: "bg-indigo-500 dark:bg-indigo-600 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-[9px]",
    };

    const compactStyles: Record<string, string> = {
      survey: "bg-amber-500 dark:bg-amber-600 text-black font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter text-[8px]",
      acc: "bg-emerald-500 dark:bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter text-[8px]",
      pending: "bg-orange-500 dark:bg-orange-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter text-[8px]",
      reject: "bg-red-500 dark:bg-red-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter text-[8px]",
      pending_gudang: "bg-sky-500 dark:bg-sky-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter text-[8px]",
      terkirim: "bg-indigo-500 dark:bg-indigo-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter text-[8px]",
    };

    if (isCompact) {
      return (
        <span className={cn(compactStyles[status] || "bg-zinc-500 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter text-[8px]")}>
          {status.replace('_', ' ')}
        </span>
      );
    }

    return (
      <span className={cn(styles[status] || "bg-zinc-500 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-[9px]")}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const formatIDR = (val: string | number) => {
    const num = typeof val === 'string' ? Number(val.replace(/\D/g, '')) : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num || 0);
  };

  const toggleOrderExpand = (id: string) => {
    setExpandedOrderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Order sections logic
  const now = new Date();
  const activeOrders = clientHistory.filter(h => {
    if (h.status !== 'terkirim') return false;
    const deliveredAt = h.updatedAt || h.createdAt;
    const estimasi = calculateEstimasiLunas(deliveredAt, h.tenor || 30, h.tenorType || 'hari');
    return now < estimasi;
  });

  const historyOrders = clientHistory.filter(h => {
    if (h.status !== 'terkirim') return false;
    const deliveredAt = h.updatedAt || h.createdAt;
    const estimasi = calculateEstimasiLunas(deliveredAt, h.tenor || 30, h.tenorType || 'hari');
    return now >= estimasi;
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-28 pt-4">
        <div className="max-w-xl mx-auto px-4">
          
          {/* SEARCH BAR */}
          <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Cari nama, usaha, atau nomor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-white dark:bg-black placeholder-zinc-500 dark:placeholder-zinc-400 border border-zinc-200 dark:border-white/5 shadow-sm rounded-2xl text-[11px] font-bold outline-none focus:ring-1 focus:ring-primary text-zinc-900 dark:text-zinc-100 transition-all"
              />
          </div>

          {/* TAB SYSTEM */}
          <div className="flex justify-center w-full mb-6">
            <div className="inline-flex items-center justify-center gap-2">
              {[
                { id: 'pipeline', label: 'Pipeline', icon: ClipboardList },
                { id: 'client', label: 'Client', icon: Users },
                { id: 'arsip', label: 'Arsip', icon: Archive },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Stage)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex flex-row items-center justify-center gap-1.5 group ${
                    activeTab === tab.id 
                      ? 'bg-primary text-primary-foreground scale-105 shadow-sm' 
                      : 'text-zinc-500 hover:text-primary dark:text-zinc-400'
                  }`}
                >
                  <tab.icon className={`w-3.5 h-3.5 transition-colors ${activeTab === tab.id ? 'text-primary-foreground' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-primary'}`} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* FEED AREA (SUMMARY CARDS) */}
          <div className="space-y-2 pb-32">
            {loading ? (
              <SkeletonFeed count={4} />
            ) : clients.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Data Tidak Ditemukan"
                description="Belum ada data pada tahap ini atau tidak ada yang sesuai pencarian."
              />
            ) : (
              clients.filter(c => 
                c.nama?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                c.nomor?.includes(searchQuery) ||
                c.usaha?.toLowerCase().includes(searchQuery.toLowerCase())
              ).map(client => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer group flex items-start gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-[12px] font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                        {client.nama}
                      </h3>
                      {getStatusBadge(client.status, true)}
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <p className="text-[10px] font-bold truncate tracking-tight uppercase">
                        {client.alamat}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-colors self-center shrink-0" />
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* FAB */}
        {!selectedClient && (
          <button 
            onClick={() => {
              openModal({
                id: 'selection-sheet',
                title: 'Pilih Transaksi',
                className: 'dark:bg-black dark:border-white/[0.05]',
                content: (
                  <div className="grid grid-cols-1 gap-2 p-2">
                    <button 
                      onClick={() => { closeModal('selection-sheet'); setShowNewClient(true); }}
                      className="flex items-center gap-4 p-5 rounded-[24px] text-left bg-zinc-100 dark:bg-zinc-900 hover:bg-primary/10 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Konsumen Baru</p>
                        <p className="text-[10px] font-bold text-zinc-500">Pendaftaran & Order Pertama</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => { closeModal('selection-sheet'); setShowRepeatOrder(true); }}
                      className="flex items-center gap-4 p-5 rounded-[24px] text-left bg-zinc-100 dark:bg-zinc-900 hover:bg-primary/10 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <HistoryIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Repeat Order</p>
                        <p className="text-[10px] font-bold text-zinc-500">Pilih Konsumen Terdaftar</p>
                      </div>
                    </button>
                  </div>
                )
              });
            }}
            className="fixed bottom-[calc(90px+env(safe-area-inset-bottom))] right-5 z-[50] w-14 h-14 flex items-center justify-center bg-primary text-black shadow-xl hover:scale-105 active:scale-95 transition-all rounded-full"
          >
            <Plus className="w-7 h-7 stroke-[3]" />
          </button>
        )}

        {/* NOTE DIALOG */}
        <AnimatePresence>
          {showNoteDialog && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1105] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-sm bg-white dark:bg-zinc-950 rounded-[32px] p-6 shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <Edit className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">Keterangan Wajib</h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sebutkan alasan {pendingAction?.status}</p>
                  </div>
                </div>
                
                <textarea 
                  autoFocus
                  placeholder="Isi catatan di sini..."
                  value={noteContent}
                   onChange={e => setNoteContent(e.target.value)}
                  className="w-full h-32 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl text-[11px] font-bold outline-none focus:ring-1 focus:ring-primary mb-6 resize-none"
                />

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowNoteDialog(false)}
                    className="flex-1 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-2xl transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={() => {
                      if (!noteContent) return toast.error("Catatan wajib diisi");
                      handleUpdateStatus(selectedClient.id, pendingAction.stage, pendingAction.status, noteContent);
                    }}
                    disabled={isUpdating}
                    className="flex-1 py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                  >
                    Kirim
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <NewClientDialog isOpen={showNewClient} onClose={() => setShowNewClient(false)} />
        <RepeatOrderDialog isOpen={showRepeatOrder} onClose={() => setShowRepeatOrder(false)} />
        <EditClientDialog isOpen={showEditClient} onClose={() => setShowEditClient(false)} client={selectedClient} />
      </div>
    </AuthGuard>
  );
}

// Global Modal Content wrapper for Consumer Details
interface ClientDetailModalContentProps {
  selectedClient: any;
  clientHistory: any[];
  isUpdating: boolean;
  pendingAction: any;
  setPendingAction: (action: any) => void;
  setShowNoteDialog: (show: boolean) => void;
  canAction: () => boolean;
  handleUpdateStatus: (clientId: string, stage: Stage, status: string, note?: string) => Promise<void>;
  db: any;
  setSelectedClient: (client: any) => void;
  expandedOrderIds: string[];
  setExpandedOrderIds: React.Dispatch<React.SetStateAction<string[]>>;
  profile: any;
  user: any;
  onEditClick: () => void;
}

function ClientDetailModalContent({
  selectedClient,
  clientHistory,
  isUpdating,
  pendingAction,
  setPendingAction,
  setShowNoteDialog,
  canAction,
  handleUpdateStatus,
  db,
  setSelectedClient,
  expandedOrderIds,
  setExpandedOrderIds,
  profile,
  user,
  onEditClick,
}: ClientDetailModalContentProps) {
  const mapsQuery = selectedClient.usaha && selectedClient.usaha !== 'Personal Unit'
    ? `${selectedClient.usaha}, ${selectedClient.alamat}`
    : selectedClient.alamat;

  const formatIDR = (val: string | number) => {
    const num = typeof val === 'string' ? Number(val.replace(/\D/g, '')) : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num || 0);
  };

  const toggleOrderExpand = (id: string) => {
    setExpandedOrderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getStatusBadge = (status: string, isCompact = false) => {
    const styles: Record<string, string> = {
      survey: "bg-amber-500 dark:bg-amber-600 text-black font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-[9px]",
      acc: "bg-emerald-500 dark:bg-emerald-600 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-[9px]",
      pending: "bg-orange-500 dark:bg-orange-600 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-[9px]",
      reject: "bg-red-500 dark:bg-red-600 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-[9px]",
      pending_gudang: "bg-sky-500 dark:bg-sky-600 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-[9px]",
      terkirim: "bg-indigo-500 dark:bg-indigo-600 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-[9px]",
    };

    const compactStyles: Record<string, string> = {
      survey: "bg-amber-500 dark:bg-amber-600 text-black font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter text-[8px]",
      acc: "bg-emerald-500 dark:bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter text-[8px]",
      pending: "bg-orange-500 dark:bg-orange-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter text-[8px]",
      reject: "bg-red-500 dark:bg-red-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter text-[8px]",
      pending_gudang: "bg-sky-500 dark:bg-sky-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter text-[8px]",
      terkirim: "bg-indigo-500 dark:bg-indigo-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter text-[8px]",
    };

    if (isCompact) {
      return (
        <span className={cn(compactStyles[status] || "bg-zinc-500 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter text-[8px]")}>
          {status.replace('_', ' ')}
        </span>
      );
    }

    return (
      <span className={cn(styles[status] || "bg-zinc-500 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-[9px]")}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const now = new Date();
  const activeOrders = clientHistory.filter(h => {
    if (h.status !== 'terkirim') return false;
    const deliveredAt = h.updatedAt || h.createdAt;
    const estimasi = calculateEstimasiLunas(deliveredAt, h.tenor || 30, h.tenorType || 'hari');
    return now < estimasi;
  });

  const historyOrders = clientHistory.filter(h => {
    if (h.status !== 'terkirim') return false;
    const deliveredAt = h.updatedAt || h.createdAt;
    const estimasi = calculateEstimasiLunas(deliveredAt, h.tenor || 30, h.tenorType || 'hari');
    return now >= estimasi;
  });

  const canEdit = () => {
    const role = profile?.role?.toUpperCase();
    const isOwnerOfDoc = selectedClient?.ownerId === user?.uid;
    return isOwnerOfDoc || role === 'OWNER' || role === 'SURVEY' || role === 'GUDANG' || role === 'ADMIN';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* SCROLLABLE CONTENT */}
      <div className="overflow-y-auto flex-1 overscroll-contain pb-6">
        <div className="p-4 pt-1 space-y-5">
          
          {/* CENTERED COMPACT HEADER BLOCK */}
          <div className="flex flex-col items-center justify-center text-center space-y-2 border-b border-zinc-100 dark:border-white/5 pb-4">
            {/* 1. Status Badge */}
            <div className="flex justify-center">
              {getStatusBadge(selectedClient.status, true)}
            </div>

            {/* 2. Nama Konsumen */}
            <div className="space-y-0.5">
              <h2 className="text-base font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight border-b-0 m-0">
                {selectedClient.nama}
              </h2>
            </div>

            {/* 3. Profil */}
            <div className="flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-[10.5px] font-bold tracking-wider uppercase">
              <span>{selectedClient.usaha || 'Personal Unit'}</span>
            </div>

            {/* 4. Alamat */}
            <div className="flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-[10px] font-medium leading-relaxed uppercase tracking-tight max-w-xs px-2">
              <span className="text-center leading-normal">{selectedClient.alamat}</span>
            </div>

            {/* 5. Button Actions */}
            <div className="flex items-center justify-center gap-2.5 pt-1">
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center active:scale-95 text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-200 dark:ring-white/5 transition-all"
                title="Rute Maps"
              >
                <MapPin className="w-3.5 h-3.5 text-red-500" />
              </a>
              <a 
                href={`https://wa.me/${formatWhatsApp(selectedClient.nomor)}`}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center active:scale-95 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 transition-all"
                title="WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
              {canEdit() && (
                <button 
                  onClick={onEditClick}
                  className="w-8 h-8 rounded-full bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center active:scale-95 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20 transition-all"
                  title="Edit Data Konsumen"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* SECTION 2: ORDER AKTIF */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 m-0 border-b-0 p-0">Order Selesai / Aktif</h3>
              </div>
              {activeOrders.length > 0 && (
                <span className="text-[9px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                  {activeOrders.length} PKG
                </span>
              )}
            </div>
            
            {activeOrders.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic opacity-60 m-0">Tidak ada pengiriman aktif</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50 dark:divide-white/[0.02]">
                {activeOrders.map(order => {
                  const estimasiLunas = calculateEstimasiLunas(order.updatedAt || order.createdAt, order.tenor || 30, order.tenorType || 'hari');
                  const isExpanded = expandedOrderIds.includes(order.id);
                  return (
                    <div key={order.id} className="py-3 first:pt-0 last:pb-0">
                      <div 
                        onClick={() => toggleOrderExpand(order.id)}
                        className="flex items-center justify-between cursor-pointer group active:opacity-70 transition-opacity"
                      >
                        <div className="flex items-center gap-3 w-full min-w-0 text-left">
                          <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[11px] font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-tight line-clamp-1">{order.produk}</h4>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <p className="text-[10px] font-black text-primary">{formatIDR(order.omset)}</p>
                              <span className="text-[8px] font-black text-zinc-300">•</span>
                              <p className="text-[9px] font-bold text-zinc-400 uppercase">Hingga {estimasiLunas.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-300" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-300" />}
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-dashed border-zinc-100 dark:border-white/5 text-left">
                              <div className="space-y-0.5">
                                <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Skema Bayar</p>
                                <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-100">{formatIDR(order.angsuran)} / {order.tenorType}</p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Masa Tenor</p>
                                <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-100">{order.tenor} {order.tenorType}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 3: RIWAYAT CLOUD */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-white/5 pb-2">
              <HistoryIcon className="w-3.5 h-3.5 text-zinc-400" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 m-0 border-b-0 p-0">Riwayat Selesai</h3>
            </div>

            {historyOrders.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic opacity-60 m-0">Belum ada riwayat lunas</p>
              </div>
            ) : (
              <div className="space-y-3 pb-3">
                {historyOrders.map(order => {
                  const estimasiLunas = calculateEstimasiLunas(order.updatedAt || order.createdAt, order.tenor || 30, order.tenorType || 'hari');
                  return (
                    <div key={order.id} className="flex items-center justify-between py-2 border-b border-zinc-50 dark:border-white/[0.02] last:border-0 grow text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 flex items-center justify-center text-zinc-400">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase truncate max-w-[140px]">{order.produk}</h4>
                          <p className="text-[9px] font-bold text-emerald-600 lowercase tracking-tighter tabular-nums">{formatIDR(order.omset)} (LUNAS)</p>
                        </div>
                      </div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase whitespace-nowrap">
                        {estimasiLunas.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STICKY FOOTER ACTIONS */}
      {canAction() && (
        <div className="flex-shrink-0 bg-white dark:bg-zinc-950 px-6 py-4 border-t border-zinc-100 dark:border-white/5 pb-2">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-300 mb-3 text-center">Workflow Controls</div>
          
          {selectedClient.stage === 'pipeline' && (
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleUpdateStatus(selectedClient.id, 'client', 'pending_gudang')}
                disabled={isUpdating}
                className="flex items-center justify-center gap-2 h-12 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-transform"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve
              </button>
              <button 
                onClick={() => { setPendingAction({ stage: 'arsip', status: 'reject' }); setShowNoteDialog(true); }}
                disabled={isUpdating}
                className="flex items-center justify-center gap-2 h-12 bg-red-500/10 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-transform"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
              <button 
                onClick={() => { setPendingAction({ stage: 'arsip', status: 'pending' }); setShowNoteDialog(true); }}
                disabled={isUpdating}
                className="col-span-2 flex items-center justify-center gap-2 h-12 bg-orange-500/10 text-orange-600 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-transform"
              >
                <Clock className="w-4 h-4" />
                Hold / Pending Survey
              </button>
            </div>
          )}

          {selectedClient.stage === 'client' && (
            <div>
              {selectedClient.status === 'pending_gudang' ? (
                <button 
                  onClick={() => handleUpdateStatus(selectedClient.id, 'client', 'terkirim')}
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center gap-3 h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-zinc-900/10 dark:shadow-white/5 active:scale-95 disabled:opacity-50 transition-transform"
                >
                  <Truck className="w-5 h-5" />
                  Konfirmasi Terkirim
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 h-12 bg-zinc-50 dark:bg-zinc-900 rounded-2xl font-black text-[10px] uppercase tracking-widest text-emerald-600 opacity-60">
                  <CheckCircle2 className="w-4 h-4" />
                  Operasional Selesai
                </div>
              )}
            </div>
          )}

          {selectedClient.stage === 'arsip' && (
            <button 
              onClick={() => {
                if (confirm("Hapus data dari arsip?")) {
                  deleteDoc(doc(db, "clients", selectedClient.id));
                  setSelectedClient(null);
                }
              }}
              className="w-full h-12 text-red-500/60 font-black text-[10px] uppercase tracking-[0.3em] active:scale-95 hover:bg-red-500/5 rounded-2xl transition-all"
            >
              Hapus Permanen
            </button>
          )}
        </div>
      )}

      {!canAction() && (
        <div className="flex-shrink-0 p-4 pt-0 text-center pb-2">
          <p className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.2em]">View-only Access Mode</p>
        </div>
      )}
    </div>
  );
}
