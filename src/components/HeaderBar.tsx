import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { useAuth } from '../providers/AuthProvider';
import { useRuntime } from '../providers/RuntimeProvider';
import { useNetwork } from '../hooks/use-network';
import { Wifi, WifiOff, MapPin, Loader2, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { MarketPlansHeaderAction } from './MarketPlansHeaderAction';

export function HeaderBar() {
  const { profile } = useAuth();
  const { activeBranchContext, setBranchContext } = useRuntime();
  const navigate = useNavigate();
  const { isOnline, isSlow } = useNetwork();
  
  const isGlobalUser = profile?.userType === 'global';

  const handleReturnToCockpit = () => {
    setBranchContext(null);
    navigate('/global');
  };

  return (
    <header className="sticky top-0 z-[60] w-full border-b border-zinc-100/80 dark:border-zinc-800/50 bg-background/80 backdrop-blur-md px-4 py-1.2 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Section: Scoped Workspace / Network Indicator */}
        <div className="flex items-center gap-3">
          {isGlobalUser ? (
            activeBranchContext ? (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <MapPin className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest leading-none">
                    Konteks: {activeBranchContext.toUpperCase()}
                  </span>
                </div>
                <button 
                  onClick={handleReturnToCockpit}
                  type="button"
                  className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 rounded-lg hover:opacity-90 active:scale-95 transition-all"
                >
                  KOKPIT
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d2f34c]/10 border border-[#d2f34c]/20 text-[#d2f34c]">
                <Globe className="w-3.5 h-3.5 text-[#d2f34c]" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest leading-none">
                  KONSENTER CENTRAL
                </span>
              </div>
            )
          ) : profile?.branchId ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 text-zinc-600 dark:text-zinc-350">
              <MapPin className="w-3.5 h-3.5 text-brand-primary" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest leading-none">
                {profile.branchId}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 text-zinc-500">
              <span className="text-[10px] font-extrabold uppercase tracking-widest leading-none">
                PUSAT
              </span>
            </div>
          )}

          {/* Connection Monitor */}
          {!isOnline ? (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 animate-pulse">
              <WifiOff className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-widest">
                OFFLINE
              </span>
            </div>
          ) : isSlow ? (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-amber-600 dark:text-amber-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-[9px] font-black uppercase tracking-widest">
                SLOW SYNC
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 text-zinc-400 dark:text-zinc-500">
              <span className="relative flex h-1.5 w-1.5 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest">ONLINE</span>
            </div>
          )}
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <MarketPlansHeaderAction />
          <div className="flex items-center gap-1">
             <ThemeToggle />
          </div>
          <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

