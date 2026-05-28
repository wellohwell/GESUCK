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
import { cn } from '../../lib/utils';

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
    <div className="w-full bg-transparent text-zinc-900 dark:text-zinc-50 pb-24 md:pb-32 pt-2 md:pt-6">
      <div className="max-w-6xl mx-auto px-0 sm:px-4 space-y-4 md:space-y-6">
        
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4 md:pb-6 px-4 sm:px-0">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 md:w-6 md:h-6 text-brand-primary" />
              Sistem Modul
            </h1>
            <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-muted-foreground leading-normal">
              REGISTRI OTORISASI & KONFIGURASI OPERASIONAL
            </p>
          </div>

          <div className="relative w-full md:w-64 shrink-0 mt-2 md:mt-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari modul..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card/50 border border-border/40 rounded-full text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Info Explainer Board */}
        <div className="mx-4 sm:mx-0 p-4 rounded-[1.5rem] bg-primary/5 border border-primary/10 text-[11px] text-muted-foreground leading-relaxed flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-black text-foreground uppercase tracking-wider block">INSTRUKSI TATA KELOLA</span>
            <span>
              Pusat kendali akses fitur. Batasi visibilitas navigasi, isolasi cabang, atau aktifkan mode pemeliharaan secara real-time.
            </span>
          </div>
        </div>

        {/* Modules List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3 md:gap-4 px-4 sm:px-0">
          {filteredModules.map((mod) => {
            const hasRolesCustomization = (mod.allowedRoles || []).length < Object.values(ROLES).length;
            const hasBranchIsolation = (mod.allowedBranches || []).length > 0;

            return (
              <div 
                key={mod.id} 
                className={cn(
                  "bg-card border rounded-[2rem] p-4 md:p-5 space-y-4 shadow-sm transition-all relative flex flex-col justify-between group",
                  editingModuleId === mod.id ? 'border-primary ring-2 ring-primary/10' : 'border-border/40 hover:border-border/60 hover:shadow-md'
                )}
              >
                <div className="space-y-3">
                  {/* Title and Active Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm md:text-base font-black text-foreground uppercase tracking-tight">{mod.name}</span>
                        <span className="font-mono text-[8px] text-muted-foreground px-1.5 py-0.5 bg-muted/50 rounded leading-none">{mod.id}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed font-bold tracking-tight">{mod.description}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                      {mod.enabled ? (
                        <span className="text-[8px] md:text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 font-black rounded-full uppercase leading-none">On</span>
                      ) : (
                        <span className="text-[8px] md:text-[9px] px-2 py-0.5 bg-red-500/10 text-red-500 font-black rounded-full uppercase leading-none">Off</span>
                      )}

                      {mod.maintenanceMode && (
                        <span className="text-[8px] md:text-[9px] px-2 py-0.5 bg-amber-500/10 text-amber-500 font-black rounded-full uppercase leading-none flex items-center gap-0.5">
                          <Wrench className="w-2.5 h-2.5" /> MT
                        </span>
                      )}

                      {mod.betaMode && (
                        <span className="text-[8px] md:text-[9px] px-2 py-0.5 bg-purple-500/10 text-purple-500 font-black rounded-full uppercase leading-none flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> Beta
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Attributes Badges View */}
                  <div className="space-y-2 pt-3 border-t border-border/20 text-[10px]">
                    <div className="flex justify-between items-center text-muted-foreground font-bold">
                      <span className="uppercase tracking-widest text-[8px]">Navigasi Bawah</span>
                      <span className="font-black flex items-center gap-1 text-foreground">
                        {mod.visibleInNav ? <Check className="w-3 h-3 text-primary" /> : <X className="w-3 h-3 text-muted-foreground" />}
                        {mod.visibleInNav ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-2 text-muted-foreground font-bold">
                      <span className="shrink-0 mt-0.5 uppercase tracking-widest text-[8px]">Otorisasi Peran</span>
                      <div className="flex flex-wrap justify-end gap-1 max-w-[70%]">
                        {hasRolesCustomization ? (
                          mod.allowedRoles.map(role => (
                            <span key={role} className="bg-muted text-foreground px-1.5 py-0.5 rounded leading-none text-[8px] uppercase font-black">{role}</span>
                          ))
                        ) : (
                          <span className="text-muted-foreground/60 italic font-medium uppercase text-[8px] tracking-wide">Universal Access</span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-muted-foreground font-bold">
                      <span className="uppercase tracking-widest text-[8px]">Otorisasi Cabang</span>
                      <span className="font-black text-right text-foreground uppercase text-[8px]">
                        {hasBranchIsolation ? (
                          <span className="text-primary">{mod.allowedBranches.join(', ')}</span>
                        ) : (
                          <span className="text-muted-foreground/60 italic font-medium">Bebas</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card footer control triggers */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border/20 mt-4">
                  <button
                    onClick={() => handleResetModule(mod.id)}
                    className="h-9 inline-flex items-center justify-center gap-1.5 bg-muted/50 hover:bg-muted text-muted-foreground rounded-full text-[9px] uppercase font-black tracking-widest transition-all active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>

                  <button
                    onClick={() => handleEditClick(mod.id)}
                    className="h-9 inline-flex items-center justify-center gap-1.5 bg-primary text-black rounded-full text-[9px] uppercase font-black tracking-widest transition-all hover:bg-primary/90 shadow-sm active:scale-95"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Configure
                  </button>
                </div>
              </div>
            );
          })}
        </div>


        {/* Dynamic Slid-in Editor Drawer/Modal for zero visual clutter */}
        <AnimatePresence>
          {editingModuleId && (
            <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setEditingModuleId(null)}
              />

              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300, duration: 0.3 }}
                className="relative bg-card border-t sm:border border-border/40 sm:rounded-[2.5rem] p-5 sm:p-7 shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto no-scrollbar rounded-t-[2.5rem]"
              >
                {/* Modal Title */}
                <div className="flex items-start justify-between border-b border-border/20 pb-4 mb-6">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary">KONFIGURATOR ALIRAN</span>
                    <h3 className="text-base md:text-lg font-black text-foreground uppercase tracking-tight leading-tight">
                      {typedModules[editingModuleId]?.name}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setEditingModuleId(null)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  {/* Status Switches Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    
                    {/* Switch: Active */}
                    <div className="p-4 rounded-[1.5rem] border border-border/30 bg-muted/20 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Status Aktif</span>
                        <p className="text-[9px] text-muted-foreground font-medium">Beralih fungsionalitas</p>
                      </div>
                      <button type="button" onClick={() => setEnabled(!enabled)}>
                        {enabled ? <ToggleRight className="w-10 h-7 text-emerald-500" /> : <ToggleLeft className="w-10 h-7 text-muted-foreground" />}
                      </button>
                    </div>

                    {/* Switch: Bottom Nav Visible */}
                    <div className="p-4 rounded-[1.5rem] border border-border/30 bg-muted/20 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Shortcuts</span>
                        <p className="text-[9px] text-muted-foreground font-medium">Tampil di menu navigasi</p>
                      </div>
                      <button type="button" onClick={() => setVisibleInNav(!visibleInNav)}>
                        {visibleInNav ? <ToggleRight className="w-10 h-7 text-primary" /> : <ToggleLeft className="w-10 h-7 text-muted-foreground" />}
                      </button>
                    </div>

                    {/* Switch: Beta Mode */}
                    <div className="p-4 rounded-[1.5rem] border border-border/30 bg-muted/20 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Beta Mode</span>
                        <p className="text-[9px] text-muted-foreground font-medium">Lencana eksperimen</p>
                      </div>
                      <button type="button" onClick={() => setBetaMode(!betaMode)}>
                        {betaMode ? <ToggleRight className="w-10 h-7 text-purple-500" /> : <ToggleLeft className="w-10 h-7 text-muted-foreground" />}
                      </button>
                    </div>

                    {/* Switch: Maintenance Mode */}
                    <div className="p-4 rounded-[1.5rem] border border-border/30 bg-muted/20 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Maintenance</span>
                        <p className="text-[9px] text-muted-foreground font-medium">Kunci operasional</p>
                      </div>
                      <button type="button" onClick={() => setMaintenanceMode(!maintenanceMode)}>
                        {maintenanceMode ? <ToggleRight className="w-10 h-7 text-amber-500" /> : <ToggleLeft className="w-10 h-7 text-muted-foreground" />}
                      </button>
                    </div>

                  </div>

                  {/* Checkboxes for role permission gating */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 px-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Otorisasi Peran ({allowedRoles.length})</span>
                    </div>

                    <div className="bg-muted/30 p-4 rounded-[2rem] grid grid-cols-2 gap-2 md:gap-3 border border-border/20">
                      {Object.values(ROLES).map((role) => {
                        const isChecked = allowedRoles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleRole(role)}
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-full text-[10px] font-black transition-all text-left px-4",
                              isChecked ? 'bg-primary text-black' : 'bg-card border border-border/40 text-muted-foreground'
                            )}
                          >
                            <span className="uppercase tracking-tight truncate">{role.replace('_', ' ')}</span>
                            {isChecked ? (
                              <Check className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 shrink-0 opacity-40" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tags input for branch limits (Beta Rollout boundaries) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 px-1">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Isolasi Cabang</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground px-1 italic">
                      Kosongkan untuk global rollout.
                    </p>

                    <div className="bg-muted/30 p-4 rounded-[2rem] border border-border/20 space-y-4">
                      <div className="relative">
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && !allowedBranches.includes(val)) {
                              setAllowedBranches([...allowedBranches, val]);
                            }
                          }}
                          className="w-full pl-5 pr-10 py-3 bg-card border border-border/40 rounded-full text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground appearance-none cursor-pointer"
                        >
                          <option value="">+ Pilih Cabang...</option>
                          {availableBranches
                            .filter(b => !allowedBranches.includes(b.branchId))
                            .map(branch => (
                              <option key={branch.branchId} value={branch.branchId}>
                                {branch.branchId} — {branch.branchName}
                              </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>

                      {allowedBranches.length > 0 ? (
                        <div className="flex flex-wrap gap-2 px-1">
                          {allowedBranches.map((branchId) => {
                            const branchData = availableBranches.find(b => b.branchId === branchId);
                            const label = branchData ? branchData.branchName : branchId;
                            return (
                              <span 
                                key={branchId} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm"
                              >
                                {label}
                                <button
                                  type="button"
                                  onClick={() => removeBranch(branchId)}
                                  className="hover:text-red-500 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em] text-center py-2 opacity-40">
                           Global Rollout Active
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Submission Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border/20 pt-6">
                    <button
                      type="button"
                      onClick={() => handleResetModule(editingModuleId)}
                      className="order-2 sm:order-1 h-12 sm:h-auto px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    >
                      Reset State
                    </button>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="order-1 sm:order-2 h-12 sm:h-auto px-10 py-3 bg-primary text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full transition-all shadow-xl shadow-primary/10 hover:bg-primary/90 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                    >
                      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      SIMPAN PERUBAHAN
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
