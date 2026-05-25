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
import { ArrowLeft } from "lucide-react";
import { toast } from "../../hooks/use-toast";
import { ThemeToggle } from "../../components/ThemeToggle";
import { toTitleCase } from "../../utils/format";
import dayjs from "dayjs";
import "dayjs/locale/id";
import relativeTime from "dayjs/plugin/relativeTime";
import { useModal } from '../../hooks/use-modal';
import { db } from "../../firebase/config";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { MarketFormContent } from "./Master";
import { useRuntime } from "../../providers/RuntimeProvider";
import { Sidebar } from "../../components/admin/Sidebar";

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
  const navigate = useNavigate();
  const location = useLocation();
  const { openModal, openDrawer, closeAllModals } = useModal();
  const { activeBranchContext } = useRuntime();
  
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
    <div className="min-h-screen w-full bg-white dark:bg-[#050505] text-zinc-900 dark:text-white font-sans transition-colors duration-300 flex">
      <Sidebar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
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
    </div>
  );
}
