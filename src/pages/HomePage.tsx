import React, { useState, useEffect, useMemo } from 'react';
import { 
  useCurrentUser, 
  useUserProfile, 
  subscribeClients, 
  subscribeOrders,
  subscribeTasks,
  subscribeActivities,
  updateOrderStage,
  updateTaskStatus,
  createClientAndOrder,
  logActivity
} from '../lib/services';
import { 
  Users, ShoppingBag, Clock, CheckCircle2, Activity,
  CheckSquare, Shield, UserCheck, Briefcase, History,
  ArrowRight, Package, Truck, AlertTriangle, Plus,
  Search, ChevronRight, X, MapPin, Calendar, Layers,
  Sparkles, Smartphone, Check, TrendingUp
} from 'lucide-react';
import { cn, formatRelativeTime, formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import { SummaryCard, OperationalCard, DetailCard, ActionCard, Card } from '../components/ui/FintechCard';

export default function HomePage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { profile, loading: profileLoading } = useUserProfile();
  
  const [clients, setClients] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // Local state for dashboard controls
  const [activeTab, setActiveTab] = useState<'workspace' | 'pipeline'>('workspace');
  const [pipelineSection, setPipelineSection] = useState<'survey' | 'warehouse' | 'delivery' | 'overdue'>('survey');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Form states for new client and order
  const [newOrderForm, setNewOrderForm] = useState({
    nama: '', nomor: '', usaha: '', alamat: '', barang: '', 
    angsuran: '', tenor: '30', tenorType: 'hari'
  });

  useEffect(() => {
    if (!user?.uid || !profile?.role) return;

    const unsubscribeClients = subscribeClients(profile.role, user.uid, setClients, profile.branchId);
    const unsubscribeOrders = subscribeOrders(profile.role, user.uid, setOrders, 'all', profile.branchId);
    const unsubscribeTasks = subscribeTasks(profile.role, user.uid, setTasks, profile.branchId);
    const unsubscribeActivities = subscribeActivities(profile.role, user.uid, (data) => setActivities(data.slice(0, 10)), 10, profile.branchId);

    return () => {
      unsubscribeClients();
      unsubscribeOrders();
      unsubscribeTasks();
      unsubscribeActivities();
    };
  }, [user?.uid, profile?.role, profile?.branchId]);

  const stats = useMemo(() => {
    const totalClients = clients.length;
    const totalOrders = orders.length;

    const activeOrders = orders.filter(o => o.stage !== 'selesai' && o.stage !== 'completed' && o.stage !== 'batal');
    const pendingSurvey = orders.filter(o => !o.stage || o.stage === 'survey');
    const warehouseQueue = orders.filter(o => o.stage === 'acc' && (!o.deliveryStatus || o.deliveryStatus === 'pending_gudang'));
    const deliveryQueue = orders.filter(o => o.deliveryStatus === 'kirim');

    const now = new Date();
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'completed' || t.status === 'cancelled') return false;
      if (!t.dueAt) return false;
      const d = t.dueAt.toDate ? t.dueAt.toDate() : new Date(t.dueAt);
      return d < now;
    });

    const activeSurveyCount = pendingSurvey.length;
    const activeWarehouseCount = warehouseQueue.length;
    const activeDeliveryCount = deliveryQueue.length;
    const overdueCount = overdueTasks.length;

    const estimateActiveOmset = activeOrders.reduce((sum, o) => {
      const ang = Number(o.angsuran) || 0;
      const ten = Number(o.tenor) || 1;
      return sum + (ang * ten);
    }, 0);

    return { 
      totalClients, totalOrders, totalActiveOrders: activeOrders.length,
      activeSurveyCount, activeWarehouseCount, activeDeliveryCount, overdueCount,
      estimateActiveOmset, pendingSurvey, warehouseQueue, deliveryQueue, overdueTasks
    };
  }, [clients, orders, tasks]);

  const assignedData = useMemo(() => {
    if (!user || !profile) return { customers: [], orders: [], tasks: [] };
    const myUid = user.uid;
    const myRole = profile.role?.toUpperCase();

    return {
      customers: clients.filter(c => c.ownerId === myUid || c.createdBy === myUid),
      orders: orders.filter(o => o.ownerId === myUid || o.createdBy === myUid),
      tasks: tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && (t.assignedTo === myUid || t.ownerId === myUid || (t.assignedRole && t.assignedRole.toUpperCase() === myRole)))
    };
  }, [clients, orders, tasks, user, profile]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.nama || !newOrderForm.nomor || !newOrderForm.barang) return toast.error("Nama, Nomor HP, dan Nama Barang wajib diisi");
    
    setIsSubmittingOrder(true);
    try {
      await createClientAndOrder({
        ...newOrderForm,
        angsuran: Number(newOrderForm.angsuran.replace(/\D/g, '')) || 0,
        tenor: Number(newOrderForm.tenor) || 30
      });
      toast.success("Konsumen baru & order pipeline berhasil dibuat! 🚀");
      setIsNewClientOpen(false);
      setNewOrderForm({ nama: '', nomor: '', usaha: '', alamat: '', barang: '', angsuran: '', tenor: '30', tenorType: 'hari' });
    } catch (err: any) {
      toast.error(`Gagal membuat konsumen: ${err.message || 'Error'}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleUpdateStage = async (orderId: string, stage: string, extra: any = {}) => {
    try {
      await updateOrderStage(orderId, { stage, ...extra });
      toast.success(`Pipeline berhasil dipindahkan ke: ${stage.toUpperCase()}!`);
    } catch (err: any) {
      toast.error(`Gagal memindahkan pipeline: ${err.message}`);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, 'completed');
      toast.success("Tugas diselesaikan!");
    } catch (err: any) {
      toast.error(`Gagal menyelesaikan tugas: ${err.message}`);
    }
  };

  const filteredSearchClients = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return clients.filter(c => (c.nama?.toLowerCase().includes(q) || c.nomor?.includes(q) || c.usaha?.toLowerCase().includes(q))).slice(0, 5);
  }, [clients, searchQuery]);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="w-56 h-7 rounded-[1.25rem]" />
            <Skeleton className="w-36 h-4 rounded-[1.25rem]" />
          </div>
          <Skeleton variant="circular" className="w-12 h-12" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-24 rounded-3xl" /></div>
      </div>
    );
  }

  const roleLabel = profile?.role?.toUpperCase() || 'OFFICER';
  const roleGreeting = 
    roleLabel === 'OWNER' ? 'Owner Command Space' :
    roleLabel === 'ADMIN' ? 'Global Admin Workspace' :
    roleLabel === 'STAFF' ? 'Branch Command Space' :
    (roleLabel === 'SPV' || roleLabel === 'SUPERVISOR') ? 'Supervisor Control Desk' : 'Operator Control Center';

  return (
    <div className="min-h-screen bg-background text-foreground pt-6 pb-32 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 1. GREETING HEADER - Floating Surface */}
        <Card depth="soft" className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-black text-text-primary tracking-tight">
                  Halo, {profile?.displayName || user?.displayName || 'User'}
                </h1>
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-lg uppercase tracking-wider">
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs text-text-muted font-medium">
                {roleGreeting}
              </p>
            </div>
          </div>
          <div className="flex flex-col text-left md:text-right">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">WAKTU AKTIF</span>
            <span className="text-sm font-bold text-text-primary capitalize tracking-tight mt-0.5">
              {dayjs().format('dddd, DD MMMM YYYY')}
            </span>
            {profile?.branchId && (
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest mt-0.5 flex items-center md:justify-end gap-1">
                <MapPin className="w-3 h-3" /> CABANG: {profile.branchId}
              </span>
            )}
          </div>
        </Card>

        {/* 2. QUICK STATS (Summary Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard 
            title="Active Orders" 
            value={stats.totalActiveOrders.toString()}
            icon={ShoppingBag}
            theme="primary"
          />
          <SummaryCard 
            title="Pending Survey" 
            value={stats.activeSurveyCount.toString()}
            icon={Activity}
          />
          <SummaryCard 
            title="Gudang / Kirim" 
            value={(stats.activeWarehouseCount + stats.activeDeliveryCount).toString()}
            icon={Truck}
          />
          <SummaryCard 
            title="Overdue Tasks" 
            value={stats.overdueCount.toString()}
            icon={AlertTriangle}
            theme={stats.overdueCount > 0 ? "success" : "default"} // Inverted logic: if > 0 make it stand out.
            className={stats.overdueCount > 0 ? "bg-destructive/10 text-destructive border-destructive/20" : ""}
          />
        </div>

        {/* OWNER / ADMIN EXCLUSIVE ACTIVE OMSET CARD */}
        {(roleLabel === 'OWNER' || roleLabel === 'ADMIN' || roleLabel === 'STAFF' || roleLabel === 'SPV' || roleLabel === 'SUPERVISOR') && (
          <SummaryCard
            title="Potensi Omset Aktif"
            value={formatCurrency(stats.estimateActiveOmset)}
            icon={TrendingUp}
            theme="primary"
            trend={{ value: 'Real-Time Estimates', isPositive: true }}
            action={
              <button onClick={() => navigate('/report')} className="text-[10px] px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold transition-colors">
                Laporan &rarr;
              </button>
            }
          />
        )}

        {/* 4. QUICK ACTIONS */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted px-1">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ActionCard title="Konsumen Baru" icon={Plus} color="primary" onClick={() => setIsNewClientOpen(true)} />
            <ActionCard title="Data CRM" icon={Users} onClick={() => navigate('/workspace/client')} />
            <ActionCard title="Workflows" icon={Layers} onClick={() => { setActiveTab('pipeline'); setPipelineSection('survey'); }} />
            <ActionCard title="Timeline Audit" icon={History} onClick={() => navigate('/workspace/timeline')} />
          </div>

          <div className="relative mt-2">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-text-muted" />
            </div>
            <input 
              type="text" 
              placeholder="Cari Cepat Konsumen..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border/50 rounded-full py-3 pl-11 pr-4 text-sm font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
            />
          </div>

          {searchQuery && (
            <DetailCard title={`Hasil Pencarian (${filteredSearchClients.length})`} className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {filteredSearchClients.length === 0 ? (
                <p className="text-xs text-text-muted font-bold text-center py-4">Konsumen tidak ditemukan</p>
              ) : (
                <div className="space-y-2">
                  {filteredSearchClients.map(c => (
                    <OperationalCard 
                      key={c.id}
                      title={c.nama}
                      subtitle={`${c.nomor} • ${c.usaha || 'Personal'}`}
                      icon={UserCheck}
                      interactive={true}
                      onClick={() => { setSearchQuery(''); navigate(`/workspace/client?search=${c.nama}`); }}
                    />
                  ))}
                </div>
              )}
            </DetailCard>
          )}
        </div>

        {/* 3. ACTIVE TASKS / WORKFLOWS */}
        <div className="space-y-4">
          {/* Custom Tabs */}
          <div className="flex p-1 bg-card border border-border/50 rounded-full">
            {(['workspace', 'pipeline'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all active:scale-95",
                  activeTab === tab ? "bg-white text-black shadow-sm" : "text-text-muted hover:text-text-secondary"
                )}
              >
                {tab === 'workspace' ? 'Workspace Saya' : 'Pipeline Operasional'}
              </button>
            ))}
          </div>

          {activeTab === 'workspace' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailCard title={`Tugas Hari Ini (${assignedData.tasks.length})`} icon={CheckSquare}>
                {assignedData.tasks.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-8">Tidak ada tugas hari ini</p>
                ) : (
                  <div className="space-y-2">
                    {assignedData.tasks.map(t => (
                      <OperationalCard 
                        key={t.id}
                        title={t.title}
                        subtitle={t.description}
                        icon={Layers}
                        rightContent={
                          <button onClick={() => handleCompleteTask(t.id)} className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 mb-1 hover:text-white transition-colors">
                            <Check className="w-4 h-4" />
                          </button>
                        }
                      />
                    ))}
                  </div>
                )}
              </DetailCard>

              <DetailCard title={`Order CRM Diawasi (${assignedData.orders.length})`} icon={Users}>
                {assignedData.orders.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-8">Belum ada order diawasi</p>
                ) : (
                  <div className="space-y-2">
                    {assignedData.orders.slice(0, 5).map(o => (
                      <OperationalCard 
                        key={o.id}
                        title={o.nama}
                        subtitle={`${o.barang} • Stage: ${o.stage || 'Survey'}`}
                        icon={ShoppingBag}
                        interactive={true}
                        onClick={() => navigate(`/workspace/client?search=${o.nama}`)}
                      />
                    ))}
                  </div>
                )}
              </DetailCard>
            </div>
          )}

          {activeTab === 'pipeline' && (
             <DetailCard title="Pipeline Queues" icon={Clock}>
               <div className="flex overflow-x-auto gap-2 no-scrollbar pb-3 mb-2">
                 {[
                   { id: 'survey', label: 'Survey', count: stats.activeSurveyCount },
                   { id: 'warehouse', label: 'Warehouse', count: stats.activeWarehouseCount },
                   { id: 'delivery', label: 'Delivery', count: stats.activeDeliveryCount },
                   { id: 'overdue', label: 'Overdue', count: stats.overdueCount }
                 ].map(sec => (
                   <button
                     key={sec.id}
                     onClick={() => setPipelineSection(sec.id as any)}
                     className={cn(
                       "px-4 py-2 rounded-full border text-xs font-bold transition-all whitespace-nowrap shadow-sm bg-card",
                       pipelineSection === sec.id ? "bg-primary/10 border-primary/20 text-primary" : "border-border/50 text-text-muted"
                     )}
                   >
                     {sec.label} ({sec.count})
                   </button>
                 ))}
               </div>

               <div className="space-y-3">
                 {/* SURVERY QUEUE */}
                 {pipelineSection === 'survey' && (
                   stats.pendingSurvey.length === 0 ? <p className="text-xs text-text-muted text-center py-6">Tidak ada antrian survey</p> :
                   stats.pendingSurvey.map(o => (
                     <OperationalCard 
                       key={o.id} title={o.nama} subtitle={`Item: ${o.barang} • ${formatCurrency(o.angsuran * o.tenor)}`}
                       icon={Activity}
                       expandableContent={
                          <div className="flex gap-2">
                             <button onClick={() => handleUpdateStage(o.id, 'acc')} className="flex-1 py-2 bg-emerald-500 rounded-full text-white text-xs font-bold">ACC Order</button>
                             <button onClick={() => handleUpdateStage(o.id, 'batal')} className="px-4 py-2 bg-destructive/10 text-destructive rounded-full text-xs font-bold">Tolak</button>
                          </div>
                       }
                     />
                   ))
                 )}

                 {/* WAREHOUSE QUEUE */}
                 {pipelineSection === 'warehouse' && (
                   stats.warehouseQueue.length === 0 ? <p className="text-xs text-text-muted text-center py-6">Tidak ada antrian gudang</p> :
                   stats.warehouseQueue.map(o => (
                     <OperationalCard 
                       key={o.id} title={o.nama} subtitle={`Alamat: ${o.alamat || 'Kosong'}`}
                       icon={Package}
                       expandableContent={
                          <button onClick={() => handleUpdateStage(o.id, 'acc', { deliveryStatus: 'kirim' })} className="w-full py-2 bg-purple-500 rounded-full text-white text-xs font-bold flex items-center justify-center gap-2"><Truck className="w-4 h-4"/> Siap Kirim (Kurir)</button>
                       }
                     />
                   ))
                 )}

                 {/* DELIVERY QUEUE */}
                 {pipelineSection === 'delivery' && (
                   stats.deliveryQueue.length === 0 ? <p className="text-xs text-text-muted text-center py-6">Tidak ada antrian kurir</p> :
                   stats.deliveryQueue.map(o => (
                     <OperationalCard 
                       key={o.id} title={o.nama} subtitle={`Alamat: ${o.alamat || 'Kosong'}`}
                       icon={Truck}
                       expandableContent={
                          <button onClick={() => handleUpdateStage(o.id, 'acc', { deliveryStatus: 'terkirim', stage: 'acc' })} className="w-full py-2 bg-indigo-500 rounded-full text-white text-xs font-bold flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4"/> Konfirmasi Diterima</button>
                       }
                     />
                   ))
                 )}

                 {/* OVERDUE QUEUE */}
                 {pipelineSection === 'overdue' && (
                   stats.overdueTasks.length === 0 ? <p className="text-xs text-emerald-500 font-bold text-center py-6">Aman, tidak ada overdue</p> :
                   stats.overdueTasks.map(t => (
                     <OperationalCard 
                       key={t.id} title={t.title} subtitle={t.description}
                       icon={AlertTriangle}
                       className="border-destructive/30"
                       expandableContent={
                          <button onClick={() => handleCompleteTask(t.id)} className="w-full py-2 bg-emerald-500 rounded-full text-white text-xs font-bold flex items-center justify-center gap-2"><Check className="w-4 h-4"/> Selesaikan Task</button>
                       }
                     />
                   ))
                 )}
               </div>
             </DetailCard>
          )}
        </div>

        {/* 5. LIVE ACTIVITY FEED */}
        <DetailCard title="Live Operational Audit Log" icon={Activity} action={<button onClick={() => navigate('/workspace/timeline')} className="text-[10px] text-primary font-bold">See All</button>}>
           {activities.length === 0 ? (
             <p className="text-xs text-text-muted text-center py-4">Belum ada aktivitas terekam.</p>
           ) : (
             <div className="space-y-4">
               {activities.slice(0, 5).map(act => (
                 <div key={act.id} className="flex gap-3">
                   <div className="w-8 h-8 rounded-full bg-secondary/50 flex-shrink-0 flex items-center justify-center text-text-muted">
                     {act.category === 'user' ? <Users className="w-4 h-4" /> : act.category === 'order' ? <ShoppingBag className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                   </div>
                   <div className="flex-1">
                     <div className="flex items-center justify-between">
                       <p className="text-xs font-bold text-text-primary capitalize">{act.title}</p>
                       <span className="text-[10px] text-text-muted font-medium">{formatRelativeTime(act.createdAt)}</span>
                     </div>
                     <p className="text-[11px] text-text-muted leading-snug">{act.description}</p>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </DetailCard>

      </div>

      {isNewClientOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg overflow-hidden relative border-border/50 shadow-2xl p-0">
             <div className="p-4 border-b border-border/50 flex items-center justify-between bg-card text-text-primary">
               <h2 className="text-sm font-bold uppercase tracking-widest">Pipeline Baru</h2>
               <button onClick={() => setIsNewClientOpen(false)} className="p-1 rounded-lg hover:bg-secondary/50">
                 <X className="w-5 h-5 text-text-muted" />
               </button>
             </div>
             <form onSubmit={handleCreateOrder} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto bg-background/50">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Nama Lengkap</label>
                  <input required placeholder="Budi Prasetyo" value={newOrderForm.nama} onChange={(e) => setNewOrderForm({ ...newOrderForm, nama: e.target.value })} className="w-full bg-card border border-border/50 rounded-[1.25rem] px-4 py-3 text-xs font-bold text-text-primary outline-none focus:border-primary/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Nomor WhatsApp</label>
                  <input required type="tel" placeholder="0812345678" value={newOrderForm.nomor} onChange={(e) => setNewOrderForm({ ...newOrderForm, nomor: e.target.value })} className="w-full bg-card border border-border/50 rounded-[1.25rem] px-4 py-3 text-xs font-bold text-text-primary outline-none focus:border-primary/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase">Usaha / Toko</label>
                    <input placeholder="Warung Sembako" value={newOrderForm.usaha} onChange={(e) => setNewOrderForm({ ...newOrderForm, usaha: e.target.value })} className="w-full bg-card border border-border/50 rounded-[1.25rem] px-4 py-3 text-xs font-bold text-text-primary outline-none focus:border-primary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase">Barang Kredit</label>
                    <input required placeholder="Kulkas Sharp 2 Pintu" value={newOrderForm.barang} onChange={(e) => setNewOrderForm({ ...newOrderForm, barang: e.target.value })} className="w-full bg-card border border-border/50 rounded-[1.25rem] px-4 py-3 text-xs font-bold text-text-primary outline-none focus:border-primary/50" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Alamat Pengiriman</label>
                  <textarea placeholder="Jl. Sudirman No 4..." value={newOrderForm.alamat} onChange={(e) => setNewOrderForm({ ...newOrderForm, alamat: e.target.value })} className="w-full h-20 bg-card border border-border/50 rounded-[1.25rem] px-4 py-3 text-xs font-medium text-text-primary outline-none focus:border-primary/50" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase">Cicilan Harian (Rp)</label>
                    <input inputMode="numeric" placeholder="15000" value={newOrderForm.angsuran ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(newOrderForm.angsuran)) : ''} onChange={(e) => setNewOrderForm({ ...newOrderForm, angsuran: e.target.value.replace(/\D/g, '') })} className="w-full bg-card border border-border/50 rounded-[1.25rem] px-4 py-3 text-xs font-bold text-text-primary outline-none focus:border-primary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase">Tenor Hari</label>
                    <input type="number" placeholder="30" value={newOrderForm.tenor} onChange={(e) => setNewOrderForm({ ...newOrderForm, tenor: e.target.value })} className="w-full bg-card border border-border/50 rounded-[1.25rem] px-4 py-3 text-xs font-bold text-text-primary outline-none focus:border-primary/50" />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                   <button type="button" onClick={() => setIsNewClientOpen(false)} className="flex-1 py-3 bg-secondary/50 rounded-full text-xs font-bold text-text-primary hover:bg-secondary active:scale-95 transition-all">Batal</button>
                   <button type="submit" disabled={isSubmittingOrder} className="flex-1 py-3 bg-primary rounded-full text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-95 transition-all">{isSubmittingOrder ? 'Menyimpan...' : 'Simpan'}</button>
                </div>
             </form>
          </Card>
        </div>
      )}

    </div>
  );
}
