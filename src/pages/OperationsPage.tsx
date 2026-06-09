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
  ExternalLink,
  MessageCircle,
  User,
  Store,
  Home
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

function getTimelineEvents(client: any) {
  if (!client) return [];
  const events = [];
  
  if (client.createdAt) {
    events.push({
      title: 'Submit',
      time: client.createdAt,
      desc: 'Pengajuan konsumen baru.',
      status: 'success'
    });
  }
  
  if (client.survey?.status && client.survey.status !== 'submitted') {
    const isApproved = client.survey.status === 'approved';
    const isPending = client.survey.status === 'pending';
    const isRejected = client.survey.status === 'rejected';
    
    events.push({
      title: isApproved ? 'ACC' : isPending ? 'Pending' : 'Reject',
      time: client.survey.updatedAt || client.updatedAt,
      desc: `Oleh ${client.survey.updatedBy || 'Surveyor'}.`,
      note: client.survey.note,
      status: isApproved ? 'success' : isPending ? 'warning' : 'danger'
    });
  }
  
  if (client.currentStep === 'warehouse' || client.orderStatus === 'completed') {
    const isPending = client.warehouse?.status === 'pending';
    events.push({
      title: 'Antrean Gudang',
      time: client.warehouse?.updatedAt || client.updatedAt,
      desc: 'Pesanan dalam antrean.',
      note: client.warehouse?.note,
      status: isPending ? 'warning' : 'success'
    });
  }
  
  if (client.orderStatus === 'completed') {
    events.push({
      title: 'Pesanan Terkirim',
      time: client.warehouse?.updatedAt || client.updatedAt,
      desc: `Terkirim.`,
      status: 'success'
    });
  }

  return events.sort((a, b) => {
    const tA = a.time?.toDate ? a.time.toDate() : new Date(a.time || 0);
    const tB = b.time?.toDate ? b.time.toDate() : new Date(b.time || 0);
    return tA.getTime() - tB.getTime();
  });
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

  // Accordion Expand States (Removed as we use details tag)

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
    const cleanNomor = (selectedClient?.nomor || "").replace(/[^0-9]/g, "");
    if (!selectedClient?.nomor || cleanNomor.length < 5 || !profile?.role || !user?.uid) {
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

  // openNotePrompt definition logic (removed timelineEvents useMemo that was here)

  // Open Notes Dialog Handler
  const openNotePrompt = (action: { stage: 'pipeline' | 'client' | 'arsip', orderStatus: string, currentStep: string }) => {
    setPendingAction(action);
    setNoteContent('');
    setShowNoteDialog(true);
  };

  const getStatusBadgeProps = (status: string, step?: string) => {
    const map: Record<string, { label: string, color: string }> = {
      submitted: { label: 'Survey', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
      approved: { label: 'Gudang', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20' },
      pending: { label: 'Pending', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20' },
      rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' },
      completed: { label: 'Terkirim', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
      cancelled: { label: 'Batal', color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20' },
      
      survey: { label: 'Survey', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
      acc: { label: 'ACC', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
      reject: { label: 'Reject', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' },
      pending_gudang: { label: 'Gudang', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20' },
      terkirim: { label: 'Terkirim', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
    };
    return map[status] || { label: status, color: 'bg-secondary/50 text-text-secondary border border-border/50' };
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
      <div className="flex items-center gap-2 border-b border-border-default pb-3">
        <h1 className="text-base md:text-lg font-bold uppercase tracking-tight flex items-center gap-1.5">
          <Layers className="w-4.5 h-4.5 text-primary" /> Operations Workspace
        </h1>
        <div className="px-2 py-0.5 mt-0.5 rounded text-[9px] font-bold bg-primary/10 border border-primary/20 text-primary uppercase">
          {profile?.role || 'User'}
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
                      className="flex justify-between items-center bg-card p-2.5 rounded-lg border border-border/10 cursor-pointer hover:bg-card/85 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h4 className="text-[10px] font-bold text-text-primary uppercase truncate">{client.nama}</h4>
                        </div>
                        <p className="text-[10px] font-semibold text-text-primary truncate">{client.usaha || '-'}</p>
                        <p className="text-[10px] text-text-muted truncate">{client.alamat || '-'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2 text-right">
                         {client.customerStatus && (
                            <span className={cn(
                              "text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider whitespace-nowrap shrink-0",
                              client.customerStatus === 'eks' 
                                ? "bg-sky-500/10 text-sky-500 border border-sky-500/20" 
                                : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            )}>
                              {client.customerStatus === 'eks' ? 'Eks' : 'Baru'}
                            </span>
                          )}
                         <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-amber-500/15 text-amber-500 rounded border border-amber-500/10 shrink-0">
                           Survey
                         </span>
                         <span className="text-[9px] text-text-muted font-bold font-mono uppercase shrink-0">
                           {getRelativeTime(client.updatedAt || client.createdAt)}
                         </span>
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
                      className="flex justify-between items-center bg-card p-2.5 rounded-lg border border-border/10 cursor-pointer hover:bg-card/85 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h4 className="text-[10px] font-bold text-text-primary uppercase truncate">{client.nama}</h4>
                          {client.customerStatus && (
                            <span className={cn(
                              "text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider whitespace-nowrap shrink-0",
                              client.customerStatus === 'eks' 
                                ? "bg-sky-500/10 text-sky-500 border border-sky-500/20" 
                                : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            )}>
                              {client.customerStatus === 'eks' ? 'Eks' : 'Baru'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-semibold text-text-primary truncate">{client.usaha || '-'}</p>
                        <p className="text-[10px] text-text-muted truncate">{client.alamat || '-'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2 text-right">
                         <span className={cn(
                             "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0",
                             client.warehouse?.status === 'pending'
                               ? "bg-orange-500/15 text-orange-500 border-orange-500/10"
                               : "bg-sky-500/15 text-sky-500 border-sky-500/10"
                           )}>
                             {client.warehouse?.status === 'pending' ? 'Pending' : 'Gudang'}
                         </span>
                         <span className="text-[9px] text-text-muted font-bold font-mono uppercase shrink-0">
                           {getRelativeTime(client.updatedAt || client.createdAt)}
                         </span>
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
                <div className="font-sans px-1 space-y-3 relative">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-semibold text-text-primary uppercase flex items-center whitespace-pre-wrap">
                      <User className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                      {normalizedClient.nama || '-'}
                      {normalizedClient.customerStatus && (
                        <span className={cn(
                          "ml-2 text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider whitespace-nowrap",
                          normalizedClient.customerStatus === 'eks' 
                            ? "bg-sky-500/10 text-sky-500 border border-sky-500/20" 
                            : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        )}>
                          {normalizedClient.customerStatus === 'eks' ? 'Eks' : 'Baru'}
                        </span>
                      )}
                    </p>
                    {normalizedClient.usaha && (
                      <p className="text-[10px] font-normal text-text-secondary flex items-center whitespace-pre-wrap mt-0.5"><Store className="w-3.5 h-3.5 mr-1.5 shrink-0" />{normalizedClient.usaha}</p>
                    )}
                    <p className="text-[10px] font-normal text-text-muted leading-relaxed flex items-start whitespace-pre-wrap mt-1"><Home className="w-3.5 h-3.5 mr-1.5 shrink-0 mt-0.5" />{normalizedClient.alamat || '-'}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-3">
                    <a href={`https://wa.me/${formatWhatsApp(normalizedClient.nomor || '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 flex-1 h-9 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-xl font-bold text-[11px] transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((normalizedClient.usaha ? normalizedClient.usaha + ' ' : '') + (normalizedClient.alamat || ''))}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 flex-1 h-9 bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 rounded-xl font-bold text-[11px] transition-colors">
                      <MapPin className="w-3.5 h-3.5" />
                      Maps
                    </a>
                  </div>
                </div>

                {/* 2. CURRENT ACTIVE ORDER */}
                <div className="space-y-2 text-left font-sans">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-1">Order Aktif</h4>
                  <details className="group border border-border/10 rounded-xl bg-card/30">
                    <summary className="p-3 flex items-center justify-between cursor-pointer list-none text-xs font-bold text-text-primary">
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{normalizedClient.barang || '-'}</span>
                        <span>•</span>
                        <span>{formatCurrency(normalizedClient.angsuran || 0)}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="px-4 pb-3 pt-1 border-t border-border/10 text-xs text-text-muted space-y-1">
                      <p>Status: {getStatusBadgeProps(normalizedClient.orderStatus, normalizedClient.currentStep).label}</p>
                      <p>Angsuran: {formatCurrency(normalizedClient.angsuran || 0)} / {normalizedClient.tenorType || '-'}</p>
                      <p>Tenor: {normalizedClient.tenor || 0} {normalizedClient.tenorType || '-'}</p>
                      <p>Dibuat: {normalizedClient.createdAt?.toDate ? normalizedClient.createdAt.toDate().toLocaleDateString('id-ID') : '-'}</p>
                      
                      <div className="mt-4 pt-3 border-t border-border/10">
                        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Timeline</h4>
                        <div className="flex w-full items-start mt-2">
                          {getTimelineEvents(normalizedClient).map((event, i, arr) => (
                            <div key={i} className="flex-1 flex flex-col items-center relative">
                              {i > 0 && (
                                <div className={cn("absolute top-[7px] left-0 w-1/2 h-[2px]", 
                                  event.status === 'success' ? 'bg-emerald-500' : 'bg-zinc-700')} />
                              )}
                              {i < arr.length - 1 && (
                                <div className={cn("absolute top-[7px] right-0 w-1/2 h-[2px]", 
                                  arr[i+1]?.status === 'success' ? 'bg-emerald-500' : 'bg-zinc-700')} />
                              )}
                              <div className="w-full flex justify-center items-center h-4 relative z-10">
                                <div className={cn("w-2 h-2 rounded-full outline outline-[2px] outline-card", 
                                   event.status === 'success' ? 'bg-emerald-500' :
                                   event.status === 'warning' ? 'bg-orange-500' :
                                   'bg-zinc-600'
                                )} />
                              </div>
                              <div className="text-center w-full mt-1 px-0.5">
                                 <p className="text-[9px] text-text-primary leading-tight font-bold break-words">{event.title}</p>
                                 <p className="text-[8px] text-text-muted mt-0.5">{getRelativeTime(event.time)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>
                </div>

                {/* 3. ORDER HISTORY */}
                <div className="space-y-2 text-left font-sans">
                   <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-1">Order History</h4>
                   {normalizedHistory.filter(h => h.id !== normalizedClient.id).sort((a,b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)).map(order => (
                       <details key={order.id} className="group border border-border/10 rounded-xl bg-card/30">
                         <summary className="p-3 flex justify-between items-center cursor-pointer list-none">
                           <div>
                              <p className="text-xs font-bold text-text-primary">{order.barang || '-'}</p>
                              <p className="text-[10px] text-text-muted mt-0.5">{formatCurrency(order.angsuran || 0)} / {order.tenorType || '-'}</p>
                           </div>
                            <ChevronRight className="w-4 h-4 text-text-muted group-open:rotate-90 transition-transform" />
                         </summary>
                         <div className="px-4 pb-3 pt-1 border-t border-border/10 text-xs text-text-muted space-y-1">
                             <p>Status: {getStatusBadgeProps(order.orderStatus, order.currentStep).label}</p>
                             <p>Angsuran: {formatCurrency(order.angsuran || 0)} / {order.tenorType || '-'}</p>
                             <p>Tenor: {order.tenor} {order.tenorType}</p>
                             <p>Dibuat: {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('id-ID') : '-'}</p>
                             
                             <div className="mt-4 pt-3 border-t border-border/10">
                               <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Timeline</h4>
                               <div className="flex w-full justify-between items-start mt-2 relative">
                                 {getTimelineEvents(order).map((event, i, arr) => (
                                   <div key={i} className="flex-1 flex flex-col items-center relative z-10">
                                      {i > 0 && (<div className={cn("absolute top-[7px] left-0 w-1/2 h-[2px]", event.status === 'success' ? 'bg-emerald-500' : 'bg-zinc-700')} />)}
                                      {i < arr.length - 1 && (<div className={cn("absolute top-[7px] right-0 w-1/2 h-[2px]", arr[i+1]?.status === 'success' ? 'bg-emerald-500' : 'bg-zinc-700')} />)}
                                      <div className="w-full flex justify-center items-center h-4 relative z-10">
                                        <div className={cn("w-2 h-2 rounded-full outline outline-[2px] outline-card", 
                                           event.status === 'success' ? 'bg-emerald-500' :
                                           event.status === 'warning' ? 'bg-orange-500' :
                                           'bg-zinc-600'
                                        )} />
                                      </div>
                                      <div className="text-center w-full mt-1 px-0.5">
                                         <p className="text-[9px] text-text-primary leading-tight font-bold break-words">{event.title}</p>
                                         <p className="text-[8px] text-text-muted mt-0.5">{getRelativeTime(event.time)}</p>
                                      </div>
                                   </div>
                                 ))}
                               </div>
                             </div>
                         </div>
                       </details>
                     ))}
                     {normalizedHistory.filter(h => h.id !== normalizedClient.id).length === 0 && (
                       <div className="text-center py-4 text-xs text-text-muted font-medium bg-card/10 rounded-xl border border-border/10">
                         Belum memiliki riwayat order terdahulu.
                       </div>
                     )}
                </div>

                {/* 4. WORKFLOW ACTIONS */}
                <div className="bg-card border border-border-default rounded-xl p-4 space-y-3.5 shadow-inner">
                  <div className="flex items-center gap-1.5 border-b border-border-default/30 pb-2 mb-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted text-left">Workflow Actions</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 w-full">
                    {normalizedClient.currentStep === 'survey' ? (
                      // Surveyor Controls
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(normalizedClient.id, 'pipeline', 'approved', 'warehouse')}
                          disabled={isUpdating}
                          className="px-4 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-full text-[11px] font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> ACC
                        </button>
                        <button 
                          onClick={() => openNotePrompt({ stage: 'arsip', orderStatus: 'rejected', currentStep: 'done' })}
                          disabled={isUpdating}
                          className="px-4 py-1.5 bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 rounded-full text-[11px] font-black text-red-500 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95"
                        >
                          <XCircle className="w-3.5 h-3.5 shrink-0" /> Reject
                        </button>
                        <button 
                          onClick={() => openNotePrompt({ stage: 'arsip', orderStatus: 'pending', currentStep: 'done' })}
                          disabled={isUpdating}
                          className="px-4 py-1.5 bg-orange-500/10 border border-orange-500/25 hover:bg-orange-500/20 rounded-full text-[11px] font-black text-orange-400 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95"
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" /> Pending
                        </button>
                      </>
                    ) : (
                      // Warehouse / Gudang Controls
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(normalizedClient.id, 'client', 'completed', 'done')}
                          disabled={isUpdating}
                          className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[11px] font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm active:scale-95"
                        >
                          <Truck className="w-3.5 h-3.5 shrink-0" /> Terkirim
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(normalizedClient.id, 'pipeline', 'approved', 'warehouse', 'pending_gudang-action')}
                          disabled={isUpdating}
                          className="px-4 py-1.5 bg-orange-500/10 border border-orange-500/25 hover:bg-orange-500/20 rounded-full text-[11px] font-black text-orange-400 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95"
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" /> Pending Gudang
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
