import React, { useEffect, useState, useMemo } from "react";
import {
  subscribeMarketPlans,
  subscribeAllMarketPlans,
  addMarketPlan,
  deleteMarketPlan,
  subscribeMarkets,
  subscribeUsers,
} from "../lib/services";
import { auth } from "../firebase/config";
import {
  Plus,
  X,
  Clock,
  MapPin,
  Users,
  LogOut,
  Settings,
  CheckCircle2,
  Trash2,
  ChevronDown,
  Search,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-toastify";
import { cn } from "../lib/utils";
import { getActiveSystemDate } from "../utils/javaneseDate";
import { ThemeToggle } from "../components/ThemeToggle";
import { toTitleCase } from "../utils/format";
import dayjs from "dayjs";
import dayOfYear from "dayjs/plugin/dayOfYear";
import "dayjs/locale/id";

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

interface DashboardProps {
  onNavigateAdmin: () => void;
  onNavigateReport: () => void;
  isAdmin: boolean;
}

export default function Dashboard({
  onNavigateAdmin,
  onNavigateReport,
  isAdmin,
}: DashboardProps) {
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
    if (!selectedMarket) return null;

    const todayPasaran = activeDate.pasaran.toUpperCase();
    const marketPasarans = Array.isArray(selectedMarket.pasaran)
      ? selectedMarket.pasaran
      : [];

    // Validation for markets with specific pasaran days that are not open daily
    if (marketPasarans.length > 0 && !selectedMarket.buka_harian) {
      if (
        !marketPasarans.some((p: string) => p.toUpperCase() === todayPasaran)
      ) {
        return `Pasar ini hanya buka pada hari ${marketPasarans.join(", ")}, tidak sesuai dengan hari ini (${activeDate.pasaran}).`;
      }
    }

    return null;
  }, [selectedMarket, activeDate.pasaran]);

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
    const mainWilayah = ["Sleman", "Bantul", "Kota Yogyakarta"];
    const otherWilayah = [
      "Kulon Progo",
      "Magelang",
      "Temanggung",
      "Purworejo",
      "Gunungkidul",
    ];

    // Seed data: start with 0 visits for all known combinations or at least placeholders
    const visitCounts: Record<
      string,
      { count: number; name: string; wilayah: string }
    > = {};

    allPlans.forEach((plan) => {
      const key = `${plan.marketName}-${plan.city}`;
      if (!visitCounts[key]) {
        visitCounts[key] = {
          count: 0,
          name: plan.marketName,
          wilayah: plan.city,
        };
      }
      visitCounts[key].count += 1;
    });

    const getTopForWilayah = (wilayah: string, type: "HOT" | "COLD") => {
      const marketsInWilayah = Object.values(visitCounts).filter((v) =>
        v.wilayah.toLowerCase().includes(wilayah.toLowerCase()),
      );

      if (marketsInWilayah.length === 0) return null;

      const sorted = [...marketsInWilayah].sort((a, b) =>
        type === "HOT" ? b.count - a.count : a.count - b.count,
      );

      return { ...sorted[0], temp: type };
    };

    // Rotation based on ISO date for consistent "daily" rotation
    const dayOfYear = dayjs(activeDate.isoDate).dayOfYear();
    const rotatedWilayahHot = otherWilayah[dayOfYear % otherWilayah.length];
    const rotatedWilayahCold =
      otherWilayah[(dayOfYear + 1) % otherWilayah.length];

    const generateCategory = (
      baseWilayahs: string[],
      rotatedWilayah: string,
      type: "HOT" | "COLD",
    ) => {
      const results = baseWilayahs.map((w) => getTopForWilayah(w, type));
      results.push(getTopForWilayah(rotatedWilayah, type));
      return results;
    };

    const hot = generateCategory(mainWilayah, rotatedWilayahHot, "HOT");
    const cold = generateCategory(mainWilayah, rotatedWilayahCold, "COLD");

    return { hot, cold };
  }, [allPlans, activeDate.isoDate]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-zinc-900 dark:text-white font-sans transition-colors duration-300">
      {/* Navbar Minimal */}
      <nav className="p-2 flex items-center justify-between max-w-2xl mx-auto border-b border-zinc-100 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="flex flex-col justify-center">
            <h4 className="text-xs font-medium tracking-tight text-zinc-900 dark:text-white  leading-none">
              {auth.currentUser?.displayName || "Guest"}
            </h4>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="w-px h-4 bg-zinc-200 dark:bg-white/10 mx-1" />
          {isAdmin && (
            <button
              onClick={onNavigateAdmin}
              className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors border border-zinc-200 dark:border-transparent dark:hover:border-white/10"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400 dark:text-white/40" />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onNavigateReport}
              title="Export Report"
              className="p-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-brand-primary/10 transition-colors border border-emerald-100 dark:border-transparent dark:text-brand-primary/60 text-emerald-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"/><path d="M4 11V4a2 2 0 0 1 2-2h9l5 5v3"/></svg>
            </button>
          )}
          <button
            onClick={() => auth.signOut()}
            className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border border-red-100 dark:border-transparent"
          >
            <LogOut className="w-3.5 h-3.5 text-red-500/40" />
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 pt-4 pb-10">
        {/* Header Hero */}
        <section className="mb-6 text-center pt-1">
          <h1 className="text-xl font-display font-medium leading-tight tracking-tighter text-zinc-900 dark:text-white mb-0.5">
            {activeDate.dayName}{" "}
            <span className="text-brand-primary">{activeDate.pasaran}</span>
          </h1>
          <p className="text-[10px] text-zinc-400 dark:text-white/40 font-bold uppercase tracking-[0.2em] mb-4">
            {activeDate.fullDate}
          </p>

          <h2 className="text-[9px] font-semibold text-zinc-400 dark:text-white/30 uppercase tracking-widest mb-1">
            Market Temperature
          </h2>

          {/* Ultra-Compact Market Temperature Indicator */}
          <div className="flex justify-center">
            <div className="w-full max-w-[280px] grid grid-cols-2 gap-x-6">
              {/* HOT COLUMN */}
              <div className="text-left border-r border-zinc-100 dark:border-white/5 pr-4">
                <span className="text-[9px] font-black tracking-tighter text-red-500/60 dark:text-red-500/40 uppercase block mb-1.5">
                  🔥 HOT
                </span>
                <div className="space-y-1">
                  {marketTemperature?.hot?.some((m: any) => m !== null) ? (
                    marketTemperature.hot.map((m: any, idx: number) => (
                      <p
                        key={idx}
                        className="text-[10px] font-medium text-zinc-900 dark:text-white/70 truncate leading-none"
                      >
                        {m ? toTitleCase(m.name) : "Belum Ada Data"}
                      </p>
                    ))
                  ) : (
                    <p className="text-[9px] font-medium text-zinc-300 dark:text-white/10 italic">
                      Belum Ada Data
                    </p>
                  )}
                </div>
              </div>

              {/* COLD COLUMN */}
              <div className="text-left pl-2">
                <span className="text-[9px] font-black tracking-tighter text-blue-500/60 dark:text-blue-500/40 uppercase block mb-1.5">
                  🧊 COLD
                </span>
                <div className="space-y-1">
                  {marketTemperature?.cold?.some((m: any) => m !== null) ? (
                    marketTemperature.cold.map((m: any, idx: number) => (
                      <p
                        key={idx}
                        className="text-[10px] font-medium text-zinc-900 dark:text-white/70 truncate leading-none"
                      >
                        {m ? toTitleCase(m.name) : "Belum Ada Data"}
                      </p>
                    ))
                  ) : (
                    <p className="text-[9px] font-medium text-zinc-300 dark:text-white/10 italic">
                      Belum Ada Data
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live List */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-brand-primary" />
              <h2 className="text-sm font-medium  tracking-tight text-zinc-500 dark:text-white/70">
                Rencana Kunjungan
              </h2>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-white/[0.03] rounded-full border border-zinc-200/50 dark:border-white/[0.05]">
              <div className="relative">
                <Users className="w-3.5 h-3.5 text-zinc-400 dark:text-white/30" />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#C6FF00] rounded-full border border-white dark:border-[#050505]" />
              </div>
              <span className="text-[10px] font-bold text-zinc-500 dark:text-white/50 tracking-tight">
                {Math.max(0, users.length - plans.length)} <span className="opacity-60">Pending</span>
              </span>
            </div>
          </div>

          <div className="space-y-0.5">
            {!myPlan && !loading && (
              <div className="flex justify-center mt-8 mb-8">
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black font-medium text-xs  tracking-tight shadow-sm hover:translate-y-[-1px] hover:shadow-md transition-all duration-200 active:scale-95 gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  Tambah Rencana
                </motion.button>
              </div>
            )}

            <AnimatePresence mode="popLayout" initial={false}>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <motion.div
                    key={`skeleton-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-10 border-b border-zinc-100 dark:border-white/[0.03] animate-pulse flex items-center gap-2 px-1"
                  >
                    <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-white/[0.02]" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2 w-14 bg-zinc-100 dark:bg-white/[0.02] rounded" />
                      <div className="h-1.5 w-18 bg-zinc-100 dark:bg-white/[0.02] rounded" />
                    </div>
                  </motion.div>
                ))
              ) : plans.length === 0 ? (
                <motion.div
                  key="no-plans"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-10 px-4 flex flex-col items-center justify-center text-center"
                >
                  <p className="text-xs text-zinc-300 dark:text-white/20 font-medium  tracking-tight">
                    BELUM ADA RENCANA HARI INI
                  </p>
                </motion.div>
              ) : (
                plans.map((plan) => (
                  <motion.div
                    layout
                    key={plan.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "group py-2 px-1.5 flex items-center gap-2 border-b border-zinc-100 dark:border-white/[0.03] last:border-0 transition-all duration-300",
                      plan.userId === auth.currentUser?.uid && "bg-brand-primary/[0.03] dark:bg-brand-primary/[0.01]"
                    )}
                  >
                    <div className="w-7 h-7 flex-shrink-0 rounded-full bg-zinc-100 dark:bg-white/5 overflow-hidden p-0.5 border border-zinc-200 dark:border-white/10 group-hover:border-brand-primary/30 transition-colors">
                      <img
                        src={userMap[plan.userId]?.photoURL || plan.userPhoto}
                        className="w-full h-full rounded-full object-cover transition-all duration-500"
                        alt=""
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] font-bold text-zinc-900 dark:text-white tracking-tight truncate leading-none mt-0.5">
                          {toTitleCase(plan.marketName)}
                          {(() => {
                            const raw = plan.marketType === 'PASARAN_JAWA' 
                              ? (plan.marketPasaran?.includes(activeDate.pasaran.toUpperCase()) 
                                  ? activeDate.pasaran.toUpperCase() 
                                  : plan.marketPasaran?.join(", ") || activeDate.pasaran.toUpperCase())
                              : plan.marketType?.replace("PASARAN_", "").replace("PASAR_", "").replace("_", " ");
                            const category = toTitleCase(raw);
                            return category !== "Umum" ? (
                              <span className="opacity-50 ml-1 font-medium">
                                - {category}
                              </span>
                            ) : null;
                          })()}
                        </p>
                        {plan.userId === auth.currentUser?.uid && (
                          <div className="w-1 h-1 rounded-full bg-brand-primary" />
                        )}
                      </div>

                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[8px] font-bold text-brand-primary tracking-widest truncate max-w-[70px]">
                          {toTitleCase((userMap[plan.userId]?.name || plan.userName || "User").split(" ")[0])}
                        </span>
                        <div className="w-0.5 h-0.5 rounded-full bg-zinc-300 dark:bg-white/10 shrink-0" />
                        <span className="text-[8px] font-bold text-zinc-400 dark:text-white/40 tracking-widest truncate">
                          {toTitleCase(plan.city)}
                        </span>
                        {plan.marketJam && (
                          <>
                            <div className="w-0.5 h-0.5 rounded-full bg-zinc-300 dark:bg-white/10 shrink-0" />
                            <span className="text-[8px] font-mono font-medium text-zinc-400 dark:text-white/30 tracking-tight">
                              {plan.marketJam}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-1.5">
                      <p className="text-[10px] text-zinc-300 dark:text-white/20 font-medium tracking-tight whitespace-nowrap">
                        {plan.createdAt?.toDate ? dayjs(plan.createdAt.toDate()).format("HH:mm") : "-"}
                      </p>
                      {(plan.userId === auth.currentUser?.uid || isAdmin) && (
                        <button
                          onClick={(e) => handleDelete(e, plan.id)}
                          className="p-1 rounded-lg text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Modal - Improved Minimal Feel */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-zinc-900/40 dark:bg-black/90 backdrop-blur-sm dark:backdrop-blur-md"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full h-full bg-white dark:bg-[#0a0a0a] flex flex-col relative"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-[#0a0a0a] px-4 py-4 z-20 border-b border-zinc-100 dark:border-white/5 flex justify-between items-center">
                <h2 className="text-sm font-display font-medium tracking-tight text-zinc-900 dark:text-white  underline-offset-4 decoration-brand-primary decoration-2 underline">
                  RENCANA KUNJUNGAN
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center border border-zinc-200 dark:border-white/10 text-zinc-400 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
                <div className="space-y-3 mb-4">
                {/* Search Box */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-white/30" />
                  <input
                    type="text"
                    placeholder="Cari pasar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(toTitleCase(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs font-medium outline-none focus:border-brand-primary dark:focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary transition-all text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-white/10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-zinc-400 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* City Selector */}
                  <div className="flex-1 min-w-0">
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full h-[38px] bg-white dark:bg-white/5 px-2.5 rounded-[10px] text-sm font-medium border border-zinc-100 dark:border-white/5 outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer transition-colors shadow-sm"
                    >
                      <option value="" className="bg-white dark:bg-[#0a0a0a]">Wilayah</option>
                      {WILAYAH_EXACT.map((w) => (
                        <option key={w} value={w} className="bg-white dark:bg-[#0a0a0a]">{w}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type Selector */}
                  <div className="flex-1 min-w-0">
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full h-[38px] bg-white dark:bg-white/5 px-2.5 rounded-[10px] text-sm font-medium border border-zinc-100 dark:border-white/5 outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer transition-colors shadow-sm"
                    >
                      <option value="" className="bg-white dark:bg-[#0a0a0a]">Kategori</option>
                      {KATEGORI_TYPES.map((k) => (
                        <option key={k.id} value={k.id} className="bg-white dark:bg-[#0a0a0a]">{k.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pasaran Selector */}
                  <div className="flex-1 min-w-0">
                    <select
                      value={selectedPasaran || ""}
                      onChange={(e) => setSelectedPasaran(e.target.value)}
                      className="w-full h-[38px] bg-white dark:bg-white/5 px-2.5 rounded-[10px] text-sm font-medium border border-zinc-100 dark:border-white/5 outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer transition-colors shadow-sm"
                    >
                      <option value="" className="bg-white dark:bg-[#0a0a0a]">Pasaran</option>
                      {["PAHING", "PON", "WAGE", "KLIWON", "LEGI"].map((p) => (
                        <option key={p} value={p} className="bg-white dark:bg-[#0a0a0a]">{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Available Markets List */}
              <div className="relative">
                <div className="flex items-center justify-between mb-3 px-1">
                  <label className="text-xs font-medium text-zinc-400 dark:text-white/60  tracking-tight block">
                    Pasar Tersedia
                  </label>
                  <span className="text-xs font-medium text-brand-primary bg-brand-primary/10 px-2.5 py-0.5 rounded-full border border-brand-primary/20">
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

                <div className="divide-y divide-zinc-100 dark:divide-white/[0.06] max-h-[350px] overflow-y-auto no-scrollbar">
                    {availableMarkets.length > 0 ? (
                      availableMarkets.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => handleMarketClick(m)}
                          className={cn(
                            "flex items-center justify-between py-2 px-0.5 border-b border-zinc-100 dark:border-white/[0.06] last:border-0 transition-all hover:bg-zinc-100/50 dark:hover:bg-white/[0.02] active:bg-zinc-200 dark:active:bg-white/[0.04] group cursor-pointer",
                            selectedMarketName === m.nama_pasar && "bg-brand-primary/[0.03] dark:bg-brand-primary/[0.01]"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className={cn(
                              "font-medium text-[13px] leading-tight tracking-tight truncate transition-colors",
                              selectedMarketName === m.nama_pasar ? "text-brand-primary" : "text-zinc-900 dark:text-white"
                            )}>
                              {toTitleCase(m.nama_pasar)}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs font-medium text-zinc-500 dark:text-white/40  tracking-wide">
                              <span>{toTitleCase(m.wilayah)}</span>
                              <span className="opacity-30">•</span>
                              <span>{m.buka_harian ? "SETIAP HARI" : m.pasaran?.join(", ")}</span>
                              <span className="opacity-30">•</span>
                              <span className="text-brand-primary/60">
                                {(() => {
                                  if (selectedMarketName === m.nama_pasar && selectedSubCategory) {
                                    const mKats = Array.isArray(m.kategori) ? m.kategori : [m.kategori];
                                    const katObj = mKats.find((k: any) => (typeof k === "object" ? k.kode || k.id : k) === selectedSubCategory);
                                    if (typeof katObj === "object" && katObj?.jam_buka) return String(katObj.jam_buka);
                                    if (typeof m.jam_buka === "object" && m.jam_buka !== null) return String(m.jam_buka[selectedSubCategory] || Object.values(m.jam_buka)[0] || "");
                                  }
                                  if (typeof m.jam_buka === "object" && m.jam_buka !== null) {
                                    return Object.values(m.jam_buka)
                                      .map((val) => typeof val === "object" ? JSON.stringify(val) : String(val))
                                      .filter(Boolean)
                                      .join(" • ").replace(/Pasar/g, "");
                                  }
                                  return String(m.jam_buka || "");
                                })()}
                              </span>
                            </div>

                            {/* Sub Category Selection */}
                            {selectedMarketName === m.nama_pasar && Array.isArray(m.kategori) && m.kategori.length > 1 && (
                              <div className="mt-2.5 flex flex-wrap gap-1.5 p-1 bg-zinc-100/50 dark:bg-black/20 rounded-xl w-fit">
                                {m.kategori.map((kat: any, katIdx: number) => {
                                  const katIdVal = typeof kat === "object" ? kat.kode || kat.id || katIdx : kat;
                                  const label = typeof kat === "object" ? kat.label : KATEGORI_TYPES.find((k) => k.id === kat)?.label || kat;
                                  const labelStr = typeof label === "object" ? String(label.label || katIdVal) : String(label);
                                  return (
                                    <button
                                      key={`${m.id}-${katIdVal}-${katIdx}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSubCategory(String(katIdVal));
                                      }}
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-medium  tracking-tight transition-all",
                                        selectedSubCategory === String(katIdVal)
                                          ? "bg-brand-primary text-black"
                                          : "bg-zinc-200 dark:bg-white/10 text-zinc-500 dark:text-white/40 hover:bg-zinc-300 dark:hover:bg-white/20",
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
                            <div className="bg-brand-primary text-black p-1 rounded-full shadow-lg shadow-brand-primary/20 ml-4 shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-zinc-400 dark:text-white/10  text-sm font-medium  tracking-tight">
                        Data Tidak Ditemukan
                      </div>
                    )}
                </div>
              </div>
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 p-4 bg-white dark:bg-[#0a0a0a] border-t border-zinc-100 dark:border-white/5 flex justify-center z-20">
                <button
                  onClick={handleAddPlan}
                  className="w-full max-w-[200px] h-12 bg-zinc-900 dark:bg-brand-primary text-white dark:text-black rounded-full font-medium  tracking-tight text-sm shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-[1.02] active:scale-95 flex items-center justify-center relative overflow-hidden"
                >
                  <span className="relative z-10">SIMPAN</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

}
