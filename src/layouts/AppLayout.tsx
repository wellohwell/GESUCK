import React from 'react';
import { Outlet } from 'react-router-dom';
import { HeaderBar } from '../components/HeaderBar';
import { BottomNavbar } from '../components/BottomNavbar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 pb-20">
      <HeaderBar />
      <main>
        <Outlet />
      </main>
      <div id="global-bottom-nav">
        <BottomNavbar isAdmin={false} />
      </div>
    </div>
  );
}
