import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  subscribeMarketPlans,
  subscribeAllMarketPlans,
  addMarketPlan,
  deleteMarketPlan,
  subscribeMarkets,
  subscribeUsers,
  removeMarket
} from "../lib/services";
import { auth } from "../firebase/config";
import {
  Plus,
  X,
  Users,
  CheckCircle2,
  Trash2,
  Search,
  AlertTriangle,
  Download,
  Edit2,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "../hooks/use-toast";
import { cn } from "../lib/utils";
import { getActiveSystemDate } from "../utils/javaneseDate";
import { toTitleCase } from "../utils/format";
import dayjs from "dayjs";
import dayOfYear from "dayjs/plugin/dayOfYear";
import "dayjs/locale/id";

import { useRole, useBranch } from "../hooks/authHooks";
import { ROLES } from "../config/roles";
import { useModal } from "../hooks/use-modal";
import { MasterDataView, MarketFormContent } from "./admin/Master";
import { useSearchParams } from "react-router-dom";
import { ActionButton } from "../components/ui/buttons";
import Report from "./Report";
import { TambahRencanaModal } from "../features/market-plans/modals/TambahRencanaModal";
import { PlanItem } from "../features/market-plans/components/PlanItem";
import { SharedMarketPlanRenderer } from "../features/market-plans/components/SharedMarketPlanRenderer";
import { MarketTemperature } from "../features/market-plans/components/MarketTemperature";

dayjs.extend(dayOfYear);
dayjs.locale("id");


const WILAYAH_EXACT = [
  "Kota Yogyakarta",
  "Sleman",
  "Bantul",
  "Gunungkidul",
  "Kulon Progo",
  "Purworejo",
  "Magelang",
  "Temanggung",
];

const KATEGORI_TYPES = [
  { id: "PASAR_UMUM", label: "Pasar Umum" },
  { id: "PASAR_SUBUH", label: "Pasar Pagi/Subuh" },
  { id: "PASARAN_JAWA", label: "Pasaran Jawa" },
];

interface MarketPlansProps {
  isManager: boolean;
}

export default function MarketPlans({
  isManager,
}: MarketPlansProps) {
  const { branchId } = useBranch();
  const [rawPlans, setRawPlans] = useState<any[]>([]);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const plans = useMemo(() => {
    return rawPlans
      .filter((p) => {
        if (p.branchId) {
          return p.branchId === branchId;
        }
        return users.some((u) => u.id === p.userId);
      })
      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
  }, [rawPlans, branchId, users]);

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeDate, setActiveDate] = useState(getActiveSystemDate());
  const [showPendingTooltip, setShowPendingTooltip] = useState(false);
  const pendingTooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (pendingTooltipRef.current && !pendingTooltipRef.current.contains(event.target as Node)) {
        setShowPendingTooltip(false);
      }
    }
    if (showPendingTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showPendingTooltip]);
  
  // Form State
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedPasaran, setSelectedPasaran] = useState("");
  const [selectedMarketName, setSelectedMarketName] = useState("");
  const [selectedMarketCity, setSelectedMarketCity] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { openModal, closeAllModals } = useModal();
  const role = useRole();
  const canAccessMaster = role === ROLES.OWNER || role === ROLES.MANAGER || role === ROLES.STAFF || role === ROLES.SPV;
  const actualIsAdmin = isManager || canAccessMaster;

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'plans' | 'master' | 'laporan') || 'plans';
  const setActiveTab = (tab: 'plans' | 'master' | 'laporan') => {
    setSearchParams({ tab });
  };
  const [masterSearch, setMasterSearch] = useState("");
  const [filterWilayah, setFilterWilayah] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterPasaran, setFilterPasaran] = useState("");

  const filteredMasterMarkets = useMemo(() => {
    return markets.filter((m) => {
      const query = masterSearch.toLowerCase();
      const matchSearch =
        m.nama_pasar?.toLowerCase().includes(query) ||
        m.wilayah?.toLowerCase().includes(query);
      const matchWilayah = !filterWilayah || m.wilayah === filterWilayah;
      const matchKategori =
        !filterKategori ||
        (Array.isArray(m.kategori)
          ? m.kategori.includes(filterKategori)
          : m.kategori === filterKategori);
      const matchPasaran =
        !filterPasaran ||
        m.pasaran?.includes(filterPasaran.toUpperCase()) ||
        m.buka_harian;
      return matchSearch && matchWilayah && matchKategori && matchPasaran;
    });
  }, [markets, masterSearch, filterWilayah, filterKategori, filterPasaran]);

  const handleDeleteMarket = async (id: string, name: string) => {
    if (!window.confirm(`Hapus pasar "${name}"?`)) return;
    try {
      await removeMarket(id, branchId);
      toast.info("Pasar berhasil dihapus");
    } catch (e) {
      toast.error("Gagal menghapus pasar");
    }
  };

  const [isMasterFormOpen, setIsMasterFormOpen] = useState(false);
  const [masterMarketToEdit, setMasterMarketToEdit] = useState<any>(null);

  const openForm = (market: any = null) => {
    setMasterMarketToEdit(market);
    setIsMasterFormOpen(true);
  };

  useEffect(() => {
    if (showModal) {
      document.body.classList.add("market-modal-active");
    } else {
      document.body.classList.remove("market-modal-active");
    }
    return () => document.body.classList.remove("market-modal-active");
  }, [showModal]);

  useEffect(() => {
    if (!branchId) return;

    const unsubPlans = subscribeMarketPlans(activeDate.isoDate, (data) => {
      setRawPlans(data);
      setLoading(false);
    });

    const unsubMarkets = subscribeMarkets(setMarkets, branchId);
    const unsubAllPlans = subscribeAllMarketPlans(setAllPlans); // Usually for analytics, might want to filter this too
    const unsubUsers = subscribeUsers(setUsers, branchId);

    return () => {
      unsubPlans();
      unsubMarkets();
      unsubAllPlans();
      unsubUsers();
    };
  }, [activeDate.isoDate, branchId]);

  const userMap = useMemo(() => {
    const map: Record<string, { name: string; photoURL?: string }> = {};
    users.forEach((u) => {
      if (u.id) {
        map[u.id] = {
          name: u.displayName || u.name || "User",
          photoURL: u.photoURL || u.photoUrl,
        };
      }
    });
    return map;
  }, [users]);

  const pendingUsersList = useMemo(() => {
    const requiredRoles = ['spv', 'sales', 'supervisor'];
    const usersRequired = users.filter((u: any) => u.role && requiredRoles.includes(u.role.toLowerCase()));
    const usersWithPlansIds = new Set(plans.map(p => p.userId));
    return usersRequired.filter(u => !usersWithPlansIds.has(u.id));
  }, [users, plans]);

  const pendingUsersCount = pendingUsersList.length;

  const normalizeMarketName = (name: string): string => {
    if (!name) return "";
    return name
      .toLowerCase()
      .replace(/^pasar\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const normalizeCityName = (city: string): string => {
    if (!city) return "";
    return city
      .toLowerCase()
      .replace(/^kota\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const takenMarketsMap = useMemo(() => {
    const map: Record<string, string> = {};
    plans.forEach((p) => {
      const uInfo = userMap[p.userId];
      const userName = uInfo ? uInfo.name : "User";
      const key = `${normalizeMarketName(p.marketName)}|${normalizeCityName(p.city)}`;
      map[key] = userName;
    });
    return map;
  }, [plans, userMap]);

  const availableMarkets = useMemo(() => {
    return markets.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.nama_pasar.toLowerCase().includes(searchQuery.toLowerCase());

      // If there's a search query, we follow the user's wish to not necessarily match city/kategori
      if (searchQuery) return matchesSearch;

      const matchesCity = !selectedCity || m.wilayah === selectedCity;
      const mKategori = Array.isArray(m.kategori) ? m.kategori : [m.kategori];
      const matchesType =
        !selectedType ||
        mKategori.some(
          (k) => (typeof k === "object" ? k.kode || k.id : k) === selectedType,
        );

      const matchesPasaran =
        !selectedPasaran ||
        m.pasaran?.includes(selectedPasaran.toUpperCase());

      return matchesCity && matchesType && matchesPasaran;
    });
  }, [markets, selectedCity, selectedType, selectedPasaran, searchQuery]);

  const selectedMarket = useMemo(
    () => markets.find((m) => m.nama_pasar === selectedMarketName && m.wilayah === selectedMarketCity),
    [markets, selectedMarketName, selectedMarketCity],
  );

  const pasaranWarning = useMemo(() => {
    if (!selectedMarket) return null;

    const resolvedCategory =
      selectedSubCategory ||
      (Array.isArray(selectedMarket?.kategori)
        ? typeof selectedMarket.kategori[0] === "object"
          ? selectedMarket.kategori[0].kode || selectedMarket.kategori[0].id
          : selectedMarket.kategori[0]
        : typeof selectedMarket?.kategori === "object"
          ? selectedMarket.kategori.kode || selectedMarket.kategori.id
          : selectedMarket?.kategori) ||
      selectedType;

    if (!resolvedCategory) return null;

    const todayPasaran = activeDate.pasaran.toUpperCase();
    const marketPasarans = Array.isArray(selectedMarket.pasaran)
      ? selectedMarket.pasaran
      : [];

    // Validation for markets with specific pasaran days
    // Only check pasaran days if the selected category is PASARAN_JAWA
    if (resolvedCategory === "PASARAN_JAWA") {
      if (
        marketPasarans.length > 0 &&
        !marketPasarans.some((p: string) => p.toUpperCase() === todayPasaran)
      ) {
        return `Pasar ini hanya buka pada hari ${marketPasarans.join(", ")}, tidak sesuai dengan hari ini (${activeDate.pasaran}).`;
      }
    }

    return null;
  }, [selectedMarket, selectedSubCategory, selectedType, activeDate.pasaran]);

  const resetForm = () => {
    setSelectedMarketName("");
    setSelectedMarketCity("");
    setSelectedSubCategory("");
    setSelectedCity("");
    setSelectedType("");
    setSearchQuery("");
    setSelectedPasaran("");
  };

  const handleAddPlan = async () => {
    if (!selectedMarketName) {
      toast.error("Pilih pasar terlebih dahulu.");
      return;
    }

    if (pasaranWarning) {
      toast.error(pasaranWarning);
      return;
    }

    try {
      const finalCategory =
        selectedSubCategory ||
        (Array.isArray(selectedMarket?.kategori)
          ? typeof selectedMarket.kategori[0] === "object"
            ? selectedMarket.kategori[0].kode || selectedMarket.kategori[0].id
            : selectedMarket.kategori[0]
          : typeof selectedMarket?.kategori === "object"
            ? selectedMarket.kategori.kode || selectedMarket.kategori.id
            : selectedMarket?.kategori) ||
        selectedType;

      // Find jam_buka based on finalCategory
      let jamBuka = "";
      const mKategoris = Array.isArray(selectedMarket?.kategori)
        ? selectedMarket.kategori
        : [selectedMarket?.kategori];
      const katObj = mKategoris.find(
        (k) => (typeof k === "object" ? k.kode || k.id : k) === finalCategory,
      );

      if (typeof katObj === "object" && katObj?.jam_buka) {
        jamBuka = katObj.jam_buka;
      } else if (
        typeof selectedMarket?.jam_buka === "object" &&
        selectedMarket?.jam_buka !== null
      ) {
        jamBuka =
          selectedMarket.jam_buka[finalCategory] ||
          Object.values(selectedMarket.jam_buka)[0] ||
          "";
      } else {
        jamBuka = selectedMarket?.jam_buka || "";
      }

      await addMarketPlan({
        branchId: branchId,
        city: toTitleCase(selectedMarket?.wilayah || selectedCity),
        marketType: finalCategory,
        marketName: toTitleCase(selectedMarketName),
        marketJam: String(jamBuka),
        marketPasaran: selectedMarket?.pasaran || [],
        dayStart: activeDate.isoDate,
      });
      setShowModal(false);
      resetForm();
      toast.success("Rencana berhasil disimpan");
    } catch (error) {
      toast.error("Gagal menyimpan rencana");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteMarketPlan(id);
      toast.info("Rencana dihapus");
    } catch (error) {
      toast.error("Gagal menghapus");
    }
  };

   const handleMarketClick = (m: any) => {
    const key = `${normalizeMarketName(m.nama_pasar)}|${normalizeCityName(m.wilayah)}`;
    const takerName = takenMarketsMap[key];
    if (takerName) return;

    setSelectedMarketName(m.nama_pasar);
    setSelectedMarketCity(m.wilayah);
    const mKategoris = Array.isArray(m.kategori) ? m.kategori : [m.kategori];

    const getKatId = (k: any) => (typeof k === "object" ? k.kode || k.id : k);

    if (mKategoris.length === 1) {
      setSelectedSubCategory(getKatId(mKategoris[0]));
    } else if (
      selectedType &&
      mKategoris.some((k) => getKatId(k) === selectedType)
    ) {
      setSelectedSubCategory(selectedType);
    } else {
      setSelectedSubCategory(""); // User must choose
    }
  };

  const myPlan = plans.find((p) => p.userId === auth.currentUser?.uid);

  const marketTemperature = useMemo(() => {
    if (allPlans.length < 5) return { hot: [], cold: [], isLowData: true };

    const now = dayjs();
    const scores: Record<string, { 
      score: number; 
      name: string; 
      city: string; 
      currentWeekVisits: number; 
      prevWeekVisits: number;
      totalVisits: number;
    }> = {};

    allPlans.forEach((plan) => {
      const planDate = dayjs(plan.dayStart);
      const diffDays = Math.abs(now.diff(planDate, 'day'));
      
      let weight = 0.2;
      if (diffDays === 0) weight = 1.0;
      else if (diffDays <= 7) weight = 0.8;
      else if (diffDays <= 30) weight = 0.5;

      const key = plan.marketName;
      if (!scores[key]) {
        scores[key] = { 
          score: 0, 
          name: plan.marketName, 
          city: plan.city, 
          currentWeekVisits: 0, 
          prevWeekVisits: 0,
          totalVisits: 0 
        };
      }
      
      scores[key].score += weight;
      scores[key].totalVisits += 1;

      // For trends: compare this week (0-7 days) with last week (8-14 days)
      if (diffDays <= 7) {
        scores[key].currentWeekVisits += 1;
      } else if (diffDays > 7 && diffDays <= 14) {
        scores[key].prevWeekVisits += 1;
      }
    });

    const sortedByScore = Object.values(scores).sort((a, b) => b.score - a.score);
    const hot = sortedByScore.slice(0, 4).map(m => ({
      ...m,
      trend: m.currentWeekVisits > m.prevWeekVisits ? 'up' : m.currentWeekVisits < m.prevWeekVisits ? 'down' : 'stable'
    }));

    const hotNames = new Set(hot.map(h => h.name));
    
    const allKnownMarketNames = markets.map(m => m.nama_pasar);
    const visitedMarketNames = new Set(Object.keys(scores));
    
    const unvisitedMarkets = allKnownMarketNames
      .filter(name => !visitedMarketNames.has(name) && !hotNames.has(name))
      .map(name => ({ name, score: 0, totalVisits: 0, status: 'NO ACTIVITY' }));

    const visitedButNotHot = sortedByScore
      .filter(m => !hotNames.has(m.name))
      .sort((a, b) => a.score - b.score)
      .map(m => ({ ...m, status: 'LOW ACTIVITY' }));

    const cold = [...visitedButNotHot, ...unvisitedMarkets].slice(0, 4);

    return { hot, cold, isLowData: false };
  }, [allPlans, markets]);

  if (activeTab === 'laporan') {
    return (
      <Report 
        onBack={() => setActiveTab('plans')} 
        computedPlans={plans}
        computedUserMap={userMap}
        marketTemperature={marketTemperature}
        pendingUsersCount={pendingUsersCount}
        pendingUsersList={pendingUsersList}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 relative overflow-x-hidden">
      {/* Background Polish */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/[0.02] blur-[80px] rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.035] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] contrast-125" />
      </div>
      
      <main className={cn(
        "max-w-2xl md:max-w-5xl lg:max-w-6xl mx-auto px-4 md:px-8 pb-32 relative z-10 w-full",
        canAccessMaster ? "pt-4 md:pt-12" : "pt-2 md:pt-6"
      )}>
        {activeTab === 'plans' ? (
          <>
            <AnimatePresence>
            {showModal && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed inset-0 z-[100] bg-background flex flex-col font-sans"
              >
                {isMasterFormOpen ? (
                  <div className="w-full flex-1 flex flex-col relative h-full bg-card dark:bg-black overflow-hidden">
                    <MarketFormContent 
                      market={masterMarketToEdit} 
                      onClose={() => {
                        setIsMasterFormOpen(false);
                        setMasterMarketToEdit(null);
                      }} 
                    />
                  </div>
                ) : (
                  <>
                    {/* A. Sticky Header */}
                    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/10 pt-safe pb-1 group/header">
                      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6">
                        <div className="flex items-center justify-between h-12 mb-1">
                           <div className="flex items-center gap-2">
                              <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-foreground/80">TAMBAH RENCANA</h2>
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                 <div className="w-1 h-1 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(198,255,46,0.5)]" />
                                 <span className="text-[8px] font-black text-primary tracking-widest leading-none">LIVE</span>
                              </div>
                           </div>
                           <button 
                             onClick={() => setShowModal(false)}
                             className="w-8 h-8 rounded-full bg-muted/40 hover:bg-muted/60 flex items-center justify-center border border-border/10 text-muted-foreground transition-all active:scale-95"
                           >
                             <X className="w-3.5 h-3.5" />
                           </button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative group/search w-full mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30 group-focus-within/search:text-primary transition-colors" />
                          <input
                            type="text"
                            placeholder="Cari pasar atau wilayah..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(toTitleCase(e.target.value))}
                            className="w-full bg-muted/30 border border-border/20 rounded-[1.25rem] pl-9 pr-4 h-10 text-[10px] font-bold outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all text-foreground placeholder:text-muted-foreground/20"
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted transition-colors"
                            >
                              <X className="w-3 h-3 text-muted-foreground/40" />
                            </button>
                          )}
                        </div>

                        {/* Headers for filters */}
                        <div className="grid grid-cols-3 gap-2 px-1 mb-1">
                           <label className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">WILAYAH</label>
                           <label className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">KATEGORI</label>
                           <label className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">PASARAN</label>
                        </div>

                        {/* Selects */}
                        <div className="grid grid-cols-3 gap-2 pb-3">
                          <div className="relative">
                            <select
                              value={selectedCity}
                              onChange={(e) => setSelectedCity(e.target.value)}
                              className="w-full h-10 bg-muted/45 px-3 rounded-xl text-[10px] font-black border border-border/10 outline-none focus:ring-0 text-foreground appearance-none cursor-pointer transition-all uppercase tracking-tighter"
                            >
                              <option value="" className="bg-background">SEMUA</option>
                              {WILAYAH_EXACT.map((w) => (
                                <option key={w} value={w} className="bg-background">{w.toUpperCase()}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
                          </div>

                          <div className="relative">
                            <select
                              value={selectedType}
                              onChange={(e) => setSelectedType(e.target.value)}
                              className="w-full h-10 bg-muted/45 px-3 rounded-xl text-[10px] font-black border border-border/10 outline-none focus:ring-0 text-foreground appearance-none cursor-pointer transition-all uppercase tracking-tighter"
                            >
                              <option value="" className="bg-background">SEMUA</option>
                              {KATEGORI_TYPES.map((k) => (
                                <option key={k.id} value={k.id} className="bg-background">{k.label.toUpperCase()}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
                          </div>

                          <div className="relative">
                            <select
                              value={selectedPasaran || ""}
                              onChange={(e) => setSelectedPasaran(e.target.value)}
                              className="w-full h-10 bg-muted/45 px-3 rounded-xl text-[10px] font-black border border-border/10 outline-none focus:ring-0 text-foreground appearance-none cursor-pointer transition-all uppercase tracking-tighter"
                            >
                              <option value="" className="bg-background">SEMUA</option>
                              {["PAHING", "PON", "WAGE", "KLIWON", "LEGI"].map((p) => (
                                <option key={p} value={p} className="bg-background">{p.toUpperCase()}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </header>

                    {/* B. Content Scroll */}
                    <main className="flex-1 overflow-y-auto no-scrollbar pt-6 pb-20">
                      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6">
                        <div className="flex items-center justify-between px-1 mb-6">
                           <label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.25rem]">
                             PASAR TERSEDIA
                           </label>
                           <span className="text-[10px] font-black text-primary bg-primary/10 px-3.5 py-1 rounded-full border border-primary/20 tracking-widest">
                             {availableMarkets.length} TOTAL
                           </span>
                        </div>

                        <AnimatePresence mode="popLayout">
                          {pasaranWarning && !searchQuery && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-[1.5rem] p-4 mb-5 flex gap-3 overflow-hidden shadow-sm"
                            >
                              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                              <p className="text-xs font-bold text-yellow-800 dark:text-yellow-200/60 leading-relaxed uppercase tracking-tight">
                                {pasaranWarning}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="grid grid-cols-1 gap-3">
                             {availableMarkets.length > 0 ? (
                              availableMarkets.map((m) => {
                                 const key = `${normalizeMarketName(m.nama_pasar)}|${normalizeCityName(m.wilayah)}`;
                                 const takerName = takenMarketsMap[key];
                                 const isTaken = !!takerName;
                                 const isSelected = selectedMarketName === m.nama_pasar && selectedMarketCity === m.wilayah;
                                 return (
                                   <div
                                    key={m.id}
                                    onClick={() => !isTaken && handleMarketClick(m)}
                                    className={cn(
                                      "flex flex-col p-4 transition-all rounded-[1.5rem] shadow-sm relative overflow-hidden group",
                                      isTaken 
                                        ? "opacity-60 bg-zinc-100/30 dark:bg-zinc-950/20 cursor-not-allowed border border-transparent" 
                                        : "active:scale-[0.985] cursor-pointer bg-muted/10 dark:bg-muted/5 hover:bg-muted/20 dark:hover:bg-zinc-900 shadow-none hover:shadow-md border border-border/10 hover:border-primary/20",
                                      isSelected && !isTaken && "bg-primary/[0.03] dark:bg-primary/[0.05] border-primary/30 ring-1 ring-primary/20 shadow-primary/5"
                                    )}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div className="min-w-0 flex-1 pr-1">
                                        <h4 className={cn(
                                          "font-semibold text-[13px] md:text-sm leading-tight tracking-tight truncate transition-colors",
                                          isSelected && !isTaken ? "text-primary" : "text-foreground",
                                          isTaken && "text-muted-foreground/60"
                                        )}>
                                          {toTitleCase(m.nama_pasar)}
                                          {(() => {
                                            const kats = Array.isArray(m.kategori) ? m.kategori : [m.kategori].filter(Boolean);
                                            if (kats.length === 0) return null;
                                            const firstKat = kats[0];
                                            const katId = typeof firstKat === "object" ? firstKat.kode || firstKat.id : firstKat;
                                            
                                            let label = "";
                                            if (katId === "PASAR_UMUM") label = "Umum";
                                            else if (katId === "PASAR_SUBUH") label = "Pagi";
                                            else if (katId === "PASARAN_JAWA") label = "Pasaran";
                                            else {
                                              const found = KATEGORI_TYPES.find(t => t.id === katId);
                                              label = found ? found.label.replace("Pasar ", "") : String(katId).replace("Pasar ", "");
                                            }
                                            
                                            return label ? (
                                              <span className="text-primary font-bold ml-1.5">
                                                • {label}
                                              </span>
                                            ) : null;
                                          })()}
                                        </h4>
                                        <div className="text-[10px] font-black text-muted-foreground/60 tracking-wider mt-0.5 uppercase">
                                          {toTitleCase(m.wilayah)}
                                        </div>
                                      </div>
                                      
                                      {isSelected && !isTaken && (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-[0_0_12px_rgba(198,255,46,0.3)]">
                                          <CheckCircle2 className="w-3 h-3 text-black" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex flex-col gap-1 mt-3">
                                      {(Array.isArray(m.kategori) ? m.kategori : [m.kategori]).map((kat: any, kIdx: number) => {
                                        const katId = typeof kat === "object" ? kat.kode || kat.id : kat;
                                        const isPasaranJawa = katId === "PASARAN_JAWA";
                                        
                                        let infoLabel = "";
                                        if (isPasaranJawa) {
                                          infoLabel = (m.pasaran || []).map(p => p.toUpperCase()).join(", ") || "HARI INI";
                                        } else {
                                          const labelText = KATEGORI_TYPES.find(t => t.id === katId)?.label || katId;
                                          infoLabel = String(labelText).replace("Pasar ", "").toUpperCase();
                                        }

                                        let scheduleText = "";
                                        if (typeof m.jam_buka === "object" && m.jam_buka !== null) {
                                          scheduleText = m.jam_buka[katId] || Object.values(m.jam_buka)[0] || "";
                                        } else {
                                          scheduleText = m.jam_buka || "";
                                        }

                                        return (
                                          <div key={`${m.id}-kat-${kIdx}`} className="flex items-center gap-1.5 text-[9px] font-black text-primary tracking-widest uppercase">
                                            <span className="opacity-70 group-hover:rotate-12 transition-transform h-3">🕐</span>
                                            <span className="text-primary">{infoLabel} - {scheduleText}</span>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {isTaken && (
                                      <div className="mt-3 text-[9px] font-black text-rose-500 bg-rose-500/5 px-3 py-1 rounded-full border border-rose-500/10 w-fit tracking-wider uppercase flex items-center gap-1.5">
                                        <Users className="w-3 h-3" />
                                        <span>PASAR INI TELAH DIPILIH {takerName}</span>
                                      </div>
                                    )}

                                    {isSelected && !isTaken && Array.isArray(m.kategori) && m.kategori.length > 1 && (
                                      <div className="mt-4 flex flex-wrap gap-1.5 p-1 rounded-[1.25rem] w-full">
                                        {m.kategori.map((kat: any, katIdx: number) => {
                                          const katIdVal = typeof kat === "object" ? kat.kode || kat.id || katIdx : kat;
                                          const labelValue = typeof kat === "object" ? kat.label : KATEGORI_TYPES.find((k) => k.id === kat)?.label || kat;
                                          const labelStr = typeof labelValue === "object" ? String(labelValue.label || katIdVal) : String(labelValue);
                                          const isKatSelected = selectedSubCategory === String(katIdVal);
                                          
                                          return (
                                            <button
                                              key={`${m.id}-choice-${katIdVal}-${katIdx}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSubCategory(String(katIdVal));
                                              }}
                                              className={cn(
                                                "flex-1 px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all duration-200 border",
                                                isKatSelected
                                                  ? "bg-primary text-black border-primary shadow-[0_4px_12px_rgba(198,255,46,0.2)] scale-[1.02]"
                                                  : "bg-muted/40 dark:bg-white/5 text-muted-foreground border-transparent hover:bg-muted/60 dark:hover:bg-white/10",
                                              )}
                                            >
                                              {labelStr.replace("Pasar ", "")}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                               );
                              })
                            ) : (
                              <div className="py-20 text-center flex flex-col items-center justify-center opacity-40">
                                <Search className="w-10 h-10 mb-4 text-muted-foreground/30" />
                                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em]">
                                  Data Tidak Ditemukan
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </main>

                    {/* C. Sticky Bottom Action */}
                    <footer className="sticky bottom-0 z-40 bg-background/90 backdrop-blur-2xl border-t border-border/10 p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex justify-center shadow-[0_-12px_30px_rgba(0,0,0,0.05)]">
                      <div className="max-w-3xl mx-auto w-full">
                        <ActionButton
                          onClick={handleAddPlan}
                          disabled={!selectedMarketName}
                          icon={CheckCircle2}
                          className="w-full"
                        >
                          {selectedMarketName ? `SIMPAN: ${selectedMarketName}` : 'PILIH PASAR TERLEBIH DAHULU'}
                        </ActionButton>
                      </div>
                    </footer>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="md:grid md:grid-cols-12 md:gap-12 md:items-start w-full relative">
            {/* Header Hero */}
            <section className="mb-4 md:mb-0 text-center md:text-left pt-0.5 relative md:col-span-5 lg:col-span-4 md:sticky md:top-24">
          <div className="absolute top-[-30px] left-1/2 md:left-20 -translate-x-1/2 w-[180px] h-[60px] bg-primary/5 blur-[40px] rounded-full pointer-events-none" />
          
          <h1 className="text-2xl md:text-4xl font-black leading-none tracking-tight text-foreground mb-1 capitalize">
            {activeDate.dayName}{" "}
            <span className="text-primary">{activeDate.pasaran}</span>
          </h1>
          <p className="text-[10px] md:text-sm text-muted-foreground font-bold uppercase tracking-[0.3em] mb-4 md:mb-8 md:opacity-90 opacity-70">
            {activeDate.fullDate}
          </p>

          <div className="flex flex-col items-center md:items-start gap-1.5 mb-2">
             <div className="h-px w-8 bg-zinc-200 dark:bg-card/10" />
             <h2 className="text-[8px] md:text-[10px] font-black text-zinc-400 dark:text-white/20 uppercase tracking-[0.3em] md:tracking-[0.4em]">
               MARKET TEMPERATURE
             </h2>
          </div>

          <MarketTemperature marketTemperature={marketTemperature} />
          </section>

          {/* Live List & Footer */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col">
            <section className="mb-4 md:mb-6">
              <SharedMarketPlanRenderer 
                plans={plans}
                userMap={userMap}
                activeDate={activeDate}
                actualIsAdmin={actualIsAdmin}
                handleDelete={handleDelete}
                loading={loading}
                pendingUsersCount={pendingUsersCount}
                pendingUsersList={pendingUsersList}
                showPendingTooltip={showPendingTooltip}
                setShowPendingTooltip={setShowPendingTooltip}
                pendingTooltipRef={pendingTooltipRef}
                topContent={
                   !myPlan && !loading ? (
                    <div data-html2canvas-ignore="true" className="flex justify-center pt-3 pb-4">
                      <ActionButton
                        onClick={() => setShowModal(true)}
                        icon={Plus}
                      >
                        TAMBAH RENCANA
                      </ActionButton>
                    </div>
                   ) : null
                }
              />
            </section>

          {/* Tactical Footer */}
          <footer className="mt-8 px-2 md:px-4">
             <div className="h-px bg-gradient-to-r from-transparent via-zinc-200/50 dark:via-white/10 to-transparent mb-5" />
             <div className="flex items-center justify-between">
                <div className="flex flex-col">
                   <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(198,255,46,0.3)]" />
                      <span className="text-[9px] md:text-[11px] font-black text-zinc-900/80 dark:text-white/80 uppercase tracking-[0.25em] md:tracking-[0.3em] leading-none mb-[1px] md:mb-[2px]">VORKTEAM</span>
                   </div>
                   <span className="text-[7px] md:text-[8px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest mt-1">OPS DASHBOARD v.2.0</span>
                </div>

                <div className="flex flex-col items-end">
                   <span className="text-[8px] md:text-[9px] font-bold text-zinc-400 dark:text-white/40 tracking-tight uppercase leading-none mb-1.5 md:mb-2">
                      SYNCED {dayjs().format("HH:mm")} WIB
                   </span>
                   <div className="flex items-center gap-1.5 opacity-30 md:opacity-40">
                      <div className="w-0.5 md:w-1 h-0.5 md:h-1 rounded-full bg-zinc-400 dark:bg-card/50" />
                      <div className="w-0.5 md:w-1 h-0.5 md:h-1 rounded-full bg-zinc-400 dark:bg-card/50" />
                      <div className="w-0.5 md:w-1 h-0.5 md:h-1 rounded-full bg-primary" />
                   </div>
                </div>
             </div>
          </footer>
         </div>
        </div>
      </>
    ) : (
      <div className="w-full">
        {isMasterFormOpen ? (
          <MarketFormContent 
            market={masterMarketToEdit} 
            onClose={() => {
              setIsMasterFormOpen(false);
              setMasterMarketToEdit(null);
            }} 
          />
        ) : (
          <MasterDataView
            markets={filteredMasterMarkets}
            onAdd={() => openForm()}
            onEdit={openForm}
            onDelete={handleDeleteMarket}
            search={masterSearch}
            setSearch={setMasterSearch}
            filters={{
              wilayah: filterWilayah,
              setWilayah: setFilterWilayah,
              kategori: filterKategori,
              setKategori: setFilterKategori,
              pasaran: filterPasaran,
              setPasaran: setFilterPasaran,
            }}
          />
        )}
      </div>
    )}
  </main>
    </div>
  );
}
