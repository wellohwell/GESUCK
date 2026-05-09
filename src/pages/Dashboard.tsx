import React, { useEffect, useState, useMemo } from "react";
import {
  subscribeMarketPlans,
  addMarketPlan,
  deleteMarketPlan,
  subscribeMarkets,
} from "../firebase/services";
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-toastify";
import { cn } from "../lib/utils";
import { getActiveSystemDate } from "../utils/javaneseDate";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/id";

dayjs.extend(relativeTime);
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
  isAdmin: boolean;
}

export default function Dashboard({
  onNavigateAdmin,
  isAdmin,
}: DashboardProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeDate, setActiveDate] = useState(getActiveSystemDate());

  // Form State
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedMarketName, setSelectedMarketName] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsubPlans = subscribeMarketPlans(activeDate.isoDate, (data) => {
      setPlans(
        data.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        ),
      );
      setLoading(false);
    });

    const unsubMarkets = subscribeMarkets(setMarkets);

    return () => {
      unsubPlans();
      unsubMarkets();
    };
  }, [activeDate.isoDate]);

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

      return matchesCity && matchesType;
    });
  }, [markets, plans, selectedCity, selectedType, searchQuery]);

  const selectedMarket = useMemo(
    () => markets.find((m) => m.nama_pasar === selectedMarketName),
    [markets, selectedMarketName],
  );

  const pasaranWarning = useMemo(() => {
    if (!selectedMarket || selectedMarket.kategori !== "PASARAN_JAWA")
      return null;

    const todayPasaran = activeDate.pasaran.toUpperCase();
    const marketPasarans = selectedMarket.pasaran || [];

    if (selectedMarket.buka_harian) return null;
    if (marketPasarans.includes(todayPasaran)) return null;

    return `Pasar ini biasanya buka hari ${marketPasarans.join(", ")}, sedangkan hari ini adalah ${activeDate.pasaran}.`;
  }, [selectedMarket, activeDate.pasaran]);

  const handleAddPlan = async () => {
    if (!selectedMarketName) {
      toast.error("Pilih pasar terlebih dahulu.");
      return;
    }

    if (
      pasaranWarning &&
      !window.confirm(`${pasaranWarning}\n\nTetap simpan rencana?`)
    ) {
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
        city: selectedMarket?.wilayah || selectedCity,
        marketType: finalCategory,
        marketName: selectedMarketName,
        marketJam: String(jamBuka),
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

  const resetForm = () => {
    setSelectedMarketName("");
    setSelectedSubCategory("");
    setSelectedCity("");
    setSelectedType("");
    setSearchQuery("");
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

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      {/* Navbar Minimal */}
      <nav className="p-3 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 p-0.5">
            <img
              src={
                auth.currentUser?.photoURL ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${auth.currentUser?.displayName}`
              }
              alt="Avatar"
              className="w-full h-full rounded-full object-cover"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h4 className="text-[11px] font-black tracking-tight">
              {auth.currentUser?.displayName}
            </h4>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <button
              onClick={onNavigateAdmin}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
            >
              <Settings className="w-3.5 h-3.5 text-white/40" />
            </button>
          )}
          <button
            onClick={() => auth.signOut()}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-red-500/40" />
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-3 pt-1 pb-20">
        {/* Header Hero */}
        <section className="mb-4 text-center pt-2">
          <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] mb-1">
            {activeDate.fullDate}
          </p>
          <h1 className="text-xl font-display font-black leading-tight tracking-tighter text-white">
            {activeDate.dayName}{" "}
            <span className="text-brand-primary">{activeDate.pasaran}</span>
          </h1>
        </section>

        {/* Live List */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-brand-primary" />
              <h2 className="text-[10px] font-black uppercase tracking-widest text-white/70">
                #GJY2026 Status
              </h2>
            </div>
            <span className="text-[8px] font-bold text-white/40 bg-white/10 px-1.5 py-0.5 rounded border border-white/5">
              {plans.length} ONLINE
            </span>
          </div>

          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-12 bg-white/[0.02] rounded-xl animate-pulse border border-white/5"
                  />
                ))
              ) : plans.length === 0 ? (
                <div className="py-8 text-center glass rounded-xl border border-dashed border-white/10">
                  <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest">
                    Belum ada rencana
                  </p>
                </div>
              ) : (
                plans.map((plan) => (
                  <motion.div
                    layout
                    key={plan.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "group p-1.5 rounded-xl border transition-all duration-500 flex items-center gap-2 relative overflow-hidden",
                      plan.userId === auth.currentUser?.uid
                        ? "bg-white/[0.04] border-brand-primary/20"
                        : "bg-white/[0.02] border-white/5",
                    )}
                  >
                    <div className="w-7 h-7 flex-shrink-0 rounded-lg bg-white/5 border border-white/5 overflow-hidden p-0.5">
                      <img
                        src={plan.userPhoto}
                        className="w-full h-full rounded-lg object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                        alt=""
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-black text-white leading-tight group-hover:text-brand-primary transition-colors truncate">
                        {plan.marketName}
                      </p>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-black text-brand-primary uppercase tracking-wider truncate max-w-[80px]">
                          {typeof plan.userName === "string"
                            ? plan.userName.split(" ")[0]
                            : "User"}
                        </span>
                        <div className="w-0.5 h-0.5 rounded-full bg-white/20 shrink-0" />
                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-tight truncate">
                          {plan.city}
                        </span>
                        {plan.marketJam && (
                          <>
                            <div className="w-0.5 h-0.5 rounded-full bg-white/20 shrink-0" />
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-tight">
                              {typeof plan.marketJam === "object" &&
                              plan.marketJam !== null
                                ? Object.values(plan.marketJam)
                                    .map((val) =>
                                      typeof val === "object"
                                        ? JSON.stringify(val)
                                        : String(val),
                                    )
                                    .filter(Boolean)
                                    .join(", ")
                                : String(plan.marketJam || "")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[8px] text-white/30 font-black mb-0.5 tracking-tight">
                        {dayjs(plan.createdAt?.toDate()).fromNow()}
                      </p>
                      {plan.userId === auth.currentUser?.uid && (
                        <button
                          onClick={(e) => handleDelete(e, plan.id)}
                          className="p-1 rounded bg-red-500/10 text-red-500/30 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
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

      {/* Floating Action Button */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40">
        <button
          onClick={() => setShowModal(true)}
          disabled={!!myPlan}
          className={cn(
            "w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-2 border shadow-2xl active:scale-95 disabled:opacity-50 disabled:active:scale-100",
            myPlan
              ? "bg-white/5 text-white/20 border-white/5 cursor-not-allowed"
              : "bg-white text-black border-transparent hover:bg-brand-primary",
          )}
        >
          {myPlan ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />
              Rencana Dimiliki
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              Tambah Rencana
            </>
          )}
        </button>
      </div>

      {/* Modal - Improved Minimal Feel */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-lg bg-[#0a0a0a] rounded-t-[20px] sm:rounded-[20px] p-3 pb-5 sm:pb-3 relative border-t border-white/10 sm:border border-white/5 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-xs font-display font-black tracking-tight text-white uppercase">
                    RENCANA KUNJUNGAN PASAR
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Search Box */}
                <div>
                  <label className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1 block pl-1">
                    Cari
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                    <input
                      type="text"
                      placeholder="Ketik nama pasar..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-2 py-1.5 text-xs font-bold outline-none focus:border-brand-primary/40 transition-all text-white placeholder:text-white/20"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <X className="w-3.5 h-3.5 text-white/40 hover:text-white" />
                      </button>
                    )}
                  </div>
                </div>

                {/* City Selector */}
                <div>
                  <label className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1 block pl-1">
                    Wilayah
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs font-bold appearance-none outline-none focus:border-brand-primary/40 transition-all text-white"
                    >
                      <option value="" className="bg-[#0a0a0a]">
                        Semua
                      </option>
                      {WILAYAH_EXACT.map((w) => (
                        <option key={w} value={w} className="bg-[#0a0a0a]">
                          {w}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-white/40" />
                    </div>
                  </div>
                </div>

                {/* Type Selector */}
                <div>
                  <label className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1 block pl-1">
                    Kategori
                  </label>
                  <div className="relative">
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs font-bold appearance-none outline-none focus:border-brand-primary/40 transition-all text-white"
                    >
                      <option value="" className="bg-[#0a0a0a]">
                        Semua
                      </option>
                      {KATEGORI_TYPES.map((k) => (
                        <option
                          key={k.id}
                          value={k.id}
                          className="bg-[#0a0a0a]"
                        >
                          {k.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-white/40" />
                    </div>
                  </div>
                </div>

                {/* Available Markets List */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <label className="text-[9px] font-black text-white/60 uppercase tracking-widest block">
                      Target Pasar
                    </label>
                    <span className="text-[9px] font-bold text-white/40 bg-white/10 px-2 py-0.5 rounded uppercase border border-white/5">
                      {availableMarkets.length} Tersedia
                    </span>
                  </div>

                  <AnimatePresence>
                    {pasaranWarning && !searchQuery && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-1.5 mb-1.5 flex gap-2 overflow-hidden"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                        <p className="text-[9px] font-bold text-yellow-200/60 leading-normal">
                          {pasaranWarning}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="grid grid-cols-1 gap-1 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                    {availableMarkets.length > 0 ? (
                      availableMarkets.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleMarketClick(m)}
                          className={cn(
                            "p-1.5 rounded-lg text-left border transition-all relative overflow-hidden group",
                            selectedMarketName === m.nama_pasar
                              ? "bg-brand-primary/10 border-brand-primary text-brand-primary"
                              : "bg-white/5 border-white/5 text-white/60 hover:border-white/10",
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p
                                className={cn(
                                  "font-bold text-sm leading-tight mb-1",
                                  selectedMarketName === m.nama_pasar
                                    ? "text-brand-primary"
                                    : "text-white",
                                )}
                              >
                                {m.nama_pasar}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <div className="flex items-center gap-1 opacity-60">
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span className="text-[8px] font-bold uppercase tracking-tight">
                                    {m.wilayah}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-60">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span className="text-[8px] font-bold uppercase tracking-tight">
                                    {(() => {
                                      if (
                                        selectedMarketName === m.nama_pasar &&
                                        selectedSubCategory
                                      ) {
                                        const mKats = Array.isArray(m.kategori)
                                          ? m.kategori
                                          : [m.kategori];
                                        const katObj = mKats.find(
                                          (k: any) =>
                                            (typeof k === "object"
                                              ? k.kode || k.id
                                              : k) === selectedSubCategory,
                                        );

                                        if (
                                          typeof katObj === "object" &&
                                          katObj?.jam_buka
                                        ) {
                                          return String(katObj.jam_buka);
                                        }

                                        if (
                                          typeof m.jam_buka === "object" &&
                                          m.jam_buka !== null
                                        ) {
                                          return String(
                                            m.jam_buka[selectedSubCategory] ||
                                              Object.values(m.jam_buka)[0] ||
                                              "",
                                          );
                                        }
                                      }

                                      if (
                                        typeof m.jam_buka === "object" &&
                                        m.jam_buka !== null
                                      ) {
                                        return Object.values(m.jam_buka)
                                          .map((val) =>
                                            typeof val === "object"
                                              ? JSON.stringify(val)
                                              : String(val),
                                          )
                                          .filter(Boolean)
                                          .join(", ");
                                      }

                                      return String(m.jam_buka || "");
                                    })()}
                                  </span>
                                </div>
                              </div>

                              {/* Sub Category Selection */}
                              {selectedMarketName === m.nama_pasar &&
                                Array.isArray(m.kategori) &&
                                m.kategori.length > 1 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {m.kategori.map(
                                      (kat: any, katIdx: number) => {
                                        const katId =
                                          typeof kat === "object"
                                            ? kat.kode || kat.id || katIdx
                                            : kat;
                                        const label =
                                          typeof kat === "object"
                                            ? kat.label
                                            : KATEGORI_TYPES.find(
                                                (k) => k.id === kat,
                                              )?.label || kat;
                                        return (
                                          <button
                                            key={katId}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedSubCategory(katId);
                                            }}
                                            className={cn(
                                              "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all",
                                              selectedSubCategory === katId
                                                ? "bg-brand-primary text-black"
                                                : "bg-white/10 text-white/40 hover:bg-white/20",
                                            )}
                                          >
                                            {typeof label === "object"
                                              ? String(label.label || katId)
                                              : label}
                                          </button>
                                        );
                                      },
                                    )}
                                  </div>
                                )}
                            </div>
                            {selectedMarketName === m.nama_pasar && (
                              <div className="bg-brand-primary text-black p-0.5 rounded-full">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="col-span-1 py-8 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-xl">
                        <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest">
                          Semua pasar terpenuhi
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleAddPlan}
                  className="w-full py-3 rounded-xl bg-brand-primary text-black font-black text-[9px] uppercase tracking-[0.2em] transition-all shadow-xl"
                >
                  SIMPAN RENCANA
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
