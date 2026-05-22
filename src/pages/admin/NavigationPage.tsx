import React, { useState } from 'react';
import { useNavigation } from '../../providers/NavigationProvider';
import { useModules } from '../../providers/ModuleProvider';
import { DynamicNavItem, ICON_DICTIONARY, getIconComponent } from '../../config/appShell';
import { ROLES } from '../../config/roles';
import { 
  Sliders, 
  RefreshCw, 
  Search, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Trash2, 
  Plus, 
  Smartphone, 
  Monitor, 
  Sparkles, 
  AlertTriangle,
  RotateCcw,
  Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-toastify';

export default function NavigationPage() {
  const { navItems, isLoaded, updateNavItem, resetToDefault } = useNavigation();
  const { modules } = useModules();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [branchInput, setBranchInput] = useState('');

  // Draft editing states
  const [draftLabel, setDraftLabel] = useState('');
  const [draftRoute, setDraftRoute] = useState('');
  const [draftIcon, setDraftIcon] = useState('home');
  const [draftVisible, setDraftVisible] = useState(true);
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [draftAllowedRoles, setDraftAllowedRoles] = useState<string[]>([]);
  const [draftAllowedBranches, setDraftAllowedBranches] = useState<string[]>([]);
  const [draftMobileOnly, setDraftMobileOnly] = useState(false);
  const [draftDesktopOnly, setDraftDesktopOnly] = useState(false);
  const [draftBadge, setDraftBadge] = useState<'none' | 'beta' | 'new' | 'maintenance'>('none');
  const [draftModuleId, setDraftModuleId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Search filtered nav items
  const filteredNavItems = navItems.filter(item => {
    const q = searchQuery.toLowerCase();
    return item.label.toLowerCase().includes(q) || 
           item.route.toLowerCase().includes(q) ||
           item.id.toLowerCase().includes(q);
  });

  const handleEditClick = (item: DynamicNavItem) => {
    setEditingId(item.id);
    setDraftLabel(item.label);
    setDraftRoute(item.route);
    setDraftIcon(item.icon);
    setDraftVisible(item.visible);
    setDraftEnabled(item.enabled);
    setDraftAllowedRoles(item.allowedRoles || []);
    setDraftAllowedBranches(item.allowedBranches || []);
    setDraftMobileOnly(item.mobileOnly || false);
    setDraftDesktopOnly(item.desktopOnly || false);
    setDraftBadge(item.badge || 'none');
    setDraftModuleId(item.moduleId || '');
    setBranchInput('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    setIsSaving(true);
    try {
      await updateNavItem(editingId, {
        label: draftLabel,
        route: draftRoute,
        icon: draftIcon,
        visible: draftVisible,
        enabled: draftEnabled,
        allowedRoles: draftAllowedRoles,
        allowedBranches: draftAllowedBranches,
        mobileOnly: draftMobileOnly,
        desktopOnly: draftDesktopOnly,
        badge: draftBadge,
        moduleId: draftModuleId || undefined
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRole = (role: string) => {
    if (draftAllowedRoles.includes(role)) {
      setDraftAllowedRoles(draftAllowedRoles.filter(r => r !== role));
    } else {
      setDraftAllowedRoles([...draftAllowedRoles, role]);
    }
  };

  const addBranch = () => {
    const clean = branchInput.trim().toUpperCase();
    if (clean && !draftAllowedBranches.includes(clean)) {
      setDraftAllowedBranches([...draftAllowedBranches, clean]);
      setBranchInput('');
    }
  };

  const removeBranch = (branch: string) => {
    setDraftAllowedBranches(draftAllowedBranches.filter(b => b !== branch));
  };

  // Move navigation sorting order up/down
  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= navItems.length) return;

    const itemA = navItems[index];
    const itemB = navItems[targetIndex];

    try {
      // Swapping the order in Firebase
      const tempOrder = itemA.order;
      await Promise.all([
        updateNavItem(itemA.id, { order: itemB.order }),
        updateNavItem(itemB.id, { order: tempOrder })
      ]);
    } catch (err) {
      console.error('Reorder update failed:', err);
    }
  };

  const activeMobileNavCount = navItems.filter(item => item.enabled && item.visible && !item.desktopOnly).length;

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 p-4 sm:p-6 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Dashboard section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl">
                <Sliders className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-xl font-black uppercase tracking-wider text-white">
                Tata Kelola Navigasi
              </h1>
            </div>
            <p className="text-xs text-zinc-400">
              Ubah hierarki bottom bar, pasang badge promosi, fungsionalkan filter hak akses per cabang secara real-time.
            </p>
          </div>
          
          <button
            onClick={() => {
              if (window.confirm('Apakah Anda yakin ingin mengatur ulang susunan navigasi ke default pabrik?')) {
                resetToDefault();
              }
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 border border-zinc-805/80 bg-zinc-900/60 hover:bg-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-pink-500 hover:text-pink-400 transition-all cursor-pointer self-start sm:self-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Setel Ulang Navigasi
          </button>
        </div>

        {/* Warning Badge count */}
        {activeMobileNavCount > 5 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-red-200">Terbanyak Link Navigasi Aktif ({activeMobileNavCount} Item)</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Rekomendasi UI bottom bar seluler adalah 4-5 item agar navigasi terlihat elegan. Silakan matikan visibilitas (visible: false) beberapa item non-primer untuk merapikan layout mobile.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-3.5 space-y-1">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Total Link</span>
            <div className="text-lg font-black text-white">{navItems.length} Registry</div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-3.5 space-y-1">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Bottom Bar Aktif</span>
            <div className={`text-lg font-black ${activeMobileNavCount > 5 ? 'text-amber-400' : 'text-primary'}`}>
              {activeMobileNavCount} Items
            </div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-3.5 space-y-1">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Dibatasi Peran</span>
            <div className="text-lg font-black text-blue-400">
              {navItems.filter(i => i.allowedRoles && i.allowedRoles.length > 0).length} Link
            </div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-3.5 space-y-1">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Sirkuit Cabang Terisolasi</span>
            <div className="text-lg font-black text-purple-400">
              {navItems.filter(i => i.allowedBranches && i.allowedBranches.length > 0).length} Cabang
            </div>
          </div>
        </div>

        {/* Filter Controls search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari label, ID modul, rute alamat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/30 border border-zinc-800/80 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all"
          />
        </div>

        {/* Visual Board List */}
        {!isLoaded ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-3 border-zinc-700 border-t-primary rounded-full animate-spin mb-3"></div>
            <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Memuat Struktur Registri Navigasi...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredNavItems.map((item, idx) => {
                const IconComponent = getIconComponent(item.icon);
                const hasRoles = item.allowedRoles && item.allowedRoles.length > 0;
                const hasBranches = item.allowedBranches && item.allowedBranches.length > 0;
                
                // Fetch linked module info if any
                const linkedMod = item.moduleId ? modules[item.moduleId] : null;

                return (
                  <motion.div
                    key={item.id}
                    layoutId={`nav-card-${item.id}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className={`relative bg-zinc-950 border rounded-2xl p-4 hover:border-zinc-700/80 transition-all ${
                      !item.enabled ? 'opacity-50' : ''
                    } ${
                      item.visible ? 'border-zinc-800/80' : 'border-dashed border-zinc-800/50 bg-zinc-950/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Indicator & Core Details */}
                      <div className="flex gap-3">
                        <div className={`p-2.5 rounded-xl border shrink-0 ${
                          item.visible && item.enabled 
                            ? 'bg-primary/5 border-primary/10 text-primary' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                        }`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-black text-white leading-none">{item.label}</h3>
                            <span className="text-[9px] font-bold py-0.5 px-1.5 bg-zinc-900 border border-zinc-805/80 text-zinc-400 rounded">
                              idx: {item.order}
                            </span>
                            
                            {/* Badges indicators */}
                            {item.badge && item.badge !== 'none' && (
                              <span className={`text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded ${
                                item.badge === 'beta' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                item.badge === 'new' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[10px] font-mono text-zinc-500 leading-none">
                            {item.route}
                          </p>

                          {/* Link to module registry check */}
                          {item.moduleId && (
                            <div className="flex items-center gap-1 text-[9px] font-medium text-amber-500/80">
                              <Link2 className="w-3 h-3 text-amber-500" />
                              Terikat Modul: <strong className="uppercase">{item.moduleId}</strong> ({linkedMod ? (linkedMod.enabled ? 'Aktif' : 'Disabled ⚠️') : 'Registri Tidak Ditemukan 🚫'})
                            </div>
                          )}

                          {/* Visibility status text tags */}
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {item.visible ? (
                              <span className="flex items-center gap-0.5 text-[8px] font-bold text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded">
                                <Eye className="w-2.5 h-2.5 text-green-400" /> TERLIHAT
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-[8px] font-bold text-zinc-500 bg-zinc-900/60 px-1.5 py-0.5 rounded border border-dashed border-zinc-800">
                                <EyeOff className="w-2.5 h-2.5 text-zinc-500" /> DISEMBUNYIKAN
                              </span>
                            )}

                            {item.mobileOnly && (
                              <span className="flex items-center gap-0.5 text-[8px] font-bold text-amber-400 bg-amber-950/30 px-1.5 py-0.5 rounded">
                                <Smartphone className="w-2.5 h-2.5" /> MOBILE ONLY
                              </span>
                            )}

                            {item.desktopOnly && (
                              <span className="flex items-center gap-0.5 text-[8px] font-bold text-blue-400 bg-blue-950/30 px-1.5 py-0.5 rounded">
                                <Monitor className="w-2.5 h-2.5" /> DESKTOP ONLY
                              </span>
                            )}

                            {hasRoles && (
                              <span className="text-[8px] font-bold text-blue-300 bg-blue-950/40 px-1.5 py-0.5 rounded uppercase">
                                PERAN: {item.allowedRoles.join(', ')}
                              </span>
                            )}

                            {hasBranches && (
                              <span className="text-[8px] font-bold text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded">
                                CABANG: {item.allowedBranches.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Operational Reorder Arrow Keys & Edit Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Up arrow */}
                        <button
                          disabled={idx === 0}
                          onClick={() => moveItem(idx, 'up')}
                          className="p-1.5 bg-zinc-900 border border-zinc-800/80 rounded-xl text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Down arrow */}
                        <button
                          disabled={idx === navItems.length - 1}
                          onClick={() => moveItem(idx, 'down')}
                          className="p-1.5 bg-zinc-900 border border-zinc-800/80 rounded-xl text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit click */}
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-1.5 bg-primary/10 border border-primary/20 text-primary"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Editor Modal Overlay Drawer */}
      <AnimatePresence>
        {editingId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="absolute top-4 right-4 p-1.5 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-base font-black uppercase tracking-wider text-white mb-6 border-b border-zinc-900 pb-3 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-primary" />
                Ubah Konfigurasi Navigasi: <span className="text-zinc-400 text-sm font-bold lowercase">#{editingId}</span>
              </h2>

              <form onSubmit={handleSave} className="space-y-4">
                
                {/* Row 1: Label and Route */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nama Label</label>
                    <input
                      type="text"
                      value={draftLabel}
                      onChange={(e) => setDraftLabel(e.target.value)}
                      required
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-primary/40 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Rute Halaman</label>
                    <input
                      type="text"
                      value={draftRoute}
                      onChange={(e) => setDraftRoute(e.target.value)}
                      required
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-primary/40 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Row 2: Icons selection dropdown and Promo Badge */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Pilih Icon</label>
                    <select
                      value={draftIcon}
                      onChange={(e) => setDraftIcon(e.target.value)}
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-primary/40 cursor-pointer text-zinc-300"
                    >
                      {Object.keys(ICON_DICTIONARY).map(key => (
                        <option key={key} value={key} className="bg-zinc-950 font-bold">{key.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sinyal Badge</label>
                    <select
                      value={draftBadge}
                      onChange={(e) => setDraftBadge(e.target.value as any)}
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-primary/40 cursor-pointer text-zinc-300 animate-none"
                    >
                      <option value="none" className="bg-zinc-950 text-zinc-400 font-bold">NONE</option>
                      <option value="beta" className="bg-zinc-950 text-amber-400 font-bold">BETA MODE</option>
                      <option value="new" className="bg-zinc-950 text-green-400 font-bold">NEW SPOT</option>
                      <option value="maintenance" className="bg-zinc-950 text-red-400 font-bold font-mono">STANDBY / PERBAIKAN</option>
                    </select>
                  </div>
                </div>

                {/* Sub: Modular Connection check selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Kaitan Modul (Dinamis Gating)</label>
                  <p className="text-[9px] text-zinc-500 leading-none">Menautkan link ke modul utama. Otomatis tersembunyi bila modul mati.</p>
                  <select
                    value={draftModuleId}
                    onChange={(e) => setDraftModuleId(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-primary/40 cursor-pointer text-zinc-300 font-mono"
                  >
                    <option value="" className="bg-zinc-950 text-zinc-400">Tidak Terikat Modul (Selalu Terbuka)</option>
                    {Object.keys(modules).map(modKey => (
                      <option key={modKey} value={modKey} className="bg-zinc-950 font-bold uppercase">{modKey.toUpperCase()} - {modules[modKey]?.name}</option>
                    ))}
                  </select>
                </div>

                {/* Row 3: Visibility & Enablement Toggle Indicators */}
                <div className="grid grid-cols-2 gap-3 border-t border-zinc-900 pt-3">
                  <button
                    type="button"
                    onClick={() => setDraftVisible(!draftVisible)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      draftVisible 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-zinc-900/40 border-zinc-850/80 opacity-60'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black uppercase text-white block">Status Tampak</span>
                      <span className="text-[9px] text-zinc-500 block leading-none">Tampil di UI</span>
                    </div>
                    {draftVisible ? (
                      <ToggleRight className="w-6 h-6 text-primary" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-zinc-500" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraftEnabled(!draftEnabled)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      draftEnabled 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-zinc-900/40 border-zinc-850/80 opacity-60'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black uppercase text-white block">Status Fungsional</span>
                      <span className="text-[9px] text-zinc-500 block leading-none">Dapat di-klik</span>
                    </div>
                    {draftEnabled ? (
                      <ToggleRight className="w-6 h-6 text-primary" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-zinc-500" />
                    )}
                  </button>
                </div>

                {/* Adaptive Display Screen Bounds */}
                <div className="grid grid-cols-2 gap-3 border-t border-zinc-900 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftMobileOnly(!draftMobileOnly);
                      if (!draftMobileOnly) setDraftDesktopOnly(false); // mutually exclusive
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      draftMobileOnly 
                        ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' 
                        : 'bg-zinc-900/40 border-zinc-805/80 opacity-60'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black uppercase text-white block">Mobile Only</span>
                      <span className="text-[9px] text-zinc-500 block leading-none">Sembunyikan di desktop</span>
                    </div>
                    <Smartphone className={`w-5 h-5 ${draftMobileOnly ? 'text-amber-400' : 'text-zinc-500'}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDraftDesktopOnly(!draftDesktopOnly);
                      if (!draftDesktopOnly) setDraftMobileOnly(false); // mutually exclusive
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      draftDesktopOnly 
                        ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' 
                        : 'bg-zinc-900/40 border-zinc-805/80 opacity-60'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black uppercase text-white block">Desktop Only</span>
                      <span className="text-[9px] text-zinc-500 block leading-none">Sembunyikan di ponsel</span>
                    </div>
                    <Monitor className={`w-5 h-5 ${draftDesktopOnly ? 'text-blue-400' : 'text-zinc-500'}`} />
                  </button>
                </div>

                {/* Allowed Roles Multi-Select */}
                <div className="space-y-1.5 border-t border-zinc-900 pt-3">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Batasan Peran Pengguna</label>
                  <p className="text-[9px] text-zinc-500 leading-none">Jika kosong, semua peran diizinkan untuk melihat navigasi ini.</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.values(ROLES).map(role => {
                      const isSelected = draftAllowedRoles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => toggleRole(role)}
                          className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                            isSelected
                              ? 'bg-primary border-transparent text-primary-foreground'
                              : 'bg-zinc-900/50 hover:bg-zinc-800 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          {isSelected && '✓ '} {role.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Allowed Branch Scoping */}
                <div className="space-y-2 border-t border-zinc-900 pt-3">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-sans">Batasan Kode Cabang</label>
                  <p className="text-[9px] text-zinc-500 leading-none">Saring navigasi agar hanya terlihat di cabang tertentu harian.</p>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Contoh: KDR-MTR"
                      value={branchInput}
                      onChange={(e) => setBranchInput(e.target.value)}
                      className="bg-zinc-900/60 border border-zinc-850/80 text-xs text-white uppercase rounded-xl px-3 py-2 flex-grow focus:outline-none focus:border-primary/40 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={addBranch}
                      className="px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
                    >
                      Tambah
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {draftAllowedBranches.length === 0 ? (
                      <span className="text-[10px] font-sans font-semibold text-zinc-500 italic">Buka untuk umum (Semua Cabang)</span>
                    ) : (
                      draftAllowedBranches.map(branch => (
                        <span
                          key={branch}
                          className="flex items-center gap-1 text-[10px] font-mono font-black text-purple-400 bg-purple-950/20 border border-purple-500/20 px-2 py-1 rounded-xl"
                        >
                          {branch}
                          <button
                            type="button"
                            onClick={() => removeBranch(branch)}
                            className="text-purple-400 hover:text-red-400 transition-colors ml-0.5 focus:outline-none"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Save and Cancel triggers */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
