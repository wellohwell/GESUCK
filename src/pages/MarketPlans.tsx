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
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "../hooks/use-toast";
import { cn } from "../lib/utils";
import { getActiveSystemDate } from "../utils/javaneseDate";
import { toTitleCase } from "../utils/format";
import dayjs from "dayjs";
import dayOfYear from "dayjs/plugin/dayOfYear";
import "dayjs/locale/id";

import { useRole } from "../hooks/authHooks";
import { ROLES } from "../config/roles";
import { useModal } from "../hooks/use-modal";
import { MasterDataView, MarketFormContent } from "./admin/Master";
import Report from "./Report";

dayjs.extend(dayOfYear);
dayjs.locale("id");

const PlanItem = React.memo(({ 
  plan, 
  user, 
  activeDate, 
  isAdmin, 
  onDelete
}: { 
  plan: any; 
  user: any; 
  activeDate: any; 
  isAdmin: boolean; 
  onDelete: (e: React.MouseEvent, id: string) => void;
}) => {
  const iscurrentUser = plan.userId === auth.currentUser?.uid;
  const isVisited = plan.status === 'visited';
  
  return (
    <motion.div
      layout
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className={cn(
        "group py-2 md:py-3 px-3 md:px-4 flex items-center gap-3 md:gap-4 bg-transparent hover:bg-muted/30 rounded-2xl transition-all duration-200 border border-transparent",
        iscurrentUser && "bg-background md:bg-background/80 shadow-md border-border/60 ring-1 ring-primary/10 relative overflow-hidden cursor-pointer"
      )}
    >
      {iscurrentUser && (
         <div className="absolute top-0 right-0 w-10 h-10 bg-gradient-to-bl from-primary/5 to-transparent pointer-events-none" />
      )}

      <div className="relative shrink-0">
        <div className={cn(
          "w-7 h-7 md:w-10 md:h-10 rounded-full bg-muted overflow-hidden p-[1px] md:p-[2px] border border-border transition-all duration-300 ring-2 ring-transparent",
          iscurrentUser ? "ring-primary/30 border-primary/20 scale-105" : "group-hover:border-primary/20"
        )}>
          {user?.photoURL || plan.userPhoto ? (
            <img
              src={user?.photoURL || plan.userPhoto}
              className="w-full h-full rounded-full object-cover"
              alt=""
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              loading="lazy"
              data-html2canvas-ignore="true"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-[9px] md:text-xs font-black text-muted-foreground uppercase">
              {toTitleCase((user?.name || plan.userName || "U")).charAt(0)}
            </div>
          )}
        </div>
        {iscurrentUser && (
          <div className="absolute -bottom-0.5 md:-bottom-1 -right-0.5 md:-right-1 w-2.5 h-2.5 md:w-3.5 md:h-3.5 bg-primary rounded-full border-2 md:border-[3px] border-background z-10" />
        )}
      </div>

      <div className="flex-1 min-w-0 md:flex md:flex-col md:justify-center">
        <div className="flex items-center gap-2 mb-0.5 md:mb-1">
          <p className="text-xs md:text-sm font-semibold text-foreground tracking-tight truncate leading-tight flex items-center gap-1.5">
            {toTitleCase(plan.marketName)}
            {isVisited && <CheckCircle2 className="w-2.5 md:w-3.5 h-2.5 md:h-3.5 text-emerald-500" />}
            {(() => {
              const raw = plan.marketType === 'PASARAN_JAWA' 
                ? (plan.marketPasaran?.includes(activeDate.pasaran.toUpperCase()) 
                    ? activeDate.pasaran.toUpperCase() 
                    : plan.marketPasaran?.join(", ") || activeDate.pasaran.toUpperCase())
                : plan.marketType?.replace("PASARAN_", "").replace("PASAR_", "").replace("_", " ");
              const category = toTitleCase(raw);
              return category !== "Umum" ? (
                <span className="opacity-50 ml-1 md:ml-1.5 font-bold text-[8px] md:text-[10px] tracking-tight text-primary uppercase">
                  • {category}
                </span>
              ) : null;
            })()}
          </p>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 text-zinc-500">
          <span className="text-[8px] md:text-[10px] font-black text-primary tracking-widest truncate uppercase leading-none">
            {toTitleCase((user?.name || plan.userName || "User").split(" ")[0])}
          </span>
          <div className="w-[1.5px] h-[1.5px] md:w-1 md:h-1 rounded-full bg-muted-foreground/30 shrink-0" />
          <span className="text-[8px] md:text-[10px] font-medium text-muted-foreground tracking-tight truncate uppercase">
            {toTitleCase(plan.city)}
          </span>
          {plan.marketJam && (
            <>
              <div className="w-[1px] h-[1px] md:w-[1.5px] md:h-[1.5px] rounded-full bg-muted-foreground/30 shrink-0" />
              <span className="text-[8px] md:text-[10px] font-mono font-bold text-muted-foreground/60 tracking-tighter tabular-nums">
                {plan.marketJam.replace(' ', '')}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="text-right flex flex-col items-end gap-1 md:gap-1.5 relative z-10">
        <p className="text-[8px] md:text-xs text-zinc-300 dark:text-white/30 font-medium tracking-tight whitespace-nowrap tabular-nums font-mono">
          {plan.createdAt?.toDate ? dayjs(plan.createdAt.toDate()).format("HH:mm") : "-"}
        </p>
        {(iscurrentUser || isAdmin) && (
          <button
            data-html2canvas-ignore="true"
            onClick={(e) => onDelete(e, plan.id)}
            className="p-1 md:p-1.5 rounded-md text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-2.5 md:w-3.5 h-2.5 md:h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
});

PlanItem.displayName = "PlanItem";

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
  isAdmin: boolean;
}

export default function MarketPlans({
  isAdmin,
}: MarketPlansProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeDate, setActiveDate] = useState(getActiveSystemDate());

  // Form State
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedPasaran, setSelectedPasaran] = useState("");
  const [selectedMarketName, setSelectedMarketName] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { openModal, closeAllModals } = useModal();
  const role = useRole();
  const canAccessMaster = role === ROLES.OWNER || role === ROLES.ADMIN || role === ROLES.ADMIN_CABANG || role === ROLES.SPV;
  const actualIsAdmin = isAdmin || canAccessMaster;

  const [activeTab, setActiveTab] = useState<'plans' | 'master' | 'laporan'>('plans');
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
      await removeMarket(id);
      toast.info("Pasar berhasil dihapus");
    } catch (e) {
      toast.error("Gagal menghapus pasar");
    }
  };

  const openForm = (market: any = null) => {
    openModal({
      type: "fullscreen",
      hideCloseButton: true,
      content: <MarketFormContent market={market} onClose={closeAllModals} />,
    });
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
    const unsubPlans = subscribeMarketPlans(activeDate.isoDate, (data) => {
      setPlans(
        data.sort(
          (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0),
        ),
      );
      setLoading(false);
    });

    const unsubMarkets = subscribeMarkets(setMarkets);
    const unsubAllPlans = subscribeAllMarketPlans(setAllPlans);
    const unsubUsers = subscribeUsers(setUsers);

    return () => {
      unsubPlans();
      unsubMarkets();
      unsubAllPlans();
      unsubUsers();
    };
  }, [activeDate.isoDate]);

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

  const availableMarkets = useMemo(() => {
    const takenMarketNames = new Set(plans.map((p) => p.marketName));
    return markets.filter((m) => {
      const isTaken = takenMarketNames.has(m.nama_pasar);
      if (isTaken) return false;

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
  }, [markets, plans, selectedCity, selectedType, selectedPasaran, searchQuery]);

  const selectedMarket = useMemo(
    () => markets.find((m) => m.nama_pasar === selectedMarketName),
    [markets, selectedMarketName],
  );

  const pasaranWarning = useMemo(() => {
    if (!selectedMarket || !selectedSubCategory) return null;

    const todayPasaran = activeDate.pasaran.toUpperCase();
    const marketPasarans = Array.isArray(selectedMarket.pasaran)
      ? selectedMarket.pasaran
      : [];

    // Validation for markets with specific pasaran days
    // Only check pasaran days if the selected category is PASARAN_JAWA
    if (selectedSubCategory === "PASARAN_JAWA") {
      if (
        marketPasarans.length > 0 &&
        !marketPasarans.some((p: string) => p.toUpperCase() === todayPasaran)
      ) {
        return `Pasar ini hanya buka pada hari ${marketPasarans.join(", ")}, tidak sesuai dengan hari ini (${activeDate.pasaran}).`;
      }
    }

    return null;
  }, [selectedMarket, selectedSubCategory, activeDate.pasaran]);

  const resetForm = () => {
    setSelectedMarketName("");
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
    setSelectedMarketName(m.nama_pasar);
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
    return <Report onBack={() => setActiveTab('plans')} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 relative overflow-x-hidden">
      {/* Background Polish */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/[0.02] blur-[80px] rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.035] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] contrast-125" />
      </div>
      
      <main className="max-w-2xl md:max-w-5xl lg:max-w-6xl mx-auto px-4 md:px-8 pt-4 md:pt-12 pb-32 relative z-10 w-full">
        {/* Minimalist Tab Switcher / Navigation & Export Trigger */}
        <div data-html2canvas-ignore="true" className="flex items-center gap-5 md:gap-8 mb-6 border-b border-zinc-200/40 dark:border-white/[0.04] pb-2 w-full">
          <button
            onClick={() => setActiveTab('plans')}
            className={cn(
              "pb-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all relative cursor-pointer -mb-[10px] border-b-2",
              activeTab === 'plans' 
                ? "text-foreground border-[#B7E800] dark:border-[#C6FF00]" 
                : "text-zinc-400 dark:text-zinc-500 hover:text-foreground border-transparent"
            )}
          >
            Rencana Kunjungan
          </button>
          
          {canAccessMaster && (
            <button
              onClick={() => setActiveTab('master')}
              className={cn(
                "pb-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all relative cursor-pointer -mb-[10px] border-b-2",
                activeTab === 'master' 
                  ? "text-foreground border-[#B7E800] dark:border-[#C6FF00]" 
                  : "text-zinc-400 dark:text-zinc-500 hover:text-foreground border-transparent"
              )}
            >
              Master Data Pasar
            </button>
          )}

          <button
            onClick={() => setActiveTab('laporan')}
            className={cn(
              "pb-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all relative cursor-pointer -mb-[10px] border-b-2",
              activeTab === 'laporan' 
                ? "text-foreground border-[#B7E800] dark:border-[#C6FF00]" 
                : "text-zinc-400 dark:text-zinc-500 hover:text-foreground border-transparent"
            )}
          >
            Laporan harian
          </button>

        </div>

        {activeTab === 'plans' ? (
          <div className="md:grid md:grid-cols-12 md:gap-12 md:items-start w-full relative">
            {/* Header Hero */}
            <section className="mb-4 md:mb-0 text-center md:text-left pt-0.5 relative md:col-span-5 lg:col-span-4 md:sticky md:top-24">
          <div className="absolute top-[-30px] left-1/2 md:left-20 -translate-x-1/2 w-[180px] h-[60px] bg-[#B7E800]/3 dark:bg-[#C6FF00]/3 blur-[40px] rounded-full pointer-events-none" />
          
          <h1 className="text-2xl md:text-4xl font-black leading-none tracking-tight text-foreground mb-1 capitalize">
            {activeDate.dayName}{" "}
            <span className="text-primary">{activeDate.pasaran}</span>
          </h1>
          <p className="text-[10px] md:text-sm text-muted-foreground font-bold uppercase tracking-[0.3em] mb-4 md:mb-8 md:opacity-90 opacity-70">
            {activeDate.fullDate}
          </p>

          <div className="flex flex-col items-center md:items-start gap-1.5 mb-2">
             <div className="h-px w-8 bg-zinc-200 dark:bg-white/10" />
             <h2 className="text-[8px] md:text-[10px] font-black text-zinc-400 dark:text-white/20 uppercase tracking-[0.3em] md:tracking-[0.4em]">
               MARKET TEMPERATURE
             </h2>
          </div>

          {/* Ultra-Compact Market Temperature Indicator */}
          <div className="flex justify-center md:justify-start">
            <div className="w-full max-w-[340px] md:max-w-full grid grid-cols-2 gap-x-3 card-base p-2 md:p-4 shadow-soft divide-x divide-border/20 relative overflow-hidden group">
              {marketTemperature.isLowData ? (
                <div className="col-span-2 py-4 md:py-8 flex flex-col items-center justify-center">
                  <p className="text-[8px] md:text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-1">
                    Waiting for more activity
                  </p>
                  <p className="text-[7px] md:text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest">
                    Not enough visit data to rank
                  </p>
                </div>
              ) : (
                <>
                  {/* HOT COLUMN */}
                  <div className="text-left pr-3 md:pr-4 group cursor-default">
                    <div className="flex items-center gap-1.5 mb-1.5 md:mb-3">
                      <span className="text-[8px] md:text-[10px] font-black tracking-[0.1em] md:tracking-[0.2em] text-red-500 uppercase leading-none px-1.5 py-0.5 md:py-1 bg-red-500/5 rounded-sm shadow-[0_0_10px_-2px_rgba(239,68,68,0.2)]">
                        HOT
                      </span>
                      <div className="h-[1px] flex-1 bg-red-500/10" />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      {marketTemperature.hot.map((m: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between gap-1.5 h-4 md:h-5">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <div className="w-1 h-1 rounded-full bg-red-500/40 shrink-0" />
                            <p className="text-[9px] md:text-xs font-bold text-foreground/80 truncate leading-none md:mt-0.5">
                              {toTitleCase(m.name)}
                            </p>
                          </div>
                          <div className="flex justify-end w-4">
                            <span className={cn(
                              "text-[9px] md:text-sm font-black shrink-0 leading-none",
                              m.trend === 'up' ? "text-green-500" : m.trend === 'down' ? "text-red-500" : "text-muted-foreground/30"
                            )}>
                              {m.trend === 'up' ? "↑" : m.trend === 'down' ? "↓" : "→"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* COLD COLUMN */}
                  <div className="text-left pl-3 md:pl-4 group cursor-default">
                    <div className="flex items-center gap-1.5 mb-1.5 md:mb-3">
                      <span className="text-[8px] md:text-[10px] font-black tracking-[0.1em] md:tracking-[0.2em] text-blue-500 uppercase leading-none px-1.5 py-0.5 md:py-1 bg-blue-500/5 rounded-sm shadow-[0_0_10px_-2px_rgba(59,130,246,0.2)]">
                        COLD
                      </span>
                      <div className="h-[1px] flex-1 bg-blue-500/10" />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      {marketTemperature.cold.map((m: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between gap-1.5 h-4 md:h-5">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <div className="w-1 h-1 rounded-full bg-blue-500/40 shrink-0" />
                            <p className="text-[9px] md:text-xs font-bold text-foreground/80 truncate leading-none md:mt-0.5">
                              {toTitleCase(m.name)}
                            </p>
                          </div>
                          <div className="flex justify-end w-4">
                            <span className={cn(
                              "text-[9px] md:text-sm font-black shrink-0 leading-none",
                              m.status === 'LOW ACTIVITY' ? "text-muted-foreground/40" : "text-muted-foreground/20"
                            )}>
                              {m.status === 'LOW ACTIVITY' ? '•' : '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Live List & Footer */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col">
          <section className="mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <div className="w-4 md:w-5 h-4 md:h-5 bg-[#B7E800] dark:bg-[#C6FF00] rounded-md flex items-center justify-center shadow-[0_2px_8px_rgba(183,232,0,0.3)] dark:shadow-[0_2px_10px_rgba(198,255,0,0.4)]">
                   <Users className="w-2.5 md:w-3 h-2.5 md:h-3 text-black" />
                </div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs md:text-sm font-bold tracking-tight text-zinc-800 dark:text-white/90">
                    Rencana Kunjungan
                    {users.length - plans.length > 0 && (
                      <>
                        <span className="opacity-10 mx-1.5 font-normal md:text-base">•</span>
                        <span className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-wider">
                          {Math.max(0, users.length - plans.length)} PENDING
                        </span>
                      </>
                    )}
                  </h2>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                <span className="text-[9px] md:text-[10px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest leading-none">LIVE</span>
              </div>
            </div>

            <div className="card-base p-1.5 md:p-2 shadow-soft">
              {!myPlan && !loading && (
                <div data-html2canvas-ignore="true" className="flex justify-center pt-3 pb-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center justify-center px-6 md:px-8 h-10 md:h-12 rounded-xl md:rounded-2xl bg-foreground text-background font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg gap-2 group transition-all"
                  >
                    <Plus className="w-3.5 md:w-4 h-3.5 md:h-4 group-hover:rotate-90 transition-transform duration-300" />
                    TAMBAH RENCANA
                  </motion.button>
                </div>
              )}

              <AnimatePresence mode="popLayout" initial={false}>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <motion.div
                      key={`skeleton-${i}`}
                      exit={{ opacity: 0 }}
                      className="h-14 md:h-16 skeleton my-1 md:my-2 flex items-center gap-3 px-3 md:px-4 mx-0.5 md:mx-1 rounded-2xl"
                    >
                      <div className="w-8 md:w-10 h-8 md:h-10 rounded-full bg-foreground/5 shadow-inner" />
                      <div className="flex-1 space-y-2.5">
                         <div className="h-2 md:h-2.5 w-24 md:w-32 bg-foreground/5 rounded-full" />
                         <div className="h-1.5 md:h-2 w-16 md:w-24 bg-foreground/5 rounded-full" />
                      </div>
                    </motion.div>
                  ))
                ) : plans.length === 0 ? (
                  <motion.div
                    key="no-plans"
                    exit={{ opacity: 0 }}
                    className="py-20 md:py-32 px-4 flex flex-col items-center justify-center text-center"
                  >
                    <div className="w-12 md:w-16 h-12 md:h-16 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/[0.05] flex items-center justify-center mb-4">
                       <Users className="w-5 md:w-6 h-5 md:h-6 text-zinc-300 dark:text-white/10" />
                    </div>
                    <p className="text-[11px] md:text-xs text-zinc-400 dark:text-white/20 font-black uppercase tracking-[0.3em] md:tracking-[0.4em]">
                      SISTEM BELUM MENERIMA DATA
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-1 md:space-y-2">
                    {plans.map((plan) => (
                      <PlanItem
                        key={plan.id}
                        plan={plan}
                        user={userMap[plan.userId]}
                        activeDate={activeDate}
                        isAdmin={actualIsAdmin}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Tactical Footer */}
          <footer className="mt-8 px-2 md:px-4">
             <div className="h-px bg-gradient-to-r from-transparent via-zinc-200/50 dark:via-white/10 to-transparent mb-5" />
             <div className="flex items-center justify-between">
                <div className="flex flex-col">
                   <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-[#B7E800] dark:bg-[#C6FF00] shadow-[0_0_8px_rgba(198,255,0,0.3)]" />
                      <span className="text-[9px] md:text-[11px] font-black text-zinc-900/80 dark:text-white/80 uppercase tracking-[0.25em] md:tracking-[0.3em] leading-none mb-[1px] md:mb-[2px]">VORKTEAM</span>
                   </div>
                   <span className="text-[7px] md:text-[8px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest mt-1">OPS DASHBOARD v.2.0</span>
                </div>

                <div className="flex flex-col items-end">
                   <span className="text-[8px] md:text-[9px] font-bold text-zinc-400 dark:text-white/40 tracking-tight uppercase leading-none mb-1.5 md:mb-2">
                      SYNCED {dayjs().format("HH:mm")} WIB
                   </span>
                   <div className="flex items-center gap-1.5 opacity-30 md:opacity-40">
                      <div className="w-0.5 md:w-1 h-0.5 md:h-1 rounded-full bg-zinc-400 dark:bg-white/50" />
                      <div className="w-0.5 md:w-1 h-0.5 md:h-1 rounded-full bg-zinc-400 dark:bg-white/50" />
                      <div className="w-0.5 md:w-1 h-0.5 md:h-1 rounded-full bg-[#B7E800] dark:bg-[#C6FF00]" />
                   </div>
                </div>
             </div>
          </footer>
        </div>
      </div>
    ) : (
      <div className="w-full">
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
      </div>
    )}
  </main>

        {/* Modal - Improved Minimal Feel */}
        <AnimatePresence>
          {showModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-zinc-900/40 dark:bg-black/90 backdrop-blur-sm dark:backdrop-blur-md"
            />

            <motion.div
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full h-full bg-background flex flex-col relative sm:rounded-t-3xl overflow-hidden shadow-premium"
            >
              {/* Floating Close - Minimalist */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 z-50 w-7 h-7 rounded-full bg-muted/40 hover:bg-muted/60 backdrop-blur-sm flex items-center justify-center border border-border/10 text-muted-foreground transition-all active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="p-6 pt-8 pb-32 flex-1 overflow-y-auto no-scrollbar">
                <div className="space-y-3 mb-5">
                {/* Search Box */}
                <div className="relative group max-w-sm mx-auto">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Cari pasar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(toTitleCase(e.target.value))}
                    className="w-full bg-muted/50 border border-border/60 rounded-xl pl-10 pr-4 h-10 text-[11px] font-bold outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-foreground placeholder:text-muted-foreground/30"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 tap-target rounded-full hover:bg-muted transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>

                <div className="flex gap-1.5 max-w-sm mx-auto overflow-x-auto no-scrollbar py-0.5">
                  {/* City Selector */}
                  <div className="shrink-0 min-w-[90px]">
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full h-8 bg-muted/40 px-2 rounded-lg text-[9px] font-black border-none outline-none focus:ring-0 text-foreground appearance-none cursor-pointer transition-all uppercase tracking-tighter"
                    >
                      <option value="" className="bg-background">Wilayah</option>
                      {WILAYAH_EXACT.map((w) => (
                        <option key={w} value={w} className="bg-background">{w}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type Selector */}
                  <div className="shrink-0 min-w-[90px]">
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full h-8 bg-muted/40 px-2 rounded-lg text-[9px] font-black border-none outline-none focus:ring-0 text-foreground appearance-none cursor-pointer transition-all uppercase tracking-tighter"
                    >
                      <option value="" className="bg-background">Kategori</option>
                      {KATEGORI_TYPES.map((k) => (
                        <option key={k.id} value={k.id} className="bg-background">{k.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pasaran Selector */}
                  <div className="shrink-0 min-w-[90px]">
                    <select
                      value={selectedPasaran || ""}
                      onChange={(e) => setSelectedPasaran(e.target.value)}
                      className="w-full h-8 bg-muted/40 px-2 rounded-lg text-[9px] font-black border-none outline-none focus:ring-0 text-foreground appearance-none cursor-pointer transition-all uppercase tracking-tighter"
                    >
                      <option value="" className="bg-background">Pasaran</option>
                      {["PAHING", "PON", "WAGE", "KLIWON", "LEGI"].map((p) => (
                        <option key={p} value={p} className="bg-background">{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Available Markets List */}
              <div className="relative">
                <div className="flex items-center justify-between mb-4 px-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                    Pasar Tersedia
                  </label>
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 tracking-widest">
                    {availableMarkets.length} TOTAL
                  </span>
                </div>

                <AnimatePresence>
                  {pasaranWarning && !searchQuery && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-2xl p-3 mb-3 flex gap-3 overflow-hidden shadow-sm shadow-yellow-500/5"
                    >
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 shrink-0" />
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200/60 leading-relaxed">
                        {pasaranWarning}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="max-h-[450px] overflow-y-auto no-scrollbar">
                    {availableMarkets.length > 0 ? (
                      availableMarkets.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => handleMarketClick(m)}
                          className={cn(
                            "flex items-center justify-between py-2 px-0.5 transition-all hover:bg-muted/30 active:bg-muted group cursor-pointer border-b border-border/5 last:border-0",
                            selectedMarketName === m.nama_pasar && "bg-primary/5 shadow-inner"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className={cn(
                              "font-semibold text-sm leading-tight tracking-tight truncate transition-colors",
                              selectedMarketName === m.nama_pasar ? "text-primary" : "text-foreground"
                            )}>
                              {toTitleCase(m.nama_pasar)}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              <span className="text-zinc-400">{toTitleCase(m.wilayah)}</span>
                              {(Array.isArray(m.kategori) ? m.kategori : [m.kategori]).map((kat: any, kIdx: number) => {
                                const katId = typeof kat === "object" ? kat.kode || kat.id : kat;
                                const isPasaranJawa = katId === "PASARAN_JAWA";
                                
                                if (isPasaranJawa) {
                                  return (
                                    <React.Fragment key={`${m.id}-kat-${kIdx}`}>
                                      <span className="opacity-30">•</span>
                                      <span className="text-primary font-mono tracking-normal">
                                        [{m.pasaran?.join(", ") || "HARI INI"}]
                                      </span>
                                    </React.Fragment>
                                  );
                                }

                                const labelText = KATEGORI_TYPES.find(t => t.id === katId)?.label || katId;
                                return (
                                  <React.Fragment key={`${m.id}-kat-${kIdx}`}>
                                    <span className="opacity-30">•</span>
                                    <span className="text-primary">
                                      {String(labelText).replace("Pasar ", "")}
                                    </span>
                                  </React.Fragment>
                                );
                              })}
                              
                              <span className="opacity-30">•</span>
                              <span className="text-foreground/40 tabular-nums">
                                {(() => {
                                  if (selectedMarketName === m.nama_pasar && selectedSubCategory) {
                                    const mKats = Array.isArray(m.kategori) ? m.kategori : [m.kategori];
                                    const katObj = mKats.find((k: any) => (typeof k === "object" ? k.kode || k.id : k) === selectedSubCategory);
                                    if (typeof katObj === "object" && katObj?.jam_buka) return String(katObj.jam_buka);
                                    if (typeof m.jam_buka === "object" && m.jam_buka !== null) return String(m.jam_buka[selectedSubCategory] || Object.values(m.jam_buka)[0] || "");
                                  }
                                  if (typeof m.jam_buka === "object" && m.jam_buka !== null) {
                                    const jams = Object.values(m.jam_buka)
                                      .map((val) => typeof val === "object" ? "" : String(val))
                                      .filter(Boolean);
                                    return jams.length > 0 ? jams.join(" • ") : "";
                                  }
                                  return String(m.jam_buka || "");
                                })()}
                              </span>
                            </div>

                            {/* Sub Category Selection - Always show if multi-category and selected */}
                            {selectedMarketName === m.nama_pasar && Array.isArray(m.kategori) && m.kategori.length > 1 && (
                              <div className="mt-2.5 flex flex-wrap gap-1.5 p-1.5 bg-zinc-50 dark:bg-white/[0.02] rounded-xl w-fit border border-zinc-100 dark:border-white/5 shadow-inner">
                                {m.kategori.map((kat: any, katIdx: number) => {
                                  const katIdVal = typeof kat === "object" ? kat.kode || kat.id || katIdx : kat;
                                  const labelValue = typeof kat === "object" ? kat.label : KATEGORI_TYPES.find((k) => k.id === kat)?.label || kat;
                                  const labelStr = typeof labelValue === "object" ? String(labelValue.label || katIdVal) : String(labelValue);
                                  const isSelected = selectedSubCategory === String(katIdVal);
                                  
                                  return (
                                    <button
                                      key={`${m.id}-choice-${katIdVal}-${katIdx}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSubCategory(String(katIdVal));
                                      }}
                                      className={cn(
                                        "px-4 py-1.5 rounded-lg text-[9px] font-black tracking-[0.05em] uppercase transition-all duration-200",
                                        isSelected
                                          ? "bg-primary text-black shadow-[0_2px_8px_rgba(183,232,0,0.2)] scale-105"
                                          : "bg-zinc-200 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-white/10",
                                      )}
                                    >
                                      {labelStr.replace("Pasar ", "")}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {selectedMarketName === m.nama_pasar && (
                            <div className="bg-primary text-black p-1.5 rounded-full ml-4 shrink-0 transition-all scale-110 ring-2 ring-primary/20">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center text-muted-foreground font-black text-[10px] uppercase tracking-[0.4em] opacity-30">
                        Data Tidak Ditemukan
                      </div>
                    )}
                </div>
              </div>
               </div>

              {/* Floating Save Button - Perfectly matching Bottom Nav style */}
              <div className="fixed bottom-0 left-0 right-0 z-[110] flex justify-center p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pointer-events-none">
                <nav className="bg-white/90 dark:bg-black/90 backdrop-blur-2xl rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-1.5 pointer-events-auto min-w-[200px]">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddPlan}
                    className="relative w-full flex items-center justify-center gap-2 h-9 sm:h-10 px-8 rounded-full bg-[#C6FF00] text-black shadow-[0_0_15px_rgba(198,255,0,0.3)] transition-all group"
                  >
                    <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold tracking-tight uppercase">
                      SIMPAN RENCANA
                    </span>
                  </motion.button>
                </nav>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
