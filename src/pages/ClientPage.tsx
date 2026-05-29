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
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { cn, calculateEstimasiLunas, formatWhatsApp, formatCurrency } from '../lib/utils';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'motion/react';
import { NewClientContent } from '../features/client/dialogs/NewClientDialog';
import { RepeatOrderContent } from '../features/client/dialogs/RepeatOrderDialog';
import { EditClientContent } from '../features/client/dialogs/EditClientDialog';
import { useModal } from '../components/ui/modal/useModal';
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
    status: client.status === 'terkirim' ? 'delivered' : 'pending',
    updatedAt: client.updatedAt || client.createdAt || null,
    updatedBy: client.updatedBy || ''
  };

  return {
    ...client,
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

function canDeleteClient(client: any, profile: any) {
  if (!client || !profile) return false;
  const role = profile.role?.toUpperCase();
  if (role === 'OWNER' || role === 'MANAGER' || role === 'ADMIN' || role === 'STAFF') {
    return true;
  }
  const norm = getNormalizedClient(client);
  if (role === 'SURVEY' && norm.currentStep === 'survey' && norm.stage === 'pipeline') {
    return true;
  }
  if (role === 'GUDANG' && norm.currentStep === 'warehouse' && norm.stage === 'pipeline') {
    return true;
  }
  return false;
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
  const [clientToDelete, setClientToDelete] = useState<any>(null);
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);
  const [isOrderHistoryExpanded, setIsOrderHistoryExpanded] = useState(false);
  const [isCustomerInfoExpanded, setIsCustomerInfoExpanded] = useState(false);
  
  const { openModal, closeModal } = useModal();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const normalizedClient = useMemo(() => getNormalizedClient(selectedClient), [selectedClient]);
  const normalizedHistory = useMemo(() => clientHistory.map(getNormalizedClient), [clientHistory]);

  const timelineEvents = useMemo(() => {
    if (!normalizedClient) return [];
    const events = [];
    
    // 1. Submitted
    if (normalizedClient.createdAt) {
      events.push({
        title: 'Submitted (Pengajuan)',
        time: normalizedClient.createdAt,
        desc: 'Data konsumen berhasil dibuat dan diajukan ke tim survei.',
        status: 'success'
      });
    }
    
    // 2. Survey Status
    if (normalizedClient.survey?.status && normalizedClient.survey.status !== 'submitted') {
      const isApproved = normalizedClient.survey.status === 'approved';
      const isPending = normalizedClient.survey.status === 'pending';
      const isRejected = normalizedClient.survey.status === 'rejected';
      
      events.push({
        title: isApproved ? 'Survey Disetujui (ACC)' : isPending ? 'Survey Ditunda (Pending)' : 'Survey Ditolak',
        time: normalizedClient.survey.updatedAt || normalizedClient.updatedAt,
        desc: `Diproses oleh ${normalizedClient.survey.updatedBy || 'Surveyor'}.`,
        note: normalizedClient.survey.note,
        status: isApproved ? 'success' : isPending ? 'warning' : 'danger'
      });
    }
    
    // 3. Warehouse Pending
    if (normalizedClient.currentStep === 'warehouse' || normalizedClient.orderStatus === 'completed') {
      const isPending = normalizedClient.orderStatus === 'approved' || normalizedClient.status === 'pending_gudang';
      events.push({
        title: 'Antrean Gudang & Pengiriman',
        time: normalizedClient.warehouse?.updatedAt || normalizedClient.updatedAt,
        desc: 'Data didelegasikan ke tim gudang untuk persiapan barang.',
        note: normalizedClient.warehouse?.note,
        status: isPending ? 'warning' : 'success'
      });
    }
    
    // 4. Delivered
    if (normalizedClient.orderStatus === 'completed') {
      events.push({
        title: 'Pesanan Terkirim',
        time: normalizedClient.warehouse?.updatedAt || normalizedClient.updatedAt,
        desc: `Pesanan berhasil diserahkan ke konsumen oleh ${normalizedClient.warehouse?.updatedBy || 'Gudang'}.`,
        status: 'success'
      });
    }

    // Sort events by time
    return events.sort((a, b) => {
      const tA = a.time?.toDate ? a.time.toDate() : new Date(a.time || 0);
      const tB = b.time?.toDate ? b.time.toDate() : new Date(b.time || 0);
      return tA.getTime() - tB.getTime(); // Chronological order
    });
  }, [normalizedClient]);

  const isSurveyor = () => {
    const role = profile?.role?.toUpperCase();
    return role === 'SURVEY' || role === 'STAFF' || role === 'SUPERVISOR' || role === 'SPV' || role === 'ADMIN' || role === 'OWNER' || role === 'MANAGER';
  };
  
  const isGudang = () => {
    const role = profile?.role?.toUpperCase();
    return role === 'GUDANG' || role === 'STAFF' || role === 'SUPERVISOR' || role === 'SPV' || role === 'ADMIN' || role === 'OWNER' || role === 'MANAGER';
  };

  useEffect(() => {
    if (!profile?.role || !user?.uid) return;
    setLoading(true);
    const unsub = subscribeClientsByStage(activeTab, profile.role, user.uid, (data) => {
      const normalizedData = data.map(getNormalizedClient);
      
      // Role queue isolation filter
      let filtered = normalizedData;
      if (activeTab === 'pipeline') {
        filtered = normalizedData.filter(c => 
          (c.currentStep === 'survey' || c.currentStep === 'warehouse') &&
          !['completed', 'rejected', 'pending', 'cancelled'].includes(c.orderStatus)
        );
        const userRole = profile.role.toUpperCase();
        if (userRole === 'SURVEY') {
          filtered = filtered.filter(c => c.currentStep === 'survey');
        } else if (userRole === 'GUDANG') {
          filtered = filtered.filter(c => c.currentStep === 'warehouse');
        }
      } else if (activeTab === 'client') {
        filtered = normalizedData.filter(c => ['approved', 'completed'].includes(c.orderStatus));
      } else if (activeTab === 'arsip') {
        filtered = normalizedData.filter(c => ['pending', 'rejected', 'cancelled'].includes(c.orderStatus));
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
        updatedAt: serverTimestamp()
      };

      if (orderStatus === 'warehouse_pending') {
        updates.orderStatus = 'approved';
        updates.currentStep = 'warehouse';
        updates.warehouse = {
          status: 'pending',
          note: note || '',
          updatedAt: serverTimestamp(),
          updatedBy: emailOrUid
        };
        updates.status = 'pending_gudang';
      } else {
        updates.orderStatus = orderStatus;
        updates.currentStep = currentStep;

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
          updates.archivedAt = serverTimestamp();
          updates.archivedBy = emailOrUid;
          
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
          updates.archivedAt = serverTimestamp();
          updates.archivedBy = emailOrUid;
        } else if (orderStatus === 'completed') {
          updates.warehouse = {
            status: 'delivered',
            note: note || '',
            updatedAt: serverTimestamp(),
            updatedBy: emailOrUid
          };
        }
        
        // Legacy status syncing for non-warehouse actions
        updates.status = (
          orderStatus === 'submitted' ? 'survey' :
          orderStatus === 'approved' ? 'pending_gudang' :
          orderStatus === 'pending' ? 'pending' :
          orderStatus === 'rejected' ? 'reject' :
          orderStatus === 'completed' ? 'terkirim' :
          orderStatus
        );
      }

      await updateDoc(doc(db, "clients", clientId), updates);
      toast.success(`Berhasil update status`);
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
                { id: 'client', label: 'Client', icon: Users },
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

            {/* Floating Action Button */}
            <div className="flex justify-end pr-2">
              <div className="relative group">
                <button 
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground shadow-sm hover:scale-105 active:scale-95 transition-all rounded-full"
                >
                  <Plus className={cn("w-5 h-5 stroke-[3] transition-transform", showAddMenu && "rotate-45")} />
                </button>
                
                {/* Floating Menu */}
                {showAddMenu && (
                  <div className="absolute top-12 right-0 flex flex-col gap-2 min-w-[200px] items-end z-[50]">
                     <Card glass={false} depth="deep" interactive onClick={() => { 
                       setShowAddMenu(false); 
                       const id = openModal({ title: 'Konsumen Baru', content: <NewClientContent onClose={() => closeModal(id)} />, size: 'xl' }); 
                     }} className="px-4 py-3 flex items-center gap-3 w-full bg-white dark:bg-zinc-900 border-border/80 text-text-primary shadow-xl">
                       <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                         <Plus className="w-4 h-4" />
                       </div>
                       <div className="text-left">
                         <p className="text-xs font-bold leading-tight">Konsumen Baru</p>
                         <p className="text-[10px] text-text-muted">Daftar & Request</p>
                       </div>
                     </Card>
                     <Card glass={false} depth="deep" interactive onClick={() => { 
                       setShowAddMenu(false); 
                       const id = openModal({ title: 'Repeat Order', content: <RepeatOrderContent onClose={() => closeModal(id)} />, size: 'xl' }); 
                     }} className="px-4 py-3 flex items-center gap-3 w-full bg-white dark:bg-zinc-900 border-border/80 text-text-primary shadow-xl">
                       <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                         <HistoryIcon className="w-4 h-4" />
                       </div>
                       <div className="text-left">
                         <p className="text-xs font-bold leading-tight">Repeat Order</p>
                         <p className="text-[10px] text-text-muted">Order tambahan</p>
                       </div>
                     </Card>
                  </div>
                )}
              </div>
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
              <div className="space-y-8">
                {activeTab === 'pipeline' ? (
                  <>
                    {/* Survey Queue */}
                    {filteredClients.filter(c => getNormalizedClient(c).currentStep === 'survey').length > 0 && (
                      <div className="space-y-3">
                        {filteredClients.filter(c => getNormalizedClient(c).currentStep === 'survey').map(client => {
                          const norm = getNormalizedClient(client);
                          const badge = getStatusBadgeProps(norm.orderStatus, norm.currentStep);
                          return (
                            <OperationalCard
                              key={client.id}
                              title={norm.nama}
                              subtitle={`${norm.usaha || 'Personal'} • ${norm.alamat || '-'}`}
                              icon={UserCheck}
                              onClick={() => setSelectedClient(client)}
                              status={
                                <div className="flex flex-col items-end gap-1 select-none text-right shrink-0">
                                  <span className={cn("text-[9px] px-2 py-0.5 rounded-lg uppercase font-bold tracking-wider", badge.color)}>
                                    {badge.label}
                                  </span>
                                  {(client.updatedAt || client.createdAt) && (
                                    <span className="text-[10px] text-text-muted font-medium">
                                      {getRelativeTime(client.updatedAt || client.createdAt)}
                                    </span>
                                  )}
                                </div>
                              }
                              rightContent={
                                canDeleteClient(client, profile) ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setClientToDelete(client);
                                    }}
                                    className="p-2 rounded-full hover:bg-destructive/10 text-text-muted hover:text-destructive transition-colors shrink-0"
                                    title="Hapus Dokumen"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                ) : null
                              }
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* Warehouse Queue */}
                    {filteredClients.filter(c => getNormalizedClient(c).currentStep === 'warehouse').length > 0 && (
                      <div className="space-y-3">
                        {filteredClients.filter(c => getNormalizedClient(c).currentStep === 'warehouse').map(client => {
                          const norm = getNormalizedClient(client);
                          const badge = getStatusBadgeProps(norm.orderStatus, norm.currentStep);
                          return (
                            <OperationalCard
                              key={client.id}
                              title={norm.nama}
                              subtitle={`${norm.usaha || 'Personal'} • ${norm.alamat || '-'}`}
                              icon={UserCheck}
                              onClick={() => setSelectedClient(client)}
                              status={
                                <div className="flex flex-col items-end gap-1 select-none text-right shrink-0">
                                  <span className={cn("text-[9px] px-2 py-0.5 rounded-lg uppercase font-bold tracking-wider", badge.color)}>
                                    {badge.label}
                                  </span>
                                  {(client.updatedAt || client.createdAt) && (
                                    <span className="text-[10px] text-text-muted font-medium">
                                      {getRelativeTime(client.updatedAt || client.createdAt)}
                                    </span>
                                  )}
                                </div>
                              }
                              rightContent={
                                canDeleteClient(client, profile) ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setClientToDelete(client);
                                    }}
                                    className="p-2 rounded-full hover:bg-destructive/10 text-text-muted hover:text-destructive transition-colors shrink-0"
                                    title="Hapus Dokumen"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                ) : null
                              }
                            />
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    {filteredClients.map(client => {
                      const norm = getNormalizedClient(client);
                      const badge = getStatusBadgeProps(norm.orderStatus, norm.currentStep);
                      return (
                        <OperationalCard
                          key={client.id}
                          title={norm.nama}
                          subtitle={`${norm.usaha || 'Personal'} • ${norm.alamat || '-'}`}
                          icon={UserCheck}
                          onClick={() => setSelectedClient(client)}
                          status={
                            <div className="flex flex-col items-end gap-1 select-none text-right shrink-0">
                              <span className={cn("text-[9px] px-2 py-0.5 rounded-lg uppercase font-bold tracking-wider", badge.color)}>
                                {badge.label}
                              </span>
                              {(client.updatedAt || client.createdAt) && (
                                <span className="text-[10px] text-text-muted font-medium">
                                  {getRelativeTime(client.updatedAt || client.createdAt)}
                                </span>
                              )}
                            </div>
                          }
                          rightContent={
                            canDeleteClient(client, profile) ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setClientToDelete(client);
                                }}
                                className="p-2 rounded-full hover:bg-destructive/10 text-text-muted hover:text-destructive transition-colors shrink-0"
                                title="Hapus Dokumen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : null
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FULLSCREEN DETAIL VIEW */}
        <AnimatePresence>
          {selectedClient && (
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center md:p-4">
              <motion.div 
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full h-full md:max-w-2xl md:max-h-[90vh] bg-background border border-border/20 md:rounded-3xl flex flex-col overflow-hidden shadow-2xl relative"
              >
                {(() => {
                  const completedOrdersCount = normalizedHistory.filter(h => 
                    h.id !== normalizedClient.id && 
                    (h.stage === 'client' || h.orderStatus === 'completed' || h.status === 'terkirim')
                  ).length;

                  const category = completedOrdersCount === 0 ? 'Baru' : completedOrdersCount === 1 ? 'Repeat' : 'Loyal';
                  const categoryColor = completedOrdersCount === 0 
                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400' 
                    : completedOrdersCount === 1 
                      ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400' 
                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400';

                  return (
                    <>
                      <div className="sticky top-0 px-4 py-3 bg-card/90 backdrop-blur-md border-b border-border/40 flex items-center justify-between z-30 shrink-0">
                        <div className="flex items-center gap-3">
                          <button onClick={() => setSelectedClient(null)} className="p-2 -ml-2 rounded-full hover:bg-secondary/50 text-text-primary transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                          </button>
                          <div className="flex flex-col text-left">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide truncate max-w-[120px] sm:max-w-xs">{normalizedClient.nama}</h2>
                              <span className={cn("text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider", categoryColor)}>
                                {category}
                              </span>
                            </div>
                            <p className="text-[10px] text-text-muted mt-0.5 truncate">{normalizedClient.nomor || '-'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={cn("text-[9px] px-2 py-0.5 rounded-lg uppercase font-bold tracking-widest hidden sm:inline-block", getStatusBadgeProps(normalizedClient.orderStatus, normalizedClient.currentStep).color)}>
                            {getStatusBadgeProps(normalizedClient.orderStatus, normalizedClient.currentStep).label}
                          </span>
                          {canDeleteClient(selectedClient, profile) && (
                            <button 
                              onClick={() => setClientToDelete(selectedClient)}
                              className="p-2 rounded-full hover:bg-destructive/10 text-destructive transition-colors shrink-0"
                              title="Hapus Data"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => { 
                            const id = openModal({ 
                              title: 'Edit Data Konsumen', 
                              content: <EditClientContent client={selectedClient} onClose={() => closeModal(id)} />, 
                              size: 'xl' 
                            }); 
                          }} className="p-2 rounded-full hover:bg-primary/10 text-primary transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Scrollable Content */}
                      <div className="flex-1 overflow-y-auto overscroll-contain bg-background pb-32">
                        <div className="max-w-2xl mx-auto p-4 space-y-5">
                          
                          {/* 1. CURRENT ACTIVE ORDER */}
                          <DetailCard title="Current Order" icon={Activity}>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-3 text-left font-sans">
                              <div>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Produk</p>
                                <p className="text-sm font-semibold text-text-primary">{normalizedClient.produk || '-'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Omset</p>
                                <p className="text-sm font-semibold text-text-primary">{formatCurrency(normalizedClient.omset)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Angsuran</p>
                                <p className="text-sm font-semibold text-text-primary">{formatCurrency(normalizedClient.angsuran)} / {normalizedClient.tenorType}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Masa Tenor</p>
                                <p className="text-sm font-semibold text-text-primary">
                                  {normalizedClient.tenor} {normalizedClient.tenorType}
                                </p>
                              </div>
                            </div>
                          </DetailCard>

                          {/* 2. ONGOING ORDERS */}
                          {normalizedHistory.filter(h => h.stage === 'pipeline' && h.id !== normalizedClient.id).length > 0 && (
                            <div className="space-y-2 text-left font-sans">
                              <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-widest px-1">Ongoing Orders</h4>
                              {normalizedHistory.filter(h => h.stage === 'pipeline' && h.id !== normalizedClient.id).map(order => (
                                <Card key={order.id} className="p-3 flex justify-between items-center bg-card/50">
                                   <div>
                                     <p className="text-xs font-bold text-text-primary">{order.produk}</p>
                                     <p className="text-[10px] text-text-muted mt-0.5">Omset: {formatCurrency(order.omset)}</p>
                                   </div>
                                   <span className={cn("text-[8px] px-2 py-0.5 rounded-lg uppercase font-bold text-right", getStatusBadgeProps(order.orderStatus, order.currentStep).color)}>
                                     {getStatusBadgeProps(order.orderStatus, order.currentStep).label}
                                   </span>
                                </Card>
                              ))}
                            </div>
                          )}

                          {/* 3. ORDER HISTORY */}
                          {normalizedHistory.filter(h => h.stage !== 'pipeline' && h.id !== normalizedClient.id).length > 0 && (
                            <details className="group font-sans">
                              <summary className="flex items-center gap-2 cursor-pointer list-none text-[11px] font-bold text-text-muted uppercase tracking-widest px-1 mb-2">
                                <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                                Order History
                              </summary>
                              <div className="space-y-2 pl-1 mt-2">
                                {normalizedHistory.filter(h => h.stage !== 'pipeline' && h.id !== normalizedClient.id).map(order => (
                                  <div key={order.id} className="flex items-start gap-3 relative before:absolute before:left-2 before:top-6 before:bottom-[-8px] before:w-px before:bg-border/50 last:before:hidden">
                                     <div className="w-4 h-4 rounded-full border border-border bg-card mt-1 shrink-0 flex items-center justify-center">
                                       <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                                     </div>
                                     <div className="pb-3 text-left">
                                        <p className="text-xs font-bold text-text-primary">{order.produk}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className={cn("text-[9px] font-bold uppercase", order.orderStatus === 'rejected' || order.orderStatus === 'pending' ? 'text-destructive' : 'text-emerald-500')}>
                                            {order.orderStatus === 'rejected' ? 'Rejected' : order.orderStatus === 'pending' ? 'Pending' : 'Completed'}
                                          </span>
                                          <span className="text-[10px] text-text-muted">
                                             {order.updatedAt?.toDate ? order.updatedAt.toDate().toLocaleDateString('id-ID') : '-'}
                                          </span>
                                        </div>
                                     </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}

                          {/* 4. CUSTOMER INFORMATION */}
                          <details className="group font-sans">
                            <summary className="flex items-center gap-2 cursor-pointer list-none text-[11px] font-bold text-text-muted uppercase tracking-widest px-1 mb-2">
                              <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                              Customer Data
                            </summary>
                            <Card className="p-4 mt-2 text-left space-y-4">
                              <div>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Nama & Usaha</p>
                                <p className="text-sm font-semibold text-text-primary">{normalizedClient.nama}</p>
                                <p className="text-xs text-text-muted font-medium mt-0.5">{normalizedClient.usaha || '-'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Kontak</p>
                                <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                  <Phone className="w-3.5 h-3.5 inline-block text-text-muted" />
                                  <span>{normalizedClient.nomor}</span>
                                  <a href={`https://wa.me/${formatWhatsApp(normalizedClient.nomor)}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded ml-2 uppercase">Chat</a>
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Alamat</p>
                                <p className="text-sm font-semibold text-text-primary leading-relaxed flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                                  <span>{normalizedClient.alamat}</span>
                                </p>
                              </div>
                            </Card>
                          </details>

                          {/* 5. OPERATIONAL NOTES */}
                          {normalizedClient.archiveReason && (
                            <div className="space-y-2 text-left font-sans">
                              <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-widest px-1">Reject / Archive Note</h4>
                              <Card className="p-3 bg-red-500/5 dark:bg-red-500/10 border-red-500/20 text-red-500 text-xs font-semibold leading-relaxed">
                                {normalizedClient.archiveReason}
                              </Card>
                            </div>
                          )}

                          {/* 6. TIMELINE */}
                          <div className="space-y-2 text-left pt-2 pb-8 font-sans">
                             <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-widest px-1 mb-3">Timeline</h4>
                             <div className="pl-1">
                                {[
                                  { label: 'Submitted', status: 'completed', time: normalizedClient.createdAt },
                                  { 
                                     label: 'Survey', 
                                     status: (normalizedClient.currentStep === 'warehouse' || normalizedClient.currentStep === 'done' || (normalizedClient.currentStep === 'survey' && normalizedClient.orderStatus === 'approved')) ? 'completed' : 
                                             (normalizedClient.currentStep === 'survey' ? (normalizedClient.orderStatus === 'rejected' ? 'rejected' : 'active') : 'waiting') 
                                  },
                                  { 
                                     label: 'Warehouse & Shipping', 
                                     status: (normalizedClient.currentStep === 'done' && normalizedClient.stage === 'client') ? 'completed' : 
                                             ((normalizedClient.currentStep === 'warehouse' && normalizedClient.orderStatus !== 'rejected') ? 'active' : 'waiting') 
                                  }
                                ].map((step, idx, arr) => (
                                  <div key={step.label} className={cn("flex items-start gap-4 relative", idx < arr.length - 1 && "before:absolute before:left-2 before:top-6 before:bottom-[-12px] before:w-px before:bg-border/50")}>
                                    <div className={cn("w-4 h-4 rounded-full mt-1 shrink-0 flex items-center justify-center border z-10", 
                                       step.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" : 
                                       step.status === 'active' ? "bg-primary border-primary text-primary-foreground" : 
                                       step.status === 'rejected' ? "bg-destructive border-destructive text-destructive-foreground" :
                                       "bg-card border-border text-transparent"
                                     )}>
                                      {step.status === 'completed' ? <CheckCircle2 className="w-2.5 h-2.5" /> : 
                                       step.status === 'active' ? <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> :
                                       step.status === 'rejected' ? <XCircle className="w-2.5 h-2.5" /> : <div className="w-1 h-1 rounded-full bg-border" />}
                                    </div>
                                    <div className="pb-5">
                                      <p className={cn("text-xs font-bold uppercase tracking-wider", 
                                        step.status === 'waiting' ? "text-text-muted" : "text-text-primary"
                                      )}>{step.label}</p>
                                      {step.time && step.time.toDate && (
                                        <p className="text-[10px] text-text-muted mt-0.5">{step.time.toDate().toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year:'numeric'})}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                             </div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

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
                            <div className="grid grid-cols-2 gap-2">
                              <button 
                                onClick={() => { setPendingAction({ stage: 'pipeline', orderStatus: 'warehouse_pending', currentStep: 'warehouse' }); setShowNoteDialog(true); }}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-1 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm active:scale-95"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                Pending Gudang
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(normalizedClient.id, 'client', 'completed', 'done')}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm active:scale-95"
                              >
                                <Truck className="w-4 h-4" />
                                Terkirim
                              </button>
                            </div>
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
                          onClick={() => setClientToDelete(selectedClient)}
                          className="w-full h-12 bg-destructive/5 hover:bg-destructive/10 text-destructive rounded-full font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                        >
                          Hapus Permanen
                        </button>
                      </div>
                    )}
                 </div>
              )}
            </motion.div>
            </div>
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

        {/* Confirm Delete Modal */}
        <AnimatePresence>
          {clientToDelete && (
            <div className="fixed inset-0 z-[10002] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm bg-background border border-border/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
              >
                {/* Background glow for delete warning */}
                <div className="absolute -top-12 -left-12 w-24 h-24 bg-destructive/10 blur-3xl rounded-full pointer-events-none" />
                
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight">Konfirmasi Hapus</h3>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Hapus Data Operasional</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6 relative z-10">
                  <p className="text-xs text-text-secondary leading-relaxed text-left">
                    Apakah Anda yakin ingin menghapus data konsumen <strong className="text-text-primary uppercase">{clientToDelete.nama}</strong>? Tindakan ini permanen dan tidak dapat dibatalkan.
                  </p>
                  <div className="p-3 bg-secondary/30 rounded-2xl border border-border/30 text-left">
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Detail Dokumen:</p>
                    <p className="text-xs font-semibold text-text-primary truncate">{clientToDelete.nama} • {clientToDelete.usaha || 'Personal'}</p>
                    <p className="text-[10px] font-medium text-text-muted truncate mt-0.5">{clientToDelete.alamat}</p>
                  </div>
                </div>

                <div className="flex gap-2 relative z-10">
                  <button 
                    onClick={() => setClientToDelete(null)} 
                    className="flex-1 py-3 bg-secondary hover:bg-secondary/80 rounded-full text-xs font-bold text-text-primary transition-colors active:scale-95"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        await deleteDoc(doc(db, "clients", clientToDelete.id));
                        toast.success("Berhasil menghapus data");
                        setClientToDelete(null);
                        if (selectedClient?.id === clientToDelete.id) {
                          setSelectedClient(null);
                        }
                      } catch (err) {
                        console.error(err);
                        toast.error("Gagal menghapus data");
                      }
                    }} 
                    className="flex-1 py-3 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    Hapus
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal Dialogs are handled globally */}
      </div>
    </AuthGuard>
  );
}

