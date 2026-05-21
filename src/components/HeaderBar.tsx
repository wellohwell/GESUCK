import React from 'react';
import { useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { useUserProfile } from '../lib/services';
import { useNetwork } from '../hooks/use-network';
import { Wifi, WifiOff, MapPin, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function HeaderBar() {
  const { profile } = useUserProfile();
  const { isOnline, isSlow } = useNetwork();

  return (
    <header className="sticky top-0 z-[60] w-full border-b border-zinc-100/80 dark:border-zinc-800/50 bg-background/80 backdrop-blur-md px-4 py-3 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Section: Scoped Workspace / Network Indicator */}
        <div className="flex items-center gap-3">
          {profile?.branchId ? (
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

