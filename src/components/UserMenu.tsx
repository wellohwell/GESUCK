import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { useAuth } from '../providers/AuthProvider';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogOut, ChevronDown, Settings, Sliders } from 'lucide-react';
import { cn } from '../lib/utils';
import { ROLES } from '../config/roles';

export function UserMenu() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isHighLevelAdmin = profile?.role === ROLES.OWNER;
  const isStaff = profile?.role === ROLES.STAFF;

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
        className="flex items-center gap-2 p-1 pl-2 rounded-[1.5rem] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95 group border border-transparent hover:border-border/50 dark:hover:border-zinc-700 sm:hover:shadow-[0_0_15px_-3px_rgba(183,232,0,0.3)] dark:sm:hover:shadow-[0_0_20px_-5px_rgba(183,232,0,0.2)]"
      >
        <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-black font-black text-xs shadow-lg shadow-brand-primary/20 group-hover:ring-2 group-hover:ring-brand-primary/50 transition-all overflow-hidden">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
      </button>

      {isOpen && (
          <div
            className="absolute right-0 mt-3 w-56 bg-card shadow-2xl p-2 z-[100] rounded-[2rem] border border-border/40 backdrop-blur-xl"
          >
            <div className="px-5 py-4 mb-2 border-b border-zinc-100 border-border/50">
               <p className="text-xs font-black text-brand-primary uppercase tracking-widest">
                 {profile?.userType === 'global' ? `Global ${profile?.globalRole || 'Owner'}` : (profile?.role || 'Member')}
               </p>
               <p className="text-sm font-black truncate">{profile?.displayName || profile?.nama || 'User'}</p>
               <p className="text-[10px] text-muted-foreground truncate italic">{profile?.email}</p>
            </div>

            <div className="space-y-1 p-1">
              <Link 
                to="/workspace/profile" 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-5 py-3 rounded-full text-sm font-bold hover:bg-brand-primary hover:text-black transition-all group animate-in slide-in-from-left duration-200"
              >
                Profile
              </Link>

              {isHighLevelAdmin && (
                <>
                  <Link 
                    to="/admin" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 rounded-full text-sm font-bold bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-black transition-all group animate-in slide-in-from-left duration-200"
                  >
                    Dashboard Admin
                  </Link>

                  <Link 
                    to="/admin/branches" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 rounded-full text-sm font-bold hover:bg-brand-primary hover:text-black transition-all group animate-in slide-in-from-left duration-200"
                  >
                    Manajemen Cabang
                  </Link>

                  <Link 
                    to="/admin/modules" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 rounded-full text-sm font-bold hover:bg-brand-primary hover:text-black transition-all group animate-in slide-in-from-left duration-200"
                  >
                    Tata Kelola Modul
                  </Link>

                  <Link 
                    to="/admin/navigation" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 rounded-full text-sm font-bold hover:bg-brand-primary hover:text-black transition-all group animate-in slide-in-from-left duration-200"
                  >
                    Tata Kelola Navigasi
                  </Link>

                  <Link 
                    to="/admin/docs" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 rounded-full text-sm font-bold hover:bg-brand-primary hover:text-black transition-all group animate-in slide-in-from-left duration-200"
                  >
                    Arsitektur & Standar
                  </Link>
                </>
              )}

              {isStaff && (
                <Link 
                  to="/admin/users" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-5 py-3 rounded-full text-sm font-bold bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-black transition-all group animate-in slide-in-from-left duration-200"
                >
                  Manajemen User & Approval
                </Link>
              )}
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-3 rounded-full text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center group-hover:bg-card/10">
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
