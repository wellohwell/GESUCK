import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from '../../components/workspace/BottomNav';

export const StaffLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-16">
      <main className="p-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
