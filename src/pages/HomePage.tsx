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
  Users, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Activity,
  CheckSquare,
  Shield,
  UserCheck,
  Briefcase,
  History,
  ArrowRight,
  Package,
  Truck,
  AlertTriangle,
  Plus,
  Search,
  ChevronRight,
  X,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  Smartphone,
  Check
} from 'lucide-react';
import { cn, formatRelativeTime, formatCurrency } from '../lib/utils';
import { ROLES } from '../config/roles';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';


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
  const [quickActionOrder, setQuickActionOrder] = useState<any | null>(null);

  // Form states for new client and order
  const [newOrderForm, setNewOrderForm] = useState({
    nama: '',
    nomor: '',
    usaha: '',
    alamat: '',
    barang: '',
    angsuran: '',
    tenor: '30',
    tenorType: 'hari'
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

  // Command center smart stats calculation
  const stats = useMemo(() => {
    const totalClients = clients.length;
    const totalOrders = orders.length;

    // Active orders (not finished, completed, or cancelled)
    const activeOrders = orders.filter(o => 
      o.stage !== 'selesai' && o.stage !== 'completed' && o.stage !== 'batal'
    );

    // Filtered lists for pipelining
    const pendingSurvey = orders.filter(o => !o.stage || o.stage === 'survey');
    
    // Warehouse queue: stage is 'acc' but delivery is still pending_gudang or null
    const warehouseQueue = orders.filter(o => 
      o.stage === 'acc' && (!o.deliveryStatus || o.deliveryStatus === 'pending_gudang')
    );
    
    // Delivery queue: out for delivery (deliveryStatus is kirim)
    const deliveryQueue = orders.filter(o => 
      o.deliveryStatus === 'kirim'
    );

    // Overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'completed' || t.status === 'cancelled') return false;
      if (!t.dueAt) return false;
      const d = t.dueAt.toDate ? t.dueAt.toDate() : new Date(t.dueAt);
      return d < now;
    });

    // Compute metrics
    const totalActiveOrders = activeOrders.length;
    const activeSurveyCount = pendingSurvey.length;
    const activeWarehouseCount = warehouseQueue.length;
    const activeDeliveryCount = deliveryQueue.length;
    const overdueCount = overdueTasks.length;

    // Sum of omset estimate from active orders
    const estimateActiveOmset = activeOrders.reduce((sum, o) => {
      const ang = Number(o.angsuran) || 0;
      const ten = Number(o.tenor) || 1;
      return sum + (ang * ten);
    }, 0);

    return { 
      totalClients, 
      totalOrders, 
      totalActiveOrders,
      activeSurveyCount,
      activeWarehouseCount,
      activeDeliveryCount,
      overdueCount,
      estimateActiveOmset,
      pendingSurvey,
      warehouseQueue,
      deliveryQueue,
      overdueTasks
    };
  }, [clients, orders, tasks]);

  // Scoped list of assigned tasks/clients for the "Workspace Saya" tab
  const assignedData = useMemo(() => {
    if (!user || !profile) return { customers: [], orders: [], tasks: [] };
    const myUid = user.uid;
    const myRole = profile.role?.toUpperCase();

    // Customers assigned (leads or active created by current user)
    const myCustomers = clients.filter(c => c.ownerId === myUid || c.createdBy === myUid);
    
    // Orders assigned to me or created by me
    const myOrders = orders.filter(o => o.ownerId === myUid || o.createdBy === myUid);

    // Tasks specifically assigned to my UID or assigned to my role
    const myTasks = tasks.filter(t => {
      if (t.status === 'completed' || t.status === 'cancelled') return false;
      if (t.assignedTo === myUid) return true;
      if (t.ownerId === myUid) return true;
      if (t.assignedRole && t.assignedRole.toUpperCase() === myRole) return true;
      return false;
    });

    return {
      customers: myCustomers,
      orders: myOrders,
      tasks: myTasks
    };
  }, [clients, orders, tasks, user, profile]);

  // Quick Action Handlers
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.nama || !newOrderForm.nomor || !newOrderForm.barang) {
      toast.error("Nama, Nomor HP, dan Nama Barang wajib diisi");
      return;
    }
    
    setIsSubmittingOrder(true);
    try {
      const angsuranClean = Number(newOrderForm.angsuran.replace(/\D/g, '')) || 0;
      const tenorClean = Number(newOrderForm.tenor) || 30;

      await createClientAndOrder({
        ...newOrderForm,
        angsuran: angsuranClean,
        tenor: tenorClean
      });

      toast.success("Konsumen baru & order pipeline berhasil dibuat! 🚀");
      setIsNewClientOpen(false);
      setNewOrderForm({
        nama: '', nomor: '', usaha: '', alamat: '', barang: '', 
        angsuran: '', tenor: '30', tenorType: 'hari'
      });
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

  // Searching logic for quick search bar
  const filteredSearchClients = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return clients.filter(c => 
      (c.nama && c.nama.toLowerCase().includes(q)) || 
      (c.nomor && c.nomor.includes(q)) ||
      (c.usaha && c.usaha.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [clients, searchQuery]);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24">
        {/* Profile/Greeting Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="w-56 h-7 rounded-xl" />
            <Skeleton className="w-36 h-4 rounded-xl" />
          </div>
          <Skeleton variant="circular" className="w-12 h-12" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>

        {/* Tabs switcher row */}
        <div className="flex gap-2">
          <Skeleton className="w-32 h-10 rounded-full" />
          <Skeleton className="w-32 h-10 rounded-full" />
        </div>

        {/* Bento Workspace Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="space-y-4">
            <Skeleton className="w-40 h-5 rounded-lg" />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="space-y-4">
            <Skeleton className="w-40 h-5 rounded-lg" />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  const roleLabel = profile?.role?.toUpperCase() || 'OFFICER';
  const roleGreeting = 
    roleLabel === 'OWNER' ? 'Owner Command Space 👑' :
    roleLabel === 'ADMIN' ? 'Global Admin Workspace 🛡️' :
    roleLabel === 'STAFF' ? 'Branch Command Space 📡' :
    roleLabel === 'SPV' ? 'Supervisor Control Desk 📈' :
    'Operator Control Center ⚡';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-foreground pt-6 pb-32 px-4 selection:bg-primary/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* COMMAND CENTER HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-900 rounded-3xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">
                  Halo, {profile?.displayName || user?.displayName || 'User'}
                </h1>
                <span className="text-[9px] font-black bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap">
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                {roleGreeting}
              </p>
            </div>
          </div>
          <div className="flex flex-col text-right md:-mt-1">
            <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">WAKTU AKTIF STATUS</span>
            <span className="text-md font-black text-zinc-800 dark:text-zinc-200 uppercase font-mono tracking-tight mt-0.5">
              {dayjs().format('dddd, DD MMMM YYYY')}
            </span>
            {profile?.branchId && (
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1 justify-end">
                <MapPin className="w-3 h-3 text-red-500" />
                CABANG: {profile.branchId.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* METRICS DASHBOARD ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">ACTIVE ORDERS</p>
              <h3 className="text-2xl font-black text-indigo-500 font-mono tracking-tight mt-1">{stats.totalActiveOrders}</h3>
            </div>
            <p className="text-[9px] text-zinc-400 font-medium mt-3">Pipeline operasional berjalan</p>
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
              <Plus className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">PENDING SURVEY</p>
              <h3 className="text-2xl font-black text-amber-500 font-mono tracking-tight mt-1">{stats.activeSurveyCount}</h3>
            </div>
            <p className="text-[9px] text-zinc-400 font-medium mt-3">Menunggu verifikasi lapangan</p>
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center">
              <Truck className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">GUDANG / DELIVERY</p>
              <h3 className="text-2xl font-black text-purple-500 font-mono tracking-tight mt-1">
                {stats.activeWarehouseCount + stats.activeDeliveryCount}
              </h3>
            </div>
            <p className="text-[9px] text-zinc-400 font-medium mt-3">Persiapan & pengiriman barang</p>
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className={`absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center ${stats.overdueCount > 0 ? 'bg-red-50 dark:bg-red-950/40 animate-pulse' : 'bg-green-50 dark:bg-green-950/40'}`}>
              <AlertTriangle className={`w-4 h-4 ${stats.overdueCount > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
            <div>
              <p className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">OVERDUE RECALLS</p>
              <h3 className={cn("text-2xl font-black font-mono tracking-tight mt-1", stats.overdueCount > 0 ? "text-red-500" : "text-green-500")}>
                {stats.overdueCount}
              </h3>
            </div>
            <p className="text-[9px] text-zinc-400 font-medium mt-3">Tugas belum terselesaikan</p>
          </div>
        </div>

        {/* OWNER / ADMIN EXCLUSIVE ACTIVE OMSET CARD */}
        {(roleLabel === 'OWNER' || roleLabel === 'ADMIN' || roleLabel === 'STAFF') && (
          <div className="bg-gradient-to-r from-zinc-900 to-black text-white rounded-3xl p-6 shadow-xl border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[9px] font-black bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase tracking-widest">
                Real-Time Estimates
              </span>
              <h3 className="text-2xl font-black tracking-tight">{formatCurrency(stats.estimateActiveOmset)}</h3>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Potensi Omset Aktif Berjalan</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => navigate('/report')}
                className="px-4 py-2.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1 transition-all"
              >
                Analisis Laporan <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* QUICK CONTROL ACTION PLATFORM */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Layers className="w-4.5 h-4.5 text-zinc-900 dark:text-white" />
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white italic">OPERATIONAL QUICK SUITE</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => setIsNewClientOpen(true)}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-widest py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/10 transition-all border border-transparent"
            >
              <Plus className="w-4 h-4" />
              Konsumen Baru
            </button>
            
            <button 
              onClick={() => navigate('/client')}
              className="bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-foreground font-black text-xs uppercase tracking-widest py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-sm border border-zinc-200/60 dark:border-zinc-900 transition-all"
            >
              <Users className="w-4 h-4" />
              Data CRM / Client
            </button>

            <button 
              onClick={() => {
                setActiveTab('pipeline');
                setPipelineSection('survey');
              }}
              className="bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-foreground font-black text-xs uppercase tracking-widest py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-sm border border-zinc-200/60 dark:border-zinc-900 transition-all"
            >
              <Clock className="w-4 h-4" />
              Workflows
            </button>

            <button 
              onClick={() => navigate('/timeline')}
              className="bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-foreground font-black text-xs uppercase tracking-widest py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-sm border border-zinc-200/60 dark:border-zinc-900 transition-all"
            >
              <History className="w-4 h-4" />
              Timeline Audit
            </button>
          </div>

          {/* INLINE CUSTOMER SEARCH BOX */}
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-400" />
            </div>
            <input 
              type="text" 
              placeholder="Cari Cepat Konsumen (Nama / No HP / Usaha)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold uppercase tracking-wider text-foreground placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-4 flex items-center text-zinc-400 hover:text-zinc-650"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* QUICK SEARCH RESULTS DROP-LIST */}
          {searchQuery && (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-900 rounded-3xl p-4 shadow-xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Hasil Pencarian Cepat ({filteredSearchClients.length})</h3>
              {filteredSearchClients.length === 0 ? (
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider py-4 text-center">Konsumen tidak ditemukan</p>
              ) : (
                filteredSearchClients.map(c => (
                  <div 
                    key={c.id} 
                    className="flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-zinc-55/40 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-primary/30 transition-all"
                  >
                    <div>
                      <h4 className="text-xs font-black uppercase text-zinc-900 dark:text-white leading-tight">{c.nama}</h4>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">{c.nomor} • {c.usaha || 'Tidak ada usaha'}</p>
                    </div>
                    <div className="flex gap-2 mt-2 md:mt-0">
                      <button 
                        onClick={() => {
                          setSearchQuery('');
                          navigate(`/client?search=${c.nama}`);
                        }}
                        className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
                      >
                        Detail CRM <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* WORKSPACE & WORKFLOW SWITCH PANEL */}
        <div className="space-y-4">
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl w-full">
            <button
              onClick={() => setActiveTab('workspace')}
              className={cn(
                "flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2",
                activeTab === 'workspace' 
                  ? "bg-white dark:bg-zinc-950 text-foreground shadow-sm"
                  : "text-zinc-455 hover:text-zinc-850"
              )}
            >
              <UserCheck className="w-4 h-4" />
              Workspace Saya
            </button>
            <button
              onClick={() => setActiveTab('pipeline')}
              className={cn(
                "flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2",
                activeTab === 'pipeline' 
                  ? "bg-white dark:bg-zinc-950 text-foreground shadow-sm"
                  : "text-zinc-455 hover:text-zinc-850"
              )}
            >
              <Clock className="w-4 h-4" />
              Pipeline Operasional
            </button>
          </div>

          <div className="animate-in fade-in duration-300">
            {/* TAB: WORKSPACE SAYA */}
            {activeTab === 'workspace' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* SUBCOLUMN 1: ASSIGNED TASKS */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-900 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Tugas Saya Hari Ini</h3>
                    <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-black">
                      {assignedData.tasks.length} Pending
                    </span>
                  </div>

                  {assignedData.tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                        <Check className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-zinc-800 dark:text-zinc-200">Semua tugas beres!</h4>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mt-1">Tidak ada tugas operasional tertunda hari ini.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                      {assignedData.tasks.map(t => (
                        <div key={t.id} className="p-4 bg-zinc-55/30 dark:bg-zinc-900/30 rounded-2xl border border-zinc-100 dark:border-zinc-900 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 rounded-full inline-block mb-1 border",
                                t.priority === 'high' ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-850"
                              )}>
                                {t.priority || 'medium'}
                              </span>
                              <h4 className="text-xs font-black uppercase tracking-tight text-zinc-900 dark:text-white">{t.title}</h4>
                            </div>
                            <button 
                              onClick={() => handleCompleteTask(t.id)}
                              className="w-7 h-7 rounded-lg bg-green-500/15 text-green-500 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center"
                              title="Tandai Selesai"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-[11px] font-medium text-zinc-400">{t.description}</p>
                          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-zinc-400 border-t border-zinc-50 dark:border-zinc-900/50 pt-2 mt-2">
                            <span>Tipe: {t.type}</span>
                            {t.dueAt && (
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3" />
                                {dayjs(t.dueAt.toDate ? t.dueAt.toDate() : t.dueAt).format('DD MMM')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SUBCOLUMN 2: MY PIPELINE ORDERS & ASSIGNED CUSTOMERS */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-900 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Order/CRM Terakhir</h3>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-black">
                      {assignedData.orders.length} Diawasi
                    </span>
                  </div>

                  {assignedData.orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                      <ShoppingBag className="w-10 h-10 text-zinc-300 dark:text-zinc-800" />
                      <div>
                        <h4 className="text-xs font-black uppercase text-zinc-800 dark:text-zinc-200 font-bold tracking-wider">Belum ada order</h4>
                        <p className="text-[10px] text-zinc-450 uppercase tracking-widest mt-1">Daftarkan konsumen pertama Anda di tombol atas.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                      {assignedData.orders.slice(0, 5).map(o => (
                        <div key={o.id} className="p-3.5 bg-zinc-55/30 dark:bg-zinc-900/30 rounded-2xl border border-zinc-100 dark:border-zinc-900 flex items-center justify-between hover:border-zinc-200 transition-all">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-tight">{o.nama}</h4>
                            <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-widest mt-0.5">{o.barang} • {formatCurrency(o.angsuran * o.tenor)}</p>
                            <span className="text-[8px] font-black uppercase text-indigo-500 bg-indigo-50/20 border border-indigo-500/10 px-2 py-0.5 rounded-full mt-1.5 inline-block">
                              Stage: {o.stage || 'Survey'}
                            </span>
                          </div>
                          <button 
                            onClick={() => navigate(`/client?search=${o.nama}`)}
                            className="p-2 border border-zinc-100 dark:border-zinc-850 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl"
                          >
                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB: PIPELINE OPERASIONAL (CENTRALIZED FLOW CODES) */}
            {activeTab === 'pipeline' && (
              <div className="space-y-4">
                
                {/* HORIZONTAL MINI TABS FOR CODES */}
                <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
                  {[
                    { id: 'survey', label: '1. Survey & Approval', count: stats.activeSurveyCount, color: 'bg-amber-500' },
                    { id: 'warehouse', label: '2. Gudang & Packing', count: stats.activeWarehouseCount, color: 'bg-purple-500' },
                    { id: 'delivery', label: '3. Kurir / Delivery', count: stats.activeDeliveryCount, color: 'bg-indigo-500' },
                    { id: 'overdue', label: '4. Overdue', count: stats.overdueCount, color: 'bg-red-500' }
                  ].map(sec => (
                    <button
                      key={sec.id}
                      onClick={() => setPipelineSection(sec.id as any)}
                      className={cn(
                        "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 border shadow-sm",
                        pipelineSection === sec.id
                          ? "bg-zinc-900 text-white border-zinc-850 dark:bg-white dark:text-zinc-900 dark:border-zinc-100"
                          : "bg-white text-zinc-550 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-450 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      )}
                    >
                      <span className={`w-2 h-2 rounded-full ${sec.color}`} />
                      {sec.label}
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-md text-[8px]">
                        {sec.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* CURRENT ACTIVE STAGE CONTAINER */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-900 rounded-3xl p-6">
                  
                  {pipelineSection === 'survey' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-3">
                        <h3 className="text-xs font-black uppercase tracking-widest">Survey & Approval Queue</h3>
                        <span className="text-xs text-zinc-400 font-bold uppercase font-mono">{stats.activeSurveyCount} pipelines</span>
                      </div>

                      {stats.pendingSurvey.length === 0 ? (
                        <div className="text-center py-12 text-zinc-400 font-bold text-xs uppercase">Tidak ada sirkulasi survey tertunda</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {stats.pendingSurvey.map(o => (
                            <div key={o.id} className="p-4 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-150/50 dark:border-zinc-800 space-y-3">
                              <div>
                                <h4 className="text-xs font-black uppercase text-zinc-900 dark:text-white leading-tight">{o.nama}</h4>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Usaha: {o.usaha || 'tidak ada'}</p>
                                <p className="text-[10px] font-mono font-bold text-zinc-500 mt-1">Item: {o.barang} • {formatCurrency(o.angsuran * o.tenor)}</p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateStage(o.id, 'acc')}
                                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
                                >
                                  ACC Order
                                </button>
                                <button
                                  onClick={() => handleUpdateStage(o.id, 'batal')}
                                  className="py-2 px-3 bg-red-500/10 hover:bg-red-500/15 text-red-500 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
                                >
                                  Tolak
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {pipelineSection === 'warehouse' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-3">
                        <h3 className="text-xs font-black uppercase tracking-widest">Gudang & Logistic Prep Queue</h3>
                        <span className="text-xs text-zinc-400 font-bold uppercase font-mono">{stats.activeWarehouseCount} pipelines</span>
                      </div>

                      {stats.warehouseQueue.length === 0 ? (
                        <div className="text-center py-12 text-zinc-400 font-bold text-xs uppercase">Tidak ada persiapan logistik tertunda</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {stats.warehouseQueue.map(o => (
                            <div key={o.id} className="p-4 bg-zinc-55/40 dark:bg-zinc-900/30 rounded-2xl border border-zinc-100 dark:border-zinc-900 space-y-3">
                              <div>
                                <h4 className="text-xs font-black uppercase text-zinc-900 dark:text-white leading-tight">{o.nama}</h4>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">{o.barang}</p>
                                <p className="text-[10px] text-zinc-450 mt-1 italic font-medium">{o.alamat || 'Alamat kosong'}</p>
                              </div>
                              <button
                                onClick={() => handleUpdateStage(o.id, 'acc', { deliveryStatus: 'kirim' })}
                                className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                Siap Kirim (Kurir)
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {pipelineSection === 'delivery' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-3">
                        <h3 className="text-xs font-black uppercase tracking-widest">Out For Delivery (Kurir Runway)</h3>
                        <span className="text-xs text-zinc-400 font-bold uppercase font-mono">{stats.activeDeliveryCount} pipelines</span>
                      </div>

                      {stats.deliveryQueue.length === 0 ? (
                        <div className="text-center py-12 text-zinc-400 font-bold text-xs uppercase">Tidak ada pengiriman barang berjalan</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {stats.deliveryQueue.map(o => (
                            <div key={o.id} className="p-4 bg-zinc-55/40 dark:bg-zinc-900/30 rounded-2xl border border-zinc-100 dark:border-zinc-900 space-y-3">
                              <div>
                                <h4 className="text-xs font-black uppercase text-zinc-900 dark:text-white leading-tight">{o.nama}</h4>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">{o.barang}</p>
                                <p className="text-[10px] text-zinc-450 mt-1 italic font-medium">{o.alamat || 'Alamat kosong'}</p>
                              </div>
                              <button
                                onClick={() => handleUpdateStage(o.id, 'acc', { deliveryStatus: 'terkirim', stage: 'acc' })}
                                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Konfirmasi Diterima Konsumen
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {pipelineSection === 'overdue' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-3">
                        <h3 className="text-xs font-black uppercase tracking-widest">Overdue Tasks (Butuh Penanganan)</h3>
                        <span className="text-xs text-zinc-400 font-bold uppercase font-mono">{stats.overdueCount} issues</span>
                      </div>

                      {stats.overdueTasks.length === 0 ? (
                        <div className="text-center py-12 text-zinc-400 font-bold text-xs uppercase text-green-500 font-bold flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-8 h-8" />
                          Semua tugas berjalan aman tanpa overdue!
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {stats.overdueTasks.map(t => (
                            <div key={t.id} className="p-4 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[8px] font-black uppercase bg-red-500 text-white px-2 py-0.5 rounded-full">
                                    Overdue
                                  </span>
                                  <h4 className="text-xs font-black uppercase tracking-tight text-red-600 dark:text-red-400">{t.title}</h4>
                                </div>
                                <p className="text-[11px] text-zinc-500 font-medium">{t.description}</p>
                                <p className="text-[9px] text-zinc-400 font-bold uppercase mt-1">Due At: {t.dueAt ? dayjs(t.dueAt.toDate ? t.dueAt.toDate() : t.dueAt).format('DD MMMM YYYY') : '-'}</p>
                              </div>
                              <button
                                onClick={() => handleCompleteTask(t.id)}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl shrink-0 transition-all flex items-center justify-center gap-1"
                              >
                                Complete Now
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>

        {/* COMPACT REAL-TIME AUDIT LOG FEED */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-zinc-900 dark:text-white" />
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white italic">Operational Audit Log</h2>
            </div>
            <button 
              onClick={() => navigate('/timeline')}
              className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-primary flex items-center gap-1 transition-colors"
            >
              Full Timeline <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-900 rounded-3xl p-5 space-y-3">
             {activities.length === 0 ? (
               <div className="p-8 text-center bg-zinc-50/50 dark:bg-zinc-900 border border-dashed border-zinc-250 dark:border-zinc-800 rounded-2xl">
                  <Activity className="w-8 h-8 text-zinc-200 dark:text-zinc-800 mx-auto mb-2 animate-pulse" />
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">No activities recorded in branch</p>
               </div>
             ) : (
               <div className="divide-y divide-zinc-100 dark:divide-zinc-905">
                 {activities.slice(0, 6).map((act) => (
                   <div 
                     key={act.id} 
                     className="py-3 flex gap-3.5 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors duration-150 px-1 rounded-xl"
                   >
                     <div className={cn(
                       "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                       act.category === 'user' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                       act.category === 'order' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                       act.category === 'task' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                       "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-800"
                     )}>
                        {act.category === 'user' && <Users className="w-4.5 h-4.5" />}
                        {act.category === 'order' && (act.type === 'order_shipped' ? <Truck className="w-4.5 h-4.5" /> : <ShoppingBag className="w-4.5 h-4.5" />)}
                        {act.category === 'task' && (act.type === 'task_overdue' ? <AlertTriangle className="w-4.5 h-4.5" /> : <CheckSquare className="w-4.5 h-4.5" />)}
                        {!['user', 'order', 'task'].includes(act.category) && <Activity className="w-4.5 h-4.5" />}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                           <p className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight truncate">{act.title}</p>
                           <span className="text-[10px] font-mono text-zinc-400 whitespace-nowrap shrink-0">{formatRelativeTime(act.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed mt-0.5">
                           {act.description}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                           <span className="text-[9px] font-black text-primary uppercase tracking-widest">{act.actorName}</span>
                           <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                           <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{act.actorRole}</span>
                        </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>

      </div>

      {/* GORGEOUS QUICK-ADD CLIENT MODAL DRAW */}
      {isNewClientOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest">DAFTAR KONSUMEN & PIPELINE BARU</h2>
              <button 
                onClick={() => setIsNewClientOpen(false)}
                className="p-1 px-1.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 rounded-lg hover:text-black transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Nama Konsumen (Wajib)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Budi Prasetyo"
                  value={newOrderForm.nama}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, nama: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Nomor HP / WhatsApp (Wajib)</label>
                <input 
                  type="tel" 
                  required
                  placeholder="Contoh: 0812345678"
                  value={newOrderForm.nomor}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, nomor: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Jenis Usaha</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Warung Sembako"
                    value={newOrderForm.usaha}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, usaha: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Barang Order (Wajib)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Kulkas Sharp"
                    value={newOrderForm.barang}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, barang: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Alamat Pengiriman</label>
                <textarea 
                  placeholder="Alamat lengkap lokasi pengiriman..."
                  value={newOrderForm.alamat}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, alamat: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-medium text-zinc-900 dark:text-white h-16 min-h-[4rem]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Angsuran (IDR)</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: 15000"
                    value={newOrderForm.angsuran}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setNewOrderForm({ ...newOrderForm, angsuran: val });
                    }}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Tenor ({newOrderForm.tenorType})</label>
                  <input 
                    type="number" 
                    placeholder="Contoh: 30"
                    value={newOrderForm.tenor}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, tenor: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewClientOpen(false)}
                  className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-foreground font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="flex-1 py-3 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary/15 disabled:opacity-50"
                >
                  {isSubmittingOrder ? 'Mendaftarkan...' : 'Daftarkan & Kirim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
