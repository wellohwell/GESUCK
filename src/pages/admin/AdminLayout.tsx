import React, { useEffect, useState, useMemo } from "react";
import { 
  subscribeMarkets, 
  subscribeMarketPlans, 
  addMarket, 
  updateMarket, 
  removeMarket, 
  subscribeUsers, 
  subscribeMarketPlansByMonth,
  getMarketsCollectionPath
} from "../../lib/services";
import { getActiveSystemDate } from "../../utils/javaneseDate";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Menu, X, LogOut } from "lucide-react";
import { toast } from "../../hooks/use-toast";
import { ThemeToggle } from "../../components/ThemeToggle";
import { toTitleCase } from "../../utils/format";
import dayjs from "dayjs";
import "dayjs/locale/id";
import relativeTime from "dayjs/plugin/relativeTime";
import { useModal } from '../../hooks/use-modal';
import { db, auth } from "../../firebase/config";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { MarketFormContent } from "./Master";
import { useRuntime } from "../../providers/RuntimeProvider";
import { Sidebar } from "../../components/admin/Sidebar";
import { useNavigation } from "../../hooks/useNavigation";
import { getIconComponent } from "../../config/appShell";
import { useAuth } from "../../providers/AuthProvider";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

dayjs.extend(relativeTime);
dayjs.locale("id");

interface AdminProps {
  onBack?: () => void;
}

const SAMPLE_MARKETS = [
  { nama_pasar: "PS PONJONG", wilayah: "Gunungkidul", pasaran: ["PON", "LEGI"], buka_harian: true, jam_buka: "02:00 - 10:00", kategori: "PASAR_UMUM" },
  { nama_pasar: "PS KARANG MOJO", wilayah: "Gunungkidul", pasaran: ["PAHING"], buka_harian: true, jam_buka: "02:00 - 10:00", kategori: "PASAR_UMUM" },
  { nama_pasar: "ps. KUWON", wilayah: "Gunungkidul", pasaran: ["PON", "LEGI", "KLIWON"], buka_harian: false, jam_buka: "03:00 - 08:00", kategori: "PASAR_SUBUH" },
  { nama_pasar: "PS BERINGHARJO", wilayah: "Kota Yogyakarta", pasaran: [], buka_harian: true, jam_buka: "05:00 - 17:00", kategori: "PASAR_UMUM" },
];

