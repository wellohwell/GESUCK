import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { DesktopSidebar } from '../../components/DesktopSidebar';
import { HeaderBar } from '../../components/HeaderBar';
import { BottomNavbar } from '../../components/BottomNavbar';

export function WorkspaceLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex p-0 md:p-3 pb-0 gap-3 overflow-hidden">
        {/* Desktop/Tablet Sidebar */}
        <div className="hidden md:block w-56 flex-shrink-0 z-10">
          <DesktopSidebar />
        </div>

        {/* Content pane */}
        <div className="flex-1 flex flex-col min-w-0 h-[100vh] md:h-[calc(100vh-1.5rem)] relative rounded-none md:rounded-[1.5rem] overflow-hidden bg-card/40 backdrop-blur-sm z-10 transition-all duration-300">
          <HeaderBar />
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
