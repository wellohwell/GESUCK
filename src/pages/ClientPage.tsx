import React, { useState, useEffect } from 'react';
import { AuthGuard } from '../components/AuthGuard';
import { 
  useCurrentUser, 
  useUserProfile, 
  subscribeOrders,
  subscribeClientOrders
} from '../lib/services';
import { clientService } from '../features/client/services/client.service';
import { 
  Users, 
  ShoppingBag, 
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Search,
  History,
  Phone,
  Briefcase,
  MapPin,
  ChevronRight,
  Package,
  Truck,
  AlertTriangle,
  Wallet,
  ArrowLeft,
  X,
  MessageCircle,
  Navigation,
  Repeat,
  Repeat2,
  Edit,
  Info,
  Calendar
} from 'lucide-react';
import { cn, formatRelativeTime, calculateOmset } from '../lib/utils';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'motion/react';
import { openModal, closeModal } from '../hooks/use-modal';
import { NewClientDialog } from '../features/client/dialogs/NewClientDialog';
import { RepeatOrderDialog } from '../features/client/dialogs/RepeatOrderDialog';
import { ClientForm } from '../features/client/components/ClientForm';
import { useClientData } from '../features/client/hooks/useClientData';
import { SkeletonFeed } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

type Stage = 'survey' | 'acc' | 'archive';

