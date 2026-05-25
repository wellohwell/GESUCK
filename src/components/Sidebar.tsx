import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useNavigation } from '../providers/NavigationProvider';
import { getIconComponent } from '../config/appShell';
import { useAuth } from '../providers/AuthProvider';
import { LogOut } from 'lucide-react';
import { auth } from '../firebase/config';

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const { navItems, isEligible, isLoaded } = useNavigation();
  const { profile, firebaseUser } = useAuth();

  if (!isLoaded) return null;

  const activeNavItems = navItems.filter(isEligible);

  const handleLogout = async () => {
    if (window.confirm("Apakah Anda yakin ingin keluar dari Vork?")) {
      await auth.signOut();
    }
  };

  return (
    <aside className="w-64 border-r border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-950 flex-shrink-0 flex flex-col h-screen sticky top-0 hidden md:flex">
      {/* Brand Logo Header */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-zinc-150/40 dark:border-zinc-800/50 flex-shrink-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-black font-extrabold text-sm shadow-sm">
          V
        </div>
        <div>
          <h1 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50 leading-none">VORK</h1>
          <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mt-1">SaaS CRM Platform</p>
        </div>
      </div>

      {/* Nav links scroll area */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 no-scrollbar">
        {activeNavItems.map((item) => {
          const isActive = pathname === item.route || 
                          (item.route !== '/workspace/home' && item.route !== '/' && pathname.startsWith(item.route));

          const IconComponent = getIconComponent(item.icon);

          return (
            <Link
              key={item.id}
              to={item.route}
              className={cn(
                'relative flex items-center gap-3 h-10 px-3 rounded-xl transition-all font-bold group',
                isActive 
                  ? 'bg-primary text-black shadow-sm' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-primary hover:bg-primary/10'
              )}
            >
              <IconComponent 
                className={cn(
                  'h-4.5 w-4.5 shrink-0 z-10 transition-colors',
                  isActive 
                    ? 'text-black' 
                    : 'text-zinc-405 dark:text-zinc-400 group-hover:text-primary'
                )} 
              />
              <span className="text-xs transition-colors z-10 tracking-tight">{item.label}</span>

              {item.badge && item.badge !== 'none' && (
                <span className={cn(
                  "ml-auto text-[8px] font-black uppercase px-2 py-0.5 rounded-md leading-none h-4 flex items-center justify-center",
                  item.badge === 'beta' && "bg-amber-400/20 text-amber-500",
                  item.badge === 'new' && "bg-emerald-400/20 text-emerald-500",
                  item.badge === 'maintenance' && "bg-red-400/20 text-red-500"
                )}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile quick info footer */}
      {profile && (
        <div className="p-4 border-t border-zinc-150/40 dark:border-zinc-800/50 bg-white/30 dark:bg-zinc-950/30 flex-shrink-0 grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="min-w-0">
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tight truncate">
              {profile.nama || firebaseUser?.email || 'User'}
            </h4>
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mt-1 truncate">
              {profile.role || 'Guest'}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 flex items-center justify-center text-zinc-500 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-all active:scale-95"
            title="Keluar / Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
