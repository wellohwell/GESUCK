import React, { useEffect, useState, useMemo, useRef } from "react";
import { 
  subscribeMarkets, 
  subscribeMarketPlans, 
  addMarket, 
  updateMarket, 
  removeMarket, 
  subscribeUsers, 
  updateUser,
  subscribeMarketPlansByMonth,
  deleteMarketPlan
} from "../../lib/services";
import { db, auth } from "../../firebase/config";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getActiveSystemDate } from "../../utils/javaneseDate";
import { motion, AnimatePresence } from "motion/react";
import { Outlet } from "react-router-dom";
import { domToCanvas } from "modern-screenshot";
import { jsPDF } from "jspdf";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import { 
  ArrowLeft, 
  Users, 
  MapPin, 
  Search,
  Database,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Filter,
  X,
  Layers,
  ChevronDown,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  TrendingUp,
  Activity,
  FileSpreadsheet
} from "lucide-react";
import { cn } from "../../lib/utils";
import { toast } from "../../hooks/use-toast";
import { ThemeToggle } from "../../components/ThemeToggle";
import { toTitleCase } from "../../utils/format";
import dayjs from "dayjs";
import "dayjs/locale/id";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("id");

interface AdminProps {
  onBack: () => void;
}

const WILAYAH_OPTIONS = [
  "Kota Yogyakarta", "Sleman", "Bantul", "Gunungkidul", "Kulon Progo", "Purworejo", "Magelang", "Temanggung"
];

const PASARAN_OPTIONS = ["Legi", "Pahing", "Pon", "Wage", "Kliwon"];

const KATEGORI_OPTIONS = [
  { id: "PASAR_UMUM", label: "Pasar Umum" },
  { id: "PASAR_SUBUH", label: "Pasar Pagi/Subuh" },
  { id: "PASARAN_JAWA", label: "Pasaran Jawa" },
];

const SAMPLE_MARKETS = [
  { nama_pasar: "PS PONJONG", wilayah: "Gunungkidul", pasaran: ["PON", "LEGI"], buka_harian: true, jam_buka: "02:00 - 10:00", kategori: "PASAR_UMUM" },
  { nama_pasar: "PS KARANG MOJO", wilayah: "Gunungkidul", pasaran: ["PAHING"], buka_harian: true, jam_buka: "02:00 - 10:00", kategori: "PASAR_UMUM" },
  { nama_pasar: "ps. KUWON", wilayah: "Gunungkidul", pasaran: ["PON", "LEGI", "KLIWON"], buka_harian: false, jam_buka: "03:00 - 08:00", kategori: "PASAR_SUBUH" },
  { nama_pasar: "PS BERINGHARJO", wilayah: "Kota Yogyakarta", pasaran: [], buka_harian: true, jam_buka: "05:00 - 17:00", kategori: "PASAR_UMUM" },
];

// Import necessary hooks
import { useModal } from '../../hooks/use-modal';

