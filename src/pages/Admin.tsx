import React, { useEffect, useState, useMemo, useRef } from "react";
import { subscribeMarkets, subscribeAssignments, addMarket, updateMarket, removeMarket, adminRemoveAssignment, subscribeUsers, updateUser } from "../firebase/services";
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
      // Optimization for HTML2Canvas to avoid tainting and deal with memory limits
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#050505",
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
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-6xl mx-auto px-3 h-12 flex items-center gap-2">
          <button onClick={onBack} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1">
            <h1 className="text-[12px] font-display font-black tracking-widest italic tracking-tighter">#GJY2026</h1>
          </div>
          
          <div className="flex gap-0.5 p-0.5 bg-white/10 rounded-lg">
            <button 
              onClick={() => setActiveTab("users")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[9px] font-bold transition-all",
                activeTab === "users" ? "bg-brand-primary text-black" : "text-white/60 hover:text-white"
              )}
            >
              USER MGMT
            </button>
            <button 
              onClick={() => setActiveTab("master")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[9px] font-bold transition-all",
                activeTab === "master" ? "bg-brand-secondary text-black" : "text-white/60 hover:text-white"
              )}
            >
              MASTER
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-3 py-4">
        <AnimatePresence mode="wait">
          {activeTab === "users" ? (
            <UserManagementView 
               users={users}
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


function UserManagementView({ users }: any) {
  const updateUserRoleAndStatus = async (uid: string, role: string, status: string, displayName?: string) => {
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
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
       <div className="glass rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]">
         <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.05] text-[9px] uppercase tracking-[0.2em] text-white/60">
                <th className="px-4 py-3 font-black">User</th>
                <th className="px-4 py-3 font-black">Email</th>
                <th className="px-4 py-3 font-black">Role</th>
                <th className="px-4 py-3 font-black">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.photoURL && <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded-full ring-1 ring-white/10" />}
                      <input 
                        defaultValue={u.displayName}
                        onBlur={(e) => updateUserRoleAndStatus(u.id, u.role, u.status, e.target.value)}
                        className="font-bold text-[11px] text-white bg-transparent outline-none border-b border-transparent focus:border-brand-primary/40"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-white/60">{u.email}</td>
                  <td className="px-4 py-3">
                    <select 
                      value={u.role || 'Penyelam'}
                      onChange={(e) => updateUserRoleAndStatus(u.id, e.target.value, u.status || 'active')}
                      className="bg-white/10 border border-white/10 p-1 rounded text-[10px] outline-none focus:border-brand-primary/40 text-white"
                    >
                      <option value="Admin" className="bg-black">Admin</option>
                      <option value="Penyelam" className="bg-black">Penyelam</option>
                      <option value="Sales" className="bg-black">Sales</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                     <select 
                      value={u.status || 'pending'}
                      onChange={(e) => updateUserRoleAndStatus(u.id, u.role || 'Penyelam', e.target.value)}
                      className={cn("p-1 rounded text-[10px] border outline-none", u.status === 'active' ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-yellow-500/10 border-yellow-500/30 text-yellow-500")}
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
         </table>
       </div>
    </motion.div>
  );
}

function MasterDataView({ markets, onAdd, onEdit, onDelete, onSeed, isSeeding, search, setSearch, filters }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
          <input 
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search markets..."
            className="w-full h-10 glass pl-10 pr-4 rounded-xl border border-white/10 outline-none focus:ring-1 focus:ring-brand-secondary/50 transition-all font-sans text-xs text-white placeholder:text-white/20"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onSeed} disabled={isSeeding}
            className="h-10 px-4 glass rounded-xl flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all bg-white/10 border-white/10 disabled:opacity-50"
          >
            <Database className="w-3 h-3" />
            Seed
          </button>
          <button 
            onClick={onAdd}
            className="h-10 px-4 bg-brand-secondary text-black rounded-xl flex items-center gap-2 text-[9px] font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg uppercase"
          >
            <Plus className="w-3.5 h-3.5" />
            MARKET
          </button>
        </div>
      </div>

      {/* Filters Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mb-4">
        <select 
          value={filters.wilayah} onChange={(e) => filters.setWilayah(e.target.value)}
          className="h-9 glass px-3 rounded-lg text-[10px] border border-white/10 outline-none font-bold text-white bg-black/40"
        >
          <option value="" className="bg-black">Semua Wilayah</option>
          {WILAYAH_OPTIONS.map(w => <option key={w} value={w} className="bg-black">{w}</option>)}
        </select>
        <select 
          value={filters.kategori} onChange={(e) => filters.setKategori(e.target.value)}
          className="h-9 glass px-3 rounded-lg text-[10px] border border-white/10 outline-none font-bold text-white bg-black/40"
        >
          <option value="" className="bg-black">Semua Kategori</option>
          {KATEGORI_OPTIONS.map(k => <option key={k.id} value={k.id} className="bg-black">{k.label}</option>)}
        </select>
        <select 
          value={filters.pasaran} onChange={(e) => filters.setPasaran(e.target.value)}
          className="h-9 glass px-3 rounded-lg text-[10px] border border-white/10 outline-none font-bold text-white bg-black/40"
        >
          <option value="" className="bg-black">Semua Hari Pasaran</option>
          {PASARAN_OPTIONS.map(p => <option key={p} value={p} className="bg-black">{p}</option>)}
        </select>
      </div>

      {/* Desktop Table / Mobile Cards */}
      <div className="hidden lg:block glass rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black/20">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-white/[0.05] text-[8px] uppercase font-black tracking-widest text-white/60">
              <th className="px-3 py-3">Nama Pasar</th>
              <th className="px-3 py-3">Wilayah</th>
              <th className="px-3 py-3">Kategori</th>
              <th className="px-3 py-3">Operasional</th>
              <th className="px-3 py-3">Buka</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {markets.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-12 text-center text-white/40 italic text-xs">No markets found</td></tr>
            ) : (
              markets.map((m: any, i: number) => (
                <tr key={m.id} className={cn("group hover:bg-white/[0.05] transition-colors border-t border-white/10", i !== 0 && "border-t")}>
                  <td className="px-3 py-2 font-bold text-[11px] tracking-tight text-white">{m.nama_pasar}</td>
                  <td className="px-3 py-2 text-[9px] text-white/60">{m.wilayah}</td>
                  <td className="px-2 py-2 text-[9px] text-brand-secondary/80 font-bold uppercase tracking-tighter">
                    {(Array.isArray(m.kategori) ? m.kategori : [m.kategori])
                      .map(id => KATEGORI_OPTIONS.find(o => o.id === id)?.label.replace('Pasar ', '').toUpperCase() || String(id).replace('PASAR_', ''))
                      .join(', ')
                    }
                  </td>
                  <td className="px-3 py-2">
                    {m.buka_harian ? (
                      <span className="text-[9px] text-brand-primary font-bold">HARIAN</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {m.pasaran?.map((p: string) => (
                          <span key={p} className="text-[7px] px-1 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/20 font-bold">{p}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[9px] font-mono text-white/40">
                      {typeof m.jam_buka === 'object' && m.jam_buka !== null
                        ? Object.entries(m.jam_buka).map(([cat, jam]) => {
                            const label = String(KATEGORI_OPTIONS.find(o => o.id === cat)?.label || cat);
                            const jamStr = typeof jam === 'object' ? JSON.stringify(jam) : String(jam);
                            return (
                                <div key={String(cat)} className="flex gap-1">
                                    <span className="opacity-50 text-brand-primary/60">{label.replace('Pasar ', '').substring(0, 5).toUpperCase()}:</span>
                                    <span className="text-white/60">{jamStr}</span>
                                </div>
                            );
                          }) 
                        : String(m.jam_buka || "")}
                    </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(m)} className="p-1 glass hover:bg-white/20 rounded-md text-white/60 hover:text-white transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => onDelete(m.id, m.nama_pasar)} className="p-1 glass hover:bg-red-500/30 rounded-md text-white/60 hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="lg:hidden space-y-2">
        {markets.map((m: any) => (
          <div key={m.id} className="glass p-3 rounded-xl border border-white/10 relative group bg-white/[0.02]">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-sm leading-tight text-white mb-0.5">{m.nama_pasar}</h4>
                <p className="text-[9px] text-white/60 flex items-center gap-1 font-bold italic tracking-tight"><MapPin className="w-2.5 h-2.5 text-brand-primary" /> {m.wilayah}</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => onEdit(m)} className="w-7 h-7 flex items-center justify-center glass rounded-lg border-white/10 text-white/60 hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => onDelete(m.id, m.nama_pasar)} className="w-7 h-7 flex items-center justify-center glass rounded-lg border-white/10 text-red-500/60 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                <p className="text-[8px] text-white/40 uppercase mb-0.5 font-black tracking-widest">Waktu</p>
                <p className="text-[10px] font-bold text-white/80">{m.buka_harian ? "Harian" : m.pasaran?.join(", ")}</p>
              </div>
              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                <p className="text-[8px] text-white/40 uppercase mb-0.5 font-black tracking-widest">Jam</p>
                <div className="text-[10px] font-mono text-white/80">
                  {typeof m.jam_buka === 'object' && m.jam_buka !== null
                    ? Object.entries(m.jam_buka).map(([cat, jam]) => {
                        const label = String(KATEGORI_OPTIONS.find(o => o.id === cat)?.label || cat);
                        const jamStr = typeof jam === 'object' ? JSON.stringify(jam) : String(jam);
                        return (
                            <div key={String(cat)} className="flex gap-1"><span className="opacity-50 text-brand-primary/60">{label.replace('Pasar ', '').substring(0, 5).toUpperCase()}:</span> {jamStr}</div>
                        );
                      }) 
                    : String(m.jam_buka || "")}
                </div>
              </div>
            </div>
          </div>
        ))}
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
      if (typeof market?.jam_buka === 'object' && market?.jam_buka !== null) {
        const sanitized = {} as any;
        Object.entries(market.jam_buka).forEach(([k, v]) => {
          if (k !== "[object Object]") sanitized[String(k)] = v;
        });
        return sanitized;
      }
      
      const kategoriArray = Array.isArray(market?.kategori) 
        ? market.kategori.map((k: any) => typeof k === 'object' ? String(k.id || "PASAR_UMUM") : String(k))
        : (market?.kategori 
            ? [typeof market.kategori === 'object' ? String(market.kategori.id || "PASAR_UMUM") : String(market.kategori)] 
            : ["PASAR_UMUM"]
          );
      
      const newJam = {} as any;
      kategoriArray.forEach((k: string) => {
        if (k && k !== "undefined" && k !== "[object Object]") {
          newJam[k] = typeof market?.jam_buka === 'string' ? market.jam_buka : "";
        }
      });
      return newJam;
    })(),
    kategori: Array.isArray(market?.kategori) 
      ? market.kategori.map((k: any) => typeof k === 'object' ? String(k.id || "PASAR_UMUM") : String(k)).filter((k: string) => k !== "[object Object]" && k !== "undefined")
      : (market?.kategori 
          ? [typeof market.kategori === 'object' ? String(market.kategori.id || "PASAR_UMUM") : String(market.kategori)].filter(k => k !== "[object Object]" && k !== "undefined") 
          : ["PASAR_UMUM"]),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePasaran = (p: string) => {
    const upperP = p.toUpperCase();
    if (formData.pasaran.includes(upperP)) {
      setFormData({ ...formData, pasaran: formData.pasaran.filter((x: string) => x !== upperP) });
    } else {
      setFormData({ ...formData, pasaran: [...formData.pasaran, upperP] });
    }
  };

  const toggleKategori = (id: string) => {
    if (formData.kategori.includes(id)) {
      setFormData({ ...formData, kategori: formData.kategori.filter((x: string) => x !== id) });
    } else {
      setFormData({ ...formData, kategori: [...formData.kategori, id] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_pasar) return toast.error("Nama Pasar wajib diisi");
    if (!formData.jam_buka) return toast.error("Jam Buka wajib diisi");
    if (!formData.buka_harian && formData.pasaran.length === 0) return toast.error("Pilih minimal satu hari pasaran");

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
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
        className="glass w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-display font-bold">{market ? "Edit Pasar" : "Pasar Baru"}</h2>
            <p className="text-[8px] text-white/40 uppercase tracking-widest mt-0.5">Master Data</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-3.5 h-3.5 text-white/40" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-1.5">
            <label className="text-[9px] text-white/60 uppercase tracking-[0.1em] font-black">Nama Pasar</label>
            <input 
              type="text" value={formData.nama_pasar} onChange={(e) => setFormData({...formData, nama_pasar: e.target.value})}
              placeholder="Nama pasar..."
              className="w-full h-10 bg-white/10 border border-white/20 rounded-lg px-3 outline-none focus:border-brand-secondary/60 transition-all text-xs text-white placeholder:text-white/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] text-white/60 uppercase tracking-[0.1em] font-black">Wilayah</label>
              <div className="relative">
                <select 
                  value={formData.wilayah} onChange={(e) => setFormData({...formData, wilayah: e.target.value})}
                  className="w-full h-10 bg-white/10 border border-white/20 rounded-lg px-3 outline-none appearance-none cursor-pointer text-xs text-white"
                >
                  {WILAYAH_OPTIONS.map(o => <option key={o} value={o} className="bg-black">{o}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] text-white/60 uppercase tracking-[0.1em] font-black">Kategori</label>
              <div className="flex flex-wrap gap-1.5">
                {KATEGORI_OPTIONS.map(o => (
                    <button
                        key={o.id} type="button"
                        onClick={() => toggleKategori(o.id)}
                        className={cn(
                            "flex-1 min-w-[80px] h-9 rounded-md border text-[9px] font-black uppercase tracking-tight transition-all",
                            formData.kategori.includes(o.id) ? "bg-brand-primary text-black border-brand-primary" : "bg-white/10 border-white/10 text-white/40"
                        )}
                    >
                        {o.label}
                    </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[9px] text-white/60 uppercase tracking-[0.1em] font-black">Jam Buka Per Kategori</label>
              <button 
                type="button"
                onClick={() => setFormData({...formData, buka_harian: !formData.buka_harian})}
                className={cn(
                  "h-9 px-4 rounded-lg border flex items-center justify-center gap-2 font-black text-[9px] tracking-widest transition-all",
                  formData.buka_harian ? "bg-brand-primary text-black border-brand-primary" : "bg-white/10 border-white/20 text-white/60"
                )}
              >
                {formData.buka_harian ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                BUKA HARIAN
              </button>
            </div>
             
            {formData.kategori.map(cat => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-[10px] text-white/80 w-32 truncate font-bold">{KATEGORI_OPTIONS.find(o => o.id === cat)?.label}</span>
                <input 
                  type="text" 
                  value={formData.jam_buka[cat] || ""} 
                  onChange={(e) => setFormData({...formData, jam_buka: {...formData.jam_buka, [cat]: e.target.value}})}
                  placeholder="02:00 - 10:00"
                  className="flex-1 h-10 bg-white/10 border border-white/20 rounded-lg px-3 outline-none text-xs font-mono text-white placeholder:text-white/20 focus:border-brand-primary/40"
                />
              </div>
            ))}
          </div>

          {!formData.buka_harian && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
              <label className="text-[9px] text-white/60 uppercase tracking-[0.1em] font-black">Hari Pasaran</label>
              <div className="flex flex-wrap gap-1.5">
                {PASARAN_OPTIONS.map(p => (
                  <button
                    key={p} type="button"
                    onClick={() => togglePasaran(p)}
                    className={cn(
                      "flex-1 min-w-[70px] h-9 rounded-md border text-[9px] font-black uppercase tracking-tight transition-all",
                      formData.pasaran.includes(p.toUpperCase()) ? "bg-brand-secondary text-black border-brand-secondary" : "bg-white/10 border-white/10 text-white/40"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <div className="pt-1 flex gap-2">
            <button 
              type="button" onClick={onClose}
              className="flex-1 h-9 glass rounded-lg font-black uppercase tracking-[0.1em] text-[10px] hover:bg-white/10 transition-all"
            >
              BATAL
            </button>
            <button 
              type="submit" disabled={isSubmitting}
              className="flex-[2] h-9 bg-brand-secondary text-black rounded-lg font-black uppercase tracking-[0.1em] text-[10px] shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? "WAIT..." : (market ? "SIMPAN" : "TAMBAH")}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