export default function AdminLayout({ onBack }: AdminProps) {
  useEffect(() => {
    console.log("Admin mounted");
    return () => console.log("Admin unmounted");
  }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const { openModal, openDrawer, closeAllModals } = useModal();
  const { activeBranchContext } = useRuntime();
  const { profile, firebaseUser } = useAuth();
  const navItems = useNavigation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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

  const openForm = (market: any = null) => {
    openModal({
      type: "fullscreen",
      hideCloseButton: true,
      content: <MarketFormContent market={market} onClose={closeAllModals} />,
    });
  };

  useEffect(() => {
    const unsubMarkets = subscribeMarkets(setMarkets, activeBranchContext);
    const unsubAssignments = subscribeMarketPlans(activeDate.isoDate, setAssignments);
    const unsubUsers = subscribeUsers(setUsers);
    const unsubMonthlyPlans = subscribeMarketPlansByMonth(selectedMonth, setAllMonthlyPlans);
    
    return () => {
      unsubMarkets();
      unsubAssignments();
      unsubUsers();
      unsubMonthlyPlans();
    };
  }, [activeDate.isoDate, selectedMonth, activeBranchContext]);

  const seedData = async () => {
    if (!window.confirm("Hapus semua data pasar lama dan muat data sampel?")) return;
    setIsSeeding(true);
    try {
      const path = getMarketsCollectionPath(activeBranchContext);
      const q = await getDocs(collection(db, path));
      for (const d of q.docs) await deleteDoc(doc(db, path, d.id));
      for (const market of SAMPLE_MARKETS) await addMarket(market, activeBranchContext);
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
      await removeMarket(id, activeBranchContext);
      toast.info("Pasar berhasil dihapus");
    } catch (e) {
      toast.error("Gagal menghapus pasar");
    }
  };

  const handleBack = () => {
    const cleanPath = location.pathname.replace(/\/$/, "");
    if (cleanPath === "/admin" || cleanPath === "/owner") {
      if (typeof onBack === "function") {
        onBack();
      } else {
        navigate("/workspace/home");
      }
    } else {
      if (cleanPath.startsWith("/owner")) {
        navigate("/owner");
      } else {
        navigate("/admin");
      }
    }
  };

  // Dynamic Page Title
  const pageTitle = useMemo(() => {
    const cleanPath = location.pathname.replace(/\/$/, "");
    if (cleanPath.endsWith("/insight")) return "MARKET INSIGHT";
    if (cleanPath.endsWith("/user") || cleanPath.endsWith("/users")) return "USER DETAIL & PENUGASAN";
    if (cleanPath.endsWith("/master")) return "DATA MASTER PASAR";
    if (cleanPath.endsWith("/branches")) return "MANAJEMEN CABANG";
    if (cleanPath.endsWith("/modules")) return "TATA KELOLA MODUL";
    if (cleanPath.endsWith("/navigation")) return "TATA KELOLA NAVIGASI";
    if (cleanPath.endsWith("/docs")) return "ARSITEKTUR & STANDAR";
    if (cleanPath === "/owner") return "OWNER SYSTEM CONTROL";
    if (cleanPath === "/admin") return "MANAGER DASHBOARD";
    return "ADMIN PANEL";
  }, [location.pathname]);

  return (
    <div className="min-h-screen w-full bg-card dark:bg-[#050505] text-zinc-900 dark:text-white font-sans transition-colors duration-300 flex flex-col md:flex-row relative">
      <Sidebar />
      
      {/* Sticky top app bar for mobile */}
      <div className="md:hidden sticky top-0 z-[50] flex items-center justify-between border-b border-border/50/60 border-border/50/60 bg-card/95 dark:bg-[#050505]/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 mx-auto" />
          </button>
          
          <h1 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white truncate max-w-[180px]">
            {pageTitle}
          </h1>
        </div>

        {/* Back navigation button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50/60 border-border/50/60 bg-zinc-50 bg-card/40 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all active:scale-95 uppercase tracking-wider hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Kembali</span>
        </button>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 md:py-6 pb-24 md:pb-6">
        <Outlet context={{ 
            markets, 
            assignments, 
            users, 
            plans: allMonthlyPlans, 
            handleDeleteMarket, 
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
            filteredMarkets,
            openForm
        }} />
      </main>

      {/* Mobile slide drawer / sheet */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-sm md:hidden"
            />

            {/* Slide Sheet Drawer (aligned to the left) */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-[80] w-[280px] bg-background border-r border-border/50 dark:border-zinc-900 shadow-2xl flex flex-col p-5 md:hidden"
            >
              <div className="flex items-center justify-between mb-8 border-b border-zinc-100 border-border/50 pb-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50 leading-none">VORK SYSTEM</h2>
                  <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mt-1">SaaS CRM Platform</p>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-650 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors"
                >
                  <X className="w-5 h-5 mx-auto" />
                </button>
              </div>

              {/* Navigation Items replicated */}
              <nav className="flex-1 overflow-y-auto space-y-1.5 pr-2">
                <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3 pl-2">System</div>
                {navItems.map((item) => {
                  const Icon = getIconComponent(item.icon);
                  const isActive = location.pathname === item.route || 
                                  (item.route !== '/workspace/home' && item.route !== '/' && location.pathname.startsWith(item.route));
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigate(item.route);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[1.25rem] text-[11px] font-bold uppercase tracking-wider transition-all",
                        isActive
                          ? "bg-primary/10 text-primary border border-primary/10 shadow-sm"
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0 mx-auto" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Quick profile / signout */}
              <div className="border-t border-zinc-100 dark:border-zinc-900 pt-4 mt-auto">
                <div className="flex items-center justify-between gap-3 bg-zinc-50 bg-card/50 p-2.5 rounded-[1.25rem]">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-tight truncate leading-none">
                      {profile?.nama || firebaseUser?.email || "User"}
                    </h4>
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1.5 inline-block leading-none">
                      {profile?.role || "Manager"}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      if (window.confirm("Apakah Anda yakin ingin keluar dari Vork?")) {
                        await auth.signOut();
                      }
                    }}
                    className="p-2 rounded-lg bg-zinc-100 hover:bg-red-500/10 hover:text-red-500 dark:bg-zinc-800 transition-colors flex items-center justify-center"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
