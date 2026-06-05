import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Flame, Snowflake } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface MarketTemperatureProps {
  markets: any[];
  allPlans: any[];
}

export function MarketTemperature({ markets, allPlans }: MarketTemperatureProps) {
  const temperatureData = useMemo(() => {
    // Helper to normalize market names for robust matching
    const cleanName = (name: string) => {
      if (!name) return "";
      return name
        .toLowerCase()
        .replace(/pasar/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    // Count visits per market across all plans
    const marketVisits: Record<string, number> = {};
    const visitedMarketIds = new Set<string>();

    allPlans.forEach(plan => {
      let matchedMarketId = plan.marketId;

      if (!matchedMarketId && plan.marketName) {
        const cleanedPlanName = cleanName(plan.marketName);
        const cleanedPlanCity = plan.city ? plan.city.toLowerCase().trim() : "";
        
        // Try strict name and city first
        let found = markets.find(m => {
          const mCity = m.wilayah ? m.wilayah.toLowerCase().trim() : "";
          return cleanName(m.nama_pasar) === cleanedPlanName && (cleanedPlanCity === "" || mCity === cleanedPlanCity);
        });
        
        // Fallback to name only
        if (!found) {
          found = markets.find(m => cleanName(m.nama_pasar) === cleanedPlanName);
        }

        if (found) {
          matchedMarketId = found.id;
        }
      }

      if (matchedMarketId) {
        marketVisits[matchedMarketId] = (marketVisits[matchedMarketId] || 0) + 1;
        visitedMarketIds.add(matchedMarketId);
      }
    });

    // Enrich markets with visit count
    const enrichedMarkets = markets.map(m => ({
      ...m,
      visitCount: marketVisits[m.id] || 0,
      isVisited: visitedMarketIds.has(m.id)
    }));

    // Identify HOT markets (Top 4 by count)
    const hotMarkets = [...enrichedMarkets]
      .filter(m => m.visitCount > 0)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 4);

    // Identify COLD markets (Never visited first, then lowest visit count)
    const coldMarkets = [...enrichedMarkets]
      .sort((a, b) => {
        if (a.isVisited !== b.isVisited) return a.isVisited ? 1 : -1;
        return a.visitCount - b.visitCount;
      })
      .slice(0, 4);

    return { hotMarkets, coldMarkets };
  }, [markets, allPlans]);

  return (
    <div className="flex flex-col items-center mt-4 w-full">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[340px] md:max-w-full"
      >
        <h3 className="font-bold text-[10px] uppercase tracking-wider text-primary text-center mb-4">
          • Market Temperature •
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* HOT */}
          <div className="flex flex-col items-start">
            <div className="flex items-center justify-start gap-1.5 text-orange-500 mb-2">
              <Flame className="w-3 h-3" />
              <span className="font-bold text-[8px] uppercase tracking-wider">HOT</span>
            </div>
            <div className="space-y-1">
              {temperatureData.hotMarkets.length > 0 ? (
                temperatureData.hotMarkets.map(m => (
                  <div key={m.id} className="flex items-center justify-start gap-1.5 text-[10px] text-foreground">
                    <div className="w-1 h-1 rounded-full bg-orange-500 flex-shrink-0" />
                    {m.nama_pasar.replace(/pasar\s*/gi, '').trim()}
                  </div>
                ))
              ) : (
                <div className="text-[9px] text-muted-foreground italic text-left">
                  Belum ada data kunjungan.
                </div>
              )}
            </div>
          </div>

          {/* COLD */}
          <div className="flex flex-col items-start">
            <div className="flex items-center justify-start gap-1.5 text-blue-500 mb-2">
              <Snowflake className="w-3 h-3" />
              <span className="font-bold text-[8px] uppercase tracking-wider">COLD</span>
            </div>
            <div className="space-y-1">
              {temperatureData.coldMarkets.length > 0 ? (
                temperatureData.coldMarkets.map(m => (
                  <div key={m.id} className="flex items-center justify-start gap-1.5 text-[10px] text-foreground">
                    <div className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                    {m.nama_pasar.replace(/pasar\s*/gi, '').trim()}
                  </div>
                ))
              ) : (
                <div className="text-[9px] text-muted-foreground italic text-left">
                  Semua pasar sudah dikunjungi.
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
