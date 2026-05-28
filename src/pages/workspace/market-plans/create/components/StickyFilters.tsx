import React from "react";
import { ChevronDown } from "lucide-react";
import { WILAYAH_EXACT, KATEGORI_TYPES, PASARAN_OPTIONS } from "../../constants";
import { SearchInput } from "./SearchInput";

interface StickyFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedCity: string;
  setSelectedCity: (val: string) => void;
  selectedType: string;
  setSelectedType: (val: string) => void;
  selectedPasaran: string;
  setSelectedPasaran: (val: string) => void;
  totalAvailable: number;
}

export const StickyFilters: React.FC<StickyFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCity,
  setSelectedCity,
  selectedType,
  setSelectedType,
  selectedPasaran,
  setSelectedPasaran,
  totalAvailable,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/10 pb-3 group/header shadow-sm mt-[-1px]">
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 space-y-3 pt-3">
        {/* Search Bar */}
        <SearchInput value={searchQuery} onChange={setSearchQuery} />

        {/* Filters Grid */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-3 gap-2 px-1">
            <label className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">WILAYAH</label>
            <label className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">KATEGORI</label>
            <label className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">PASARAN</label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full h-9 bg-muted/45 px-3 rounded-xl text-[10px] font-black border border-border/10 outline-none focus:ring-1 focus:ring-primary/20 text-foreground appearance-none cursor-pointer transition-all uppercase tracking-tighter"
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
                className="w-full h-9 bg-muted/45 px-3 rounded-xl text-[10px] font-black border border-border/10 outline-none focus:ring-1 focus:ring-primary/20 text-foreground appearance-none cursor-pointer transition-all uppercase tracking-tighter"
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
                className="w-full h-9 bg-muted/45 px-3 rounded-xl text-[10px] font-black border border-border/10 outline-none focus:ring-1 focus:ring-primary/20 text-foreground appearance-none cursor-pointer transition-all uppercase tracking-tighter"
              >
                <option value="" className="bg-background">SEMUA</option>
                {PASARAN_OPTIONS.map((p) => (
                  <option key={p} value={p} className="bg-background">{p.toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Status Area */}
        <div className="flex items-center justify-between px-1 pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">PASAR TERSEDIA</span>
          </div>
          <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-0.5 rounded-full border border-primary/20 tracking-widest">
            {totalAvailable} TOTAL
          </span>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/10 to-transparent" />
    </header>
  );
};
