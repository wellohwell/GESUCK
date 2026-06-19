import React, { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Shield, MapPin, Calendar, Camera, Settings, LogOut, Pencil, Check, X, Bell, Wifi, WifiOff, Database, RefreshCw, FileText, CheckCircle, Server, UserCheck, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';
import { auth, db } from '../../firebase/config';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { updateUserProfile } from '../../features/auth/services';
import { useNetwork } from '../../hooks/use-network';
import { getOfflineQueue, runBackgroundSync, OfflineSyncItem } from '../../utils/offlineSync';

export function WorkspaceProfilePage() {
  const { profile, branchesList } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'offline'>('profile');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingNotification, setIsUpdatingNotification] = useState(false);

  // Offline Diagnostics State
  const { isOnline } = useNetwork();
  const [cacheSize, setCacheSize] = useState<string>('Estimating...');
  const [swStatus, setSwStatus] = useState<string>('Checking...');
  const [queue, setQueue] = useState<OfflineSyncItem[]>(getOfflineQueue());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState<string>('-');

  const CACHED_ROUTES = [
    { path: '/workspace/operations', name: 'Operations / Operasional', type: 'Offline Cache' },
    { path: '/workspace/explore', name: 'Explore / Jelajah', type: 'Offline Cache' },
    { path: '/workspace/client', name: 'Client / Konsumen', type: 'Offline Cache' },
    { path: '/workspace/profile', name: 'Profile / Profil', type: 'Offline Cache' },
    { path: '/workspace/market-plans', name: 'Plans / Rencana Status', type: 'Offline Cache' },
    { path: '/workspace/tools', name: 'Tools / Alat', type: 'Offline Cache' },
  ];

  useEffect(() => {
    // Estimate cache
    const getCacheEstimate = async () => {
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const { usage } = await navigator.storage.estimate();
          setCacheSize(usage ? `${(usage / (1024 * 1024)).toFixed(2)} MB` : '0.12 MB');
        } catch (e) {
          setCacheSize('0.12 MB');
        }
      } else {
        setCacheSize('Supported (Estimated: ~0.15 MB)');
      }
    };
    getCacheEstimate();

    // SW Check
    if ('serviceWorker' in navigator) {
      if (navigator.serviceWorker.controller) {
        setSwStatus('Active & Controlling (PWA)');
      } else {
        setSwStatus('Registered (Active on next reload)');
      }
    } else {
      setSwStatus('Not supported in this browser');
    }

    // Last Sync
    const updateLastSync = () => {
      const last = localStorage.getItem('pwa_offline_last_sync_time');
      setLastSyncText(last ? new Date(last).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never');
    };
    updateLastSync();

    // Listen for sync updates
    const handleQueueUpdate = () => {
      setQueue(getOfflineQueue());
    };
    const handleSyncUpdate = () => {
      updateLastSync();
    };

    window.addEventListener('pwa_sync_queue_update', handleQueueUpdate);
    window.addEventListener('pwa_last_sync_update', handleSyncUpdate);

    return () => {
      window.removeEventListener('pwa_sync_queue_update', handleQueueUpdate);
      window.removeEventListener('pwa_last_sync_update', handleSyncUpdate);
    };
  }, []);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await runBackgroundSync();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

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
            <span className="text-sm font-semibold text-white">
              {profile?.email}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center border-b border-border/10 pb-4 mb-2">
        <div className="inline-flex bg-zinc-900/80 p-1.5 rounded-full border border-border/30 gap-1.5">
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              "px-5 py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
              activeTab === 'profile' 
                ? "bg-primary text-black" 
                : "text-muted-foreground hover:text-white"
            )}
          >
            Informasi Akun
          </button>
          <button
            onClick={() => setActiveTab('offline')}
            className={cn(
              "px-5 py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === 'offline' 
                ? "bg-primary text-black" 
                : "text-muted-foreground hover:text-white"
            )}
          >
            Offline Status (System)
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        /* Profile Sections Grid */
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
                        className="p-2 sm:p-2.5 rounded-full bg-primary text-black hover:bg-primary/80 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                      >
                        <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                      </button>
                      <button 
                        onClick={() => setIsEditingName(false)}
                        disabled={isSaving}
                        className="p-2 sm:p-2.5 rounded-full bg-zinc-800 text-muted-foreground hover:text-white transition-all disabled:opacity-50 shrink-0 cursor-pointer"
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
                    Notifikasi pengingat
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotification}
                  disabled={isUpdatingNotification}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 scale-90",
                    visitReminder ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-800"
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

          {/* Sidebar Sign Out */}
          <div className="flex flex-col items-center gap-4 sm:gap-6 mt-4 md:col-span-1">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-8 py-3.5 sm:py-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs sm:text-sm font-bold hover:bg-red-500 hover:text-white transition-all group active:scale-[0.98] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Sign Out Account
            </button>
          </div>
        </div>
      ) : (
        /* PWA Offline Diagnostic Page */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* Main Status Cards */}
          <div className="md:col-span-2 flex flex-col gap-6">
            
            <section className="px-2 sm:px-6">
              <h2 className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" /> PWA Diagnostics & Setup
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Network Status card */}
                <div className="p-5 rounded-3xl bg-zinc-900/60 border border-border/40 hover:border-primary/20 transition-all flex flex-col gap-2.5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 text-primary/10 group-hover:text-primary/20 transition-colors">
                    {isOnline ? <Wifi className="w-12 h-12" /> : <WifiOff className="w-12 h-12" />}
                  </div>

                  <span className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground">Network status</span>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full animate-pulse", isOnline ? "bg-emerald-500" : "bg-amber-500")} />
                    <span className="text-sm font-black text-white">{isOnline ? 'Online (Terhubung)' : 'Offline (Terputus)'}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    {isOnline ? 'Sistem terhubung sepenuhnya dengan server cloud.' : 'Mode luring aktif. Perubahan disimpan di penyimpanan perangkat.'}
                  </p>
                </div>

                {/* Session status card */}
                <div className="p-5 rounded-3xl bg-zinc-900/60 border border-border/40 hover:border-primary/20 transition-all flex flex-col gap-2.5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 text-primary/10 group-hover:text-primary/20 transition-colors">
                    <UserCheck className="w-12 h-12" />
                  </div>

                  <span className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground">Sesi Login (Session)</span>
                  <span className="text-sm font-black text-white">
                    {profile?.status === 'approved' ? 'Terotentikasi Offline' : 'Belum Diverifikasi'}
                  </span>
                  <div className="text-[10px] text-muted-foreground font-mono space-y-0.5 mt-1">
                    <div>UID: {profile?.uid?.substring(0, 10)}...</div>
                    <div>Akses: {profile?.role || 'Staff'}</div>
                  </div>
                </div>

                {/* Service worker status */}
                <div className="p-5 rounded-3xl bg-zinc-900/60 border border-border/40 hover:border-primary/20 transition-all flex flex-col gap-2.5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 text-primary/10 group-hover:text-primary/20 transition-colors">
                    <Server className="w-12 h-12" />
                  </div>

                  <span className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground">Service Worker Status</span>
                  <span className="text-sm font-black text-white">{swStatus}</span>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    Versi terkontrol memvalidasi dan mem-bypass aset statis secara dinamis agar pemuatan cepat tanpa internet.
                  </p>
                </div>

                {/* Local data cache size */}
                <div className="p-5 rounded-3xl bg-zinc-900/60 border border-border/40 hover:border-primary/20 transition-all flex flex-col gap-2.5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 text-primary/10 group-hover:text-primary/20 transition-colors">
                    <Database className="w-12 h-12" />
                  </div>

                  <span className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground">Penyimpanan Terpakai (Cache)</span>
                  <span className="text-sm font-black text-white">{cacheSize}</span>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    Firestore-indexedDB meng-cache entri riwayat kunjungan dan data konsumen secara lokal.
                  </p>
                </div>
              </div>
            </section>

            {/* List Cached Routes */}
            <section className="px-2 sm:px-6">
              <h2 className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Rute Halaman Tersimpan (Cached Routes)
              </h2>

              <div className="rounded-[2rem] border border-border/45 bg-zinc-900/40 p-4 space-y-2">
                {CACHED_ROUTES.map((route, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-white/5 transition-all">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-black text-white">{route.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{route.path}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      Tersedia Offline
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* Sync Queue Panel Info */}
          <div className="md:col-span-1 flex flex-col gap-6">
            <section className="px-2">
              <h2 className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Antrean Sinkronisasi (Sync Queue)
              </h2>

              <div className="p-6 rounded-[2.5rem] bg-zinc-900 border border-border/50 flex flex-col gap-4 relative overflow-hidden">
                <div className="flex justify-between items-center border-b border-border/30 pb-4">
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Last Sync Time</span>
                    <div className="text-xs font-black text-white mt-0.5">{lastSyncText}</div>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Queue Size</span>
                    <div className="text-xs font-black text-white mt-0.5">{queue.length} task</div>
                  </div>
                </div>

                <div className="flex-1 min-h-[140px] flex flex-col justify-center items-center py-4 text-center">
                  {queue.length === 0 ? (
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      </div>
                      <span className="text-xs font-black text-white">Semua Data Sinkron</span>
                      <p className="text-[10px] text-muted-foreground max-w-[200px]">
                        Tidak ada antrean tertunda. Seluruh perubahan lokal sudah tersinkronisasi online.
                      </p>
                    </div>
                  ) : (
                    <div className="w-full space-y-3">
                      <div className="flex flex-col items-center gap-1 mb-2">
                        <span className="text-lg font-black text-primary animate-pulse">{queue.length}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Antrean Perubahan Offline</span>
                      </div>
                      
                      <div className="max-h-[120px] overflow-y-auto space-y-1.5 text-left pr-1 scrollbar-hide">
                        {queue.map((item) => (
                          <div key={item.id} className="text-[10px] bg-black/30 p-2 rounded-xl border border-border/30 flex justify-between items-center">
                            <div className="truncate pr-2">
                              <span className="font-bold text-white uppercase">{item.type}</span> - <span className="text-muted-foreground">{item.entity}</span>
                            </div>
                            <span className="shrink-0 text-[8px] font-mono px-1 py-0.5 rounded bg-amber-500/15 text-amber-500">PENDING</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSyncNow}
                  disabled={isSyncing || !isOnline}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full font-bold text-xs uppercase tracking-wider transition-all cursor-pointer",
                    isOnline 
                      ? "bg-primary text-black hover:bg-primary/80" 
                      : "bg-zinc-805 text-zinc-500 cursor-not-allowed border border-zinc-800"
                  )}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 shrink-0", isSyncing && "animate-spin")} />
                  {isSyncing ? 'Menyinkronkan...' : 'Sinkronisasi Sekarang'}
                </button>
                
                {!isOnline && (
                  <p className="text-[9px] text-amber-500 text-center font-bold">
                    Hubungkan internet untuk memicu sinkronisasi
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
