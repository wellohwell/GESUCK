import React from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';

export function MarketPlansHeaderAction() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Show ONLY when pathname is exactly "/market-plans" (case-insensitive)
  if (location.pathname.toLowerCase() !== '/market-plans') {
    return null;
  }

  const currentTab = searchParams.get('tab') || 'plans';
  const isActive = currentTab === 'laporan';

  const handleToggle = () => {
    if (isActive) {
      setSearchParams({ tab: 'plans' });
    } else {
      setSearchParams({ tab: 'laporan' });
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "h-8 px-4 rounded-full flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all duration-300",
        "border min-w-[32px] justify-center shadow-sm select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#C6FF2E]/30",
        isActive
          ? "bg-[#C6FF2E] border-transparent text-black shadow-[0_0_12px_rgba(198,255,46,0.3)] hover:bg-[#C6FF2E]/90"
          : "bg-[#C6FF2E]/8 dark:bg-[#C6FF2E]/12 border-[#C6FF2E]/18 text-[#86b100] dark:text-[#C6FF2E] hover:bg-[#C6FF2E]/15 hover:shadow-[0_0_10px_rgba(198,255,46,0.15)]"
      )}
    >
      <BarChart3 className={cn("w-4 h-4 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
    </button>
  );
}
