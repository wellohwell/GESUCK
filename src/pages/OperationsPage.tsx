import React, { useState, useEffect, useMemo } from 'react';
import { 
  useCurrentUser, 
  useUserProfile,
  subscribeClients,
  subscribeClientHistory
} from '../lib/services';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Search, 
  MapPin, 
  ChevronRight, 
  ChevronDown, 
  Package, 
  Truck, 
  X, 
  Phone, 
  UserCheck, 
  ClipboardList, 
  ArrowLeft,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  Database,
  ExternalLink
} from 'lucide-react';
import { cn, formatCurrency, formatWhatsApp } from '../lib/utils';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

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
    status: client.status === 'terkirim' ? 'delivered' : 'pending',
    updatedAt: client.updatedAt || client.createdAt || null,
    updatedBy: client.updatedBy || ''
  };

  return {
    ...client,
    barang: client.produk || client.barang || '',
    orderStatus,
    currentStep,
    survey,
    warehouse,
    archiveReason: client.archiveReason || client.note || client.pendingNote || '',
    archivedAt: client.archivedAt || null,
    archivedBy: client.archivedBy || ''
  };
}

function getRelativeTime(timestamp: any) {
  if (!timestamp) return '';
  try {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 1) return 'Baru saja';
    if (diffInMins < 60) return `${diffInMins}m lalu`;
    if (diffInHours < 24) return `${diffInHours}j lalu`;
    if (diffInDays === 1) return 'Kemarin';
    if (diffInDays < 7) return `${diffInDays} hari lalu`;
    
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch (e) {
    return '';
  }
}

