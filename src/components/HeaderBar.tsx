import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { useAuth } from '../providers/AuthProvider';
import { useRuntime } from '../providers/RuntimeProvider';
import { useNetwork } from '../hooks/use-network';
import { WifiOff, MapPin, Loader2, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { MarketPlansHeaderAction } from './MarketPlansHeaderAction';

export function HeaderBar() {
  const { profile } = useAuth();
  const { activeBranchContext } = useRuntime();
  const { isOnline, isSlow } = useNetwork();
  
  const isGlobalUser = profile?.userType === 'global';

  return (
    <header className="sticky top-0 z-[60] w-full px-2 pt-2 pb-0.5 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between bg-card/60 backdrop-blur-xl border border-border/40 shadow-sm rounded-full px-2.5 py-1">
        {/* Left Section: Scoped Workspace / Network Indicator */}
        <div className="flex items-center gap-3">
          {isGlobalUser ? (
            activeBranchContext ? (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <MapPin className="w-3.5 h-3.5 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
                    {activeBranchContext}
                  </span>
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                <Globe className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
                  Central
                </span>
              </div>
            )
          ) : profile?.branchId ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border text-text-secondary">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
                {profile.branchId}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border text-text-muted">
              <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
                Pusat
              </span>
            </div>
          )}

          {/* Connection Monitor */}
          {!isOnline ? (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive animate-pulse">
              <WifiOff className="w-3 h-3" />
              <span className="text-[9px] font-bold uppercase tracking-widest">
                Offline
              </span>
            </div>
          ) : isSlow ? (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-[9px] font-bold uppercase tracking-widest">
                Slow
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 text-emerald-500/80">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest">Live</span>
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

