import React from 'react';
import { Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <main>
        <Outlet />
      </main>
    </div>
  );
}