export default function OperationsPage() {
  const user = useCurrentUser();
  const { profile } = useUserProfile();
  const [allClients, setAllClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Selection and History for the Detail Sheet
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Dialog State for mandatory notes (Reason required for pending/reject)
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    stage: 'pipeline' | 'client' | 'arsip';
    orderStatus: string;
    currentStep: string;
  } | null>(null);

  // Accordion Expand States
  const [isCurrentOrderExpanded, setIsCurrentOrderExpanded] = useState(true);
  const [isOrderHistoryExpanded, setIsOrderHistoryExpanded] = useState(false);

  // Load Realtime Data
  useEffect(() => {
    if (!profile?.role || !user?.uid) return;
    setLoading(true);
    
    const unsub = subscribeClients(profile.role, user.uid, (data) => {
      const normalized = data.map(getNormalizedClient);
      setAllClients(normalized);
      setLoading(false);
    }, profile.branchId);

    return () => unsub();
  }, [profile?.role, user?.uid, profile?.branchId]);

  // Load selected client history
  useEffect(() => {
    if (!selectedClient?.nomor || !profile?.role || !user?.uid) {
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
  }, [selectedClient?.nomor, profile?.role, user?.uid, profile?.branchId]);

  // Sync selected client with live updates
  useEffect(() => {
    if (selectedClient && allClients.length > 0) {
      const updated = allClients.find(c => c.id === selectedClient.id);
      if (updated) {
        setSelectedClient(updated);
      }
    }
  }, [allClients]);

  // Role Normalizations
  const userRole = profile?.role?.toUpperCase() || '';
  const isSurveyor = userRole === 'SURVEY';
  const isGudang = userRole === 'GUDANG';
  const isStaffOrAdmin = ['STAFF', 'OWNER', 'MANAGER', 'ADMIN', 'SPV', 'SUPERVISOR'].includes(userRole);

  const canAccessSurveyQueue = isStaffOrAdmin || isSurveyor;
  const canAccessWarehouseQueue = isStaffOrAdmin || isGudang;

  // Real-Time Queue Segregations
  // 1. Survey Queue: currentStep === 'survey' and in pipeline stage (and not historically failed/done)
  const surveyQueue = useMemo(() => {
    return allClients.filter(c => 
      c.stage === 'pipeline' && 
      c.currentStep === 'survey' && 
      !['completed', 'rejected', 'pending', 'cancelled'].includes(c.orderStatus)
    );
  }, [allClients]);

  // 2. Warehouse Queue: currentStep === 'warehouse' and in pipeline stage
  const warehouseQueue = useMemo(() => {
    return allClients.filter(c => 
      c.stage === 'pipeline' && 
      c.currentStep === 'warehouse' && 
      !['completed', 'rejected', 'pending', 'cancelled'].includes(c.orderStatus)
    );
  }, [allClients]);

  // 3. Pending Count: total clients globally in 'arsip' with 'pending' order status, or pipeline pending
  const pendingCount = useMemo(() => {
    return allClients.filter(c => 
      c.orderStatus === 'pending'
    ).length;
  }, [allClients]);

  // 4. Completed Today calculation
  const completedToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allClients.filter(c => {
      if (c.orderStatus !== 'completed') return false;
      const completedTime = c.warehouse?.updatedAt?.toDate ? c.warehouse.updatedAt.toDate() : (c.updatedAt?.seconds ? new Date(c.updatedAt.seconds * 1000) : null);
      if (!completedTime) return false;
      completedTime.setHours(0,0,0,0);
      return completedTime.getTime() === today.getTime();
    }).length;
  }, [allClients]);

  const normalizedClient = useMemo(() => selectedClient ? getNormalizedClient(selectedClient) : null, [selectedClient]);
  const normalizedHistory = useMemo(() => clientHistory.map(getNormalizedClient), [clientHistory]);

  // Search Filter
  const filteredSurveyQueue = useMemo(() => {
    if (!searchQuery) return surveyQueue;
    const q = searchQuery.toLowerCase();
    return surveyQueue.filter(c => 
      c.nama?.toLowerCase().includes(q) || 
      c.usaha?.toLowerCase().includes(q) || 
      c.alamat?.toLowerCase().includes(q)
    );
  }, [surveyQueue, searchQuery]);

  const filteredWarehouseQueue = useMemo(() => {
    if (!searchQuery) return warehouseQueue;
    const q = searchQuery.toLowerCase();
    return warehouseQueue.filter(c => 
      c.nama?.toLowerCase().includes(q) || 
      c.usaha?.toLowerCase().includes(q) || 
      c.alamat?.toLowerCase().includes(q)
    );
  }, [warehouseQueue, searchQuery]);

  // Database status updater action
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
        updatedAt: serverTimestamp()
      };

      updates.orderStatus = orderStatus;
      updates.currentStep = currentStep;

      if (orderStatus === 'approved') {
        // ACC
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
        // Reject
        updates.survey = {
          status: 'rejected',
          note: note || '',
          updatedAt: serverTimestamp(),
          updatedBy: emailOrUid
        };
        updates.archiveReason = note || '';
        updates.archivedAt = serverTimestamp();
        updates.archivedBy = emailOrUid;
        
        const deleteDate = new Date();
        deleteDate.setDate(deleteDate.getDate() + 14);
        updates.autoDeleteAt = deleteDate.toISOString();
      } else if (orderStatus === 'pending') {
        // Pending surveyor
        updates.survey = {
          status: 'pending',
          note: note || '',
          updatedAt: serverTimestamp(),
          updatedBy: emailOrUid
        };
        updates.archiveReason = note || '';
        updates.archivedAt = serverTimestamp();
        updates.archivedBy = emailOrUid;
      } else if (orderStatus === 'completed') {
        // Terkirim
        updates.warehouse = {
          status: 'delivered',
          note: note || '',
          updatedAt: serverTimestamp(),
          updatedBy: emailOrUid
        };
      } else if (orderStatus === 'approved' && currentStep === 'warehouse' && note === 'pending_gudang-action') {
        // Custom update for Pending Gudang
        updates.warehouse = {
          status: 'pending',
          updatedAt: serverTimestamp(),
          updatedBy: emailOrUid
        };
      }

      // Legacy fields mapping
      updates.status = (
        orderStatus === 'submitted' ? 'survey' :
        orderStatus === 'approved' ? 'pending_gudang' :
        orderStatus === 'pending' ? 'pending' :
        orderStatus === 'rejected' ? 'reject' :
        orderStatus === 'completed' ? 'terkirim' :
        orderStatus
      );

      await updateDoc(doc(db, "clients", clientId), updates);
      toast.success("Berhasil memperbarui antrean operasional");
      setSelectedClient(null);
      setShowNoteDialog(false);
      setNoteContent('');
    } catch (err) {
      console.error(err);
      toast.error("Gagal melakukan aksi operasional");
    } finally {
      setIsUpdating(false);
    }
  };

  // Timeline events assembly
  const timelineEvents = useMemo(() => {
    if (!normalizedClient) return [];
    const events = [];
    
    if (normalizedClient.createdAt) {
      events.push({
        title: 'Diajukan (Submitted)',
        time: normalizedClient.createdAt,
        desc: 'Pengajuan konsumen baru masuk ke database.',
        status: 'success'
      });
    }
    
    if (normalizedClient.survey?.status && normalizedClient.survey.status !== 'submitted') {
      const isApproved = normalizedClient.survey.status === 'approved';
      const isPending = normalizedClient.survey.status === 'pending';
      const isRejected = normalizedClient.survey.status === 'rejected';
      
      events.push({
        title: isApproved ? 'Disetujui (ACC)' : isPending ? 'Ditunda (Pending)' : 'Ditolak (Reject)',
        time: normalizedClient.survey.updatedAt || normalizedClient.updatedAt,
        desc: `Diproses oleh ${normalizedClient.survey.updatedBy || 'Surveyor'}.`,
        note: normalizedClient.survey.note,
        status: isApproved ? 'success' : isPending ? 'warning' : 'danger'
      });
    }
    
    if (normalizedClient.currentStep === 'warehouse' || normalizedClient.orderStatus === 'completed') {
      const isPending = normalizedClient.warehouse?.status === 'pending';
      events.push({
        title: 'Antrean Gudang',
        time: normalizedClient.warehouse?.updatedAt || normalizedClient.updatedAt,
        desc: 'Pesanan masuk proses pengecekan stock dan pengosongan barang.',
        note: normalizedClient.warehouse?.note,
        status: isPending ? 'warning' : 'success'
      });
    }
    
    if (normalizedClient.orderStatus === 'completed') {
      events.push({
        title: 'Pesanan Terkirim',
        time: normalizedClient.warehouse?.updatedAt || normalizedClient.updatedAt,
        desc: `Paket diterima konsumen via ${normalizedClient.warehouse?.updatedBy || 'Staf Gudang'}.`,
        status: 'success'
      });
    }

    return events.sort((a, b) => {
      const tA = a.time?.toDate ? a.time.toDate() : new Date(a.time || 0);
      const tB = b.time?.toDate ? b.time.toDate() : new Date(b.time || 0);
      return tA.getTime() - tB.getTime();
    });
  }, [normalizedClient]);

  // Open Notes Dialog Handler
  const openNotePrompt = (action: { stage: 'pipeline' | 'client' | 'arsip', orderStatus: string, currentStep: string }) => {
    setPendingAction(action);
    setNoteContent('');
    setShowNoteDialog(true);
  };

  const executeNoteAction = () => {
    if (!pendingAction || !selectedClient) return;
    handleUpdateStatus(
      selectedClient.id,
      pendingAction.stage,
      pendingAction.orderStatus,
      pendingAction.currentStep,
      noteContent
    );
  };

  return (
    <div className="w-full min-h-screen text-text-primary px-3 py-4 md:p-6 lg:p-8 space-y-4 max-w-7xl mx-auto pb-24">
      {/* Dynamic Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between border-b border-border-default pb-3">
        <div>
          <h1 className="text-base md:text-lg font-bold uppercase tracking-tight flex items-center gap-1.5">
            <Layers className="w-4.5 h-4.5 text-primary" /> Operations Workspace
          </h1>
          <p className="text-[11px] md:text-xs text-text-muted mt-0.5">
            Pusat eksekusi operasional tim Surveyor dan Gudang harian.
          </p>
        </div>
        <div className="flex items-center gap-1 mt-1 md:mt-0">
          <div className="px-2 py-0.5 rounded text-[9px] font-bold bg-primary/10 border border-primary/20 text-primary uppercase">
            {profile?.role || 'User'}
          </div>
        </div>
      </div>

      {/* COMPACT SUMMARY WIDGETS */}
      {isStaffOrAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {/* Survey Count */}
          <div className="bg-card w-full border border-border-default rounded-xl p-2.5 shadow-sm flex flex-col justify-between h-[72px] hover:border-border-default/80 transition-all">
            <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider line-clamp-1">Surveyor Queue</span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-lg md:text-xl font-black text-text-primary leading-none">{surveyQueue.length}</span>
              <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Antrean</span>
            </div>
          </div>

          {/* Warehouse Count */}
          <div className="bg-card w-full border border-border-default rounded-xl p-2.5 shadow-sm flex flex-col justify-between h-[72px] hover:border-border-default/80 transition-all">
            <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider line-clamp-1">Gudang Queue</span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-lg md:text-xl font-black text-text-primary leading-none">{warehouseQueue.length}</span>
              <span className="text-[9px] font-bold text-sky-500 bg-sky-500/10 px-1.5 py-0.5 rounded">Antrean</span>
            </div>
          </div>

          {/* Pending Count */}
          <div className="bg-card w-full border border-border-default rounded-xl p-2.5 shadow-sm flex flex-col justify-between h-[72px] hover:border-border-default/80 transition-all">
            <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider line-clamp-1">Pending (Ditunda)</span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-lg md:text-xl font-black text-text-primary leading-none">{pendingCount}</span>
              <span className="text-[9px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded">Total</span>
            </div>
          </div>

          {/* Completed Today */}
          <div className="bg-card w-full border border-border-default rounded-xl p-2.5 shadow-sm flex flex-col justify-between h-[72px] hover:border-border-default/80 transition-all">
            <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider line-clamp-1">Completed Today</span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-lg md:text-xl font-black text-text-primary leading-none">{completedToday}</span>
              <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Terkirim</span>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Search Bar */}
      <div className="relative sticky top-0 z-10 w-full mb-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
          <Search className="h-3.5 w-3.5" />
        </div>
        <input
          type="text"
          placeholder="Cari konsumen operasional..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-card border border-border-default rounded-lg focus:border-primary/50 outline-none shadow-sm transition-all text-text-primary placeholder:text-text-muted font-medium h-[40px]"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted">Loading Data ...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* SURVEYOR QUEUE SECTION */}
          {canAccessSurveyQueue && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-amber-500 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" /> Antrean Surveyor ({filteredSurveyQueue.length})
                </h3>
              </div>
              
              {filteredSurveyQueue.length === 0 ? (
                <div className="border border-dashed border-border-default bg-card/40 rounded-xl p-6 text-center text-[11px] text-text-muted py-8 font-medium">
                  Tidak ada antrean survey untuk saat ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredSurveyQueue.map(client => (
                    <div 
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className="bg-card w-full border border-border-default hover:border-primary/45 rounded-lg p-2.5 sm:p-3 pb-2.5 shadow-sm relative overflow-hidden transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-xs sm:text-sm text-text-primary truncate uppercase">{client.nama}</h4>
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-amber-500/15 text-amber-500 rounded border border-amber-500/10 shrink-0">
                            Survey
                          </span>
                        </div>
                        {client.usaha && (
                          <p className="text-[10px] sm:text-xs font-semibold text-text-secondary flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5 text-text-muted inline shrink-0" /> {client.usaha}
                          </p>
                        )}
                        <p className="text-[10px] sm:text-xs font-medium text-text-muted line-clamp-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 inline-block mr-0.5 shrink-0" /> {client.alamat}
                        </p>
                      </div>

                      {/* Current Order Compact Line */}
                      <div className="border-t border-border-default/40 mt-2 pt-2 flex items-center justify-between text-left shrink-0">
                        <div className="flex items-center gap-1 text-text-secondary text-[10px] sm:text-xs font-medium truncate">
                          <Package className="w-3 h-3 text-primary shrink-0" />
                          <span className="truncate max-w-[120px] sm:max-w-[150px] font-bold">{client.barang || 'Order'}</span>
                        </div>
                        {client.hargaString ? (
                          <span className="text-[10px] sm:text-xs font-black text-text-primary shrink-0">{client.hargaString}</span>
                        ) : client.angsuran ? (
                          <span className="text-[10px] sm:text-xs font-black text-text-primary shrink-0">
                            {formatCurrency(client.angsuran)} <span className="text-[8px] text-text-muted font-normal">/{client.tenorType === 'bulan' ? 'Bln' : 'Hari'}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* WAREHOUSE QUEUE SECTION */}
          {canAccessWarehouseQueue && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-sky-500 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500" /> Antrean Gudang ({filteredWarehouseQueue.length})
                </h3>
              </div>
              
              {filteredWarehouseQueue.length === 0 ? (
                <div className="border border-dashed border-border-default bg-card/40 rounded-xl p-6 text-center text-[11px] text-text-muted py-8 font-medium">
                  Tidak ada antrean gudang untuk saat ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredWarehouseQueue.map(client => (
                    <div 
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className="bg-card w-full border border-border-default hover:border-primary/45 rounded-lg p-2.5 sm:p-3 pb-2.5 shadow-sm relative overflow-hidden transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-xs sm:text-sm text-text-primary truncate uppercase">{client.nama}</h4>
                          <span className={cn(
                            "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0",
                            client.warehouse?.status === 'pending'
                              ? "bg-orange-500/15 text-orange-500 border-orange-500/10"
                              : "bg-sky-500/15 text-sky-500 border-sky-500/10"
                          )}>
                            {client.warehouse?.status === 'pending' ? 'Pending' : 'Gudang'}
                          </span>
                        </div>
                        {client.usaha && (
                          <p className="text-[10px] sm:text-xs font-semibold text-text-secondary flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5 text-text-muted inline shrink-0" /> {client.usaha}
                          </p>
                        )}
                        <p className="text-[10px] sm:text-xs font-medium text-text-muted line-clamp-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 inline-block mr-0.5 shrink-0" /> {client.alamat}
                        </p>
                      </div>

                      {/* Current Order Compact Line */}
                      <div className="border-t border-border-default/40 mt-2 pt-2 flex items-center justify-between text-left shrink-0">
                        <div className="flex items-center gap-1 text-text-secondary text-[10px] sm:text-xs font-medium truncate">
                          <Truck className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="truncate max-w-[120px] sm:max-w-[150px] font-bold">{client.barang || 'Order'}</span>
                        </div>
                        {client.hargaString ? (
                          <span className="text-[10px] sm:text-xs font-black text-text-primary shrink-0">{client.hargaString}</span>
                        ) : client.angsuran ? (
                          <span className="text-[10px] sm:text-xs font-black text-text-primary shrink-0">
                            {formatCurrency(client.angsuran)} <span className="text-[8px] text-text-muted font-normal">/{client.tenorType === 'bulan' ? 'Bln' : 'Hari'}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FULLSCREEN / DRAWER MOBILE DETAIL SHEET */}
      <AnimatePresence>
        {selectedClient && normalizedClient && (
          <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center md:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="w-full h-full md:max-w-2xl md:max-h-[85vh] bg-background border border-border-default md:rounded-[20px] flex flex-col overflow-hidden shadow-2xl relative"
            >
              {/* Sticky Top Header Section */}
              <div className="sticky top-0 px-4 py-4 bg-card border-b border-border-default/60 flex items-center justify-between z-30 shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedClient(null)} className="p-2 -ml-2 rounded-full hover:bg-secondary/60 text-text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-wide truncate max-w-[180px] md:max-w-xs">{normalizedClient.nama}</h3>
                    <p className="text-[11px] font-medium text-text-muted mt-0.5">{normalizedClient.nomor || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-bold">
                  {normalizedClient.currentStep === 'survey' ? (
                    <span className="text-[9px] uppercase px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/10">Survey Queue</span>
                  ) : (
                    <span className="text-[9px] uppercase px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-500 border border-sky-500/10">Warehouse Queue</span>
                  )}
                </div>
              </div>

              {/* Scrollable Container Area */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-5 bg-background pb-8">
                
                {/* SECTION 1 — CUSTOMER INFORMATION */}
                <div className="bg-card border border-border-default rounded-xl p-4 space-y-3 shadow-inner">
                  <div className="flex items-center gap-1 border-b border-border-default/30 pb-2 mb-2">
                    <ClipboardList className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted text-center">Customer Information</span>
                  </div>
                  
                  <div className="space-y-2.5 text-center font-sans">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-text-muted tracking-widest block">Nama Konsumen</label>
                      <p className="text-sm font-bold text-text-primary uppercase mt-0.5">{normalizedClient.nama || '-'}</p>
                    </div>
                    {normalizedClient.usaha && (
                      <div>
                        <label className="text-[10px] font-extrabold uppercase text-text-muted tracking-widest block">Nama Usaha</label>
                        <p className="text-sm font-bold text-text-primary uppercase mt-0.5">{normalizedClient.usaha}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-text-muted tracking-widest block">Alamat</label>
                      <p className="text-xs font-semibold text-text-secondary leading-relaxed mt-0.5">{normalizedClient.alamat || '-'}</p>
                    </div>
                  </div>

                  {/* QUICK LINK CTAs */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {/* WhatsApp */}
                    <a
                      href={`https://wa.me/${formatWhatsApp(normalizedClient.nomor || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold text-white transition-all shadow-sm shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                    {/* Google Maps search */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((normalizedClient.usaha ? normalizedClient.usaha + ' ' : '') + (normalizedClient.alamat || ''))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-primary rounded-xl text-xs font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-sm shrink-0"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Google Maps
                    </a>
                  </div>
                </div>

                {/* SECTION 2 — CURRENT ORDER */}
                <div className="bg-card border border-border-default rounded-xl overflow-hidden shadow-inner">
                  <button 
                    onClick={() => setIsCurrentOrderExpanded(!isCurrentOrderExpanded)}
                    className="w-full px-4 py-3 bg-secondary/30 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-primary" />
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Current Active Order</span>
                        <p className="text-xs font-extrabold text-text-primary uppercase mt-0.5 truncate max-w-[200px]">
                          {normalizedClient.barang || 'Order Barang'}
                        </p>
                      </div>
                    </div>
                    {isCurrentOrderExpanded ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                  </button>

                  <AnimatePresence>
                    {isCurrentOrderExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border-default/40 p-4 space-y-4 text-center text-xs text-text-secondary overflow-hidden font-medium bg-card"
                      >
                        <div className="flex justify-end mb-2">
                          <button onClick={() => setIsCurrentOrderExpanded(false)} className="text-[10px] font-bold text-text-muted hover:text-text-primary">Tutup</button>
                        </div>
                        <div className="flex flex-col gap-0.5 items-center border-b border-border-default/20 pb-3">
                          <span className="text-text-muted text-[9px] uppercase tracking-wide">Harga / Barang:</span>
                          <span className="font-bold text-text-primary text-sm">{normalizedClient.hargaString || normalizedClient.barang || '-'}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 items-center border-b border-border-default/20 pb-3">
                          <span className="text-text-muted text-[9px] uppercase tracking-wide">Angsuran / Tenor:</span>
                          <span className="font-bold text-text-primary text-sm shadow-sm">
                            {formatCurrency(normalizedClient.angsuran || 0)} <span className="text-[10px] text-text-muted">/ {normalizedClient.tenor} {normalizedClient.tenorType || 'hari'}</span>
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 items-center border-b border-border-default/20 pb-3">
                          <span className="text-text-muted text-[9px] uppercase tracking-wide">Tanggal Pengajuan:</span>
                          <span className="font-bold text-text-primary text-sm">
                            {normalizedClient.createdAt ? (normalizedClient.createdAt.toDate ? normalizedClient.createdAt.toDate().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : new Date(normalizedClient.createdAt).toLocaleDateString()) : '-'}
                          </span>
                        </div>
                        {normalizedClient.orderStatus === 'completed' && (
                          <div className="flex flex-col gap-0.5 items-center border-b border-border-default/20 pb-3">
                            <span className="text-text-muted text-[9px] uppercase tracking-wide">Tanggal Terkirim:</span>
                            <span className="font-bold text-emerald-500 text-sm">
                              {normalizedClient.warehouse?.updatedAt ? (normalizedClient.warehouse.updatedAt.toDate ? normalizedClient.warehouse.updatedAt.toDate().toLocaleDateString('id-ID', {day: 'numeric', month: 'long'}) : new Date(normalizedClient.warehouse.updatedAt).toLocaleDateString()) : '-'}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5 items-center">
                          <span className="text-text-muted text-[9px] uppercase tracking-wide">Status Operasional:</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-black uppercase text-center mx-auto",
                            normalizedClient.orderStatus === 'approved' ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" :
                            normalizedClient.orderStatus === 'completed' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            normalizedClient.orderStatus === 'pending' ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                            normalizedClient.orderStatus === 'rejected' ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          )}>
                             {normalizedClient.orderStatus === 'approved' ? 'Antrean Gudang' :
                             normalizedClient.orderStatus === 'completed' ? 'Terkirim' :
                             normalizedClient.orderStatus === 'pending' ? 'Ditunda (Pending)' :
                             normalizedClient.orderStatus === 'rejected' ? 'Ditolak' : 'Proses Survey'}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* SECTION 3 — ORDER HISTORY */}
                <div className="bg-card border border-border-default rounded-xl overflow-hidden shadow-inner">
                  <button 
                    onClick={() => setIsOrderHistoryExpanded(!isOrderHistoryExpanded)}
                    className="w-full px-4 py-3 bg-secondary/30 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Order History</span>
                        <p className="text-xs font-extrabold text-text-primary uppercase mt-0.5">
                          {normalizedHistory.filter(h => h.id !== normalizedClient.id).length} Orders Found
                        </p>
                      </div>
                    </div>
                    {isOrderHistoryExpanded ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                  </button>

                  <AnimatePresence>
                    {isOrderHistoryExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border-default/40 p-4 space-y-3 text-left overflow-hidden bg-card"
                      >
                        {normalizedHistory.filter(h => h.id !== normalizedClient.id).length === 0 ? (
                          <div className="text-center py-4 text-xs text-text-muted font-medium">
                            Belum memiliki riwayat order terdahulu.
                          </div>
                        ) : (
                          normalizedHistory
                            .filter(h => h.id !== normalizedClient.id)
                            .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                            .map((order, idx) => (
                              <div key={order.id || idx} className="p-3 bg-secondary/20 rounded-lg border border-border-default/40 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-text-primary uppercase">{order.barang || 'Order Lain'}</span>
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase border",
                                    order.orderStatus === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                  )}>
                                    {order.orderStatus === 'completed' ? 'Terkirim' : 'Arsip'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px] text-text-muted font-semibold">
                                  <div>
                                    <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted/65">Angsuran / Tenor</span>
                                    <span className="text-text-secondary">{formatCurrency(order.angsuran || 0)} / {order.tenor} {order.tenorType || 'hari'}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted/65">Tanggal Order</span>
                                    <span className="text-text-secondary">
                                      {order.createdAt ? (order.createdAt.toDate ? order.createdAt.toDate().toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : new Date(order.createdAt).toLocaleDateString()) : '-'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* SECTION 4 — OPERATIONAL TIMELINE */}
                <div className="bg-card border border-border-default rounded-xl p-4 space-y-3 shadow-inner">
                  <div className="flex items-center gap-1 border-b border-border-default/30 pb-2 mb-2">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted text-left">Operational Timeline</span>
                  </div>

                  <div className="space-y-4 text-left">
                    {timelineEvents.map((event, i) => (
                      <div key={i} className="flex gap-3 items-stretch">
                        {/* Bullet Icon and vertical connection line */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className={cn(
                            "w-3 h-3 rounded-full border-2 border-background flex items-center justify-center shrink-0 mt-0.5 shadow-sm",
                            event.status === 'success' ? "bg-emerald-500" :
                            event.status === 'warning' ? "bg-amber-500" : "bg-red-500"
                          )} />
                          {i < timelineEvents.length - 1 && (
                            <div className="w-[1.5px] bg-border-default/50 flex-1 my-1.5 min-h-[1.5rem]" />
                          )}
                        </div>
                        
                        {/* Event Content Description */}
                        <div className="flex-1 pb-2">
                          <div className="flex items-baseline justify-between gap-1">
                            <h5 className="text-xs font-bold text-text-primary uppercase tracking-wide">{event.title}</h5>
                            <span className="text-[10px] text-text-muted font-bold shrink-0">{getRelativeTime(event.time)}</span>
                          </div>
                          <p className="text-[11px] text-text-secondary mt-0.5 font-medium">{event.desc}</p>
                          {event.note && (
                            <p className="text-[10px] font-semibold text-orange-500 bg-orange-500/5 border border-orange-500/10 px-2.5 py-1.5 rounded-lg mt-1.5 leading-relaxed max-w-md">
                              Catatan: "{event.note}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION 5 — WORKFLOW ACTIONS */}
                <div className="bg-card border border-border-default rounded-xl p-4 space-y-3.5 shadow-inner">
                  <div className="flex items-center gap-1.5 border-b border-border-default/30 pb-2 mb-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted text-left">Workflow Actions</span>
                  </div>
                  
                  <div className="flex gap-2 w-full">
                    {normalizedClient.currentStep === 'survey' ? (
                      // Surveyor Controls
                      <>
                        <button 
                          onClick={() => openNotePrompt({ stage: 'arsip', orderStatus: 'rejected', currentStep: 'done' })}
                          disabled={isUpdating}
                          className="flex-1 py-2.5 px-1 bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 rounded-xl text-[11px] font-black text-red-500 transition-all flex items-center justify-center gap-1 whitespace-nowrap active:scale-95"
                        >
                          <XCircle className="w-3.5 h-3.5 shrink-0" /> Reject
                        </button>
                        <button 
                          onClick={() => openNotePrompt({ stage: 'arsip', orderStatus: 'pending', currentStep: 'done' })}
                          disabled={isUpdating}
                          className="flex-1 py-2.5 px-1 bg-orange-500/10 border border-orange-500/25 hover:bg-orange-500/20 rounded-xl text-[11px] font-black text-orange-400 transition-all flex items-center justify-center gap-1 whitespace-nowrap active:scale-95"
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" /> Pending
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(normalizedClient.id, 'pipeline', 'approved', 'warehouse')}
                          disabled={isUpdating}
                          className="flex-1 px-2 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1 whitespace-nowrap shadow-sm active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> ACC
                        </button>
                      </>
                    ) : (
                      // Warehouse / Gudang Controls
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(normalizedClient.id, 'pipeline', 'approved', 'warehouse', 'pending_gudang-action')}
                          disabled={isUpdating}
                          className="flex-1 py-2.5 px-2 bg-orange-500/10 border border-orange-500/25 hover:bg-orange-500/20 rounded-xl text-[11px] font-black text-orange-400 transition-all flex items-center justify-center gap-1 whitespace-nowrap active:scale-95"
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" /> Pending Gudang
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(normalizedClient.id, 'client', 'completed', 'done')}
                          disabled={isUpdating}
                          className="flex-1 py-2.5 px-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm active:scale-95"
                        >
                          <Truck className="w-3.5 h-3.5 shrink-0" /> Terkirim
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Note Prompt Modal for Pending/Reject Reasons */}
      <AnimatePresence>
        {showNoteDialog && (
          <div className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-background border border-border-default rounded-2xl p-6 shadow-2xl space-y-4"
            >
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">Keterangan Wajib</h3>
                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">
                      Lengkapi alasan: {pendingAction?.orderStatus === 'rejected' ? 'REJECT' : 'PENDING'}
                    </p>
                  </div>
               </div>

               <textarea 
                  autoFocus
                  placeholder="Tulis alasan, catatan, atau hambatan di lapangan..."
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  className="w-full h-32 bg-card border border-border-default rounded-xl p-4 text-xs text-text-primary outline-none focus:border-primary/50 resize-none font-medium text-left leading-normal"
               />

               <div className="flex gap-2">
                  <button 
                    onClick={() => setShowNoteDialog(false)} 
                    disabled={isUpdating}
                    className="flex-1 py-3 bg-secondary rounded-xl text-xs font-bold text-text-secondary transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={executeNoteAction} 
                    disabled={isUpdating || !noteContent.trim()} 
                    className="flex-1 py-3 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-black transition-all disabled:opacity-50"
                  >
                    Simpan
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
