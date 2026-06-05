import React, { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Shield, MapPin, Calendar, Camera, Settings, LogOut, Pencil, Check, X, Bell } from 'lucide-react';
import { cn } from '../../lib/utils';
import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { updateUserProfile } from '../../features/auth/services';

export function WorkspaceProfilePage() {
  const { profile, branchesList } = useAuth();
  const navigate = useNavigate();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingNotification, setIsUpdatingNotification] = useState(false);

  const notifications = profile?.notifications ?? { visitPlanReminder: true };
  const visitReminder = notifications.visitPlanReminder ?? true;

  const handleToggleNotification = async () => {
    if (!profile?.uid) return;
    setIsUpdatingNotification(true);
    const currentNotifications = profile.notifications ?? {};
    const currentReminder = currentNotifications.visitPlanReminder ?? true;
    
    try {
      await updateUserProfile(profile.uid, {
        notifications: {
          ...currentNotifications,
          visitPlanReminder: !currentReminder
        }
      } as any);
    } catch (error) {
      console.error('Update notification preference failed:', error);
    } finally {
      setIsUpdatingNotification(false);
    }
  };

  const branchName = profile?.branchId 
    ? branchesList.find(b => b.branchId === profile.branchId)?.branchName || profile.branchId 
    : 'Global';

  useEffect(() => {
    if (profile) {
      setNewName(profile.name || '');
    }
  }, [profile]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSaveName = async () => {
    if (!profile?.uid || !newName.trim()) return;
    setIsSaving(true);
    try {
      await updateUserProfile(profile.uid, { 
        name: newName.trim(),
        nama: newName.trim() // Keep legacy 'nama' for compatibility if needed in FB
      } as any); // Use any because Partial<UserProfile> only knows 'name'
      setIsEditingName(false);
    } catch (error) {
      console.error('Update profile error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const initials = profile?.name 
    ? profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : 'U';

  const userRole = profile?.userType === 'global' 
    ? `Global ${profile?.globalRole || 'Owner'}` 
    : (profile?.role || 'Member');

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-500 pb-24 sm:pb-8">
      {/* Profile Header (Compact) */}
      <div className="relative overflow-hidden mb-1">
        <div className="px-2 py-4 flex flex-col items-center justify-center gap-3">
          <div className="shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary flex items-center justify-center text-black font-black text-lg sm:text-xl shadow-sm border-2 border-border/10 overflow-hidden">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-1.5 w-full">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-primary w-fit mx-auto mb-0.5">
              {userRole}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Account Info */}
        <div className="md:col-span-2 flex flex-col gap-4 sm:gap-6">
          <section className="px-2 sm:px-6">
            <h2 className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 sm:mb-6 flex items-center gap-2">
              <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Informasi Akun
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex flex-col gap-1 sm:gap-1.5">
                <label className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Nama Lengkap</label>
                {isEditingName ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 bg-black/40 border border-primary/30 rounded-full px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold focus:outline-none focus:border-primary transition-all text-white w-full min-w-0"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') setIsEditingName(false);
                      }}
                    />
                    <button 
                      onClick={handleSaveName}
                      disabled={isSaving}
                      className="p-2 sm:p-2.5 rounded-full bg-primary text-black hover:bg-primary/80 transition-all disabled:opacity-50 shrink-0"
                    >
                      <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </button>
                    <button 
                      onClick={() => setIsEditingName(false)}
                      disabled={isSaving}
                      className="p-2 sm:p-2.5 rounded-full bg-zinc-800 text-muted-foreground hover:text-white transition-all disabled:opacity-50 shrink-0"
                    >
                      <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-2.5 sm:py-3 rounded-full bg-black/20 border border-border/40 text-xs sm:text-sm font-bold flex justify-between items-center group cursor-pointer" onClick={() => setIsEditingName(true)}>
                    <span>{profile?.name || '-'}</span>
                    <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 sm:gap-1.5">
                <label className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Alamat Email</label>
                <div className="px-4 py-2.5 sm:py-3 rounded-full bg-black/20 border border-border/40 text-xs sm:text-sm font-bold flex items-center gap-2">
                  <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/60" />
                  {profile?.email || '-'}
                </div>
              </div>
              <div className="flex flex-col gap-1 sm:gap-1.5">
                <label className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Nomor HP</label>
                <div className="px-4 py-2.5 sm:py-3 rounded-full bg-black/20 border border-border/40 text-xs sm:text-sm font-bold flex items-center gap-2">
                  <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex items-center justify-center text-primary/60 font-black text-[10px]">#</span>
                  {profile?.phone || '-'}
                </div>
              </div>
              <div className="flex flex-col gap-1 sm:gap-1.5">
                <label className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Regional</label>
                <div className="px-4 py-2.5 sm:py-3 rounded-full bg-black/20 border border-border/40 text-xs sm:text-sm font-bold flex items-center gap-2">
                  <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/60" />
                  {profile?.userType === 'global' ? 'Global' : branchName}
                </div>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section className="px-2 sm:px-6">
            <h2 className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 sm:mb-6 flex items-center gap-2">
              <Bell className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Notifications Settings
            </h2>
            
            <div className="p-5 rounded-3xl bg-black/20 border border-border/40 flex items-center justify-between">
              <div className="space-y-1.5 pr-4 flex-1">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white block">
                  Visit Plan Reminder
                </span>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium leading-relaxed">
                  Receive reminders when tomorrow's Visit Plan has not yet been submitted.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleNotification}
                disabled={isUpdatingNotification}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50",
                  visitReminder ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-805"
                )}
                role="switch"
                aria-checked={visitReminder}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    visitReminder ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </section>

        </div>

        {/* Sidebar info */}
        <div className="flex flex-col items-center gap-4 sm:gap-6 mt-4">

          <button 
            onClick={handleLogout}
            className="w-fit flex items-center justify-center gap-3 px-8 py-3.5 sm:py-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs sm:text-sm font-bold hover:bg-red-500 hover:text-white transition-all group active:scale-[0.98]"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Sign Out Account
          </button>
        </div>
      </div>
    </div>
  );
}
