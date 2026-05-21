import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { useUserProfile } from '../lib/services';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogOut, ChevronDown, Settings, Sliders } from 'lucide-react';
import { cn } from '../lib/utils';
import { ROLES } from '../config/roles';

export function UserMenu() {
  const { profile } = useUserProfile();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isHighLevelAdmin = profile?.role === ROLES.OWNER || profile?.role === ROLES.ADMIN_CABANG || profile?.role === ROLES.ADMIN;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const initials = profile?.displayName 
    ? profile.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : profile?.nama 
      ? profile.nama.split(' ').map((n: string) => n[0]).join('').toUpperCase()
      : 'U';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-2 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95 group border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 sm:hover:shadow-[0_0_15px_-3px_rgba(183,232,0,0.3)] dark:sm:hover:shadow-[0_0_20px_-5px_rgba(183,232,0,0.2)]"
      >
        <div className="w-8 h-8 rounded-xl bg-brand-primary flex items-center justify-center text-black font-black text-xs shadow-lg shadow-brand-primary/20 group-hover:ring-2 group-hover:ring-brand-primary/50 transition-all">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Avatar" className="w-full h-full rounded-xl object-cover" />
          ) : (
            initials
          )}
        </div>
      </button>

      {isOpen && (
          <div
            className="absolute right-0 mt-3 w-56 bg-white dark:bg-zinc-900 shadow-2xl p-2 z-[100] rounded-sm"
          >
            <div className="px-4 py-3 mb-2 border-b border-zinc-100 dark:border-zinc-800">
               <p className="text-xs font-black text-brand-primary uppercase tracking-widest">{profile?.role || 'Member'}</p>
               <p className="text-sm font-black truncate">{profile?.displayName || profile?.nama || 'User'}</p>
               <p className="text-[10px] text-muted-foreground truncate italic">{profile?.email}</p>
            </div>

            <div className="space-y-1">
              <Link 
                to="/profile" 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold hover:bg-brand-primary hover:text-black transition-all group animate-in slide-in-from-left duration-200"
              >
                Profile
              </Link>

              {isHighLevelAdmin && (
                <>
                  <Link 
                    to="/admin/modules" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold hover:bg-brand-primary hover:text-black transition-all group animate-in slide-in-from-left duration-200"
                  >
                    Tata Kelola Modul
                  </Link>

                  <Link 
                    to="/admin/navigation" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold hover:bg-brand-primary hover:text-black transition-all group animate-in slide-in-from-left duration-200"
                  >
                    Tata Kelola Navigasi
                  </Link>

                  <Link 
                    to="/admin/docs" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold hover:bg-brand-primary hover:text-black transition-all group animate-in slide-in-from-left duration-200"
                  >
                    Arsitektur & Standar
                  </Link>
                </>
              )}
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center group-hover:bg-white/10">
                  <LogOut className="w-4 h-4" />
                </div>
                Sign Out
              </button>
            </div>
          </div>
      )}
    </div>
  );
}
