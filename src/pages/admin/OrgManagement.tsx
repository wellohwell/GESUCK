import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, 
  Plus, 
  Edit2, 
  Archive, 
  CheckCircle2, 
  XCircle, 
  FileSpreadsheet, 
  Users, 
  Search, 
  ArrowLeft, 
  Grid, 
  Check, 
  X,
  PlusCircle,
  Settings2,
  Trash2,
  AlertCircle
} from "lucide-react";
import { 
  subscribeBranches, 
  addBranch, 
  updateBranch, 
  subscribeUsers 
} from "../../lib/services";
import { extractSpreadsheetId } from "../../lib/sheets/fetchPricelist";
import { useAuth } from "../../providers/AuthProvider";
import { motion, AnimatePresence } from "motion/react";

export default function OrgManagement() {
  const navigate = useNavigate();
  const { profile, allBranchesList } = useAuth();
  
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<"active" | "archived">("active");

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formExplore, setFormExplore] = useState("");
  const [formPricing, setFormPricing] = useState("");
  const [formCatalog, setFormCatalog] = useState("");
  const [formAdmins, setFormAdmins] = useState<string[]>([]);
  const [adminSearch, setAdminSearch] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    // Check if user has admin/owner/branch admin permissions
    const allowedRoles = ["OWNER", "ADMIN", "ADMIN_CABANG"];
    const currentRole = profile?.role?.toUpperCase() || "";
    if (profile && !allowedRoles.includes(currentRole)) {
      navigate("/");
    }
  }, [profile, navigate]);

  useEffect(() => {
    const unsubBranches = subscribeBranches((list) => {
      setBranches(list);
      setLoading(false);
    });

    const unsubUsers = subscribeUsers((userList) => {
      setUsers(userList);
    });

    return () => {
      unsubBranches();
      unsubUsers();
    };
  }, []);

  const resetForm = () => {
    setEditingBranch(null);
    setFormId("");
    setFormName("");
    setFormActive(true);
    setFormExplore("");
    setFormPricing("");
    setFormCatalog("");
    setFormAdmins([]);
    setAdminSearch("");
    setFormError("");
    setShowForm(false);
  };

  const startEdit = (b: any) => {
    setEditingBranch(b);
    setFormId(b.branchId);
    setFormName(b.branchName);
    setFormActive(b.active ?? true);
    setFormExplore(b.spreadsheets?.explore || "");
    setFormPricing(b.spreadsheets?.pricing || "");
    setFormCatalog(b.spreadsheets?.catalog || "");
    setFormAdmins(b.admins || []);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formId.trim()) {
      setFormError("ID Cabang wajib diisi");
      return;
    }
    if (!formName.trim()) {
      setFormError("Nama Cabang wajib diisi");
      return;
    }

    const cleanId = formId.toUpperCase().trim();
    const cleanExplore = extractSpreadsheetId(formExplore);
    const cleanPricing = extractSpreadsheetId(formPricing);
    const cleanCatalog = extractSpreadsheetId(formCatalog);

    const checkDuplicate = !editingBranch && branches.some(b => b.branchId === cleanId);
    if (checkDuplicate) {
      setFormError(`Cabang dengan ID ${cleanId} sudah terdaftar.`);
      return;
    }

    const branchData = {
      branchName: formName.trim(),
      active: formActive,
      admins: formAdmins,
      spreadsheets: {
        explore: cleanExplore,
        pricing: cleanPricing,
        catalog: cleanCatalog
      }
    };

    try {
      if (editingBranch) {
        await updateBranch(editingBranch.branchId, branchData);
      } else {
        await addBranch({
          branchId: cleanId,
          ...branchData
        });
      }
      resetForm();
    } catch (err: any) {
      setFormError("Gagal menyimpan cabang: " + err.message);
    }
  };

  const toggleBranchActive = async (b: any) => {
    try {
      await updateBranch(b.branchId, { active: !b.active });
    } catch (err) {
      console.error(err);
    }
  };

  const archiveBranchToggle = async (b: any) => {
    try {
      await updateBranch(b.branchId, { archived: !b.archived });
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const matchesTab = tab === "archived" ? b.archived === true : !b.archived;
      const matchesSearch = b.branchName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            b.branchId.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [branches, tab, searchQuery]);

  // Handle admins modification during creation/edit
  const toggleAdminAssignment = (userId: string) => {
    setFormAdmins(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const getAdminNames = (adminArray: string[]) => {
    if (!adminArray || adminArray.length === 0) return "Belum ada admin cabang";
    return adminArray
      .map(id => users.find(u => u.id === id)?.name || id)
      .join(", ");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased transition-colors duration-300">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/")}
              className="p-2 hover:bg-secondary/50 rounded-full transition-colors flex items-center justify-center text-muted-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-accent" />
                Manajemen Organisasi & Cabang
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                Centralized Control Center
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            Tambah Cabang
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Statistics Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border p-5 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider block">Total Cabang</span>
              <span className="text-3xl font-black">{branches.filter(b => !b.archived).length}</span>
            </div>
            <Building2 className="w-8 h-8 text-neutral-500 opacity-60" />
          </div>
          <div className="bg-card border border-border p-5 rounded-3xl flex items-center justify-between border-l-4 border-l-green-500">
            <div>
              <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider block">Cabang Aktif</span>
              <span className="text-3xl font-black text-green-600 dark:text-green-400">{branches.filter(b => b.active && !b.archived).length}</span>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500 opacity-60" />
          </div>
          <div className="bg-card border border-border p-5 rounded-3xl flex items-center justify-between border-l-4 border-l-yellow-600">
            <div>
              <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider block">Segregasi / Diarsip</span>
              <span className="text-3xl font-black text-yellow-600 dark:text-yellow-400">{branches.filter(b => b.archived).length}</span>
            </div>
            <Archive className="w-8 h-8 text-yellow-500 opacity-60" />
          </div>
        </div>

        {/* Search, Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex border-b border-border w-full sm:w-auto">
            <button
              onClick={() => setTab("active")}
              className={`px-5 py-3 text-xs uppercase tracking-wider font-black border-b-2 transition-all ${
                tab === "active" 
                  ? "border-primary text-foreground" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Master Registrasi ({branches.filter(b => !b.archived).length})
            </button>
            <button
              onClick={() => setTab("archived")}
              className={`px-5 py-3 text-xs uppercase tracking-wider font-black border-b-2 transition-all ${
                tab === "archived" 
                  ? "border-primary text-foreground" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Segregated / Diarsip ({branches.filter(b => b.archived).length})
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="w-4 h-4 text-muted-foreground" />
            </span>
            <input
              type="text"
              placeholder="Cari ID atau nama cabang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-secondary border border-border rounded-xl placeholder-muted-foreground text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Branch Cards Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Menghubungkan Otoritas Cabang Terpusat...</span>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="bg-secondary/40 border border-border p-12 text-center rounded-3xl">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-55" />
            <h3 className="font-bold text-sm">Tidak Ada Data Cabang</h3>
            <p className="text-xs text-muted-foreground">Cabang yang Anda cari tidak ditemukan atau registrasi kosong.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredBranches.map((b) => (
                <motion.div
                  key={b.branchId}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col h-full hover:shadow-md transition-all duration-200"
                >
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="inline-block px-2 py-0.5 text-[9px] font-mono font-black uppercase text-foreground bg-secondary rounded">
                          {b.branchId}
                        </span>
                        <h2 className="text-lg font-black mt-1 leading-tight">{b.branchName}</h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleBranchActive(b)}
                          title={b.active ? "Ubah ke Tidak Aktif" : "Ubah ke Aktif"}
                          className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 transition-colors ${
                            b.active 
                              ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20" 
                              : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
                          }`}
                        >
                          {b.active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Aktif
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Non-aktif
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Spreadsheets Configuration */}
                    <div className="space-y-2 mb-4 bg-secondary/50 p-3.5 rounded-2xl border border-border">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Spreadsheets Integrasi
                      </h4>
                      
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-mono py-0.5">
                          <span className="text-muted-foreground text-[10px]">Explore:</span>
                          <span className="truncate max-w-[120px] font-bold text-[10px] text-foreground bg-background/50 px-1.5 py-0.5 rounded" title={b.spreadsheets?.explore || "-"}>
                            {b.spreadsheets?.explore || "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-mono py-0.5">
                          <span className="text-muted-foreground text-[10px]">Pricing:</span>
                          <span className="truncate max-w-[120px] font-bold text-[10px] text-foreground bg-background/50 px-1.5 py-0.5 rounded" title={b.spreadsheets?.pricing || b.spreadsheetId || "-"}>
                            {b.spreadsheets?.pricing || b.spreadsheetId || "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-mono py-0.5">
                          <span className="text-muted-foreground text-[10px]">Catalog:</span>
                          <span className="truncate max-w-[120px] font-bold text-[10px] text-foreground bg-background/50 px-1.5 py-0.5 rounded" title={b.spreadsheets?.catalog || "-"}>
                            {b.spreadsheets?.catalog || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Branch Admins list */}
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1">
                        <Users className="w-3.5 h-3.5" />
                        Branch Admins ({b.admins?.length || 0})
                      </h4>
                      <p className="text-xs font-bold text-foreground ml-1 truncate">
                        {getAdminNames(b.admins)}
                      </p>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="px-6 py-4 bg-secondary/50 border-t border-border flex items-center justify-between gap-2">
                    <button
                      onClick={() => startEdit(b)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-secondary/60 hover:bg-secondary text-xs font-bold uppercase tracking-wider rounded-xl transition-colors border border-border"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Konfigurasi Cabang
                    </button>
                    
                    <button
                      onClick={() => archiveBranchToggle(b)}
                      className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-colors ${
                        b.archived
                          ? "bg-green-600/10 hover:bg-green-600/20 text-green-700 dark:text-green-400 border-green-500/20"
                          : "bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
                      }`}
                      title={b.archived ? "Unarchive Cabang" : "Archive Cabang"}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Editor Modal Overlay */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={resetForm}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-card border border-border shadow-premium rounded-3xl overflow-hidden z-20 flex flex-col max-h-[90vh]"
            >
              <header className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/50">
                <div>
                  <h3 className="text-base font-black flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-accent" />
                    {editingBranch ? "Edit Konfigurasi Cabang" : "Tambah Registrasi Cabang Baru"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                    {editingBranch ? `Id: ${editingBranch.branchId}` : "Branch Management Setup"}
                  </p>
                </div>
                <button 
                  onClick={resetForm}
                  className="p-1.5 hover:bg-secondary text-muted-foreground rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                {formError && (
                  <div className="p-4 bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 rounded-2xl text-xs flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-bold">{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Branch ID (Code) */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">ID Cabang (Alfanumerik)</label>
                    <input
                      type="text"
                      disabled={!!editingBranch}
                      value={formId}
                      onChange={(e) => setFormId(e.target.value.toUpperCase())}
                      placeholder="e.g. YK01, SL02, KLT03"
                      className="w-full px-4 py-2.5 text-xs bg-secondary border border-border disabled:opacity-50 text-foreground rounded-xl placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono font-bold"
                      required
                    />
                  </div>

                  {/* Branch Name */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Nama Cabang / Kota</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Jogja, Solo, Klaten"
                      className="w-full px-4 py-2.5 text-xs bg-secondary border border-border text-foreground rounded-xl placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                      required
                    />
                  </div>
                </div>

                {/* Google Sheet Spreadsheets Config */}
                <div className="space-y-4 pt-3 border-t border-border">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    Spreadsheet Integrasi Multi-Cabang
                  </h4>
                  <p className="text-[10px] text-muted-foreground -mt-2">
                    Masukkan ID Spreadsheet Google atau tempel URL lengkap Sheet. Sistem otomatis mengisolasi ID unik di cloud.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground tracking-wide block mb-1">Explore Spreadsheet Resource</span>
                      <input
                        type="text"
                        value={formExplore}
                        onChange={(e) => setFormExplore(e.target.value)}
                        placeholder="Google Sheet ID / URL untuk navigasi eksplorasi"
                        className="w-full px-4 py-2 text-xs bg-secondary border border-border text-foreground rounded-xl placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground tracking-wide block mb-1">Pricing / List Harga Spreadsheet Resource</span>
                      <input
                        type="text"
                        value={formPricing}
                        onChange={(e) => setFormPricing(e.target.value)}
                        placeholder="Google Sheet ID / URL untuk default kalkulator harga"
                        className="w-full px-4 py-2 text-xs bg-secondary border border-border text-foreground rounded-xl placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground tracking-wide block mb-1">Catalog Spreadsheet Resource</span>
                      <input
                        type="text"
                        value={formCatalog}
                        onChange={(e) => setFormCatalog(e.target.value)}
                        placeholder="Google Sheet ID / URL untuk katalog visual sales"
                        className="w-full px-4 py-2 text-xs bg-secondary border border-border text-foreground rounded-xl placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Admins Integration */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Penugasan Admin Cabang (Multiple Admins)
                  </h4>
                  <p className="text-[10px] text-muted-foreground -mt-2">
                    Tentukan supervisor, admin cabang, atau pengguna yang berkuasa mengontrol penugasan khusus di wilayah Cabang ini.
                  </p>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    </span>
                    <input
                      type="text"
                      placeholder="Cari user (nama / email / status / peran)..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-[11px] bg-secondary border border-border rounded-xl text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-border rounded-2xl bg-secondary/35 divide-y divide-border">
                    {users
                      .filter(u => {
                        const s = adminSearch.toLowerCase();
                        return u.name?.toLowerCase().includes(s) || 
                               u.email?.toLowerCase().includes(s) || 
                               u.role?.toLowerCase().includes(s);
                      })
                      .map((u) => {
                        const isAssigned = formAdmins.includes(u.id);
                        return (
                          <div 
                            key={u.id}
                            onClick={() => toggleAdminAssignment(u.id)}
                            className="flex items-center justify-between px-4 py-2 text-xs cursor-pointer hover:bg-neutral-500/10 transition-colors"
                          >
                            <div>
                              <p className="font-bold">{u.name || "Tanpa Nama"}</p>
                              <p className="text-[10px] text-muted-foreground">{u.email} • Peran: <span className="uppercase font-mono font-bold text-[9px] text-accent">{u.role || "sales"}</span></p>
                            </div>
                            
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              isAssigned
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground text-transparent"
                            }`}>
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        );
                      })}
                    {users.length === 0 && (
                      <p className="text-center py-4 text-[10px] text-muted-foreground">Memuat registrasi pengguna...</p>
                    )}
                  </div>
                </div>

                {/* Active Toggle Option */}
                <div className="flex items-center justify-between p-4 bg-secondary/40 border border-border rounded-2xl">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider block">Aktifkan Cabang</span>
                    <span className="text-[10px] text-muted-foreground">Cabang non-aktif tidak akan muncul saat onboarding user baru.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormActive(!formActive)}
                    className={`w-12 h-6 rounded-full p-0.5 transition-all duration-200 ${
                      formActive ? "bg-green-500" : "bg-zinc-400 dark:bg-zinc-700"
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                      formActive ? "translate-x-6" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </form>

              <footer className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 bg-secondary/50">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md"
                >
                  Simpan Konfigurasi
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