export default function ClientPage() {
  const user = useCurrentUser();
  const { profile } = useUserProfile();
  const [activeTab, setActiveTab] = useState<Stage>('survey');
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Drawer & Modal States
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showAccModal, setShowAccModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingNote, setPendingNote] = useState('');
  const [clientOrdersHistory, setClientOrdersHistory] = useState<any[]>([]);
  const [activeOmsetTooltipId, setActiveOmsetTooltipId] = useState<string | null>(null);
  
  // New Dialog States
  const [showNewClient, setShowNewClient] = useState(false);
  const [showRepeatOrder, setShowRepeatOrder] = useState(false);
  const [showRepeatTooltip, setShowRepeatTooltip] = useState(false);
  const [showEditOrder, setShowEditOrder] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editOrderForm, setEditOrderForm] = useState({
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
    if (!profile?.role || !user?.uid) return;
    setLoading(true);
    const filter = activeTab === 'archive' ? 'archive' : activeTab;
    const unsub = subscribeOrders(profile.role, user.uid, (data) => {
      setOrders(data);
      setLoading(false);
    }, filter, profile.branchId);
    return () => unsub();
  }, [profile?.role, user?.uid, activeTab, profile?.branchId]);

  const { allClients } = useClientData();

  // Subscribe to history if order selected
  useEffect(() => {
    if (!selectedOrder?.clientId || !profile?.role || !user?.uid) return;
    const unsub = subscribeClientOrders(selectedOrder.clientId, setClientOrdersHistory, profile.role, user.uid);
    return () => unsub();
  }, [selectedOrder?.clientId, profile?.role, user?.uid]);

  // Intercept physical Back Button (popstate) and Escape Keyboard key
  useEffect(() => {
    if (!selectedOrder) return;

    // Push dummy history entry so back button closes overlay instead of leaving the application page
    window.history.pushState({ overlayOpen: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      setSelectedOrder(null);
      setShowAccModal(false);
      setShowPendingModal(false);
      setClientOrdersHistory([]);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedOrder(null);
        setShowAccModal(false);
        setShowPendingModal(false);
        setClientOrdersHistory([]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      // Clean up the dummy history state if the user closed the overlay via physical click
      if (window.history.state?.overlayOpen) {
        window.history.back();
      }
    };
  }, [selectedOrder]);

  useEffect(() => {
    setShowRepeatTooltip(false);
  }, [selectedOrder]);

  const isHoliday = (date: Date): boolean => {
    const day = date.getDay();
    if (day === 0) return true; // Hari Minggu tidak terhitung
    
    const month = date.getMonth() + 1;
    const dayOfMonth = date.getDate();
    const mmdd = `${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
    
    // Tanggal Merah Nasional yang Tetap (Fixed Indonesia Holidays)
    const fixedHolidays = [
      '01-01', // Tahun Baru Masehi
      '05-01', // Hari Buruh
      '06-01', // Hari Lahir Pancasila
      '08-17', // Hari Kemerdekaan RI
      '12-25', // Hari Natal
    ];
    if (fixedHolidays.includes(mmdd)) return true;
    
    // Hari Libur Nasional Berubah (Estimasi Tahun 2026 yang umum)
    const year = date.getFullYear();
    const yyyymmdd = `${year}-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
    const variableHolidays = [
      '2026-01-29', // Tahun Baru Imlek
      '2026-02-15', // Isra Mikraj
      '2026-03-19', // Hari Suci Nyepi
      '2026-03-20', // Idul Fitri Hari 1
      '2026-03-21', // Idul Fitri Hari 2
      '2026-04-03', // Wafat Isa Almasih
      '2026-05-14', // Kenaikan Isa Almasih
      '2026-05-27', // Hari Raya Idul Adha
      '2026-06-18', // Hari Baru Islam
      '2026-08-27', // Maulid Nabi Muhammad
    ];
    
    if (variableHolidays.includes(yyyymmdd)) return true;
    return false;
  };

  const calculateEndDate = (startDateVal: any, tenorDays: number): Date => {
    let start: Date;
    if (!startDateVal) {
      start = new Date();
    } else if (typeof startDateVal.toDate === 'function') {
      start = startDateVal.toDate();
    } else if (startDateVal instanceof Date) {
      start = new Date(startDateVal.getTime());
    } else if (typeof startDateVal === 'number' || typeof startDateVal === 'string') {
      start = new Date(startDateVal);
    } else if (startDateVal.seconds) {
      start = new Date(startDateVal.seconds * 1000);
    } else if (startDateVal._seconds) {
      start = new Date(startDateVal._seconds * 1000);
    } else {
      start = new Date();
    }
    
    let current = new Date(start.getTime());
    let addedDays = 0;
    
    while (addedDays < tenorDays) {
      // Tambah 1 hari
      current.setDate(current.getDate() + 1);
      
      // Jika bukan hari Minggu & bukan tanggal merah nasional, baru dihitung
      if (!isHoliday(current)) {
        addedDays++;
      }
    }
    
    return current;
  };

  const checkIsOrderActive = (order: any): boolean => {
    if (order.deliveryStatus !== 'terkirim') return false;
    
    // Cari tanggal transaksi "terkirim" (deliveredAt), fallback ke createdAt atau updatedAt
    const deliveryDate = order.deliveredAt || order.createdAt || order.updatedAt;
    if (!deliveryDate) return false;
    
    const tenorDays = Number(order.tenor) || 30;
    const endDate = calculateEndDate(deliveryDate, tenorDays);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const compareEndDate = new Date(endDate.getTime());
    compareEndDate.setHours(23, 59, 59, 999);
    
    return today <= compareEndDate;
  };

  const formatSimpleDate = (dateVal: any) => {
    if (!dateVal) return '';
    let d: Date;
    if (typeof dateVal.toDate === 'function') {
      d = dateVal.toDate();
    } else if (dateVal instanceof Date) {
      d = dateVal;
    } else if (typeof dateVal === 'string' || typeof dateVal === 'number') {
      d = new Date(dateVal);
    } else if (dateVal.seconds) {
      d = new Date(dateVal.seconds * 1000);
    } else if (dateVal._seconds) {
      d = new Date(dateVal._seconds * 1000);
    } else {
      return '';
    }
    
    try {
      const formatter = new Intl.DateTimeFormat('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      return formatter.format(d);
    } catch (e) {
      return d.toLocaleDateString('id-ID');
    }
  };

  const formatFullDateTime = (dateVal: any) => {
    if (!dateVal) return '';
    let d: Date;
    if (typeof dateVal.toDate === 'function') {
      d = dateVal.toDate();
    } else if (dateVal instanceof Date) {
      d = dateVal;
    } else if (typeof dateVal === 'string' || typeof dateVal === 'number') {
      d = new Date(dateVal);
    } else if (dateVal.seconds) {
      d = new Date(dateVal.seconds * 1000);
    } else if (dateVal._seconds) {
      d = new Date(dateVal._seconds * 1000);
    } else {
      return '';
    }

    try {
      const formatter = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      // Sesuai format (hari tanggal, bulan, tahun, jam)
      return formatter.format(d).replace(' pukul', ',') + ' WIB';
    } catch (err) {
      return d.toLocaleString('id-ID');
    }
  };

  const filteredOrders = orders.filter(o => 
    o.nama?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    o.nomor?.includes(searchQuery) ||
    o.usaha?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAcc = async (deliveryStatus: string) => {
    if (!selectedOrder) return;
    try {
      const updates: any = {
        stage: 'acc',
        deliveryStatus
      };
      if (deliveryStatus === 'terkirim') {
        updates.deliveredAt = new Date();
      }
      await clientService.updateOrderStage(selectedOrder.id, updates);
      toast.success(`Konsumen ${selectedOrder.nama} diapprove`);
      setShowAccModal(false);
      setSelectedOrder(null);
    } catch (err) {
      toast.error("Gagal melakukan ACC");
    }
  };

  const handleBatal = async () => {
    if (!selectedOrder) return;
    try {
      const { deleteDoc, doc } = await import("firebase/firestore");
      const { db } = await import("../firebase/config");
      await deleteDoc(doc(db, "orders", selectedOrder.id));
      toast.success("Data berhasil dihapus");
      setShowDeleteConfirm(false);
      setSelectedOrder(null);
    } catch (err) {
      toast.error("Gagal menghapus data");
    }
  };

  const handlePending = async () => {
    if (!selectedOrder || !pendingNote) {
      toast.error("Catatan pending wajib diisi");
      return;
    }
    try {
      await clientService.updateOrderStage(selectedOrder.id, {
        stage: 'pending',
        pendingNote
      });
      toast.success("Order ditangguhkan (Pending)");
      setShowPendingModal(false);
      setPendingNote('');
      setSelectedOrder(null);
    } catch (err) {
      toast.error("Gagal menangguhkan order");
    }
  };

  const handleEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!editOrderForm.nama || !editOrderForm.nomor || !editOrderForm.barang) {
      toast.error("Nama, Nomor, dan Barang wajib diisi");
      return;
    }
    setIsSubmittingEdit(true);
    try {
      const newAngsuran = Number(String(editOrderForm.angsuran).replace(/\D/g, ''));
      const newTenor = Number(editOrderForm.tenor);
      
      await clientService.updateOrderStage(selectedOrder.id, {
        stage: selectedOrder.stage,
        deliveryStatus: selectedOrder.deliveryStatus,
        nama: editOrderForm.nama,
        nomor: editOrderForm.nomor,
        usaha: editOrderForm.usaha,
        alamat: editOrderForm.alamat,
        barang: editOrderForm.barang,
        angsuran: newAngsuran,
        tenor: newTenor,
        tenorType: editOrderForm.tenorType
      });

      if (selectedOrder.clientId) {
        try {
          const { updateDoc, doc } = await import("firebase/firestore");
          const { db } = await import("../firebase/config");
          await updateDoc(doc(db, "clients", selectedOrder.clientId), {
            nama: editOrderForm.nama,
            nomor: editOrderForm.nomor,
            usaha: editOrderForm.usaha,
            alamat: editOrderForm.alamat,
            updatedAt: new Date()
          });
        } catch (clientErr) {
          console.error("Non-fatal: failed to update clients doc:", clientErr);
        }
      }
      
      setSelectedOrder(prev => {
        if (!prev) return null;
        return {
          ...prev,
          nama: editOrderForm.nama,
          nomor: editOrderForm.nomor,
          usaha: editOrderForm.usaha,
          alamat: editOrderForm.alamat,
          barang: editOrderForm.barang,
          angsuran: newAngsuran,
          tenor: newTenor,
          tenorType: editOrderForm.tenorType
        };
      });

      toast.success("Dokumen konsumen berhasil diperbarui");
      setShowEditOrder(false);
    } catch (err) {
      toast.error("Gagal memperbarui dokumen");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const formatIDR = (val: string | number) => {
    const num = typeof val === 'string' ? Number(val.replace(/\D/g, '')) : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num || 0);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-28 pt-6">
        <div className="max-w-xl mx-auto px-4">
          {/* SEARCH BAR */}
          <div className="relative mb-8">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Cari nama, usaha, atau nomor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-brand-primary transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors"
                  aria-label="Hapus Pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* TAB SYSTEM */}
            <div className="flex justify-center gap-6 mb-2">
               {[
                 { id: 'survey', label: 'Pipeline', icon: History },
                 { id: 'acc', label: 'Clients', icon: Users },
                 { id: 'archive', label: 'Arsip', icon: Briefcase },
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as Stage)}
                   className={cn(
                     "flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all outline-none",
                     activeTab === tab.id 
                       ? "bg-primary text-black shadow-lg" 
                       : "text-zinc-500 hover:bg-primary/20 hover:text-zinc-900 dark:hover:text-zinc-100"
                   )}
                 >
                   <tab.icon className="w-3.5 h-3.5" />
                   {tab.label}
                 </button>
               ))}
            </div>

            {/* FEED / LIST AREA */}
            <div className="py-6">
          {loading ? (
            <SkeletonFeed count={3} />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Konsumen Tidak Ditemukan"
              description="Tidak ada data konsumen yang cocok dengan pencarian atau filter tab aktif Anda."
            />
          ) : (
                      <div className="space-y-1 pb-32">
              {filteredOrders.map(order => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="bg-transparent border-0 border-b border-zinc-200/40 dark:border-zinc-800/50 p-0 py-1.5 space-y-1 shadow-none hover:shadow-none transition-all group cursor-pointer active:scale-98"
                >
                  {/* Top section: Nama & Status Pengiriman */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Nama Konsumen Semibold Uppercase */}
                      <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 uppercase tracking-wider truncate group-hover:text-brand-primary transition-colors">
                        {order.nama}
                      </h3>
                      {/* Unit Usaha */}
                      <p className="text-[9px] font-normal text-brand-primary uppercase tracking-[0.15em] mt-0.5">
                        {order.usaha || 'Personal'}
                      </p>
                    </div>

                    {/* Status Pengiriman */}
                    <div className="shrink-0">
                      {(() => {
                        if (order.deliveryStatus !== 'terkirim') {
                          return (
                            <span className="text-[9px] font-normal px-2.5 py-0.5 rounded-full uppercase tracking-wider border bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/10">
                              Pending
                            </span>
                          );
                        }
                        const active = checkIsOrderActive(order);
                        if (active) {
                          return (
                            <span className="text-[9px] font-normal px-2.5 py-0.5 rounded-full uppercase tracking-wider border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/10">
                              Aktif
                            </span>
                          );
                        } else {
                          return (
                            <span className="text-[9px] font-normal px-2.5 py-0.5 rounded-full uppercase tracking-wider border bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:bg-zinc-800/15 dark:text-zinc-450 dark:border-zinc-850/10">
                              Selesai
                            </span>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* Alamat */}
                  <p className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.15em] mt-0.5 line-clamp-1">
                    {order.alamat || allClients.find(c => c.id === order.clientId)?.alamat || 'Alamat tidak diset'}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* FLOATING ACTION BUTTON */}
<button 
  onClick={() => {
            openModal({
              id: 'selection-sheet',
              title: 'Pilih Jenis Konsumen',
              content: (
                <div className="grid grid-cols-1 gap-1">
                  <button 
                    onClick={() => { closeModal('selection-sheet'); setShowNewClient(true); }}
                    className="flex items-center gap-4 p-5 rounded-[32px] text-left"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase italic">Konsumen Baru</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Input data client & order pertama</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => { closeModal('selection-sheet'); setShowRepeatOrder(true); }}
                    className="flex items-center gap-4 p-5 rounded-[32px] text-left"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                      <History className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase italic">Repeat Order (RO)</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Cari client existing untuk order baru</p>
                    </div>
                  </button>
                </div>
                      )
            });
          }}
  className="fixed bottom-[calc(90px+env(safe-area-inset-bottom))] right-5 z-[50] w-12 h-12 flex items-center justify-center 
             bg-primary text-primary-foreground 
             shadow-[0_0_20px_hsl(var(--primary)/0.35)] 
             hover:scale-105 active:scale-[0.96]
             transition-all duration-200 rounded-full"
>
  <Plus className="w-6 h-6 stroke-[3]" /></button>

        {/* ORDER LIST / DETAIL FULL-PAGE OVERLAY */}
        <AnimatePresence>
          {selectedOrder && (
            <>
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 z-[40] flex flex-col h-full w-full overflow-hidden"
              >
                {/* STICKY HEADER */}
                <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-800 shrink-0">
                  <button 
                    onClick={() => {
                      setSelectedOrder(null);
                      setShowAccModal(false);
                      setShowPendingModal(false);
                      setClientOrdersHistory([]);
                    }}
                    className="p-1.5 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-all"
                    aria-label="Kembali"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <span className="text-[11px] font-black uppercase tracking-widest text-brand-primary">Detail Konsumen</span>
                  <div className="w-8" /> {/* Balance placeholder to keep title centered */}
                </div>

                {/* SCROLLABLE MAIN CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-3.5 md:p-6 space-y-4 pb-24">
                  <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* LEFT COLUMN: CONSUMER INFO & ORDERS */}
                    <div className="space-y-4">
                      {/* CLIENT CARD & ACTIONS */}
                      <div className="p-1 px-1.5 bg-transparent border-0 shadow-none border-b border-zinc-100 dark:border-zinc-800/40 pb-3 mb-2">
                        <div className="text-center">
                          <h2 className="text-base font-semibold text-zinc-950 dark:text-white uppercase tracking-wider leading-tight">
                            {selectedOrder.nama}
                          </h2>
                          <p className="text-[8.5px] font-normal text-brand-primary uppercase tracking-[0.15em] mt-0.5">
                            {selectedOrder.usaha || 'Personal'}
                          </p>

                          <p className="text-[8.5px] font-normal text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.15em] mt-1 leading-relaxed">
                            {selectedOrder.alamat || allClients.find(c => c.id === selectedOrder.clientId)?.alamat || 'Alamat belum diset'}
                          </p>

                          {/* ACTION BUTTONS GROUP BELOW ADDRESS, CENTER-ALIGNED */}
                          <div className="flex items-center justify-center gap-2 mt-2 select-none">
                            {/* Edit Action Widget */}
                            <button 
                              type="button"
                              onClick={() => {
                                setEditOrderForm({
                                  nama: selectedOrder.nama || '',
                                  nomor: selectedOrder.nomor || '',
                                  usaha: selectedOrder.usaha || '',
                                  alamat: selectedOrder.alamat || allClients.find(c => c.id === selectedOrder.clientId)?.alamat || '',
                                  barang: selectedOrder.barang || '',
                                  angsuran: String(selectedOrder.angsuran || ''),
                                  tenor: String(selectedOrder.tenor || '30'),
                                  tenorType: selectedOrder.tenorType || 'hari'
                                });
                                setShowEditOrder(true);
                              }}
                              title="Edit Dokumen Konsumen"
                              className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/20 dark:border-zinc-800 text-zinc-650 dark:text-zinc-250 hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-none cursor-pointer"
                            >
                              <Edit className="w-3 h-3 stroke-[1.8]" />
                            </button>

                            {/* Repeat Count Widget */}
                            {(() => {
                              const count = allClients.find(c => c.id === selectedOrder.clientId)?.orderCount ?? 1;
                              return (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setShowRepeatTooltip(!showRepeatTooltip)}
                                    title={`Repeat Count: ${count}x`}
                                    className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/20 dark:border-zinc-800 text-zinc-650 dark:text-zinc-250 hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-none relative cursor-pointer"
                                  >
                                    <Repeat2 className="w-3 h-3 stroke-[1.8]" />
                                    {count > 0 && (
                                      <span 
                                        className={cn(
                                          "absolute -top-0.5 -right-0.5 flex items-center justify-center bg-red-500 text-white font-extrabold shadow-sm ring-1 ring-white dark:ring-zinc-950 transition-all leading-none rounded-full",
                                          count >= 10 
                                            ? "px-0.5 h-2.5 min-w-[10px] text-[6px]" 
                                            : "w-2.5 h-2.5 text-[6px]"
                                        )}
                                      >
                                        {count > 99 ? "99+" : count}
                                      </span>
                                    )}
                                  </button>

                                  {/* Micro-interaction interactive tooltip */}
                                  <AnimatePresence>
                                    {showRepeatTooltip && (
                                      <>
                                        {/* Invisible backdrop helper to close when clicking outside */}
                                        <div 
                                          className="fixed inset-0 z-40 bg-transparent cursor-default" 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowRepeatTooltip(false);
                                          }} 
                                        />
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.9, y: 4 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.9, y: 4 }}
                                          transition={{ duration: 0.12, ease: "easeOut" }}
                                          className="absolute left-1/2 -translate-x-1/2 top-8 z-50 whitespace-nowrap bg-zinc-900 text-zinc-100 dark:bg-zinc-850 dark:text-zinc-150 px-3 py-1.5 rounded-xl text-[10.5px] font-bold shadow-xl border border-zinc-200/10 dark:border-zinc-700/50 flex items-center gap-1.5 pointer-events-none select-none"
                                        >
                                          <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                                          <span>Customer Repeat {count} Kali</span>
                                        </motion.div>
                                      </>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })()}

                            {/* Maps Action Widget */}
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedOrder.alamat || allClients.find(c => c.id === selectedOrder.clientId)?.alamat || '')}`}
                              target="_blank"
                              rel="no-referrer"
                              title="Rute Google Maps"
                              className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/20 dark:border-zinc-800 text-zinc-650 dark:text-zinc-250 hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-none"
                            >
                              <MapPin className="w-3 h-3 stroke-[1.8]" />
                            </a>

                            {/* WhatsApp Action Widget */}
                            <a 
                              href={`https://wa.me/${(selectedOrder.nomor || '').replace(/\D/g, '').replace(/^0/, '62')}`}
                              target="_blank"
                              rel="no-referrer"
                              title="WhatsApp Chat"
                              className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/20 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-none"
                            >
                              <svg 
                                viewBox="0 0 24 24" 
                                className="w-3 h-3 text-[#25D366] dark:text-[#25D366]" 
                                fill="none" 
                                stroke="#25D366" 
                                strokeWidth="1.8" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                style={{ stroke: '#25D366' }}
                              >
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                <path 
                                  d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" 
                                  transform="translate(6, 6) scale(0.5)"
                                  stroke="#25D366"
                                  strokeWidth="1.8"
                                  fill="none"
                                />
                              </svg>
                            </a>
                          </div>
                        </div>
                        <div className="hidden">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white uppercase tracking-wider leading-tight">
                                {selectedOrder.nama}
                              </h2>
                              <p className="text-[9px] font-normal text-brand-primary uppercase tracking-[0.15em] mt-0.5">
                                {selectedOrder.usaha || 'Personal'}
                              </p>
                            </div>

                             {/* ACTION BUTTONS GROUP NEXT TO NAME */}
                             <div className="flex items-center gap-1.5 px-0.5 shrink-0 select-none">
                               {/* Repeat Count Widget */}
                               {(() => {
                                 const count = allClients.find(c => c.id === selectedOrder.clientId)?.orderCount ?? 1;
                                 return (
                                   <div className="relative">
                                     <button
                                       type="button"
                                       onClick={() => setShowRepeatTooltip(!showRepeatTooltip)}
                                       title={`Repeat Count: ${count}x`}
                                       className="w-8 h-8 rounded-full bg-transparent text-zinc-650 dark:text-zinc-250 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center transition-all hover:scale-115 active:scale-95 shadow-none relative cursor-pointer"
                                     >
                                       <Repeat2 className="w-[16px] h-[16px] stroke-[1.8]" />
                                       {count > 0 && (
                                         <span 
                                           className={cn(
                                             "absolute -top-0.5 -right-0.5 flex items-center justify-center bg-red-500 text-white font-extrabold shadow-sm ring-1 ring-white dark:ring-zinc-950 transition-all leading-none rounded-full",
                                             count >= 10 
                                               ? "px-0.5 h-3.5 min-w-[14px] text-[7.5px]" 
                                               : "w-3.5 h-3.5 text-[8px]"
                                           )}
                                         >
                                           {count > 99 ? "99+" : count}
                                         </span>
                                       )}
                                     </button>

                                     {/* Micro-interaction interactive tooltip */}
                                     <AnimatePresence>
                                       {showRepeatTooltip && (
                                         <>
                                           {/* Invisible backdrop helper to close when clicking outside */}
                                           <div 
                                             className="fixed inset-0 z-40 bg-transparent cursor-default" 
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               setShowRepeatTooltip(false);
                                             }} 
                                           />
                                           <motion.div
                                             initial={{ opacity: 0, scale: 0.9, y: 4 }}
                                             animate={{ opacity: 1, scale: 1, y: 0 }}
                                             exit={{ opacity: 0, scale: 0.9, y: 4 }}
                                             transition={{ duration: 0.12, ease: "easeOut" }}
                                             className="absolute right-0 top-12 z-50 whitespace-nowrap bg-zinc-900 text-zinc-100 dark:bg-zinc-800 dark:text-zinc-150 px-3 py-1.5 rounded-xl text-[10.5px] font-bold shadow-xl border border-zinc-200/10 dark:border-zinc-700/50 flex items-center gap-1.5 pointer-events-none select-none"
                                           >
                                             <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                                             <span>Customer Repeat {count} Kali</span>
                                           </motion.div>
                                         </>
                                       )}
                                     </AnimatePresence>
                                   </div>
                                 );
                                })()}

                               {/* Maps Action Widget */}
                               <a 
                                 href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedOrder.alamat || allClients.find(c => c.id === selectedOrder.clientId)?.alamat || '')}`}
                                 target="_blank"
                                 rel="no-referrer"
                                 title="Rute Google Maps"
                                 className="w-8 h-8 rounded-full bg-transparent text-blue-500 dark:text-blue-400 hover:text-blue-650 dark:hover:text-blue-300 flex items-center justify-center transition-all hover:scale-115 active:scale-95 shadow-none"
                               >
                                 <Navigation className="w-[16px] h-[16px] stroke-[1.8]" />
                               </a>

                               {/* WhatsApp Action Widget */}
                               <a 
                                 href={`https://wa.me/${(selectedOrder.nomor || '').replace(/\D/g, '').replace(/^0/, '62')}`}
                                 target="_blank"
                                 rel="no-referrer"
                                 title="WhatsApp Chat"
                                 className="w-8 h-8 rounded-full bg-transparent text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 flex items-center justify-center transition-all hover:scale-115 active:scale-95 shadow-none"
                               >
                                 <MessageCircle className="w-[16px] h-[16px] stroke-[1.8]" />
                               </a>
                            </div>
                          </div>

                          <p className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.15em] mt-1.5 leading-relaxed">
                            {selectedOrder.alamat || allClients.find(c => c.id === selectedOrder.clientId)?.alamat || 'Alamat belum diset'}
                          </p>
                        </div>
                      </div>

                      {/* SECTION 1: ORDER SEDANG BERJALAN */}
                      <div className="bg-transparent border-0 p-1 px-1.5 shadow-none relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-3">
                           <Package className="w-4 h-4 text-brand-primary" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-zinc-450 dark:text-zinc-400">Order Sedang Berjalan</span>
                        </div>
                        
                        <div className="flex flex-col mb-1.5 relative group">
                          {/* Single-line Info List */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase text-zinc-500 dark:text-zinc-400 w-full">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedOrder.barang}</span>
                            <span>•</span>
                            <span className="relative inline-flex items-center">
                              {formatIDR((Number(selectedOrder.angsuran) || 0) * (Number(selectedOrder.tenor) || 0))}
                              <button 
                                onClick={() => setActiveOmsetTooltipId(activeOmsetTooltipId === selectedOrder.id ? null : selectedOrder.id)}
                                className="ml-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors relative z-20"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                              {activeOmsetTooltipId === selectedOrder.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10 cursor-default" 
                                    onClick={() => setActiveOmsetTooltipId(null)}
                                  />
                                  <div className="absolute left-0 bottom-full mb-1 w-max px-2.5 py-1.5 text-[10px] font-medium tracking-wide bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded shadow-lg z-20 transition-opacity normal-case text-left flex flex-col gap-0.5">
                                    <span>Angsuran : {formatIDR(selectedOrder.angsuran)}</span>
                                    <span>Tenor : {selectedOrder.tenor} {selectedOrder.tenorType}</span>
                                  </div>
                                </>
                              )}
                            </span>

                            {selectedOrder.deliveryStatus === 'terkirim' ? (
                              <>
                                <span>•</span>
                                <span className="text-emerald-600 dark:text-emerald-500 font-medium">
                                   {(() => {
                                       const dateVal = selectedOrder.deliveredAt || selectedOrder.createdAt || selectedOrder.updatedAt;
                                       let d = new Date();
                                       if (dateVal) {
                                         if (typeof dateVal.toDate === 'function') d = dateVal.toDate();
                                         else if (dateVal.seconds) d = new Date(dateVal.seconds * 1000);
                                         else d = new Date(dateVal);
                                       }
                                       return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
                                     })()}
                                </span>
                                <span>•</span>
                                {(() => {
                                   const startD = selectedOrder.deliveredAt || selectedOrder.createdAt || selectedOrder.updatedAt;
                                   const tenorVal = Number(selectedOrder.tenor) || 30;
                                   const endD = calculateEndDate(startD, tenorVal);
                                   const today = new Date();
                                   const diffTime = endD.getTime() - today.getTime();
                                   const sisaHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                   
                                   if (sisaHari > 0) {
                                     return (
                                       <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                         SISA {sisaHari} HARI
                                       </span>
                                     );
                                   } else {
                                      return (
                                        <span className="text-emerald-600 dark:text-emerald-500 font-semibold">
                                         LUNAS
                                        </span>
                                      );
                                   }
                                })()}
                              </>
                            ) : (
                              <>
                                <span>•</span>
                                <span className="font-medium">{selectedOrder.stage}</span>
                              </>
                            )}
                          </div>
                          {selectedOrder.pendingNote && (
                            <div className="mt-1 flex items-start gap-1.5 text-[10px] uppercase text-amber-600 dark:text-amber-400 w-full">
                               <span className="font-semibold whitespace-nowrap">NOTE:</span>
                               <span>{selectedOrder.pendingNote}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SECTION 2: RIWAYAT ORDER */}
                      <div className="bg-transparent border-0 p-1 px-1.5 shadow-none mt-2">
                        <div className="flex items-center gap-2 mb-3 bg-transparent">
                          <History className="w-4 h-4 text-zinc-400" />
                          <span className="text-[10px] font-black text-zinc-450 dark:text-zinc-400 uppercase tracking-widest">Riwayat Order</span>
                        </div>
                        
                        <div className="space-y-2.5">
                          {clientOrdersHistory.filter(o => o.id !== selectedOrder.id).length === 0 ? (
                             <p className="text-[10px] font-bold text-zinc-400 uppercase italic text-center py-4">Tidak ada riwayat order sebelumnya</p>
                          ) : (
                            clientOrdersHistory.filter(o => o.id !== selectedOrder.id).map(historyOrder => (
                              <div key={historyOrder.id} className="flex flex-col mb-1.5 relative group opacity-80 hover:opacity-100 transition-opacity">
                                {/* Single-line Info List for History */}
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase text-zinc-500 dark:text-zinc-400 w-full">
                                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{historyOrder.barang}</span>
                                  <span>•</span>
                                  <span className="relative inline-flex items-center">
                                    {formatIDR((Number(historyOrder.angsuran) || 0) * (Number(historyOrder.tenor) || 0))}
                                    <button 
                                      onClick={() => setActiveOmsetTooltipId(activeOmsetTooltipId === historyOrder.id ? null : historyOrder.id)}
                                      className="ml-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors relative z-20"
                                    >
                                      <Info className="w-3.5 h-3.5" />
                                    </button>
                                    {activeOmsetTooltipId === historyOrder.id && (
                                      <>
                                        <div 
                                          className="fixed inset-0 z-10 cursor-default" 
                                          onClick={() => setActiveOmsetTooltipId(null)}
                                        />
                                        <div className="absolute left-0 bottom-full mb-1 w-max px-2.5 py-1.5 text-[10px] font-medium tracking-wide bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded shadow-lg z-20 transition-opacity normal-case text-left flex flex-col gap-0.5">
                                          <span>Angsuran : {formatIDR(historyOrder.angsuran)}</span>
                                          <span>Tenor : {historyOrder.tenor} {historyOrder.tenorType}</span>
                                        </div>
                                      </>
                                    )}
                                  </span>

                                  {historyOrder.deliveryStatus === 'terkirim' ? (
                                    <>
                                      <span>•</span>
                                      <span className="text-emerald-600 dark:text-emerald-500 font-medium">
                                         {(() => {
                                             const dateVal = historyOrder.deliveredAt || historyOrder.createdAt || historyOrder.updatedAt;
                                             let d = new Date();
                                             if (dateVal) {
                                               if (typeof dateVal.toDate === 'function') d = dateVal.toDate();
                                               else if (dateVal.seconds) d = new Date(dateVal.seconds * 1000);
                                               else d = new Date(dateVal);
                                             }
                                             return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
                                           })()}
                                      </span>
                                      <span>•</span>
                                      {(() => {
                                         const startD = historyOrder.deliveredAt || historyOrder.createdAt || historyOrder.updatedAt;
                                         const tenorVal = Number(historyOrder.tenor) || 30;
                                         const endD = calculateEndDate(startD, tenorVal);
                                         const today = new Date();
                                         const diffTime = endD.getTime() - today.getTime();
                                         const sisaHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                         
                                         if (sisaHari > 0) {
                                           return (
                                             <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                               SISA {sisaHari} HARI
                                             </span>
                                            );
                                         } else {
                                            return (
                                              <span className="text-emerald-600 dark:text-emerald-500 font-semibold">
                                               LUNAS
                                              </span>
                                            );
                                         }
                                      })()}
                                    </>
                                  ) : (
                                    <>
                                      <span>•</span>
                                      <span className="font-medium">{historyOrder.stage}</span>
                                    </>
                                  )}
                                </div>
                                {historyOrder.pendingNote && (
                                  <div className="mt-1 flex items-start gap-1.5 text-[10px] uppercase text-amber-600 dark:text-amber-400 w-full">
                                     <span className="font-semibold whitespace-nowrap">NOTE:</span>
                                     <span>{historyOrder.pendingNote}</span>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: CONTROLS */}
                    <div className="space-y-4">
                      {/* CONTROLS */}
                      <div className="p-1 px-1.5 bg-transparent border-0 shadow-none">
                        <p className="text-[10px] font-black text-zinc-450 dark:text-zinc-400 uppercase tracking-widest mb-3">Aksi Kontrol Berjalan</p>
                        
                        {selectedOrder.stage === 'survey' && (
                          <div className="grid grid-cols-2 gap-2.5">
                            <button 
                              onClick={() => setShowAccModal(true)}
                              className="col-span-2 py-3 bg-emerald-500 hover:bg-emerald-600 transition-all text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-4.5 h-4.5" />
                              ACC SEKARANG
                            </button>
                            <button 
                              onClick={() => setShowPendingModal(true)}
                              className="py-3 bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 border border-amber-500/20 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 transition-all"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              PENDING
                            </button>
                            <button 
                              onClick={() => setShowDeleteConfirm(true)}
                              className="py-3 bg-red-500/10 text-red-500 hover:bg-red-500/15 border border-red-500/20 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 transition-all"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              BATAL
                            </button>
                          </div>
                        )}

                        {selectedOrder.stage === 'acc' && (
                          <div className="space-y-3">
                            <div className="p-3 rounded-2xl bg-zinc-100/40 dark:bg-zinc-900/40 flex items-center justify-between border-0 shadow-none">
                              <div>
                                <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Status Pengiriman</p>
                                <p className={cn(
                                  "text-xs font-black uppercase italic",
                                  selectedOrder.deliveryStatus !== 'terkirim'
                                    ? "text-amber-500"
                                    : checkIsOrderActive(selectedOrder)
                                      ? "text-emerald-500"
                                      : "text-zinc-500"
                                )}>
                                  {selectedOrder.deliveryStatus !== 'terkirim'
                                    ? 'Pending Gudang'
                                    : checkIsOrderActive(selectedOrder)
                                      ? 'Aktif (Barang Terkirim)'
                                      : 'Selesai (Tenor Berakhir)'}
                                </p>
                              </div>
                              <span className={cn(
                                "w-2 h-2 rounded-full animate-pulse",
                                selectedOrder.deliveryStatus !== 'terkirim'
                                  ? "bg-amber-500"
                                  : checkIsOrderActive(selectedOrder)
                                    ? "bg-emerald-500"
                                    : "bg-zinc-500"
                              )} />
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <button 
                                onClick={async () => {
                                  try {
                                    const now = new Date();
                                    await clientService.updateOrderStage(selectedOrder.id, {
                                      stage: 'acc',
                                      deliveryStatus: 'terkirim',
                                      deliveredAt: now
                                    });
                                    toast.success("Status diubah ke Terkirim (Mulai Aktif)");
                                    setSelectedOrder(prev => ({ ...prev, deliveryStatus: 'terkirim', deliveredAt: now }));
                                  } catch (err) {
                                    toast.error("Gagal memperbarui status");
                                  }
                                }}
                                className={cn(
                                  "py-2.5 rounded-2xl font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-1.5 border transition-all",
                                  selectedOrder.deliveryStatus === 'terkirim'
                                    ? "bg-emerald-500 text-white border-transparent"
                                    : "bg-emerald-500/5 text-emerald-500 border-emerald-500/15 hover:bg-emerald-500/10"
                                )}
                              >
                                <Truck className="w-3.5 h-3.5" />
                                SET TERKIRIM
                              </button>
                              <button 
                                onClick={async () => {
                                  try {
                                    await clientService.updateOrderStage(selectedOrder.id, {
                                      stage: 'acc',
                                      deliveryStatus: 'pending_gudang'
                                    });
                                    toast.success("Status diubah ke Pending Gudang");
                                    setSelectedOrder(prev => ({ ...prev, deliveryStatus: 'pending_gudang' }));
                                  } catch (err) {
                                    toast.error("Gagal memperbarui status");
                                  }
                                }}
                                className={cn(
                                  "py-2.5 rounded-2xl font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-1.5 border transition-all",
                                  selectedOrder.deliveryStatus === 'pending_gudang'
                                    ? "bg-amber-500 text-white border-transparent"
                                    : "bg-amber-550/5 text-amber-500 border-amber-550/15 hover:bg-amber-505/10"
                                )}
                              >
                                <Package className="w-3.5 h-3.5" />
                                PENDING GUDANG
                              </button>
                              <button 
                                onClick={() => setShowDeleteConfirm(true)}
                                className="col-span-2 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-1.5 mt-0.5 hover:bg-red-500/20 transition-all"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                BATALKAN / HAPUS ORDER
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* MODALS OVER DRAWER (SIMPLE MODAL REPLACEMENTS CENTRED COMFORTABLY) */}
                {showDeleteConfirm && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-[32px] p-6 shadow-2xl">
                       <h3 className="text-lg font-black uppercase tracking-tight italic text-red-500 mb-2 flex items-center gap-2">
                         <AlertTriangle className="w-5 h-5 text-red-500" />
                         Hapus Konsumen / Order
                       </h3>
                       <p className="text-xs font-semibold text-zinc-500 mb-6 leading-relaxed">
                         Apakah Anda yakin ingin menghapus data konsumen <span className="text-zinc-900 dark:text-zinc-100 font-bold">{selectedOrder?.nama}</span> beserta order ini? Aksi ini tidak dapat dibatalkan.
                       </p>
                       <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => setShowDeleteConfirm(false)} className="py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-2xl font-black uppercase tracking-widest text-[10px]">BATAL</button>
                          <button onClick={handleBatal} className="py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]">HAPUS DATA</button>
                       </div>
                    </motion.div>
                  </div>
                )}

                {showAccModal && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-[32px] p-6 shadow-2xl">
                       <h3 className="text-lg font-black uppercase tracking-tight italic mb-4">Set Status Pengiriman</h3>
                       <div className="space-y-3">
                          <button 
                            onClick={() => handleAcc('terkirim')}
                            className="w-full p-4 rounded-2xl border-2 border-emerald-500/20 hover:border-emerald-500 bg-emerald-500/5 flex items-center gap-4 transition-all"
                          >
                             <Truck className="w-6 h-6 text-emerald-500" />
                             <div className="text-left">
                                <p className="font-black text-sm uppercase text-emerald-500">TERKIRIM</p>
                                <p className="text-[10px] font-bold text-zinc-400">Barang sudah diterima konsumen (Aktif)</p>
                             </div>
                          </button>
                          <button 
                            onClick={() => handleAcc('pending_gudang')}
                            className="w-full p-4 rounded-2xl border-2 border-amber-500/20 hover:border-amber-500 bg-amber-500/5 flex items-center gap-4 transition-all"
                          >
                             <Package className="w-6 h-6 text-amber-500" />
                             <div className="text-left">
                                <p className="font-black text-sm uppercase text-amber-500">PENDING GUDANG</p>
                                <p className="text-[10px] font-bold text-zinc-400">Menunggu antrian kirim gudang</p>
                             </div>
                          </button>
                       </div>
                       <button onClick={() => setShowAccModal(false)} className="w-full mt-6 py-3 text-zinc-400 font-bold uppercase tracking-widest text-[10px] hover:text-zinc-600 transition-all">BATALKAN AKSI</button>
                    </motion.div>
                  </div>
                )}

                {showPendingModal && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-[32px] p-6 shadow-2xl">
                       <h3 className="text-lg font-black uppercase tracking-tight italic mb-4 flex items-center gap-2">
                         <AlertTriangle className="w-5 h-5 text-amber-500" />
                         Alasan Pending
                       </h3>
                       <textarea
                         placeholder="Tulis alasan order dipending... (contoh: Dokumen kurang, Alamat tidak valid)"
                         value={pendingNote}
                         onChange={e => setPendingNote(e.target.value)}
                         className="w-full h-32 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
                       />
                       <div className="grid grid-cols-2 gap-3 mt-4">
                          <button onClick={() => setShowPendingModal(false)} className="py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-2xl font-black uppercase tracking-widest text-[10px]">CANCEL</button>
                          <button onClick={handlePending} className="py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]">SET PENDING</button>
                       </div>
                    </motion.div>
                  </div>
                )}

                {showEditOrder && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      className="w-full max-w-lg bg-white dark:bg-zinc-950 rounded-[32px] p-6 shadow-2xl relative overflow-y-auto max-h-[90vh]"
                    >
                      <button 
                        onClick={() => setShowEditOrder(false)} 
                        className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-350 transition-colors w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      
                      <div className="mb-4">
                        <h3 className="text-lg font-black uppercase tracking-tight flex items-center justify-center gap-2 text-zinc-950 dark:text-white">
                          <Edit className="w-5 h-5 text-brand-primary" />
                          EDIT DOC
                        </h3>
                      </div>
                      
                      <div className="max-h-[70vh] overflow-y-auto pr-1">
                        <ClientForm 
                          form={editOrderForm}
                          setForm={setEditOrderForm}
                          onSubmit={handleEditOrder}
                          isSubmitting={isSubmittingEdit}
                          title="Edit Dokumen Konsumen"
                          submitLabel="SIMPAN PERUBAHAN"
                          isRepeat={false}
                        />
                      </div>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <NewClientDialog isOpen={showNewClient} onClose={() => setShowNewClient(false)} />
        <RepeatOrderDialog isOpen={showRepeatOrder} onClose={() => setShowRepeatOrder(false)} />

      </div>
    </div>
  </AuthGuard>
  );
}
