import React, { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Shield, MapPin, Calendar, Camera, Settings, LogOut, Pencil, Check, X } from 'lucide-react';
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
      {/* Profile Header (Minimalist) */}
      <div className="relative overflow-hidden">
        <div className="px-2 py-2 sm:py-4 flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 text-center sm:text-left">
          <div className="relative group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary flex items-center justify-center text-black font-black text-xl sm:text-2xl shadow-xl shadow-primary/20 border-2 border-border/10 overflow-hidden">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <button className="absolute bottom-0 right-0 p-2 rounded-full bg-card border border-border/60 shadow-lg text-muted-foreground hover:text-primary transition-colors">
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 flex flex-col w-full">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 w-full">
              {isEditingName ? (
                <div className="flex items-center gap-2 w-full max-w-xs mx-auto sm:mx-0">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 bg-black/40 border border-primary/30 rounded-full px-4 py-1.5 text-sm font-bold focus:outline-none focus:border-primary transition-all text-white"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                  />
                  <button 
                    onClick={handleSaveName}
                    disabled={isSaving}
                    className="p-1.5 rounded-full bg-primary text-black hover:bg-primary/80 transition-all disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setIsEditingName(false)}
                    disabled={isSaving}
                    className="p-1.5 rounded-full bg-zinc-800 text-muted-foreground hover:text-white transition-all disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black">{profile?.name || 'User'}</h1>
                  <button 
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 rounded-full bg-zinc-800/50 hover:bg-zinc-800 text-muted-foreground hover:text-primary transition-all active:scale-90"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-primary/10 border border-primary/20 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary">
                {userRole}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Account Info */}
        <div className="md:col-span-2 flex flex-col gap-4 sm:gap-6">
          <section className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-card/40 backdrop-blur-xl border border-border/40 shadow-soft">
            <h2 className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 sm:mb-6 flex items-center gap-2">
              <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Informasi Akun
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex flex-col gap-1 sm:gap-1.5">
                <label className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Nama Lengkap</label>
                <div className="px-4 py-2.5 sm:py-3 rounded-full bg-black/20 border border-border/40 text-xs sm:text-sm font-bold">
                  {profile?.name || '-'}
                </div>
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

        </div>

        {/* Sidebar info */}
        <div className="flex flex-col gap-4 sm:gap-6">

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 p-3.5 sm:p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs sm:text-sm font-bold hover:bg-red-500 hover:text-white transition-all group active:scale-[0.98]"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Sign Out Account
          </button>
        </div>
      </div>
    </div>
  );
}
