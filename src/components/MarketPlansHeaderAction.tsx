import React from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../providers/AuthProvider';

export function MarketPlansHeaderAction() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const userRole = profile?.role?.toUpperCase();
  const isStaffOrOwner = userRole === 'STAFF' || userRole === 'OWNER' || profile?.userType === 'global';

  // Show ONLY when pathname starts with /workspace/market-plans or is /market-plans
  const pathnameStr = location.pathname.toLowerCase();
  const isMarketPlans = pathnameStr.startsWith('/workspace/market-plans') || 
                       pathnameStr.startsWith('/workspace/market-plans');
  const isMarketPlansBase = pathnameStr === '/workspace/market-plans';
  const isMarketPlansLaporan = pathnameStr === '/workspace/market-plans/laporan';

  if (!isMarketPlansBase && !isMarketPlansLaporan) {
    return null;
  }

  const isActive = isMarketPlansLaporan;

  const handleToggle = () => {
    if (isActive) {
      navigate('/workspace/market-plans');
    } else {
      navigate('/workspace/market-plans/laporan');
    }
  };

  return (
    <div className="flex items-center bg-background/40 p-1 rounded-full border border-border/10">
      <div className="group relative">
        <button
          onClick={handleToggle}
          className={cn(
            "p-2 rounded-full flex items-center justify-center transition-all duration-300",
            isActive
              ? "bg-primary text-black shadow-sm scale-110"
              : "text-muted-foreground hover:bg-white/5 hover:text-white"
          )}
        >
          <BarChart3 className="w-4 h-4" />
        </button>
        <div className="absolute top-full mt-2 right-0 px-3 py-1.5 bg-black/90 backdrop-blur-md rounded-lg text-[8px] font-black text-white uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 pointer-events-none whitespace-nowrap z-50 border border-white/5 shadow-xl">
          {isActive ? 'Tampilkan Rencana' : 'Lihat Statistik'}
        </div>
      </div>
      
      {isStaffOrOwner && (
        <div className="group relative ml-1">
          <button
            onClick={() => navigate('/admin/master')}
            className="p-2 rounded-full flex items-center justify-center transition-all duration-300 text-muted-foreground hover:bg-white/5 hover:text-white"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <div className="absolute top-full mt-2 right-0 px-3 py-1.5 bg-black/90 backdrop-blur-md rounded-lg text-[8px] font-black text-white uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 pointer-events-none whitespace-nowrap z-50 border border-white/5 shadow-xl">
            Master Data
          </div>
        </div>
      )}
    </div>
  );
}
