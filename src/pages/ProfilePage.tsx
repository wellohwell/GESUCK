import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { subscribeCurrentUser } from '../lib/services';
import {
  Shield,
  Moon,
  LogOut,
  Info,
  Lock,
  CalendarDays,
  Clock
} from 'lucide-react';
import { toTitleCase } from '../utils/format';
import { toast } from '../hooks/use-toast';
import { useModal } from '../hooks/use-modal';
import { ThemeToggle } from '../components/ThemeToggle';

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const { openModal, openConfirm } = useModal();

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = subscribeCurrentUser(auth.currentUser.uid, (profile) => {
      setUserProfile(profile);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Berhasil keluar');
    } catch (e) {
      toast.error('Gagal keluar');
    }
  };

  const openLogoutConfirm = () => {
    openConfirm({
      title: 'Sign Out',
      description: 'Apakah Anda yakin ingin keluar?',
      confirmText: 'Ya, Keluar',
      confirmVariant: 'danger',
      onConfirm: handleLogout
    });
  };

  const getJoinedDateText = () => {
    const targetDate = userProfile?.approvedAt || userProfile?.createdAt;
    if (!targetDate) return "Registered -";
    
    // Check if it's a Firestore Timestamp (has toDate method)
    const date = targetDate?.toDate 
      ? targetDate.toDate() 
      : new Date(targetDate);
      
    if (isNaN(date.getTime())) return "Registered -";

    const hari = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(date);
    const tanggal = new Intl.DateTimeFormat('id-ID', { day: 'numeric' }).format(date);
    const bulan = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(date);
    const tahun = new Intl.DateTimeFormat('id-ID', { year: 'numeric' }).format(date);

    return `Registered ${hari} ${tanggal} ${bulan} ${tahun}`;
  };

  const getLamaBergabungText = () => {
    const targetDate = userProfile?.approvedAt || userProfile?.createdAt;
    if (!targetDate) return "-";
    
    const date = targetDate?.toDate 
      ? targetDate.toDate() 
      : new Date(targetDate);
      
    if (isNaN(date.getTime())) return "-";

    const diffTime = Math.abs(new Date().getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hari ini";
    if (diffDays < 30) return `${diffDays} hari`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} bulan`;
    return `${Math.floor(diffDays / 365)} tahun`;
  };

  if (!userProfile) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-32 pt-5 px-4 max-w-[800px] mx-auto">
      
      {/* Profile Header - Lebih Compact */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-lg border-4 border-background">
            {userProfile.photoURL ? (
              <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-muted flex items-center justify-center">
                <span className="text-4xl font-bold text-primary">
                  {toTitleCase(userProfile.displayName || "U").charAt(0)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 text-center">
          <div className="flex flex-col items-center justify-center gap-1.5">
            <h1 className="text-xl font-bold text-foreground">
              {toTitleCase(userProfile.displayName || "User")}
            </h1>
            {userProfile.role && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-sm inline-block">
                {userProfile.role}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">{userProfile.email || 'No email'}</p>
        </div>
      </div>

      {/* Menu Items - Super Compact */}
      <div className="space-y-5">
        
        {/* General */}
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">General</h3>
          <div className="bg-card rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors border-b border-border/50">
              <div className="flex items-center gap-3">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{getJoinedDateText()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Lama Bergabung</span>
              </div>
              <span className="text-xs text-muted-foreground">{getLamaBergabungText()}</span>
            </div>

            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Dark Mode</span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* About */}
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">About</h3>
          <div className="bg-card rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Privacy Policy</span>
              </div>
              <ChevronRight />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">About Vork</span>
              </div>
              <ChevronRight />
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <button 
          onClick={openLogoutConfirm}
          className="w-full mt-7 flex items-center justify-center gap-2.5 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-3xl font-semibold text-sm transition-all active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" className="w-3.5 h-3.5 text-muted-foreground">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}