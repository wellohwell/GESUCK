import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { DesktopSidebar } from '../../components/DesktopSidebar';
import { HeaderBar } from '../../components/HeaderBar';
import { BottomNavbar } from '../../components/BottomNavbar';
import { useNetwork } from '../../hooks/use-network';
import { WifiOff } from 'lucide-react';

export function WorkspaceLayout() {
  const { isOnline } = useNetwork();

  return (
    <div className="min-h-screen bg-background text-foreground flex p-0 md:p-3 pb-0 gap-3 overflow-hidden">
        {/* Desktop/Tablet Sidebar */}
        <div className="hidden md:block w-56 flex-shrink-0 z-10">
          <DesktopSidebar />
        </div>

        {/* Content pane */}
        <div className="flex-1 flex flex-col min-w-0 h-[100vh] md:h-[calc(100vh-1.5rem)] relative rounded-none md:rounded-[1.5rem] overflow-hidden bg-card/40 backdrop-blur-sm z-10 transition-all duration-300">
          <HeaderBar />

          {!isOnline && (
            <div className="mx-2 md:mx-8 mb-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold rounded-2xl flex items-center justify-between shrink-0 animate-in fade-in slide-in-from-top duration-300">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Anda sedang offline. Menampilkan data tersimpan.</span>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20">
                Offline Mode
              </span>
            </div>
          )}

          <main className="flex-1 overflow-y-auto relative z-0 scroll-smooth">
            <div className="max-w-7xl mx-auto w-full p-4 md:p-8 md:pt-4 pb-32 md:pb-8">
              <Outlet />
            </div>
          </main>
        </div>
        
        {/* Mobile Navbar */}
        <div className="md:hidden">
          <BottomNavbar />
        </div>
    </div>
  );
}
