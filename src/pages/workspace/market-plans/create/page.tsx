import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { auth } from "../../../../firebase/config";
import { toast } from "../../../../hooks/use-toast";
import {
  subscribeMarketPlans,
  subscribeMarkets,
  addMarketPlan
} from "../../../../lib/services";
import { useBranch } from "../../../../hooks/authHooks";
import { getActiveSystemDate } from "../../../../utils/javaneseDate";
import { toTitleCase } from "../../../../utils/format";
import { StickyFilters } from "./components/StickyFilters";
import { MarketList } from "./components/MarketList";
import { SavePlanFAB } from "./components/SavePlanFAB";

export default function CreateMarketPlanPage() {
  const navigate = useNavigate();
  const { branchId } = useBranch();
  const [activeDate] = useState(getActiveSystemDate());

  // Data State
  const [plans, setPlans] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedPasaran, setSelectedPasaran] = useState("");
  const [selectedMarketName, setSelectedMarketName] = useState("");
  const [selectedMarketCity, setSelectedMarketCity] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!branchId) return;

    const unsubPlans = subscribeMarketPlans(activeDate.isoDate, (data) => {
      setPlans(data.filter(p => !p.branchId || p.branchId === branchId));
      setLoading(false);
    });

    const unsubMarkets = subscribeMarkets(setMarkets, branchId);

    return () => {
      unsubPlans();
      unsubMarkets();
    };
  }, [activeDate.isoDate, branchId]);

  const normalizeMarketName = (name: string): string => {
    if (!name) return "";
    return name.toLowerCase().replace(/^pasar\s+/i, "").replace(/\s+/g, " ").trim();
  };

  const normalizeCityName = (city: string): string => {
    if (!city) return "";
    return city.toLowerCase().replace(/^kota\s+/i, "").replace(/\s+/g, " ").trim();
  };

  const takenMarketsMap = useMemo(() => {
    const map: Record<string, string> = {};
    plans.forEach((p) => {
      const key = `${normalizeMarketName(p.marketName)}|${normalizeCityName(p.city)}`;
      map[key] = p.userName || "User";
    });
    return map;
  }, [plans]);

  const availableMarkets = useMemo(() => {
    return markets.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.nama_pasar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.wilayah.toLowerCase().includes(searchQuery.toLowerCase());

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
    if (!selectedMarket || !selectedSubCategory) return null;

    const todayPasaran = activeDate.pasaran.toUpperCase();
    const marketPasarans = Array.isArray(selectedMarket.pasaran) ? selectedMarket.pasaran : [];

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
        userId: auth.currentUser?.uid,
      });
      
      toast.success("Rencana berhasil disimpan");
      navigate("/workspace/market-plans");
    } catch (error) {
      toast.error("Gagal menyimpan rencana");
    }
  };

  const handleMarketClick = (m: any) => {
    const key = `${normalizeMarketName(m.nama_pasar)}|${normalizeCityName(m.wilayah)}`;
    if (takenMarketsMap[key]) return;

    setSelectedMarketName(m.nama_pasar);
    setSelectedMarketCity(m.wilayah);
    
    const mKategoris = Array.isArray(m.kategori) ? m.kategori : [m.kategori];
    const getKatId = (k: any) => (typeof k === "object" ? k.kode || k.id : k);

    if (mKategoris.length === 1) {
      setSelectedSubCategory(getKatId(mKategoris[0]));
    } else if (selectedType && mKategoris.some((k) => getKatId(k) === selectedType)) {
      setSelectedSubCategory(selectedType);
    } else {
      setSelectedSubCategory(""); 
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="fixed inset-0 z-50 bg-background flex flex-col font-sans overflow-hidden"
    >
      {/* Top Banner with Close */}
      <div className="bg-background border-b border-border/5 px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          </div>
          <h2 className="text-[11px] font-black tracking-[0.2em] uppercase text-foreground/80">TAMBAH RENCANA</h2>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-muted/30 hover:bg-muted/60 flex items-center justify-center text-muted-foreground transition-all active:scale-90"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <StickyFilters 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCity={selectedCity}
          setSelectedCity={setSelectedCity}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          selectedPasaran={selectedPasaran}
          setSelectedPasaran={setSelectedPasaran}
          totalAvailable={availableMarkets.length}
        />

        <MarketList 
          markets={availableMarkets}
          takenMarketsMap={takenMarketsMap}
          selectedMarketName={selectedMarketName}
          selectedMarketCity={selectedMarketCity}
          selectedSubCategory={selectedSubCategory}
          onMarketClick={handleMarketClick}
          onSubCategorySelect={setSelectedSubCategory}
          pasaranWarning={pasaranWarning}
          searchQuery={searchQuery}
          normalizeMarketName={normalizeMarketName}
          normalizeCityName={normalizeCityName}
        />

        <SavePlanFAB 
          onClick={handleAddPlan}
          disabled={!selectedMarketName}
          selectedMarketName={selectedMarketName}
        />
      </div>
    </motion.div>
  );
}
