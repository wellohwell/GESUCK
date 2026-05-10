import React, { useEffect, useState, useMemo, useRef } from "react";
import { subscribeMarkets, subscribeAssignments, addMarket, updateMarket, removeMarket, adminRemoveAssignment, subscribeUsers, updateUser } from "../lib/services";
import { db, auth } from "../firebase/config";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getActiveSystemDate } from "../utils/javaneseDate";
import { motion, AnimatePresence } from "motion/react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
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
  Download
} from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "react-toastify";
import { ThemeToggle } from "../components/ThemeToggle";

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

export default function Admin({ onBack }: AdminProps) {
  const [activeTab, setActiveTab] = useState<"users" | "master">("users");
  const [markets, setMarkets] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeDate] = useState(getActiveSystemDate());
  const [isSeeding, setIsSeeding] = useState(false);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<any>(null);
  
  // Filter States
  const [filterWilayah, setFilterWilayah] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterPasaran, setFilterPasaran] = useState("");

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubMarkets = subscribeMarkets(setMarkets);
    const unsubAssignments = subscribeAssignments(activeDate.isoDate, setAssignments);
    const unsubUsers = subscribeUsers(setUsers);
    return () => {
      unsubMarkets();
      unsubAssignments();
      unsubUsers();
    };
  }, [activeDate.isoDate]);

  const handleExport = async (type: "pdf" | "jpg") => {
    if (!reportRef.current) return;
    const toastId = toast.loading("Menyiapkan dokumen...");
    try {
      const isDark = document.documentElement.classList.contains("dark");
      // Optimization for HTML2Canvas to avoid tainting and deal with memory limits
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: isDark ? "#050505" : "#ffffff",
        scale: 1.5, // Reduced slightly for memory stability on mobile
        useCORS: true,
        allowTaint: false,
        imageTimeout: 15000,
        logging: false
      });

      if (type === "jpg") {
        const link = document.createElement("a");
        link.download = `Laporan_Pasar_${activeDate.isoDate}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 0.9);
        link.click();
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
      toast.update(toastId, { render: "Berhasil diekspor!", type: "success", isLoading: false, autoClose: 2000 });
    } catch (e) {
      toast.update(toastId, { render: "Gagal mengekspor laporan", type: "error", isLoading: false, autoClose: 2000 });
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

  const handleDeleteAssignment = async (uid: string, marketId: string, name: string) => {
    if (!window.confirm(`Hapus penugasan "${name}"?`)) return;
    try {
      await adminRemoveAssignment(activeDate.isoDate, uid, marketId);
      toast.info("Penugasan dihapus");
    } catch (e) {
      toast.error("Gagal menghapus penugasan");
    }
  };

  const openForm = (market: any = null) => {
    setEditingMarket(market);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-zinc-900 dark:text-white font-sans transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-100 dark:border-white/10 transition-colors">
        <div className="max-w-6xl mx-auto px-3 h-12 flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors border border-zinc-200 dark:border-transparent"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-600 dark:text-white" />
          </button>
          <div className="flex-1 overflow-hidden">
            <h1 className="text-[10px] font-black tracking-[0.2em] uppercase text-zinc-400 dark:text-white/30 truncate">
              Admin Panel
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-0.5 bg-zinc-100 dark:bg-white/10 rounded-lg border border-zinc-200 dark:border-transparent">
              <button
                onClick={() => setActiveTab("users")}
                className={cn(
                  "px-3 py-0.5 rounded-md text-[9px] font-black transition-all uppercase tracking-wider",
                  activeTab === "users"
                    ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                    : "text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white",
                )}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab("master")}
                className={cn(
                  "px-3 py-0.5 rounded-md text-[9px] font-black transition-all uppercase tracking-wider",
                  activeTab === "master"
                    ? "bg-brand-secondary text-black shadow-md shadow-brand-secondary/20"
                    : "text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white",
                )}
              >
                Master
              </button>
            </div>
            <div className="w-px h-3 bg-zinc-100 dark:bg-white/10 mx-0.5" />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-3 py-4">
        <AnimatePresence mode="wait">
          {activeTab === "users" ? (
            <UserManagementView 
               users={users}
               assignments={assignments}
            />
          ) : (
            <MasterDataView 
              markets={filteredMarkets} 
              onAdd={() => openForm()} 
              onEdit={openForm} 
              onDelete={handleDeleteMarket}
              onSeed={seedData}
              isSeeding={isSeeding}
              search={search}
              setSearch={setSearch}
              filters={{
                wilayah: filterWilayah, setWilayah: setFilterWilayah,
                kategori: filterKategori, setKategori: setFilterKategori,
                pasaran: filterPasaran, setPasaran: setFilterPasaran
              }}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <MarketFormModal 
            market={editingMarket} 
            onClose={() => setIsModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Subviews Components ---

function ReportView({ assignments, activeDate, search, setSearch, onDelete, totalUsers, onExport, forwardedRef, markets }: any) {
  const stats = [
    { label: "Total Team", value: totalUsers, icon: Users, color: "text-blue-400" },
    { label: "Sudah Memilih", value: assignments.length, icon: CheckCircle2, color: "text-green-400" },
    { label: "Belum Memilih", value: Math.max(0, totalUsers - assignments.length), icon: AlertCircle, color: "text-red-400" },
    { label: "Laporan Hari", value: activeDate.pasaran, icon: Calendar, color: "text-brand-primary" },
  ];

  const filtered = assignments.filter((a: any) => 
    a.nama.toLowerCase().includes(search.toLowerCase()) || 
    a.pasarNama.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-end sm:items-center justify-between">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari personel atau pasar..."
              className="w-full sm:w-64 h-11 glass pl-10 pr-4 rounded-xl border border-white/10 outline-none focus:border-brand-primary/40 transition-all font-sans text-xs text-white placeholder:text-white/30"
            />
         </div>
         
         <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => onExport("pdf")}
              className="flex-1 sm:flex-none h-11 px-6 glass rounded-xl flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-widest text-white/60 hover:text-white transition-all bg-white/10 border-white/10"
            >
              <FileText className="w-3.5 h-3.5" />
              Export PDF
            </button>
            <button 
              onClick={() => onExport("jpg")}
              className="flex-1 sm:flex-none h-11 px-6 glass rounded-xl flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-widest text-white/60 hover:text-white transition-all bg-white/10 border-white/10"
            >
              <Download className="w-3.5 h-3.5" />
              JPG
            </button>
         </div>
      </div>

      <div ref={forwardedRef} className="p-4 bg-[#050505] rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
        {/* Report Header for Export */}
        <div className="mb-4 pt-1">
           <div className="flex items-center gap-3 mb-1">
              <div className="w-1.5 h-8 bg-brand-primary rounded-full shadow-[0_0_20px_rgba(0,255,255,0.3)]" />
              <div>
                 <h2 className="text-xl font-display font-black tracking-tight text-white uppercase italic">#GJY2026</h2>
                 <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">{activeDate.fullDate}</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
          {stats.map((s, i) => (
            <div key={i} className="glass p-3 rounded-xl border border-white/10 bg-white/[0.05]">
              <s.icon className={cn("w-4 h-4 mb-2.5", s.color)} />
              <p className="text-[9px] text-white/50 uppercase tracking-[0.15em] mb-1 font-bold">{s.label}</p>
              <p className="text-xl font-display font-black text-white">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="glass rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]">
          <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/[0.05]">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-brand-primary" />
              <h3 className="text-[10px] font-black uppercase tracking-wider">Team Rewanx</h3>
            </div>
            <span className="text-[9px] font-black text-brand-primary bg-brand-primary/20 border border-brand-primary/40 px-2 py-0.5 rounded-full uppercase tracking-widest">{filtered.length} Aktif</span>
          </div>
          <div className="overflow-x-auto text-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.05] text-[9px] uppercase tracking-[0.2em] text-white/60">
                  <th className="px-4 py-3 font-black">Personel</th>
                  <th className="px-4 py-3 font-black">Pasar</th>
                  <th className="px-4 py-3 font-black">Waktu</th>
                  <th className="px-4 py-3 font-black sr-only">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-white/10 italic text-xs font-medium tracking-wide">Belum ada data masuk hari ini</td>
                  </tr>
                ) : (
                  filtered.map((a: any) => (
                    <tr key={a.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-all group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img 
                            src={a.foto} 
                            className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/5 group-hover:ring-brand-primary/30 transition-all shadow-lg" 
                            alt="" 
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="font-black text-[11px] text-white group-hover:text-brand-primary transition-colors">{a.nama}</p>
                            <p className="text-[9px] text-white/20 font-medium tracking-tight mt-0.5">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-black text-xs text-white leading-tight">{a.pasarNama}</p>
                        <div className="flex items-center gap-1.5 mt-1 opacity-40">
                           <MapPin className="w-2.5 h-2.5 text-brand-primary" />
                           <span className="text-[9px] font-black uppercase tracking-widest">
                              {markets.find((m: any) => m.nama_pasar === a.pasarNama)?.wilayah || "DIY"}
                           </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-white/30 font-mono text-[10px]">
                          <Clock className="w-3 h-3 opacity-20" />
                          <span className="font-black">
                            {a.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => onDelete(a.uid, a.pasarId, a.nama)}
                          className="w-8 h-8 flex items-center justify-center text-white/5 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Export Footer */}
        <div className="mt-6 pt-4 border-t border-white/[0.03] flex justify-between items-center opacity-20">
           <p className="text-[7px] font-black uppercase tracking-[0.3em]">Field Operation System</p>
           <p className="text-[7px] font-mono">Generated at: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </motion.div>
  );
}


function UserManagementView({ users, assignments }: any) {
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
              <tr className="bg-zinc-50 dark:bg-white/[0.05] text-[10px] uppercase tracking-[0.2em] text-zinc-400 dark:text-white/60">
                <th className="px-6 py-4 font-black text-[10px]">User Detail</th>
                <th className="px-6 py-4 font-black text-[10px]">Aktivitas</th>
                <th className="px-6 py-4 font-black text-[10px]">Akses & Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {users.map((u: any) => {
                const isSelected = assignments.some((a: any) => a.uid === u.id);
                const lastLogin = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";
                
                return (
                  <tr
                    key={u.id}
                    className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 flex-shrink-0 rounded-full bg-zinc-100 dark:bg-white/10 p-0.5">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="w-full h-full rounded-full ring-1 ring-white/10" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-zinc-200 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-zinc-400">
                              {u.displayName?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <input
                            defaultValue={u.displayName}
                            onBlur={(e) => updateUserRoleAndStatus(u.id, u.role, u.status, e.target.value)}
                            className="font-semibold text-[13px] text-zinc-900 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-brand-primary/40 transition-colors w-full h-5 leading-none"
                          />
                          <p className="text-[10px] font-medium text-zinc-500 dark:text-white/30 truncate mt-0.5">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest">Login:</span>
                          <span className="text-[10px] font-semibold text-zinc-600 dark:text-white/60">{lastLogin}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest">Pasar:</span>
                          <span className={cn(
                            "text-[9px] font-black px-1.5 py-0.5 rounded-md",
                            isSelected ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                          )}>
                            {isSelected ? "SELESAI" : "BELUM"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="relative w-28">
                          <select
                            value={u.role || "Penyelam"}
                            onChange={(e) => updateUserRoleAndStatus(u.id, e.target.value, u.status || "active")}
                            className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 px-2 py-1.5 rounded-lg text-[10px] font-semibold outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer"
                          >
                            <option value="Admin" className="bg-zinc-900 text-white">Admin</option>
                            <option value="Penyelam" className="bg-zinc-900 text-white">Penyelam</option>
                            <option value="Sales" className="bg-zinc-900 text-white">Sales</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
                        </div>
                        <div className="relative w-28">
                          <select
                            value={u.status || "pending"}
                            onChange={(e) => updateUserRoleAndStatus(u.id, u.role || "Penyelam", e.target.value)}
                            className={cn(
                              "w-full px-2 py-1.5 rounded-lg text-[10px] font-semibold border outline-none appearance-none cursor-pointer transition-all",
                              u.status === "active"
                                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-500",
                            )}
                          >
                            <option value="active" className="bg-zinc-900 text-emerald-400">Active</option>
                            <option value="pending" className="bg-zinc-900 text-amber-500">Pending</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40 pointer-events-none" />
                        </div>
                      </div>
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
            const isSelected = assignments.some((a: any) => a.uid === u.id);
            const lastLogin = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";

            return (
              <div key={u.id} className="py-2 flex gap-3 items-center hover:bg-zinc-50 dark:hover:bg-white/[0.01] active:bg-zinc-100 dark:active:bg-white/[0.02] transition-colors px-2">
                <div className="w-9 h-9 flex-shrink-0 rounded-full bg-zinc-100 dark:bg-white/10 p-0.5 border border-zinc-200 dark:border-white/20">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="" className="w-full h-full rounded-full ring-1 ring-white/10" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-zinc-200 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-zinc-400">
                      {u.displayName?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <input
                        defaultValue={u.displayName}
                        onBlur={(e) => updateUserRoleAndStatus(u.id, u.role, u.status, e.target.value)}
                        className="font-semibold text-[12px] text-zinc-900 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-brand-primary/40 transition-colors w-full h-4 leading-none"
                      />
                      <div className="flex items-center gap-1.5 mt-0.5 text-[8px] font-medium text-zinc-500 dark:text-white/30 truncate">
                        <span>{u.email}</span>
                        <span className="opacity-30">•</span>
                        <span>{lastLogin !== '-' ? `Login: ${lastLogin}` : 'Belum Login'}</span>
                      </div>
                    </div>
                    <div className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded-md shrink-0 ml-2 mt-0.5",
                      isSelected ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {isSelected ? "SELESAI" : "BELUM"}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-1.5">
                    <div className="relative flex-1">
                        <select
                          value={u.role || "Penyelam"}
                          onChange={(e) => updateUserRoleAndStatus(u.id, e.target.value, u.status || "active")}
                          className="w-full bg-transparent border border-zinc-100 dark:border-white/10 px-1 py-1 rounded-md text-[9px] font-semibold outline-none text-zinc-900 dark:text-white appearance-none cursor-pointer"
                        >
                          <option value="Admin" className="bg-zinc-900 text-white">Admin</option>
                          <option value="Penyelam" className="bg-zinc-900 text-white">Penyelam</option>
                          <option value="Sales" className="bg-zinc-900 text-white">Sales</option>
                        </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
                    </div>
                    <div className="relative flex-1">
                        <select
                          value={u.status || "pending"}
                          onChange={(e) => updateUserRoleAndStatus(u.id, u.role || "Penyelam", e.target.value)}
                          className={cn(
                            "w-full px-2 py-1.5 rounded-lg text-[10px] font-semibold border outline-none appearance-none cursor-pointer transition-all",
                            u.status === "active"
                              ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-500",
                          )}
                        >
                          <option value="active" className="bg-zinc-900 text-emerald-400">Active</option>
                          <option value="pending" className="bg-zinc-900 text-amber-500">Pending</option>
                        </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40 pointer-events-none" />
                    </div>
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama pasar atau wilayah..."
            className="w-full h-11 bg-white dark:bg-white/5 pl-11 pr-4 rounded-xl border border-zinc-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-brand-primary/20 dark:focus:ring-brand-primary/10 transition-all font-sans text-[13px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/20 shadow-sm"
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={onAdd}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black font-black text-[9px] uppercase tracking-[0.18em] shadow-sm hover:translate-y-[-1px] hover:shadow-md transition-all duration-200 active:scale-95 gap-1.5"
          >
            <Plus className="w-3 h-3" />
            Tambah Pasar
          </button>
        </div>

        {/* Filters Hub */}
        <div className="grid grid-cols-3 gap-2">
          <div className="relative">
            <select
              value={filters.wilayah}
              onChange={(e) => filters.setWilayah(e.target.value)}
              className="w-full h-[38px] bg-white dark:bg-white/5 px-2.5 rounded-[10px] text-[11px] font-bold border border-zinc-100 dark:border-white/5 outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer transition-colors shadow-sm"
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
              className="w-full h-[38px] bg-white dark:bg-white/5 px-2.5 rounded-[10px] text-[11px] font-bold border border-zinc-100 dark:border-white/5 outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer transition-colors shadow-sm"
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
              className="w-full h-[38px] bg-white dark:bg-white/5 px-2.5 rounded-[10px] text-[11px] font-bold border border-zinc-100 dark:border-white/5 outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer transition-colors shadow-sm"
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
              <tr className="bg-zinc-50 dark:bg-white/[0.05] text-[10px] uppercase font-black tracking-widest text-zinc-400 dark:text-white/60">
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
                    className="px-6 py-20 text-center text-zinc-400 dark:text-white/10 italic text-sm font-black tracking-[0.2em] uppercase"
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
                    <td className="px-6 py-4 font-black text-sm tracking-tight text-zinc-900 dark:text-white">
                      {m.nama_pasar}
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-zinc-500 dark:text-white/60 uppercase">
                      {m.wilayah}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(m.kategori) ? m.kategori : [m.kategori])
                          .map((id: any, idx: number) => (
                            <span
                              key={typeof id === 'string' ? `${id}-${idx}` : `kat-${idx}`}
                              className="px-2 py-0.5 rounded-md bg-brand-secondary/10 dark:bg-brand-secondary/20 text-brand-secondary/80 text-[9px] font-black uppercase"
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
                        <span className="text-[10px] text-emerald-600 dark:text-brand-primary font-black uppercase tracking-[0.1em] border border-emerald-200 dark:border-brand-primary/20 px-2 py-0.5 rounded-md">
                          HARIAN
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {m.pasaran?.map((p: string, pIdx: number) => (
                            <span
                              key={`${p}-${pIdx}`}
                              className="text-[9px] px-2 py-0.5 bg-amber-50 dark:bg-yellow-500/10 text-amber-600 dark:text-yellow-400 rounded-md border border-amber-200 dark:border-yellow-500/20 font-black uppercase"
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
                                  ? JSON.stringify(jam)
                                  : String(jam);
                              return (
                                <div
                                  key={`${cat}-${jamIdx}`}
                                  className="flex items-center gap-2 text-[10px]"
                                >
                                  <span className="text-zinc-400 dark:text-brand-primary/60 font-black uppercase">
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
                          : <span className="text-zinc-600 dark:text-white/40 font-mono text-[10px]">{String(m.jam_buka || "")}</span>}
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
            <div className="py-12 text-center text-zinc-400 dark:text-white/10 italic text-xs font-black uppercase tracking-widest">
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
                    <h4 className="font-semibold text-[13px] leading-tight text-zinc-900 dark:text-white uppercase tracking-tight truncate transition-colors">
                      {m.nama_pasar}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] font-medium text-zinc-500 dark:text-white/40 uppercase tracking-wide">
                      <span>{m.wilayah}</span>
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
                                const jamStr = typeof jam === 'object' ? JSON.stringify(jam) : String(jam);
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

function MarketFormModal({ market, onClose }: any) {
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
    <motion.div
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[60] bg-white dark:bg-[#050505] overflow-y-auto"
    >
      <div className="w-full max-w-lg mx-auto min-h-screen flex flex-col">
        <div className="sticky top-0 z-10 bg-white dark:bg-[#050505] p-5 border-b border-zinc-100 dark:border-white/5 flex items-center gap-4">
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-display font-black tracking-widest text-zinc-900 dark:text-white uppercase italic">
            {market ? "Edit Master Data" : "Tambah Master Data"}
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col relative"
        >
          <div className="p-5 space-y-6 pb-6">
            <div className="space-y-2">
            <label className="text-[10px] text-zinc-400 dark:text-white/60 uppercase tracking-[0.2em] font-black block pl-1">
              Nama Pasar Target
            </label>
            <input
              type="text"
              value={formData.nama_pasar}
              onChange={(e) =>
                setFormData({ ...formData, nama_pasar: e.target.value })
              }
              placeholder="Masukan nama lengkap pasar..."
              className="w-full h-12 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl px-4 outline-none focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary transition-all text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-white/10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-400 dark:text-white/60 uppercase tracking-[0.2em] font-black block pl-1">
                Wilayah Kabupaten
              </label>
              <div className="relative">
                <select
                  value={formData.wilayah}
                  onChange={(e) =>
                    setFormData({ ...formData, wilayah: e.target.value })
                  }
                  className="w-full h-12 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl px-4 outline-none appearance-none cursor-pointer text-sm font-bold text-zinc-900 dark:text-white"
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
              <label className="text-[10px] text-zinc-400 dark:text-white/60 uppercase tracking-[0.2em] font-black block pl-1">
                Kategori Operasi
              </label>
              <div className="flex flex-wrap gap-2">
                {KATEGORI_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleKategori(o.id)}
                    className={cn(
                      "flex-1 min-w-[90px] h-10 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all",
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
              <label className="text-[10px] text-zinc-400 dark:text-white/60 uppercase tracking-[0.2em] font-black">
                Konfigurasi Jam Buka
              </label>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, buka_harian: !formData.buka_harian })
                }
                className={cn(
                  "h-10 px-4 rounded-xl border flex items-center justify-center gap-2 font-black text-[10px] tracking-widest transition-all uppercase",
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
                    <span className="text-[10px] text-zinc-500 dark:text-white/80 font-black uppercase tracking-wider">
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
                    className="w-full h-11 bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-4 outline-none text-xs font-mono font-bold text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-white/10 focus:border-brand-primary/40"
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
              <label className="text-[10px] text-zinc-400 dark:text-white/60 uppercase tracking-[0.2em] font-black block pl-1">
                Pilih Hari Pasaran
              </label>
              <div className="flex flex-wrap gap-2">
                {PASARAN_OPTIONS.map((p, pIdx) => (
                  <button
                    key={`${p}-${pIdx}`}
                    type="button"
                    onClick={() => togglePasaran(p)}
                    className={cn(
                      "flex-1 min-w-[80px] h-10 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
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

          <div className="sticky bottom-0 p-5 mt-auto bg-white dark:bg-[#050505] border-t border-zinc-100 dark:border-white/5 flex justify-center gap-3 z-20">
            <button
              type="button"
              onClick={onClose}
              className="w-full max-w-[140px] h-12 bg-zinc-100 dark:bg-white/10 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] text-zinc-500 dark:text-white/60 hover:bg-zinc-200 dark:hover:bg-white/20 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full max-w-[200px] h-12 bg-zinc-900 dark:bg-brand-secondary text-white dark:text-black rounded-2xl font-semibold uppercase tracking-[0.2em] text-[10px] shadow-xl transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 flex items-center justify-center"
            >
              {isSubmitting ? "Processing..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