export default function Admin({ onBack }: AdminProps) {
  const { openModal, openDrawer, closeAllModals } = useModal();
  const [markets, setMarkets] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [allMonthlyPlans, setAllMonthlyPlans] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeDate] = useState(getActiveSystemDate());
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [isSeeding, setIsSeeding] = useState(false);
  const [search, setSearch] = useState("");
  
  // Filter States
  const [filterWilayah, setFilterWilayah] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterPasaran, setFilterPasaran] = useState("");

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubMarkets = subscribeMarkets(setMarkets);
    const unsubAssignments = subscribeMarketPlans(activeDate.isoDate, setAssignments);
    const unsubUsers = subscribeUsers(setUsers);
    const unsubMonthlyPlans = subscribeMarketPlansByMonth(selectedMonth, setAllMonthlyPlans);
    
    return () => {
      unsubMarkets();
      unsubAssignments();
      unsubUsers();
      unsubMonthlyPlans();
    };
  }, [activeDate.isoDate, selectedMonth]);

  const handleExport = async (type: "pdf" | "jpg") => {
    if (!reportRef.current) return;
    const toastId = toast.loading("Menyiapkan dokumen...");
    try {
      const isDark = document.documentElement.classList.contains("dark");
      const canvas = await domToCanvas(reportRef.current, {
        backgroundColor: isDark ? "#050505" : "#f5f5f3",
        scale: 3,
        filter: (node) => {
          if (node instanceof HTMLElement) {
            return !node.hasAttribute("data-html2canvas-ignore") && !node.hasAttribute("data-ignore");
          }
          return true;
        }
      });

      if (type === "jpg") {
        const link = document.createElement("a");
        link.download = `Laporan_Pasar_${activeDate.isoDate}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: [canvas.width / 2, canvas.height / 2]
        });
        pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
        pdf.save(`Laporan_Pasar_${activeDate.isoDate}.pdf`);
      }
      toast.update(toastId, { render: "Berhasil diekspor!", type: "success", duration: 2000 });
    } catch (e) {
      toast.update(toastId, { render: "Gagal mengekspor laporan", type: "error", duration: 2000 });
    }
  };

  const seedData = async () => {
    if (!window.confirm("Hapus semua data pasar lama dan muat data sampel?")) return;
    setIsSeeding(true);
    try {
      const q = await getDocs(collection(db, "markets"));
      for (const d of q.docs) await deleteDoc(doc(db, "markets", d.id));
      for (const market of SAMPLE_MARKETS) await addMarket(market);
      toast.success("Master data berhasil dimuat!");
    } catch (e) {
      toast.error("Gagal memuat data.");
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredMarkets = useMemo(() => {
    return markets.filter(m => {
      const query = search.toLowerCase();
      const matchSearch = m.nama_pasar?.toLowerCase().includes(query) || m.wilayah?.toLowerCase().includes(query);
      const matchWilayah = !filterWilayah || m.wilayah === filterWilayah;
      const matchKategori = !filterKategori || (Array.isArray(m.kategori) ? m.kategori.includes(filterKategori) : m.kategori === filterKategori);
      const matchPasaran = !filterPasaran || m.pasaran?.includes(filterPasaran.toUpperCase()) || m.buka_harian;
      return matchSearch && matchWilayah && matchKategori && matchPasaran;
    });
  }, [markets, search, filterWilayah, filterKategori, filterPasaran]);

  const handleDeleteMarket = async (id: string, name: string) => {
    if (!window.confirm(`Hapus pasar "${name}"?`)) return;
    try {
      await removeMarket(id);
      toast.info("Pasar berhasil dihapus");
    } catch (e) {
      toast.error("Gagal menghapus pasar");
    }
  };

  const openForm = (market: any = null) => {
    openModal({
      type: 'fullscreen',
      hideCloseButton: true,
      content: <MarketFormContent market={market} onClose={closeAllModals} />,
    });
  };

  const handleSelectUser = (u: any) => {
    const userAssignments = assignments.filter((a: any) => a.userId === u.id);
    openModal({
      type: 'fullscreen',
      hideCloseButton: true,
      content: <UserDetailContent user={u} assignments={userAssignments} onClose={closeAllModals} />,
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-zinc-900 dark:text-white font-sans transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-100 dark:border-white/10 transition-colors">
        <div className="max-w-6xl mx-auto px-3 h-12 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors border border-zinc-200 dark:border-transparent"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-600 dark:text-white" />
          </button>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-3 py-4">
        <Outlet context={{ 
            markets, 
            assignments, 
            users, 
            plans: allMonthlyPlans, 
            handleSelectUser, 
            handleDeleteMarket, 
            openForm, 
            seedData, 
            isSeeding, 
            search, 
            setSearch, 
            filterWilayah, 
            setFilterWilayah, 
            filterKategori, 
            setFilterKategori, 
            filterPasaran, 
            setFilterPasaran, 
            filteredMarkets 
        }} />
      </main>
    </div>
  );
}

// --- Market Insight View ---

function MarketInsightView({ plans, selectedMonth, setMonth, users, markets }: any) {
  const [trackingUser, setTrackingUser] = useState("");

  // 1. Summary Calculation
  const summary = useMemo(() => {
    const visited = plans.filter(p => p.status === 'visited');
    const activeMarkets = new Set(plans.map(p => p.marketName)).size;
    const activeUsers = new Set(plans.map(p => p.userId)).size;
    
    const cityCounts: Record<string, number> = {};
    plans.forEach(p => {
      if (p.city) cityCounts[p.city] = (cityCounts[p.city] || 0) + 1;
    });
    const mostActiveCity = Object.entries(cityCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || "-";

    return { totalVisits: visited.length, activeMarkets, activeUsers, mostActiveCity };
  }, [plans]);

  // 2. Market Insight Calculation
  const marketInsight = useMemo(() => {
    const stats: Record<string, any> = {};
    
    // Initialize with master data
    markets.forEach((m: any) => {
      stats[m.nama_pasar] = {
        name: m.nama_pasar,
        city: m.wilayah,
        visits: 0,
        lastVisit: null,
        users: new Set()
      };
    });

    plans.forEach(p => {
      if (!stats[p.marketName]) {
         stats[p.marketName] = { name: p.marketName, city: p.city, visits: 0, lastVisit: null, users: new Set() };
      }
      stats[p.marketName].visits++;
      stats[p.marketName].users.add(p.userId);
      if (!stats[p.marketName].lastVisit || dayjs(p.dayStart).isAfter(dayjs(stats[p.marketName].lastVisit))) {
        stats[p.marketName].lastVisit = p.dayStart;
      }
    });

    const list = Object.values(stats).map((s: any) => ({
      ...s,
      userCount: s.users.size
    }));

    return {
      mostVisited: [...list].sort((a,b) => b.visits - a.visits).slice(0, 10),
      leastVisited: [...list].sort((a,b) => a.visits - b.visits).slice(0, 10),
      all: list
    };
  }, [plans, markets]);

  // 3. User Tracking Calculation
  const userTrackingData = useMemo(() => {
    if (!trackingUser) return null;
    const userPlans = plans.filter((p: any) => p.userId === trackingUser);
    const total = userPlans.length;
    
    const mCounts: any = {};
    const cCounts: any = {};
    userPlans.forEach(p => {
      mCounts[p.marketName] = (mCounts[p.marketName] || 0) + 1;
      if (p.city) cCounts[p.city] = (cCounts[p.city] || 0) + 1;
    });

    const favMarket = Object.entries(mCounts).sort((a: any,b: any) => b[1] - a[1])[0]?.[0] || "-";
    const favCity = Object.entries(cCounts).sort((a: any,b: any) => b[1] - a[1])[0]?.[0] || "-";

    return {
      history: userPlans.sort((a,b) => dayjs(b.dayStart).unix() - dayjs(a.dayStart).unix()),
      total,
      favMarket,
      favCity
    };
  }, [plans, trackingUser]);

  // 4. Auto Insights
  const autoInsights = useMemo(() => {
    const userCounts: any = {};
    plans.forEach(p => { userCounts[p.userName] = (userCounts[p.userName] || 0) + 1; });
    const topUser = Object.entries(userCounts).sort((a: any,b: any) => b[1] - a[1])[0] || ["-", 0];

    const longTimeNoVisit = marketInsight.all
      .filter((m: any) => m.lastVisit && dayjs().diff(dayjs(m.lastVisit), 'day') > 7)
      .sort((a: any, b: any) => dayjs(a.lastVisit).unix() - dayjs(b.lastVisit).unix())
      .slice(0, 5);

    return { topUser, longTimeNoVisit };
  }, [plans, marketInsight]);

  return (
    <div className="max-w-[800px] mx-auto space-y-6 pb-20">
      {/* Sticky Header Filters */}
      <div className="sticky top-[48px] z-40 bg-white/90 dark:bg-black/95 backdrop-blur-md py-3 border-b border-zinc-100 dark:border-white/5 -mx-3 px-3">
         <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-primary">Market Insight</h3>
              </div>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={e => setMonth(e.target.value)}
                className="h-9 px-3 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase outline-none"
              />
            </div>
         </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
         <KPICard label="Pasar Aktif" value={summary.activeMarkets} icon={MapPin} color="text-emerald-500" />
         <KPICard label="Kota Teraktif" value={summary.mostActiveCity} icon={TrendingUp} color="text-purple-500" />
      </div>

      {/* Market Insight Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Market Coverage Insight</h4>
        </div>
        
        <div className="overflow-hidden">
           <div className="overflow-x-auto no-scrollbar">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b border-zinc-100 dark:border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                   <th className="px-1 py-4">Nama Pasar</th>
                   <th className="px-5 py-4">Freq</th>
                   <th className="px-5 py-4">Terakhir</th>
                   <th className="px-5 py-4">Users</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                 {marketInsight.mostVisited.slice(0, 4).map((m: any) => (
                   <tr key={m.name} className="text-xs group hover:bg-zinc-100/50 dark:hover:bg-white/5 transition-colors">
                     <td className="px-1 py-3">
                       <p className="font-bold">{m.name}</p>
                       <p className="text-[9px] text-zinc-400 uppercase font-black tracking-tighter">{m.city}</p>
                     </td>
                     <td className="px-5 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full font-black text-[9px]",
                          m.visits > 5 ? "bg-primary/20 text-primary" : "bg-zinc-200 dark:bg-white/10 text-zinc-500"
                        )}>
                          {m.visits}x
                        </span>
                     </td>
                     <td className="px-5 py-3 font-mono text-[10px] opacity-50">
                        {m.lastVisit ? dayjs(m.lastVisit).format("DD/MM") : "-"}
                     </td>
                     <td className="px-5 py-3 font-bold text-primary">
                        {m.userCount}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      </section>

      {/* User Tracking Section */}
      <section className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">User Performance Tracking</h4>
          <select 
            value={trackingUser}
            onChange={e => setTrackingUser(e.target.value)}
            className="h-8 px-3 bg-white dark:bg-white/10 border border-zinc-100 dark:border-white/10 rounded-lg text-[9px] font-black uppercase outline-none"
          >
            <option value="">PILIH USER</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
          </select>
        </div>

        {userTrackingData ? (
          <div className="space-y-4">
             <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 rounded-xl">
                   <p className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">Total Kunjungan</p>
                   <p className="text-lg font-black">{userTrackingData.total}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-xl">
                   <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-1">Fav Market</p>
                   <p className="text-[10px] font-black leading-tight">{userTrackingData.favMarket}</p>
                </div>
                <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 rounded-xl">
                   <p className="text-[8px] font-black text-purple-600 dark:text-purple-400 uppercase mb-1">Fav Kota</p>
                   <p className="text-[10px] font-black leading-tight">{userTrackingData.favCity}</p>
                </div>
             </div>

             <div className="overflow-hidden">
                <div className="p-3 border-b border-border/50">
                   <p className="text-[9px] font-black uppercase tracking-widest">Histori Kunjungan</p>
                </div>
                <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                   {userTrackingData.history.length === 0 ? (
                     <p className="text-center py-10 text-[10px] italic text-zinc-400">Belum ada histori kunjungan</p>
                   ) : (
                     userTrackingData.history.map((h, i) => (
                       <div key={i} className="px-4 py-3 border-b border-border/30 last:border-0 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                          <div>
                             <p className="text-xs font-bold">{h.marketName}</p>
                             <p className="text-[9px] text-zinc-400 font-mono">{dayjs(h.dayStart).format("dddd, D MMMM YYYY")}</p>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                            h.status === 'visited' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-100 dark:bg-white/10 text-zinc-400"
                          )}>
                            {h.status}
                          </span>
                       </div>
                     ))
                   )}
                </div>
             </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center opacity-20">
             <Users className="w-10 h-10 mb-2" />
             <p className="text-[10px] font-black uppercase tracking-widest">Pilih user untuk melihat insight</p>
          </div>
        )}
      </section>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="p-4 flex items-center gap-4 transition-all hover:bg-zinc-100/50 dark:hover:bg-white/5">
      <div className={cn("w-10 h-10 flex items-center justify-center", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-400 dark:text-white/20 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-xl font-black tracking-tight text-zinc-900 dark:text-white leading-none">{value}</p>
      </div>
    </div>
  );
}

// --- User Management Components ---


function UserManagementView({ users, assignments, onSelectUser }: any) {
  const updateUserRoleAndStatus = async (
    uid: string,
    role: string,
    status: string,
    displayName?: string,
  ) => {
    try {
      const data: any = { role, status };
      if (displayName !== undefined) data.displayName = displayName;
      await updateUser(uid, data);
      toast.success("User updated!");
    } catch (e) {
      toast.error("Failed to update user");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
    >
      <div className="bg-transparent md:bg-white md:dark:bg-white/[0.02] md:rounded-2xl md:overflow-hidden md:border md:border-zinc-100 md:dark:border-white/10 md:shadow-xl transition-colors">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-white/[0.05] text-sm  tracking-tight text-zinc-400 dark:text-white/60">
                <th className="px-6 py-4 font-medium text-sm">User Detail</th>
                <th className="px-6 py-4 font-medium text-sm">Aktivitas</th>
                <th className="px-6 py-4 font-medium text-sm">Akses & Status</th>
                <th className="px-6 py-4 font-medium text-sm w-12 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {users.map((u: any) => {
                const userPlans = assignments.filter((a: any) => a.userId === u.id);
                const isSelected = userPlans.length > 0;
                const lastLoginFormatted = u.lastLogin?.toDate 
                  ? dayjs(u.lastLogin.toDate()).format("dddd, D MMMM YYYY - HH:mm") 
                  : "-";
                
                return (
                  <tr
                    key={u.id}
                    onClick={() => onSelectUser(u)}
                    className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 flex-shrink-0 rounded-full bg-zinc-100 dark:bg-white/10 p-0.5">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="w-full h-full rounded-full ring-1 ring-white/10" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-zinc-200 dark:bg-white/5 flex items-center justify-center text-sm font-medium text-zinc-400">
                              {u.displayName?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            defaultValue={u.displayName}
                            onBlur={(e) => {
                              const titleVal = toTitleCase(e.target.value);
                              e.target.value = titleVal;
                              updateUserRoleAndStatus(u.id, u.role, u.status, titleVal);
                            }}
                            className="font-medium text-[13px] text-zinc-900 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-brand-primary/40 transition-colors w-full h-5 leading-none"
                          />
                          <p className="text-[10px] font-bold text-zinc-400 dark:text-white/10 tracking-widest uppercase mt-0.5">{u.role || "SPV"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-zinc-600 dark:text-white/60">{lastLoginFormatted}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-black text-zinc-400 mt-0.5 tracking-[0.2em] uppercase">Pasar:</span>
                          <div className="flex flex-col gap-1">
                            {isSelected ? (
                              userPlans.map((plan: any) => (
                                <span key={plan.id} className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">
                                  {plan.marketName}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 w-fit">
                                BELUM
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <div className="relative w-28">
                          <select
                            value={u.role || "SPV"}
                            onChange={(e) => updateUserRoleAndStatus(u.id, e.target.value, u.status || "active")}
                            className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 px-2 py-1.5 rounded-lg text-sm font-medium outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer"
                          >
                            <option value="Admin" className="bg-zinc-900 text-white">Admin</option>
                            <option value="SPV" className="bg-zinc-900 text-white">SPV</option>
                            <option value="Sales" className="bg-zinc-900 text-white">Sales</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
                        </div>
                        <div className="relative w-28">
                          <select
                            value={u.status || "pending"}
                            onChange={(e) => updateUserRoleAndStatus(u.id, u.role || "SPV", e.target.value)}
                            className={cn(
                              "w-full px-2 py-1.5 rounded-lg text-sm font-medium border outline-none appearance-none cursor-pointer transition-all",
                              u.status === "approved"
                                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                : u.status === "rejected"
                                  ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400"
                                  : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-500",
                            )}
                          >
                            <option value="approved" className="bg-zinc-900 text-emerald-400">Approved</option>
                            <option value="pending" className="bg-zinc-900 text-amber-500">Pending</option>
                            <option value="rejected" className="bg-zinc-900 text-red-500">Rejected</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40 pointer-events-none" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={async () => {
                          const { removeUser } = await import("../../lib/services");
                          try {
                            await removeUser(u.id);
                            toast.success("User deleted successfully.");
                          } catch (error) {
                            toast.error("Failed to delete user.");
                          }
                        }}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Hapus User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-zinc-100 dark:divide-white/[0.05] px-1">
          {users.map((u: any) => {
            const userPlans = assignments.filter((a: any) => a.userId === u.id);
            const isSelected = userPlans.length > 0;
            const lastLoginFormatted = u.lastLogin?.toDate 
              ? dayjs(u.lastLogin.toDate()).format("ddd, D MMM - HH:mm") 
              : "-";

            return (
              <div 
                key={u.id} 
                onClick={() => onSelectUser(u)}
                className="py-2 flex gap-3 items-center hover:bg-zinc-50 dark:hover:bg-white/[0.01] active:bg-zinc-100 dark:active:bg-white/[0.02] transition-colors px-2 cursor-pointer"
              >
                <div className="w-9 h-9 flex-shrink-0 rounded-full bg-zinc-100 dark:bg-white/10 p-0.5 border border-zinc-200 dark:border-white/20">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="" className="w-full h-full rounded-full ring-1 ring-white/10" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-zinc-200 dark:bg-white/5 flex items-center justify-center text-sm font-medium text-zinc-400">
                      {u.displayName?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          defaultValue={u.displayName}
                          onBlur={(e) => {
                            const titleVal = toTitleCase(e.target.value);
                            e.target.value = titleVal;
                            updateUserRoleAndStatus(u.id, u.role, u.status, titleVal);
                          }}
                          className="font-medium text-[12px] text-zinc-900 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-brand-primary/40 transition-colors w-full h-4 leading-none"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-muted-foreground/30 truncate text-left uppercase tracking-tight">
                        <span>{u.role || "SPV"}</span>
                        <span className="opacity-30">•</span>
                        <span className="text-primary/60 font-mono tracking-tighter">{lastLoginFormatted}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2 mt-0.5">
                      {isSelected ? (
                        userPlans.map((plan: any) => (
                          <div key={plan.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">
                            {plan.marketName}
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500">
                          BELUM
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
                    <div className="relative flex-1">
                        <select
                          value={u.role || "SPV"}
                          onChange={(e) => updateUserRoleAndStatus(u.id, e.target.value, u.status || "approved")}
                          className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10 px-1 py-1 rounded-md text-xs font-medium outline-none text-zinc-900 dark:text-white appearance-none cursor-pointer"
                        >
                          <option value="Admin" className="bg-zinc-900 text-white">Admin</option>
                          <option value="SPV" className="bg-zinc-900 text-white">SPV</option>
                          <option value="Sales" className="bg-zinc-900 text-white">Sales</option>
                        </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
                    </div>
                    <div className="relative flex-1">
                        <select
                          value={u.status || "pending"}
                          onChange={(e) => updateUserRoleAndStatus(u.id, u.role || "SPV", e.target.value)}
                          className={cn(
                            "w-full px-1 py-1 rounded-md text-xs font-medium border outline-none appearance-none cursor-pointer transition-all",
                            u.status === "approved"
                              ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : u.status === "rejected"
                                ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400"
                                : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-500",
                          )}
                        >
                          <option value="approved" className="bg-zinc-900 text-emerald-400">Approved</option>
                          <option value="pending" className="bg-zinc-900 text-amber-500">Pending</option>
                          <option value="rejected" className="bg-zinc-900 text-red-500">Rejected</option>
                        </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40 pointer-events-none" />
                    </div>
                    
                    <button
                      onClick={async () => {
                        const { removeUser } = await import("../../lib/services");
                        try {
                          await removeUser(u.id);
                          toast.success("User deleted successfully.");
                        } catch (error) {
                          toast.error("Failed to delete user.");
                        }
                      }}
                      className="p-1 px-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors flex-shrink-0"
                      title="Hapus User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// --- User Detail Modal ---

function UserDetailContent({ user, assignments, onClose }: any) {
  const lastLoginFormatted = user.lastLogin?.toDate 
    ? dayjs(user.lastLogin.toDate()).format("dddd, D MMMM YYYY - HH:mm") 
    : "-";

  return (
    <>
      <div className="flex flex-col">
        <button onClick={onClose} className="mb-4 text-xs font-black uppercase tracking-widest text-zinc-400">Tutup</button>
        <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-white/10 p-1 border border-zinc-200 dark:border-white/10">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full rounded-xl object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full rounded-xl bg-zinc-200 dark:bg-white/5 flex items-center justify-center text-2xl font-bold text-zinc-400">
                {user.displayName?.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">{user.displayName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-brand-primary text-white uppercase tracking-widest leading-none">
                {user.role || "SPV"}
              </span>
              <span className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-tight",
                user.status === "approved" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
              )}>
                {user.status || "PENDING"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Terakhir Login</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{lastLoginFormatted}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Penugasan Hari Ini</p>
                {assignments.length > 0 ? (
                  <div className="space-y-2">
                    {assignments.map((plan: any) => (
                      <div key={plan.id} className="flex items-center justify-between p-2 rounded-xl bg-background border border-border">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-white">{plan.marketName}</p>
                            <p className="text-[10px] font-medium text-zinc-500">{plan.city}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {plan.createdAt?.toDate ? dayjs(plan.createdAt.toDate()).format("HH:mm") : "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-zinc-400 italic text-xs">
                    <AlertCircle className="w-4 h-4" />
                    <span>Belum ada rencana kunjungan</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2">
               {/* Since it is a drawer or modal, the close action can be omitted or we can pass modalId and call close. But we already stripped `onClose` so we can remove this button. */}
            </div>
          </div>
        </div>
    </>
  );
}

function MasterDataView({
  markets,
  onAdd,
  onEdit,
  onDelete,
  onSeed,
  isSeeding,
  search,
  setSearch,
  filters,
}: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
    >
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(toTitleCase(e.target.value))}
            placeholder="Cari berdasarkan nama pasar atau wilayah..."
            className="w-full h-11 bg-white dark:bg-white/5 pl-11 pr-4 rounded-xl border border-zinc-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-brand-primary/20 dark:focus:ring-brand-primary/10 transition-all font-sans text-[13px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/20 shadow-sm"
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={onAdd}
            className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-widest shadow-md hover:translate-y-[-1px] hover:shadow-lg transition-all duration-200 active:scale-95 gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Pasar
          </button>
        </div>

        {/* Filters Hub */}
        <div className="grid grid-cols-3 gap-2">
          <div className="relative">
            <select
              value={filters.wilayah}
              onChange={(e) => filters.setWilayah(e.target.value)}
              className="w-full h-[38px] bg-white dark:bg-white/5 px-2.5 rounded-[10px] text-sm font-medium border border-zinc-100 dark:border-white/5 outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer transition-colors shadow-sm"
            >
              <option value="" className="bg-white dark:bg-black">WILAYAH</option>
              {WILAYAH_OPTIONS.map((w) => (
                <option key={w} value={w} className="bg-white dark:bg-black">
                  {w.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filters.kategori}
              onChange={(e) => filters.setKategori(e.target.value)}
              className="w-full h-[38px] bg-white dark:bg-white/5 px-2.5 rounded-[10px] text-sm font-medium border border-zinc-100 dark:border-white/5 outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer transition-colors shadow-sm"
            >
              <option value="" className="bg-white dark:bg-black">KATEGORI</option>
              {KATEGORI_OPTIONS.map((k) => (
                <option key={k.id} value={k.id} className="bg-white dark:bg-black">
                  {k.label.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filters.pasaran}
              onChange={(e) => filters.setPasaran(e.target.value)}
              className="w-full h-[38px] bg-white dark:bg-white/5 px-2.5 rounded-[10px] text-sm font-medium border border-zinc-100 dark:border-white/5 outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer transition-colors shadow-sm"
            >
              <option value="" className="bg-white dark:bg-black">PASARAN</option>
              {PASARAN_OPTIONS.map((p) => (
                <option key={p} value={p} className="bg-white dark:bg-black">
                  {p.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Desktop Table / Mobile Cards */}
      <div className="bg-transparent md:bg-white md:dark:bg-white/[0.02] md:rounded-2xl md:overflow-hidden md:border md:border-zinc-100 md:dark:border-white/10 md:shadow-xl transition-colors">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-white/[0.05] text-sm  font-medium tracking-tight text-zinc-400 dark:text-white/60">
                <th className="px-6 py-4">Informasi Pasar</th>
                <th className="px-6 py-4">Wilayah</th>
                <th className="px-6 py-4">Kategori Detail</th>
                <th className="px-6 py-4">Operasional</th>
                <th className="px-6 py-4">Jadwal Buka</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {markets.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-20 text-center text-zinc-400 dark:text-white/10  text-sm font-medium tracking-tight "
                  >
                    Data Tidak Ditemukan
                  </td>
                </tr>
              ) : (
                markets.map((m: any) => (
                  <tr
                    key={m.id}
                    className="group hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-all"
                  >
                    <td className="px-6 py-4 font-medium text-sm tracking-tight text-zinc-900 dark:text-white">
                      {toTitleCase(m.nama_pasar)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-zinc-500 dark:text-white/60 ">
                      {toTitleCase(m.wilayah)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(m.kategori) ? m.kategori : [m.kategori])
                          .map((id: any, idx: number) => (
                            <span
                              key={typeof id === 'string' ? `${id}-${idx}` : `kat-${idx}`}
                              className="px-2 py-0.5 rounded-md bg-brand-secondary/10 dark:bg-brand-secondary/20 text-brand-secondary/80 text-xs font-medium "
                            >
                              {KATEGORI_OPTIONS.find((o) => (typeof id === 'object' ? o.id === id.id : o.id === id))
                                ?.label.replace("Pasar ", "")
                                .toUpperCase() || String(typeof id === 'object' ? (id.id || id.label) : id).replace("PASAR_", "")}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {m.buka_harian ? (
                        <span className="text-sm text-emerald-600 dark:text-brand-primary font-medium  tracking-tight border border-emerald-200 dark:border-brand-primary/20 px-2 py-0.5 rounded-md">
                          HARIAN
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {m.pasaran?.map((p: string, pIdx: number) => (
                            <span
                              key={`${p}-${pIdx}`}
                              className="text-xs px-2 py-0.5 bg-amber-50 dark:bg-yellow-500/10 text-amber-600 dark:text-yellow-400 rounded-md border border-amber-200 dark:border-yellow-500/20 font-medium "
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {typeof m.jam_buka === "object" && m.jam_buka !== null
                          ? Object.entries(m.jam_buka).map(([cat, jam], jamIdx) => {
                              const label = String(
                                KATEGORI_OPTIONS.find((o) => o.id === cat)?.label ||
                                  cat,
                              );
                              const jamStr =
                                typeof jam === "object"
                                  ? ""
                                  : String(jam);
                              return (
                                <div
                                  key={`${cat}-${jamIdx}`}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <span className="text-zinc-400 dark:text-brand-primary/60 font-medium ">
                                    {label
                                      .replace("Pasar ", "")
                                      .substring(0, 5)
                                      .toUpperCase()}
                                    :
                                  </span>
                                  <span className="text-zinc-600 dark:text-white/60 font-mono">
                                    {jamStr}
                                  </span>
                                </div>
                              );
                            })
                          : <span className="text-zinc-600 dark:text-white/40 font-mono text-sm">{String(m.jam_buka || "")}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(m)}
                          className="w-9 h-9 flex items-center justify-center bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 rounded-xl text-zinc-500 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white transition-all border border-zinc-200 dark:border-transparent shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(m.id, m.nama_pasar)}
                          className="w-9 h-9 flex items-center justify-center bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/30 rounded-xl text-red-400 dark:text-red-500/60 hover:text-red-600 dark:hover:text-red-400 transition-all border border-red-100 dark:border-transparent shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden px-3">
          {markets.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 dark:text-white/10  text-xs font-medium  tracking-tight">
              Data Tidak Ditemukan
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
              {markets.map((m: any) => (
                <div
                  key={m.id}
                  onClick={() => onEdit(m)}
                  className="flex items-center justify-between py-3 px-0.5 border-b border-zinc-100 dark:border-white/[0.06] last:border-0 transition-all hover:bg-zinc-100/50 dark:hover:bg-white/[0.02] active:bg-zinc-200 dark:active:bg-white/[0.04] group cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-[13px] leading-tight text-zinc-900 dark:text-white tracking-tight truncate transition-colors">
                      {toTitleCase(m.nama_pasar)}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-sm font-medium text-zinc-500 dark:text-white/40  tracking-wide">
                      <span>{toTitleCase(m.wilayah)}</span>
                      <span className="opacity-30">•</span>
                      <span>{m.buka_harian ? "SETIAP HARI" : m.pasaran?.join(", ")}</span>
                      <span className="opacity-30">•</span>
                      <span className="text-brand-primary/70">
                        {typeof m.jam_buka === "object" && m.jam_buka !== null
                          ? Object.entries(m.jam_buka)
                              .map(([cat, jam]) => {
                                const label = String(
                                  KATEGORI_OPTIONS.find((o) => o.id === cat)?.label ||
                                    cat,
                                ).replace("Pasar ", "");
                                const jamStr = typeof jam === 'object' ? "" : String(jam);
                                return `${label} ${jamStr.replace(/Pasar/g, "")}`;
                              })
                              .join(" • ")
                          : String(m.jam_buka || "")}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(m);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-all"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(m.id, m.nama_pasar);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MarketFormContent({ market, onClose }: any) {
  const [formData, setFormData] = useState({
    nama_pasar: market?.nama_pasar || "",
    wilayah: market?.wilayah || "Kota Yogyakarta",
    buka_harian: market?.buka_harian ?? true,
    pasaran: market?.pasaran || [],
    jam_buka: (() => {
      // If it's already an object, ensure all keys are strings and filter out any [object Object]
      if (typeof market?.jam_buka === "object" && market?.jam_buka !== null) {
        const sanitized = {} as any;
        Object.entries(market.jam_buka).forEach(([k, v]) => {
          if (k !== "[object Object]") sanitized[String(k)] = v;
        });
        return sanitized;
      }

      const kategoriArray = Array.isArray(market?.kategori)
        ? market.kategori.map((k: any) =>
            typeof k === "object" ? String(k.id || "PASAR_UMUM") : String(k),
          )
        : market?.kategori
          ? [
              typeof market.kategori === "object"
                ? String(market.kategori.id || "PASAR_UMUM")
                : String(market.kategori),
            ]
          : ["PASAR_UMUM"];

      const newJam = {} as any;
      kategoriArray.forEach((k: string) => {
        if (k && k !== "undefined" && k !== "[object Object]") {
          newJam[k] =
            typeof market?.jam_buka === "string" ? market.jam_buka : "";
        }
      });
      return newJam;
    })(),
    kategori: Array.isArray(market?.kategori)
      ? market.kategori
          .map((k: any) =>
            typeof k === "object" ? String(k.id || "PASAR_UMUM") : String(k),
          )
          .filter((k: string) => k !== "[object Object]" && k !== "undefined")
      : market?.kategori
        ? [
            typeof market.kategori === "object"
              ? String(market.kategori.id || "PASAR_UMUM")
              : String(market.kategori),
          ].filter((k) => k !== "[object Object]" && k !== "undefined")
        : ["PASAR_UMUM"],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePasaran = (p: string) => {
    const upperP = p.toUpperCase();
    if (formData.pasaran.includes(upperP)) {
      setFormData({
        ...formData,
        pasaran: formData.pasaran.filter((x: string) => x !== upperP),
      });
    } else {
      setFormData({ ...formData, pasaran: [...formData.pasaran, upperP] });
    }
  };

  const toggleKategori = (id: string) => {
    if (formData.kategori.includes(id)) {
      setFormData({
        ...formData,
        kategori: formData.kategori.filter((x: string) => x !== id),
      });
    } else {
      setFormData({ ...formData, kategori: [...formData.kategori, id] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_pasar) return toast.error("Nama Pasar wajib diisi");
    if (!formData.jam_buka) return toast.error("Jam Buka wajib diisi");
    if (!formData.buka_harian && formData.pasaran.length === 0)
      return toast.error("Pilih minimal satu hari pasaran");

    setIsSubmitting(true);
    try {
      if (market?.id) {
        await updateMarket(market.id, formData);
        toast.success("Pasar berhasil diperbarui");
      } else {
        await addMarket(formData);
        toast.success("Pasar berhasil ditambahkan");
      }
      onClose();
    } catch (e) {
      toast.error("Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col h-full relative">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col relative h-full"
      >
          <div className="p-5 space-y-6 pb-6">
            <div className="space-y-2">
            <label className="text-sm text-zinc-400 dark:text-white/60  tracking-tight font-medium block pl-1">
              Nama Pasar Target
            </label>
            <input
              type="text"
              value={formData.nama_pasar}
              onChange={(e) =>
                setFormData({ ...formData, nama_pasar: toTitleCase(e.target.value) })
              }
              placeholder="Masukan nama lengkap pasar..."
              className="w-full h-12 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl px-4 outline-none focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary transition-all text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-white/10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 dark:text-white/60  tracking-tight font-medium block pl-1">
                Wilayah Kabupaten
              </label>
              <div className="relative">
                <select
                  value={formData.wilayah}
                  onChange={(e) =>
                    setFormData({ ...formData, wilayah: e.target.value })
                  }
                  className="w-full h-12 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl px-4 outline-none appearance-none cursor-pointer text-sm font-medium text-zinc-900 dark:text-white"
                >
                  {WILAYAH_OPTIONS.map((o) => (
                    <option key={o} value={o} className="bg-white dark:bg-black">
                      {o}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 dark:text-white/60  tracking-tight font-medium block pl-1">
                Kategori Operasi
              </label>
              <div className="flex flex-wrap gap-2">
                {KATEGORI_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleKategori(o.id)}
                    className={cn(
                      "flex-1 min-w-[90px] h-10 rounded-xl border text-sm font-medium  tracking-tight transition-all",
                      formData.kategori.includes(o.id)
                        ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/10"
                        : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-400 dark:text-white/40",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-sm text-zinc-400 dark:text-white/60  tracking-tight font-medium">
                Konfigurasi Jam Buka
              </label>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, buka_harian: !formData.buka_harian })
                }
                className={cn(
                  "h-10 px-4 rounded-xl border flex items-center justify-center gap-2 font-medium text-sm tracking-tight transition-all ",
                  formData.buka_harian
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-zinc-50 dark:bg-white/10 border-zinc-200 dark:border-white/20 text-zinc-500 dark:text-white/60",
                )}
              >
                {formData.buka_harian ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                {formData.buka_harian ? "Setiap Hari" : "Pasaran"}
              </button>
            </div>

            <div className="space-y-3 bg-zinc-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-zinc-100 dark:border-white/10">
              {formData.kategori.map((cat, idx) => (
                <div key={`${cat}-${idx}`} className="space-y-1.5">
                  <div className="flex items-center gap-2 px-1">
                    <Layers className="w-3 h-3 text-brand-primary/60" />
                    <span className="text-sm text-zinc-500 dark:text-white/80 font-medium  tracking-wider">
                      {KATEGORI_OPTIONS.find((o) => o.id === cat)?.label}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formData.jam_buka[cat] || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jam_buka: { ...formData.jam_buka, [cat]: e.target.value },
                      })
                    }
                    placeholder="Contoh: 02:00 - 10:00"
                    className="w-full h-11 bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-4 outline-none text-xs font-mono font-medium text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-white/10 focus:border-brand-primary/40"
                  />
                </div>
              ))}
            </div>
          </div>

          {!formData.buka_harian && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-2"
            >
              <label className="text-sm text-zinc-400 dark:text-white/60  tracking-tight font-medium block pl-1">
                Pilih Hari Pasaran
              </label>
              <div className="flex flex-wrap gap-2">
                {PASARAN_OPTIONS.map((p, pIdx) => (
                  <button
                    key={`${p}-${pIdx}`}
                    type="button"
                    onClick={() => togglePasaran(p)}
                    className={cn(
                      "flex-1 min-w-[80px] h-10 rounded-xl border text-sm font-medium  tracking-tight transition-all",
                      formData.pasaran.includes(p.toUpperCase())
                        ? "bg-brand-secondary text-black border-brand-secondary shadow-lg shadow-brand-secondary/10"
                        : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-400 dark:text-white/40",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          </div>

          <div className="sticky bottom-0 p-5 mt-auto bg-card border-t border-border flex justify-center gap-3 z-20">
            <button
              type="button"
              onClick={onClose}
              className="w-full max-w-[140px] h-11 bg-muted rounded-xl font-black tracking-widest text-[10px] uppercase text-muted-foreground hover:bg-muted/80 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full max-w-[200px] h-11 bg-primary text-primary-foreground rounded-xl font-black tracking-widest text-[10px] uppercase shadow-lg transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 flex items-center justify-center"
            >
              {isSubmitting ? "Processing..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
  );
}

