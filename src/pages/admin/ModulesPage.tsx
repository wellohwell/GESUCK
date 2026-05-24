import React, { useState, useEffect } from 'react';
import { useModules } from '../../providers/ModuleProvider';
import { ROLES, Role } from '../../config/roles';
import { ModuleConfig } from '../../config/modules';
import { subscribeBranches } from '../../lib/services';
import { 
  ShieldAlert, 
  Settings, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Wrench, 
  Users, 
  Home, 
  Check, 
  Plus, 
  X, 
  RotateCcw,
  Search,
  Sliders,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-toastify';

export default function ModulesPage() {
  const { modules, isLoaded, updateModule, resetToDefault } = useModules();
  const typedModules = modules as Record<string, ModuleConfig>;
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal / details editor states
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  // Local draft states for module being edited
  const [enabled, setEnabled] = useState(true);
  const [visibleInNav, setVisibleInNav] = useState(true);
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  const [allowedBranches, setAllowedBranches] = useState<string[]>([]);
  const [betaMode, setBetaMode] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Branch data
  const [availableBranches, setAvailableBranches] = useState<any[]>([]);

  useEffect(() => {
    const unsub = subscribeBranches(data => {
      setAvailableBranches(data.filter(b => b.active !== false && !b.archived));
    });
    return () => unsub();
  }, []);

  // Search filtered modules
  const filteredModules = (Object.values(typedModules) as ModuleConfig[]).filter(mod => {
    const q = searchQuery.toLowerCase();
    return mod.name.toLowerCase().includes(q) || 
           mod.description.toLowerCase().includes(q) ||
           mod.id.toLowerCase().includes(q);
  });

  const handleEditClick = (modId: string) => {
    const mod = typedModules[modId];
    if (!mod) return;
    setEditingModuleId(modId);
    setEnabled(mod.enabled);
    setVisibleInNav(mod.visibleInNav);
    setAllowedRoles(mod.allowedRoles || []);
    setAllowedBranches(mod.allowedBranches || []);
    setBetaMode(mod.betaMode || false);
    setMaintenanceMode(mod.maintenanceMode || false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModuleId) return;

    setIsSaving(true);
    try {
      await updateModule(editingModuleId, {
        enabled,
        visibleInNav,
        allowedRoles,
        allowedBranches,
        betaMode,
        maintenanceMode
      });
      setEditingModuleId(null);
    } catch (e) {
      // toast is already fired inside updateModule
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetModule = async (modId: string) => {
    if (!window.confirm('Kembalikan konfigurasi modul ini ke pengaturan asal? Tindakan ini menghapus batasan kustom.')) return;
    try {
      await resetToDefault(modId);
      if (editingModuleId === modId) {
        handleEditClick(modId); // Sync editor draft state
      }
    } catch (e) {}
  };

  // Checkboxes roles toggler helper
  const toggleRole = (role: string) => {
    if (allowedRoles.includes(role)) {
      setAllowedRoles(allowedRoles.filter(r => r !== role));
    } else {
      setAllowedRoles([...allowedRoles, role]);
    }
  };

  const removeBranch = (branch: string) => {
    setAllowedBranches(allowedBranches.filter(b => b !== branch));
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest animate-pulse">Memuat Tata Kelola Sistem...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-transparent text-zinc-900 dark:text-zinc-50 pb-32 pt-6">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-850 pb-6">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <Sliders className="w-6 h-6 text-brand-primary" />
              Tata Kelola Modul & Fitur
            </h1>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 leading-normal">
              REGISTRI FITUR OTORISASI PERAN, BETA ROLLOUT CABANG, DAN MODE PEMELIHARAAN
            </p>
          </div>

          <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari modul..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all cursor-text text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* Info Explainer Board */}
        <div className="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-zinc-900 dark:text-zinc-200 block">INSTRUKSI KEPATUHAN TATA KELOLA</span>
            <span>
              Dengan modul registry terpusat ini, Anda dapat menyembunyikan navigasi, menonaktifkan sirkulasi data tertentu, beralih ke mode <strong>beta mode</strong> (untuk percobaan lapangan terbatas), mengaktifkan <strong>maintenance loop</strong>, atau membatasi hak akses berdasarkan peran struktural atau pengelompokan cabang operasional. Gunakan tombol reset jika terjadi anomali sirkuit logic.
            </span>
          </div>
        </div>

        {/* Modules List Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredModules.map((mod) => {
            const hasRolesCustomization = (mod.allowedRoles || []).length < Object.values(ROLES).length;
            const hasBranchIsolation = (mod.allowedBranches || []).length > 0;

            return (
              <div 
                key={mod.id} 
                className={`bg-white dark:bg-zinc-900 border ${editingModuleId === mod.id ? 'border-brand-primary ring-2 ring-brand-primary/10' : 'border-zinc-200 dark:border-zinc-800'} rounded-3xl p-5 space-y-4 shadow-sm transition-all relative flex flex-col justify-between`}
              >
                <div className="space-y-3">
                  {/* Title and Active Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight">{mod.name}</span>
                        <span className="font-mono text-[9px] text-zinc-400 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded leading-none">{mod.id}</span>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed font-semibold">{mod.description}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 flex-wrap">
                      {mod.enabled ? (
                        <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold rounded-full uppercase leading-none">Aktif</span>
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 font-extrabold rounded-full uppercase leading-none">Nonaktif</span>
                      )}

                      {mod.maintenanceMode && (
                        <span className="text-[9px] px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold rounded-full uppercase leading-none flex items-center gap-0.5">
                          <Wrench className="w-2.5 h-2.5" /> MT
                        </span>
                      )}

                      {mod.betaMode && (
                        <span className="text-[9px] px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold rounded-full uppercase leading-none flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5 text-purple-500" /> Beta
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Attributes Badges View */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-850/60 text-[10px]">
                    <div className="flex justify-between items-center text-zinc-450 dark:text-zinc-500">
                      <span>Menu Navigasi Bawah:</span>
                      <span className="font-extrabold flex items-center gap-1">
                        {mod.visibleInNav ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-zinc-400" />}
                        {mod.visibleInNav ? 'Tampil' : 'Sembunyi'}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-2 text-zinc-450 dark:text-zinc-500">
                      <span className="shrink-0 mt-0.5">Otorisasi Peran:</span>
                      <div className="flex flex-wrap justify-end gap-1 max-w-[70%]">
                        {hasRolesCustomization ? (
                          mod.allowedRoles.map(role => (
                            <span key={role} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded leading-none text-[8px] uppercase font-black">{role}</span>
                          ))
                        ) : (
                          <span className="text-zinc-400 italic">Terbuka Untuk Semua Peran</span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-zinc-450 dark:text-zinc-500">
                      <span>Otorisasi Cabang:</span>
                      <span className="font-extrabold text-right">
                        {hasBranchIsolation ? (
                          <span className="text-brand-primary uppercase font-extrabold">{mod.allowedBranches.join(', ')}</span>
                        ) : (
                          <span className="text-zinc-400 italic font-normal">Terbuka Untuk Semua Cabang</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card footer control triggers */}
                <div className="flex items-center justify-between gap-2 pt-4 border-t border-zinc-105 dark:border-zinc-850/60 mt-4">
                  <button
                    onClick={() => handleResetModule(mod.id)}
                    className="p-1 px-2.5 inline-flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-xl text-[10px] uppercase font-black tracking-wider transition-colors"
                    title="Reset ke bawaan pabrik"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>

                  <button
                    onClick={() => handleEditClick(mod.id)}
                    className="p-1.5 px-4.5 inline-flex items-center gap-1.5 bg-brand-primary text-white rounded-xl text-[10px] uppercase font-black tracking-widest transition-colors hover:bg-brand-primary/95 shadow-sm active:scale-97"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Konfigurasi
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Slid-in Editor Drawer/Modal for zero visual clutter */}
        <AnimatePresence>
          {editingModuleId && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
                onClick={() => setEditingModuleId(null)}
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.2 }}
                className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 rounded-3xl p-6 shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto no-scrollbar"
              >
                {/* Modal Title */}
                <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-850 pb-4 mb-5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">KONFIGURATOR ALIRAN FITUR</span>
                    <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                      Configuring: {typedModules[editingModuleId]?.name || editingModuleId}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setEditingModuleId(null)}
                    className="p-2 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-xl transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  {/* Status Switches Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* Switch: Active */}
                    <div className="p-3 rounded-2xl border border-zinc-100 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between h-24">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Status Aktif</span>
                        <p className="text-[9px] text-zinc-500">Sembunyikan modul secara instan jika dinonaktifkan.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEnabled(!enabled)}
                        className="w-fit flex items-center"
                      >
                        {enabled ? (
                          <ToggleRight className="w-10 h-7 text-emerald-500 cursor-pointer" />
                        ) : (
                          <ToggleLeft className="w-10 h-7 text-zinc-400 dark:text-zinc-600 cursor-pointer" />
                        )}
                      </button>
                    </div>

                    {/* Switch: Bottom Nav Visible */}
                    <div className="p-3 rounded-2xl border border-zinc-100 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between h-24">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Bottom Nav Link</span>
                        <p className="text-[9px] text-zinc-500">Tampilkan pintasan langsung di menu navigasi utama.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVisibleInNav(!visibleInNav)}
                        className="w-fit flex items-center"
                      >
                        {visibleInNav ? (
                          <ToggleRight className="w-10 h-7 text-brand-primary cursor-pointer" />
                        ) : (
                          <ToggleLeft className="w-10 h-7 text-zinc-400 dark:text-zinc-600 cursor-pointer" />
                        )}
                      </button>
                    </div>

                    {/* Switch: Beta Mode */}
                    <div className="p-3 rounded-2xl border border-zinc-100 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between h-24">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Beta Mode</span>
                        <p className="text-[9px] text-zinc-500">Berikan lencana kilau "BETA" sebagai penanda eksperimental.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBetaMode(!betaMode)}
                        className="w-fit flex items-center"
                      >
                        {betaMode ? (
                          <ToggleRight className="w-10 h-7 text-purple-500 cursor-pointer" />
                        ) : (
                          <ToggleLeft className="w-10 h-7 text-zinc-400 dark:text-zinc-600 cursor-pointer" />
                        )}
                      </button>
                    </div>

                    {/* Switch: Maintenance Mode */}
                    <div className="p-3 rounded-2xl border border-zinc-100 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between h-24">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Maintenance</span>
                        <p className="text-[9px] text-zinc-500">Kunci halaman dan arahkan user ke banner perbaikan.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMaintenanceMode(!maintenanceMode)}
                        className="w-fit flex items-center"
                      >
                        {maintenanceMode ? (
                          <ToggleRight className="w-10 h-7 text-amber-500 cursor-pointer" />
                        ) : (
                          <ToggleLeft className="w-10 h-7 text-zinc-400 dark:text-zinc-600 cursor-pointer" />
                        )}
                      </button>
                    </div>

                  </div>

                  {/* Checkboxes for role permission gating */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-zinc-400" />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Pembatasan Hak Akses Peran ({allowedRoles.length})</span>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl grid grid-cols-2 gap-3 border border-zinc-100 dark:border-zinc-850">
                      {Object.values(ROLES).map((role) => {
                        const isChecked = allowedRoles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleRole(role)}
                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all text-left ${isChecked ? 'bg-brand-primary/10 border border-brand-primary/30 text-brand-primary' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
                          >
                            <span className="uppercase text-[10px] tracking-tight">{role.replace('_', ' ')}</span>
                            {isChecked ? (
                              <div className="w-4 h-4 rounded bg-brand-primary flex items-center justify-center text-white shrink-0">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tags input for branch limits (Beta Rollout boundaries) */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">Eksperimentasi Kunci Cabang (Beta Rollout)</span>
                    <p className="text-[10px] text-zinc-500 leading-normal">
                      Pilih cabang yang diizinkan untuk mengakses modul ini. Kosongkan untuk mengizinkan seluruh cabang tanpa restriksi.
                    </p>

                    <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-850 space-y-3">
                      <div className="relative">
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && !allowedBranches.includes(val)) {
                              setAllowedBranches([...allowedBranches, val]);
                            }
                          }}
                          className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all text-zinc-850 dark:text-zinc-100 appearance-none"
                        >
                          <option value="">+ Tambah Cabang yang Diizinkan...</option>
                          {availableBranches
                            .filter(b => !allowedBranches.includes(b.branchId))
                            .map(branch => (
                              <option key={branch.branchId} value={branch.branchId}>
                                {branch.branchId} — {branch.branchName}
                              </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      </div>

                      {allowedBranches.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {allowedBranches.map((branchId) => {
                            const branchData = availableBranches.find(b => b.branchId === branchId);
                            const label = branchData ? `${branchData.branchId} - ${branchData.branchName}` : branchId;
                            return (
                              <span 
                                key={branchId} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary rounded-lg text-[10px] font-black uppercase tracking-tight"
                              >
                                {label}
                                <button
                                  type="button"
                                  onClick={() => removeBranch(branchId)}
                                  className="text-brand-primary hover:text-red-500 transition-colors bg-white/50 dark:bg-black/20 rounded-full p-0.5 ml-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="pt-2">
                           <p className="text-[9px] text-zinc-400 font-medium italic bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 text-center">
                             Terbuka fungsional di seluruh wilayah cabang tanpa restriksi.
                           </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submission Buttons */}
                  <div className="flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-850 pt-5">
                    <button
                      type="button"
                      onClick={() => handleResetModule(editingModuleId)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all"
                    >
                      Bawaan Pabrik
                    </button>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-brand-primary text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg hover:bg-brand-primary/95 disabled:opacity-55 active:scale-97 flex items-center gap-1.5"
                    >
                      {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      SINKRONISASI
                    </button>
                  </div>

                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
