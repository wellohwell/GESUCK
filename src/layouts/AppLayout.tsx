import React from 'react';
import { Outlet } from 'react-router-dom';

export function AppLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <Outlet />
      {children}
    </div>
  );
}
