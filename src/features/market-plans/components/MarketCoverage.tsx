import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { Target } from 'lucide-react';
import { REGION_IDENTITY } from '../utils/regionIdentity';

interface MarketCoverageProps {
  markets: any[];
  allPlans: any[];
}

export function MarketCoverage({ markets, allPlans }: MarketCoverageProps) {

  const coverageData = useMemo(() => {
    const totalMarkets = markets.length;
    
    const masterNames = new Set(markets.map(m => m.nama_pasar?.trim().toLowerCase()));
    
    // Count unique markets that have been visited AND exist in master data
    const visitedMarketNames = new Set();
    allPlans.forEach(plan => {
      const name = plan.marketName?.trim().toLowerCase();
      if (name && masterNames.has(name)) {
        visitedMarketNames.add(name);
      }
    });
    
    const visitedCount = visitedMarketNames.size;
    
    const percentage = totalMarkets > 0 ? (visitedCount / totalMarkets) * 100 : 0;
    
    let status: 'excellent' | 'good' | 'growing' = 'growing';
    if (percentage >= 80) status = 'excellent';
    else if (percentage >= 50) status = 'good';
    
    const remaining = totalMarkets - visitedCount;
    
    let insight = "";
    if (percentage === 0) {
      insight = "Begin your market expansion to see insights.";
    } else if (status === 'excellent') {
      insight = "Coverage has expanded across most active regions.";
    } else if (status === 'good') {
      insight = `Coverage is expanding. ${remaining} markets remain untouched.`;
    } else {
      insight = `Large expansion opportunity remains available.`;
    }

    // Regional aggregation
    const regionalStats: Record<string, { total: number, visited: number }> = {
      DIY: { total: 0, visited: 0 },
      MGL: { total: 0, visited: 0 },
      PWJ: { total: 0, visited: 0 },
      GKD: { total: 0, visited: 0 },
    };

    markets.forEach(m => {
      const w = m.wilayah?.trim().toLowerCase();
      const n = m.nama_pasar?.trim().toLowerCase();
      
      let targetRegionLabel = null;
      if (REGION_IDENTITY.DIY.regions.includes(w)) targetRegionLabel = 'DIY';
      else if (REGION_IDENTITY.MGL.regions.includes(w)) targetRegionLabel = 'MGL';
      else if (REGION_IDENTITY.PWJ.regions.includes(w)) targetRegionLabel = 'PWJ';
      else if (REGION_IDENTITY.GKD.regions.includes(w)) targetRegionLabel = 'GKD';

      if (targetRegionLabel) {
        regionalStats[targetRegionLabel].total += 1;
        if (visitedMarketNames.has(n)) {
          regionalStats[targetRegionLabel].visited += 1;
        }
      }
    });

    const regionalSummary = Object.entries(regionalStats).map(([name, stats]) => ({
      name,
      percentage: stats.total > 0 ? (stats.visited / stats.total) * 100 : 0
    }));
    
    return {
      total: totalMarkets,
      visited: visitedCount,
      percentage,
      status,
      remaining,
      insight,
      regionalSummary
    };
  }, [markets, allPlans]);
  
  if (coverageData.total === 0) return null;
  
  const statusConfig = {
    excellent: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Sangat Baik' },
    good: { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Baik' },
    growing: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Berkembang' }
  };
  
  const currentStatus = statusConfig[coverageData.status];

  return (
    <div className="flex justify-center md:justify-start mt-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[340px] md:max-w-full group relative"
      >
        <div className="relative p-2 flex flex-col gap-1">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3 text-primary opacity-80" />
              <h3 className="font-bold text-[8px] uppercase tracking-wider text-muted-foreground">Cakupan Pasar</h3>
            </div>
            
            <div className={cn("px-1 py-0 rounded-full border text-[7px] font-bold uppercase tracking-widest", 
              currentStatus.bg, currentStatus.color, currentStatus.border)}>
              {currentStatus.label}
            </div>
          </div>
          
          {/* Primary Metric */}
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black tracking-tighter text-foreground leading-none">
              {coverageData.percentage.toFixed(1)}%
            </span>
          </div>
          
          {/* Progress Bar Container */}
          <div className="space-y-0.5">
            <div className="h-1 w-full bg-muted/50 rounded-full overflow-hidden flex">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${coverageData.percentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn("h-full rounded-full",
                  coverageData.status === 'excellent' ? 'bg-emerald-500' :
                  coverageData.status === 'good' ? 'bg-blue-500' :
                  'bg-orange-500'
                )}
              />
            </div>
            <div className="text-[8px] text-muted-foreground w-full text-center">
              {coverageData.visited} dari {coverageData.total} pasar telah dijangkau
            </div>
          </div>
          
          {/* Regional Snapshot Row */}
          <div className="flex flex-wrap items-center justify-center gap-1 text-[8px] text-muted-foreground mt-0.5">
            {coverageData.regionalSummary.map((reg, index) => {
              const identity = REGION_IDENTITY[reg.name as keyof typeof REGION_IDENTITY];
              return (
                <React.Fragment key={reg.name}>
                   <div className="flex items-center gap-0.5">
                      <div className={cn("w-1 h-1 rounded-full", identity.dot)} />
                      <span className={cn("font-bold", identity.color)}>
                        {identity.label} <span className="font-medium opacity-80">{reg.percentage.toFixed(0)}%</span>
                      </span>
                   </div>
                   {index < coverageData.regionalSummary.length - 1 && <span className="text-border">|</span>}
                </React.Fragment>
              );
            })}
          </div>
          
        </div>
      </motion.div>
    </div>
  );
}
