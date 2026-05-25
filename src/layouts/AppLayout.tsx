import React from 'react';
import { Outlet } from 'react-router-dom';
import { HeaderBar } from '../components/HeaderBar';
import { BottomNavbar } from '../components/BottomNavbar';
import { Sidebar } from '../components/Sidebar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 flex">
      {/* Desktop & Tablet sidebar */}
      <Sidebar />

      {/* Content pane */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-20 md:pb-0">
        <HeaderBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile only bottom navigation */}
      <div id="global-bottom-nav" className="md:hidden">
        <BottomNavbar isAdmin={false} />
      </div>
    </div>
  );
}
