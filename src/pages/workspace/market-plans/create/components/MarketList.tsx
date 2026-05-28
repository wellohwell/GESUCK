import React from "react";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MarketCard } from "./MarketCard";

interface MarketListProps {
  markets: any[];
  takenMarketsMap: Record<string, string>;
  selectedMarketName: string;
  selectedMarketCity: string;
  selectedSubCategory: string;
  onMarketClick: (m: any) => void;
  onSubCategorySelect: (id: string) => void;
  pasaranWarning?: string | null;
  searchQuery: string;
  normalizeMarketName: (name: string) => string;
  normalizeCityName: (city: string) => string;
}

export const MarketList: React.FC<MarketListProps> = ({
  markets,
  takenMarketsMap,
  selectedMarketName,
  selectedMarketCity,
  selectedSubCategory,
  onMarketClick,
  onSubCategorySelect,
  pasaranWarning,
  searchQuery,
  normalizeMarketName,
  normalizeCityName,
}) => {
  return (
    <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth pb-32">
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6">
        <AnimatePresence mode="popLayout">
          {pasaranWarning && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-[1.5rem] p-4 mb-5 flex gap-3 overflow-hidden shadow-sm shadow-yellow-500/5 items-start"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse mt-1.5 shrink-0" />
              <p className="text-[10px] font-black text-yellow-800 dark:text-yellow-200/60 leading-relaxed uppercase tracking-tight">
                {pasaranWarning}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-3">
          {markets.length > 0 ? (
            markets.map((m) => {
              const key = `${normalizeMarketName(m.nama_pasar)}|${normalizeCityName(m.wilayah)}`;
              const takerName = takenMarketsMap[key];
              const isTaken = !!takerName;
              const isSelected = selectedMarketName === m.nama_pasar && selectedMarketCity === m.wilayah;

              return (
                <MarketCard
                  key={m.id}
                  market={m}
                  isTaken={isTaken}
                  takerName={takerName}
                  isSelected={isSelected}
                  selectedSubCategory={selectedSubCategory}
                  onMarketClick={onMarketClick}
                  onSubCategorySelect={onSubCategorySelect}
                />
              );
            })
          ) : (
            <div className="py-24 text-center flex flex-col items-center justify-center opacity-30">
              <Search className="w-12 h-12 mb-4 text-muted-foreground/30 stroke-[1px]" />
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em]">
                Data Tidak Ditemukan
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
