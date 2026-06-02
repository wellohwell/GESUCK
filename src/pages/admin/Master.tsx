import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, Filter, Download, Upload, MoreVertical, Pencil, Trash2, CheckCircle2, XCircle, FileJson, X, AlignLeft, Building2, MapPin, Loader2, SearchX, ChevronDown, Layers, Clock, AlertCircle } from "lucide-react";
import { db } from "../../firebase/config";
import { collection, doc, writeBatch, query, onSnapshot, serverTimestamp, setDoc, deleteDoc } from "firebase/firestore";
import { useRuntime } from "../../providers/RuntimeProvider";
import { useAuth } from "../../providers/AuthProvider";
import { toast } from "../../hooks/use-toast";
import { openModal, closeModal } from "../../components/ui/modal/useModal";
import { cn } from "../../lib/utils";
import { toTitleCase } from "../../utils/format";
import { motion, AnimatePresence } from "motion/react";

// Models
export interface MarketOperation {
  id: string;
  jenis: "PASAR_UMUM" | "PASAR_PAGI" | "PASAR_JAWA";
  hariOperasi: string[];
  jamBuka: string;
  jamTutup: string;
  metadata?: any;
}

export interface MarketMaster {
  id: string;
  name: string;
  city: string;
  district: string;
  type: string;
  active: boolean;
  kategori: string[];
  hari_operasi: string[];
  jam_operasional: { buka: string; tutup: string };
  operations?: MarketOperation[];
  createdAt?: string;
  updatedAt?: string;
}

export const KATEGORI_TYPES = [
  { id: "PASAR_UMUM", label: "Pasar Umum" },
  { id: "PASAR_PAGI", label: "Pasar Pagi" },
  { id: "PASAR_JAWA", label: "Pasar Jawa" }
];

export default function AdminMasterPage() {
  const { activeBranchContext } = useRuntime();
  const { profile } = useAuth();
  
  const [data, setData] = useState<MarketMaster[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<MarketMaster | null>(null);
  const [marketToDelete, setMarketToDelete] = useState<MarketMaster | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [branchWilayah, setBranchWilayah] = useState<string[]>([]);
  const [branchLoading, setBranchLoading] = useState(true);
  const [isWilayahManagerOpen, setIsWilayahManagerOpen] = useState(false);
  const [newWilayahInput, setNewWilayahInput] = useState("");

  const handleSaveWilayahList = async (newList: string[]) => {
    if (!activeBranchContext) return;
    try {
      const docRef = doc(db, "branches", activeBranchContext);
      await setDoc(docRef, { wilayah: newList }, { merge: true });
      toast.success("Wilayah operasional cabang berhasil diperbarui.");
    } catch (err: any) {
      toast.error("Gagal memperbarui wilayah: " + err.message);
    }
  };

  useEffect(() => {
    if (!activeBranchContext) {
      setBranchWilayah([]);
      setBranchLoading(false);
      return;
    }
    setBranchLoading(true);
    const docRef = doc(db, "branches", activeBranchContext);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const docData = docSnap.data();
        setBranchWilayah(docData.wilayah || []);
      } else {
        setBranchWilayah([]);
      }
      setBranchLoading(false);
    });
    return () => unsub();
  }, [activeBranchContext]);

  useEffect(() => {
    if (!activeBranchContext) {
      setData([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const path = `branches/${activeBranchContext}/master_markets`;
    const q = query(collection(db, path));
    
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => {
        const docData = d.data();
        const fallbackId = "op-legacy-" + d.id;
        const operations = docData.operations || [
          {
            id: fallbackId,
            jenis: docData.kategori?.[0] || docData.type || "PASAR_UMUM",
            hariOperasi: docData.hari_operasi || ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"],
            jamBuka: docData.jam_operasional?.buka || "06:00",
            jamTutup: docData.jam_operasional?.tutup || "17:00",
            metadata: {}
          }
        ];
        return {
          id: d.id,
          name: docData.name || docData.nama_pasar || "Unnamed Market",
          city: docData.city || docData.wilayah || "-",
          district: docData.district || "-",
          type: docData.type || docData.kategori?.[0] || "Umum",
          active: docData.active ?? true,
          kategori: docData.kategori || ["PASAR_UMUM"],
          hari_operasi: docData.hari_operasi || [],
          jam_operasional: docData.jam_operasional || { buka: "06:00", tutup: "17:00" },
          operations,
          createdAt: docData.createdAt || docData.created_at || new Date().toISOString(),
          updatedAt: docData.updatedAt || docData.updated_at || new Date().toISOString(),
          createdBy: docData.createdBy || "System"
        } as MarketMaster;
      });

      // Sort: Active first, then name
      items.sort((a,b) => {
        if(a.active === b.active) return a.name.localeCompare(b.name);
        return a.active ? -1 : 1;
      });
      
      setData(items);
      setLoading(false);
    }, (error) => {
      toast.error("Gagal memuat master data");
      setLoading(false);
    });

    return () => unsub();
  }, [activeBranchContext]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const q = search.toLowerCase();
      const matchSearch = item.name.toLowerCase().includes(q) || item.city.toLowerCase().includes(q) || item.district.toLowerCase().includes(q);
      return matchSearch;
    });
  }, [data, search]);

  const handleToggleActive = async (item: MarketMaster) => {
    if (!activeBranchContext) return;
    try {
      const ref = doc(db, `branches/${activeBranchContext}/master_markets`, item.id);
      await setDoc(ref, { active: !item.active, updatedAt: new Date().toISOString() }, { merge: true });
      toast.info(`Status ${item.name} diperbarui`);
    } catch {
      toast.error("Gagal memperbarui status");
    }
  };

  const handleDelete = (item: MarketMaster) => {
    setMarketToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!marketToDelete || !activeBranchContext) return;
    try {
      await deleteDoc(doc(db, `branches/${activeBranchContext}/master_markets`, marketToDelete.id));
      toast.success("Data berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus data");
    } finally {
      setMarketToDelete(null);
    }
  };

  const handleExport = () => {
    if(data.length === 0) return toast.info("Tidak ada data untuk diexport");
    const exportData = data.map(({ id, ...rest }) => rest); // Exclude ID to allow clean re-import
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `MasterMarkets_${activeBranchContext}_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeBranchContext) return toast.error("Konteks Cabang tidak valid");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed)) throw new Error("Format berkas JSON tidak valid (harus berupa Array).");

        const existingNames = new Set(data.map(d => d.name.toLowerCase()));
        
        let validRows = 0;
        let skippedRows = 0;

        const batch = writeBatch(db);
        const colPath = `branches/${activeBranchContext}/master_markets`;

        parsed.forEach(row => {
          const nm = row.name || row.nama_pasar;
          if(!nm) {
             skippedRows++;
             return;
          }
          if (existingNames.has(nm.toLowerCase())) {
             skippedRows++;
             return;
          }
          
          validRows++;
          existingNames.add(nm.toLowerCase());
          const docRef = doc(collection(db, colPath));
          batch.set(docRef, {
            name: nm,
            nama_pasar: nm, // Legacy support
            city: row.city || row.wilayah || "",
            wilayah: row.city || row.wilayah || "", // Legacy support
            district: row.district || "",
            type: row.type || row.kategori || "Umum",
            active: row.active ?? true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: profile?.email || "System JSON Import",
          });
        });

        if (validRows === 0) {
          toast.info(`Proses dibatalkan. Menemukan ${skippedRows} baris invalid atau sudah ada (duplikat).`);
          return;
        }

        const confirmMsg = `RINGKASAN IMPORT:\n- Data Valid Tersimpan: ${validRows}\n- Dokumen Dilewati (Duplikat/Invalid): ${skippedRows}\n\nPerlu diingat, import akan langsung ditulis ke cabang aktif.\nLanjutkan proses Bulk Insert?`;

        if (!window.confirm(confirmMsg)) return;

        await batch.commit();
        toast.success(`Import selesai! Berhasil memuat ${validRows} data master baru.`);
      } catch (err: any) {
        toast.error("Gagal membaca berkas import: " + err.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const openEditor = (item?: MarketMaster) => {
    setEditingMarket(item || null);
    setIsFormOpen(true);
  };

  return (
    <div className="w-full flex-1 flex flex-col pt-0 pb-24">
      {/* Sticky Action Bar */}
      <div className="sticky top-6 z-30 mx-4 md:mx-0 flex flex-col md:flex-row gap-3 md:gap-4 md:items-center justify-between mb-6">
        <div className="flex-1 flex items-center gap-2 relative">
          <Search className="absolute left-4 w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari master pasar..."
            className="w-full h-10 md:h-11 bg-zinc-100 dark:bg-black/40 focus:bg-zinc-200 dark:focus:bg-black/60 rounded-full pl-10 pr-4 text-sm font-medium outline-none text-zinc-900 dark:text-white transition-all placeholder:text-zinc-500"
          />
        </div>
         <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          {activeBranchContext && (
            <button 
              onClick={() => setIsWilayahManagerOpen(true)}
              className="h-10 md:h-11 flex items-center gap-2 px-5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full text-xs md:text-sm font-bold text-zinc-700 dark:text-zinc-200 transition-colors flex-shrink-0 cursor-pointer"
              title="Kelola Wilayah"
            >
              <MapPin className="w-4 h-4 text-emerald-500" />
              <span className="hidden md:inline">Wilayah</span>
            </button>
          )}

          <button 
            onClick={() => openEditor()}
            disabled={branchWilayah.length === 0}
            className="h-10 md:h-11 flex items-center justify-center gap-1.5 px-6 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:bg-zinc-350 dark:disabled:bg-zinc-800 disabled:text-zinc-500 disabled:pointer-events-none active:scale-95 text-black rounded-full text-xs md:text-sm font-black uppercase tracking-wider transition-all shadow-md shadow-primary/20 flex-shrink-0 cursor-pointer"
            title={branchWilayah.length === 0 ? "Tambahkan wilayah terlebih dahulu" : "Tambah Master Pasar"}
          >
            <Plus className="w-5 h-5 text-black font-black" strokeWidth={3.5} />
            <span className="hidden md:inline">Baru</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 md:px-0">
        {branchWilayah.length === 0 && !branchLoading && (
          <div className="mb-6 p-4.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-extrabold uppercase tracking-widest text-[10px] text-amber-500 font-mono">Peringatan Konfigurasi</p>
                <p className="font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">Tambahkan minimal satu wilayah operasional cabang terlebih dahulu.</p>
              </div>
            </div>
            <button
              onClick={() => setIsWilayahManagerOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all self-start sm:self-center flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer font-bold"
            >
              <MapPin className="w-3.5 h-3.5 animate-bounce" /> Kelola Wilayah
            </button>
          </div>
        )}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-zinc-100 dark:bg-card/5 animate-pulse rounded-[1.5rem] w-full" />
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-zinc-100 bg-card rounded-full flex items-center justify-center mb-4">
                <SearchX className="w-8 h-8 text-zinc-400" />
             </div>
             <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Data Master Kosong</h3>
             <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">Tidak ditemukan data pasar pada cabang terpilih.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {filteredData.map(item => {
                const isInactive = !item.active;
                const ops = item.operations || [
                  {
                    id: "fallback-" + item.id,
                    jenis: (item.kategori?.[0] || "PASAR_UMUM") as any,
                    hariOperasi: item.hari_operasi || ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"],
                    jamBuka: item.jam_operasional?.buka || "06:00",
                    jamTutup: item.jam_operasional?.tutup || "17:00",
                    metadata: {}
                  }
                ];
                
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex flex-col justify-between p-4.5 transition-all bg-card rounded-[1.5rem] hover:bg-zinc-50 dark:hover:bg-card/[0.01] shadow-sm hover:shadow-md group min-h-[180px]",
                      isInactive && "opacity-60 bg-zinc-50/50 dark:bg-zinc-950/40"
                    )}
                  >
                    <div className="min-w-0 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-sm md:text-base leading-tight tracking-tight text-zinc-900 dark:text-white group-hover:text-primary transition-colors truncate">
                            {toTitleCase(item.name)}
                          </h4>
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                            <MapPin className="w-3 h-3 text-zinc-400 dark:text-zinc-600 flex-shrink-0" />
                            <span>{toTitleCase(item.city)}</span>
                            {item.district && item.district !== "-" && (
                              <>
                                <span className="opacity-40">•</span>
                                <span className="truncate max-w-[120px]">{toTitleCase(item.district)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Display Multi-Schedule Operations */}
                      <div className="mt-2 space-y-1.5 flex-1">
                        {ops.map((op, oIdx) => {
                          const isJava = op.jenis === "PASAR_JAWA";
                          const isPagi = op.jenis === "PASAR_PAGI";
                          const isEveryday = op.hariOperasi && ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"].every(d => op.hariOperasi.includes(d));
                          return (
                            <div 
                              key={op.id || oIdx} 
                              className="bg-zinc-50/10 dark:bg-black/30 border border-zinc-100 dark:border-white/5 rounded-[1.25rem] p-2 flex flex-col gap-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className={cn(
                                  "text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                                  isJava 
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono" 
                                    : isPagi 
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                                      : "bg-primary/10 text-primary"
                                )}>
                                  {op.jenis.replace("PASAR_", "")}
                                </span>
                                <div className="flex items-center gap-1 text-[9.5px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded font-mono">
                                  <Clock className="w-2.5 h-2.5 text-zinc-400" />
                                  <span>{op.jamBuka} - {op.jamTutup}</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-0.5 mt-0.5">
                                {isEveryday ? (
                                  <span 
                                    className={cn(
                                      "text-[7px] font-black px-1.5 py-0.3 rounded-md uppercase tracking-wider border",
                                      isJava 
                                        ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 font-sans" 
                                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-sans"
                                    )}
                                  >
                                    Buka Setiap Hari
                                  </span>
                                ) : (
                                  op.hariOperasi?.map((day, dIdx) => (
                                    <span 
                                      key={dIdx} 
                                      className={cn(
                                        "text-[7px] font-bold px-1 py-0.2 rounded uppercase font-mono border",
                                        isJava 
                                          ? "bg-amber-500/5 border-amber-500/10 text-amber-600 dark:text-amber-400" 
                                          : "bg-zinc-100/50 dark:bg-zinc-800 border-transparent text-zinc-500 dark:text-zinc-400"
                                      )}
                                    >
                                      {day}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action footer */}
                    <div className="flex items-center justify-between pt-2.5 mt-3">
                      <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                        ID: {item.id.slice(0, 6)}...
                      </span>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => openEditor(item)} 
                          className="p-1 px-2 text-zinc-650 hover:text-black dark:text-zinc-450 dark:hover:text-primary bg-zinc-50 hover:bg-primary/10 dark:bg-card/5 dark:hover:bg-primary/10 rounded-lg transition-colors text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(item)} 
                          className="p-1 px-2 text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 bg-zinc-50 hover:bg-red-50 dark:bg-card/5 dark:hover:bg-red-500/10 rounded-lg transition-colors text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
             })}
          </div>
        )}
      </div>

      {/* Editor Modal / Bottom Sheet */}
      <AnimatePresence>
        {isFormOpen && (
          <MarketEditorSheet
            initialData={editingMarket}
            onClose={() => {
              setIsFormOpen(false);
              setEditingMarket(null);
            }}
            branchId={activeBranchContext!}
            profile={profile}
            branchWilayah={branchWilayah}
          />
        )}
      </AnimatePresence>

      {/* Inline Wilayah Manager Modal */}
      <AnimatePresence>
        {isWilayahManagerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWilayahManagerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-card border border-border/60 rounded-[18px] overflow-hidden shadow-2xl z-20 flex flex-col max-h-[85vh]"
            >
              <header className="px-8 pt-9 pb-7 border-b border-border/40 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 font-sans">
                    <MapPin className="w-4 h-4 text-emerald-400 animate-pulse" />
                    Kelola Wilayah
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mt-0.5">
                    Cabang ID: {activeBranchContext}
                  </p>
                </div>
                <button
                  onClick={() => setIsWilayahManagerOpen(false)}
                  className="p-1.5 hover:bg-white/5 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              <div className="p-6 space-y-4 overflow-y-auto">
                <p className="text-[11px] text-zinc-400 leading-relaxed font-semibold">
                  Tambahkan daftar wilayah/kabupaten operasional yang dilayani oleh cabang ini. Wilayah yang terdaftar akan muncul sebagai opsi dropdown saat membuat data Master Pasar.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: Bantul, Sleman, Kulon Progo"
                    value={newWilayahInput}
                    onChange={(e) => setNewWilayahInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = newWilayahInput.trim();
                        if (!val) return;
                        if (branchWilayah.includes(val)) {
                          toast.error("Wilayah sudah terdaftar.");
                          return;
                        }
                        const updated = [...branchWilayah, val];
                        await handleSaveWilayahList(updated);
                        setNewWilayahInput("");
                      }
                    }}
                    className="flex-1 h-10 px-4 rounded-xl border border-border/50 bg-[#06080A] text-xs font-bold text-white outline-none focus:border-primary transition-all"
                  />
                  <button
                    onClick={async () => {
                      const val = newWilayahInput.trim();
                      if (!val) return;
                      if (branchWilayah.includes(val)) {
                        toast.error("Wilayah sudah terdaftar.");
                        return;
                      }
                      const updated = [...branchWilayah, val];
                      await handleSaveWilayahList(updated);
                      setNewWilayahInput("");
                    }}
                    className="px-4 h-10 bg-primary hover:opacity-90 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 p-3.5 rounded-2xl bg-[#06080A] border border-border/40 min-h-[100px]">
                  {branchWilayah.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-border/40 text-[10px] font-extrabold uppercase text-zinc-300 tracking-wider"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={async () => {
                          const updated = branchWilayah.filter((w) => w !== name);
                          await handleSaveWilayahList(updated);
                        }}
                        className="hover:text-red-400 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {branchWilayah.length === 0 && (
                    <p className="text-[10px] italic text-zinc-500 self-center mx-auto">Belum ada wilayah operasional cabang.</p>
                  )}
                </div>
              </div>

              <footer className="px-6 py-4.5 border-t border-border/40 flex items-center justify-end bg-[#06080A]/40">
                <button
                  onClick={() => setIsWilayahManagerOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-border/40 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Selesai
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {marketToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMarketToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
            />
            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xl z-20 flex flex-col p-6 text-center space-y-4"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-red-550/10 flex items-center justify-center text-red-500">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-black uppercase tracking-wider text-white font-sans">
                  Hapus Master Pasar?
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
                  Apakah Anda yakin ingin menghapus permanen master data pasar <span className="font-extrabold text-white">"{marketToDelete.name}"</span>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMarketToDelete(null)}
                  className="flex-1 h-10 bg-white/5 hover:bg-white/10 text-white border border-border/40 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 h-10 bg-red-550 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-md shadow-red-550/10"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- NEW MOBILE-FIRST SHEET WRAPPER WITH MOTION ANIMATIONS ---
function MarketEditorSheet({ initialData, onClose, branchId, profile, branchWilayah }: { initialData: MarketMaster | null, onClose: () => void, branchId: string, profile: any, branchWilayah: string[] }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      {/* Native-feeling slide-up Sheet panel */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 220 }}
        className="relative w-full max-w-xl h-[92vh] md:h-[88vh] bg-zinc-50 dark:bg-zinc-950 border-t border-border/50 dark:border-white/10 rounded-t-3xl flex flex-col shadow-2xl overflow-hidden pb-safe"
      >
        <MarketEditorForm initialData={initialData} onClose={onClose} branchId={branchId} profile={profile} branchWilayah={branchWilayah} />
      </motion.div>
    </div>
  );
}

// Inner Component for Editor Form
function MarketEditorForm({ initialData, onClose, branchId, profile, branchWilayah }: { initialData: MarketMaster | null, onClose: () => void, branchId: string, profile: any, branchWilayah: string[] }) {
  const [name, setName] = useState(initialData?.name || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [district, setDistrict] = useState(initialData?.district || "");
  const [active, setActive] = useState(initialData?.active ?? true);
  const [saving, setSaving] = useState(false);

  const [isKustomCity, setIsKustomCity] = useState(() => {
    if (!initialData?.city) return false;
    const currentOptions = branchWilayah || [];
    return !currentOptions.includes(initialData.city);
  });

  const WEEKDAYS = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];
  const JAWA_DAYS = ["LEGI", "PAHING", "PON", "WAGE", "KLIWON"];

  const WEEKDAY_LABELS: Record<string, string> = {
    SENIN: "Senin",
    SELASA: "Selasa",
    RABU: "Rabu",
    KAMIS: "Kamis",
    JUMAT: "Jumat",
    SABTU: "Sabtu",
    MINGGU: "Minggu"
  };

  const JAWA_LABELS: Record<string, string> = {
    LEGI: "Legi",
    PAHING: "Pahing",
    PON: "Pon",
    WAGE: "Wage",
    KLIWON: "Kliwon"
  };

  const [operations, setOperations] = useState<MarketOperation[]>(() => {
    if (initialData?.operations && initialData.operations.length > 0) {
      return initialData.operations;
    }
    if (initialData) {
      const cats = initialData.kategori || [];
      if (cats.length > 0) {
        return cats.map((cat, idx) => ({
          id: `op-legacy-${cat}-${idx}`,
          jenis: cat as any,
          hariOperasi: initialData.hari_operasi || ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"],
          jamBuka: initialData.jam_operasional?.buka || "06:00",
          jamTutup: initialData.jam_operasional?.tutup || "17:00",
          metadata: {}
        }));
      }
      return [
        {
          id: "op-legacy-" + Math.random().toString(36).substr(2, 9),
          jenis: "PASAR_UMUM",
          hariOperasi: initialData.hari_operasi || ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"],
          jamBuka: initialData.jam_operasional?.buka || "06:00",
          jamTutup: initialData.jam_operasional?.tutup || "17:00",
          metadata: {}
        }
      ];
    }
    return [];
  });

  // Category editing state within the configuration workflow
  const [currentEditingJenis, setCurrentEditingJenis] = useState<"PASAR_UMUM" | "PASAR_PAGI" | "PASAR_JAWA" | null>(null);
  const [editHariOperasi, setEditHariOperasi] = useState<string[]>([]);
  const [editJamBuka, setEditJamBuka] = useState<string>("06:00");
  const [editJamTutup, setEditJamTutup] = useState<string>("17:00");
  const [editCustomDaysActive, setEditCustomDaysActive] = useState<boolean | null>(null);

  const handleStartAdd = (jenis: "PASAR_UMUM" | "PASAR_PAGI" | "PASAR_JAWA") => {
    let defaultBuka = "06:00";
    let defaultTutup = "17:00";
    let defaultHari = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];

    if (jenis === "PASAR_PAGI") {
      defaultBuka = "04:00";
      defaultTutup = "11:00";
    } else if (jenis === "PASAR_JAWA") {
      defaultBuka = "05:00";
      defaultTutup = "12:00";
      defaultHari = ["LEGI"];
    }

    setCurrentEditingJenis(jenis);
    setEditHariOperasi(defaultHari);
    setEditJamBuka(defaultBuka);
    setEditJamTutup(defaultTutup);
    setEditCustomDaysActive(jenis === "PASAR_JAWA" ? true : false);
  };

  const handleStartEdit = (op: MarketOperation) => {
    setCurrentEditingJenis(op.jenis);
    setEditHariOperasi([...op.hariOperasi]);
    setEditJamBuka(op.jamBuka);
    setEditJamTutup(op.jamTutup);
    
    const isEvery = !(op.jenis === "PASAR_JAWA") && WEEKDAYS.every(d => op.hariOperasi.includes(d));
    setEditCustomDaysActive(!isEvery);
  };

  const handleCancelEdit = () => {
    setCurrentEditingJenis(null);
    setEditHariOperasi([]);
    setEditJamBuka("06:00");
    setEditJamTutup("17:00");
    setEditCustomDaysActive(null);
  };

  const handleToggleEditDay = (day: string) => {
    setEditHariOperasi(prev => {
      const isExist = prev.includes(day);
      if (isExist) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const handleRemoveCategory = (jenis: "PASAR_UMUM" | "PASAR_PAGI" | "PASAR_JAWA") => {
    setOperations(prev => prev.filter(op => op.jenis !== jenis));
    toast.success(`Operasional ${jenis === "PASAR_UMUM" ? "UMUM" : jenis === "PASAR_PAGI" ? "PAGI" : "JAWA"} berhasil dihapus`);
    if (currentEditingJenis === jenis) {
      handleCancelEdit();
    }
  };

  const handleSaveCategoryConfig = () => {
    if (!currentEditingJenis) return;
    if (editHariOperasi.length === 0) {
      toast.error("Wajib memilih minimal 1 hari operasi!");
      return;
    }
    if (!editJamBuka || !editJamTutup) {
      toast.error("Jam buka dan jam tutup wajib diisi!");
      return;
    }

    setOperations(prev => {
      const existingIndex = prev.findIndex(op => op.jenis === currentEditingJenis);
      if (existingIndex !== -1) {
        return prev.map((op, idx) => {
          if (idx !== existingIndex) return op;
          return {
            ...op,
            hariOperasi: [...editHariOperasi],
            jamBuka: editJamBuka,
            jamTutup: editJamTutup
          };
        });
      } else {
        return [
          ...prev,
          {
            id: "op-" + Math.random().toString(36).substr(2, 9),
            jenis: currentEditingJenis,
            hariOperasi: [...editHariOperasi],
            jamBuka: editJamBuka,
            jamTutup: editJamTutup,
            metadata: {}
          }
        ];
      }
    });

    const displayLabel = currentEditingJenis === "PASAR_UMUM" ? "UMUM" : currentEditingJenis === "PASAR_PAGI" ? "PAGI" : "JAWA";
    toast.success(`Jadwal ${displayLabel} disimpan ke rancangan`);
    handleCancelEdit();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nama Pasar wajib diisi");
    if (!city.trim()) return toast.error("Wilayah/Kota wajib diisi");
    if (operations.length === 0) return toast.error("Minimal harus menambahkan 1 kategori operasional aktif!");

    setSaving(true);
    try {
      const nameSanitized = toTitleCase(name);
      const citySanitized = toTitleCase(city);
      const districtSanitized = district ? toTitleCase(district) : "";

      const kategori = Array.from(new Set(operations.map(o => o.jenis)));
      const hari_operasi = Array.from(new Set(operations.flatMap(o => o.hariOperasi)));
      const firstOp = operations[0];
      const jam_operasional = {
        buka: firstOp?.jamBuka || "06:00",
        tutup: firstOp?.jamTutup || "17:00"
      };

      const finalPayload = {
        name: nameSanitized,
        nama_pasar: nameSanitized,
        city: citySanitized,
        wilayah: citySanitized,
        district: districtSanitized,
        active,
        kategori,
        hari_operasi,
        jam_operasional,
        operations,
        updatedAt: new Date().toISOString()
      };

      const marketId = initialData?.id || doc(collection(db, `branches/${branchId}/master_markets`)).id;
      const marketRef = doc(db, `branches/${branchId}/master_markets`, marketId);
      
      const batch = writeBatch(db);

      batch.set(marketRef, {
        ...finalPayload,
        ...(initialData?.id ? {} : { createdAt: new Date().toISOString(), createdBy: profile?.email || "System/Admin User" })
      }, { merge: true });

      const oldOps = initialData?.operations || [];
      const newIds = new Set(operations.map(o => o.id));
      const deletedOps = oldOps.filter(o => !newIds.has(o.id));

      for (const dOp of deletedOps) {
        const opRef = doc(db, `branches/${branchId}/master_markets/${marketId}/operations`, dOp.id);
        batch.delete(opRef);
      }

      for (const op of operations) {
        const opRef = doc(db, `branches/${branchId}/master_markets/${marketId}/operations`, op.id);
        batch.set(opRef, {
          jenis: op.jenis,
          hariOperasi: op.hariOperasi,
          jamBuka: op.jamBuka,
          jamTutup: op.jamTutup,
          metadata: op.metadata || {}
        }, { merge: true });
      }

      await batch.commit();
      toast.success(initialData?.id ? "Data master pasar berhasil diperbarui" : "Master pasar baru berhasil didaftarkan");
      onClose();
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderCategoryEditor = (jenis: "PASAR_UMUM" | "PASAR_PAGI" | "PASAR_JAWA") => {
    const isJava = jenis === "PASAR_JAWA";
    const displayLabel = jenis === "PASAR_UMUM" ? "UMUM" : jenis === "PASAR_PAGI" ? "PAGI" : "JAWA";

    return (
      <div className="bg-zinc-100/65 dark:bg-zinc-900/35 border border-zinc-200 dark:border-white/5 rounded-2xl p-4 shadow-sm space-y-4 animate-in fade-in duration-200">
        <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-white/5 pb-2">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-primary dark:text-[#10B981] font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Konfigurasi {displayLabel}
          </h4>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="text-[9px] font-bold text-zinc-400 hover:text-zinc-655 dark:hover:text-zinc-200 uppercase tracking-wider cursor-pointer"
          >
            Batal
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">
            Hari Operasi
          </label>

          {isJava ? (
            <div className="flex flex-wrap gap-1">
              {JAWA_DAYS.map((day) => {
                const isActive = editHariOperasi.includes(day);
                const label = JAWA_LABELS[day] || day;
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => handleToggleEditDay(day)}
                    className={cn(
                      "flex-1 min-w-[55px] h-9 rounded-lg text-[9px] font-bold tracking-wider border transition-all cursor-pointer",
                      isActive
                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                        : "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950/40 border-border/50 dark:border-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-350"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : (
            (() => {
              const isEveryday = WEEKDAYS.every(d => editHariOperasi.includes(d));
              const showCustom = editCustomDaysActive ?? !isEveryday;

              if (!showCustom) {
                return (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                        Buka Setiap Hari (Senin - Minggu)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditCustomDaysActive(true)}
                      className="text-[9px] font-bold text-zinc-500 hover:text-primary dark:text-zinc-400 dark:hover:text-white uppercase tracking-wider underline cursor-pointer"
                    >
                      Ubah
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pl-1">
                    <span className="text-[8.5px] font-black text-amber-500 uppercase tracking-wider">
                      Kustom ({editHariOperasi.length} Hari Aktif)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditCustomDaysActive(false);
                        setEditHariOperasi([...WEEKDAYS]);
                      }}
                      className="text-[9px] font-bold text-emerald-600 dark:text-primary hover:underline uppercase tracking-wider cursor-pointer"
                    >
                      Setiap Hari
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((day) => {
                      const isActive = editHariOperasi.includes(day);
                      const shortLabel = WEEKDAY_LABELS[day]?.slice(0, 3) || day.slice(0, 3);
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => handleToggleEditDay(day)}
                          className={cn(
                            "h-9 rounded-lg text-[9px] font-bold border transition-all cursor-pointer uppercase font-mono",
                            isActive
                              ? "bg-primary/10 border-primary text-primary shadow-sm"
                              : "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950/40 border-border/50 dark:border-white/5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                          )}
                        >
                          {shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          )}
        </div>

        <div className="grid grid-cols-2 gap-3.5 pt-1">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">
              Jam Buka
            </label>
            <input
              type="time"
              required
              value={editJamBuka}
              onChange={(e) => setEditJamBuka(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border/50 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold text-center text-zinc-900 dark:text-white outline-none focus:border-primary transition-colors cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">
              Jam Tutup
            </label>
            <input
              type="time"
              required
              value={editJamTutup}
              onChange={(e) => setEditJamTutup(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border/50 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold text-center text-zinc-900 dark:text-white outline-none focus:border-primary transition-colors cursor-pointer"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveCategoryConfig}
          className="w-full h-10 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-[9.5px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm mt-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          Simpan Jadwal {displayLabel}
        </button>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between px-6 py-4 bg-white dark:bg-zinc-950 border-b border-zinc-200/50 dark:border-white/10">
        <div>
          <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-zinc-900 dark:text-white">
            {initialData ? "Edit Master Pasar" : "Tambah Master Pasar"}
          </h3>
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">
            Operational Scheduling Workspace
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 flex-shrink-0" />
        </button>
      </div>

      {/* Scrollable Content Pane */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 scrollbar-thin">
        {/* SECTION 1: Informasi Pasar */}
        <div className="bg-card border border-border/50 dark:border-white/5 rounded-[1.5rem] p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-white/5 pb-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Informasi Pasar
            </h3>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">
              Nama Pasar <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full h-11 px-4 rounded-[1.25rem] border border-border/50 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-primary transition-all" 
              placeholder="Contoh: Pasar Beringharjo" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">
              Wilayah <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2">
              <select
                value={isKustomCity ? "KUSTOM" : city}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "KUSTOM") {
                    setIsKustomCity(true);
                    setCity("");
                  } else {
                    setIsKustomCity(false);
                    setCity(val);
                  }
                }}
                required
                className="w-full h-11 px-4 rounded-[1.25rem] border border-border/50 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-primary transition-all cursor-pointer"
              >
                <option value="">Pilih Wilayah...</option>
                {branchWilayah.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="KUSTOM">+ Tulis Wilayah Kustom...</option>
              </select>

              {isKustomCity && (
                <input 
                  type="text" 
                  required 
                  value={city} 
                  onChange={(e) => setCity(e.target.value)} 
                  className="w-full h-11 px-4 rounded-[1.25rem] border border-border/50 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-primary transition-all" 
                  placeholder="Ketik nama wilayah baru/kustom..." 
                />
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: Operasional Pasar */}
        <div className="space-y-3.5 pb-10">
          <div className="flex items-center gap-2 pl-1 mb-1">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Operasional Pasar
            </h3>
          </div>

          <div className="space-y-3">
            {/* 1. Show already active operational categories as cards */}
            {operations.map((op) => {
              const isJava = op.jenis === "PASAR_JAWA";
              const isEveryday = !isJava && WEEKDAYS.every(d => op.hariOperasi.includes(d));
              
              const formattedDays = isEveryday 
                ? "Setiap Hari" 
                : op.hariOperasi.map(d => {
                    const label = isJava ? JAWA_LABELS[d] : WEEKDAY_LABELS[d];
                    return label || d;
                  }).join(", ");

              const displayLabel = op.jenis === "PASAR_UMUM" ? "UMUM" : op.jenis === "PASAR_PAGI" ? "PAGI" : "JAWA";
              const isEditing = currentEditingJenis === op.jenis;

              if (isEditing) {
                return renderCategoryEditor(op.jenis);
              }

              return (
                <div 
                  key={op.id} 
                  className="bg-card dark:bg-zinc-900/40 border border-border/50 dark:border-white/5 rounded-2xl p-4 shadow-sm flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-black text-zinc-800 dark:text-zinc-250 tracking-wider">
                        {displayLabel}
                      </span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-550 dark:text-zinc-450 font-mono">
                      {formattedDays}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                      {op.jamBuka} - {op.jamTutup}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(op)}
                      className="p-2 rounded-lg bg-zinc-100/50 hover:bg-zinc-100 dark:bg-zinc-950/45 dark:hover:bg-zinc-950 text-zinc-500 dark:text-zinc-400 hover:text-primary dark:hover:text-[#10B981] transition-all cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(op.jenis)}
                      className="p-2 rounded-lg bg-zinc-100/50 hover:bg-red-500/10 dark:bg-zinc-950/45 dark:hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-all cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* 2. Show "+ Tambah Operasional" buttons for categories that are NOT active */}
            {["PASAR_UMUM", "PASAR_PAGI", "PASAR_JAWA"].map((cat) => {
              const isAlreadyActive = operations.some(op => op.jenis === cat);
              const isCurrentlyEditing = currentEditingJenis === cat;
              
              if (isAlreadyActive || isCurrentlyEditing) return null;

              const displayLabel = cat === "PASAR_UMUM" ? "UMUM" : cat === "PASAR_PAGI" ? "PAGI" : "JAWA";

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleStartAdd(cat as any)}
                  className="w-full py-3 px-4 rounded-xl border border-dashed border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-455 hover:text-primary dark:hover:text-[#10B981] hover:border-primary/50 dark:hover:border-[#10B981]/50 hover:bg-zinc-50 dark:hover:bg-zinc-950/30 flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-widest transition-all duration-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-zinc-400 dark:text-zinc-500" strokeWidth={3} />
                  Tambah Operasional {displayLabel}
                </button>
              );
            })}

            {/* 3. If editing a new category that is NOT yet active in operations, render its configuration panel */}
            {currentEditingJenis && !operations.some(op => op.jenis === currentEditingJenis) && renderCategoryEditor(currentEditingJenis)}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions Action Panel (SafeArea optimized) */}
      <div className="sticky bottom-0 z-10 p-4 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-250/50 dark:border-white/10 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-12 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-card/5 dark:hover:bg-card/10 text-zinc-800 dark:text-zinc-200 border border-border/50 dark:border-white/10 rounded-[1.25rem] text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
        >
          Tutup
        </button>
        <button
          type="submit"
          disabled={saving || !!currentEditingJenis}
          className="flex-[2.5] h-12 flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-[1.25rem] text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> MENYIMPAN...</> : "SIMPAN PASAR"}
        </button>
      </div>
    </form>
  );
}

// --- LEGACY EXPORTS FOR COMPATIBILITY WITH MarketPlans.tsx and AdminLayout.tsx ---

export const WILAYAH_OPTIONS = [
    "Kota Yogyakarta", "Sleman", "Bantul", "Gunungkidul", "Kulon Progo", "Purworejo", "Magelang", "Temanggung"
];
  
export const PASARAN_OPTIONS = ["Legi", "Pahing", "Pon", "Wage", "Kliwon"];
  
export const KATEGORI_OPTIONS = [
    { id: "PASAR_UMUM", label: "Pasar Umum" },
    { id: "PASAR_SUBUH", label: "Pasar Pagi/Subuh" },
    { id: "PASARAN_JAWA", label: "Pasaran Jawa" },
];

export function MasterDataView({ markets, onAdd, onEdit, onDelete, search, setSearch, filters }: any) {
  return (
    <div className="p-4 border border-border/50 dark:border-white/10 rounded-[1.5rem] bg-card dark:bg-card/5 opacity-50">
       <p className="text-zinc-500 text-sm font-medium text-center">Tampilan legacy Data Master telah dipindahkan. Mohon gunakan panel admin utama.</p>
    </div>
  );
}

export function MarketFormContent({ market, onClose }: any) {
  const { activeBranchContext } = useRuntime();
  const { profile } = useAuth();
  const [branchWilayah, setBranchWilayah] = useState<string[]>([]);

  useEffect(() => {
    if (!activeBranchContext) return;
    const docRef = doc(db, "branches", activeBranchContext);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setBranchWilayah(docSnap.data().wilayah || []);
      }
    });
    return () => unsub();
  }, [activeBranchContext]);
  
  if (!activeBranchContext) return <div className="p-10 text-center">Konteks cabang tidak tersedia</div>;

  const handleClose = () => {
    onClose();
    // Refresh parent context if possible
    window.location.reload();
  };
  
  return (
     <div className="w-full flex-1 flex flex-col h-[85vh] bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-border/50 dark:border-white/5 shadow-lg overflow-hidden">
        <div className="flex-1 overflow-y-auto">
           <MarketEditorForm 
             initialData={market ? {
               id: market.id,
               name: market.name || market.nama_pasar || "",
               city: market.city || market.wilayah || "",
               district: market.district || market.alamat || "",
               type: market.type || market.kategori || "Umum",
               active: market.active ?? true,
               kategori: market.kategori || ["PASAR_UMUM"],
               hari_operasi: market.hari_operasi || ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"],
               jam_operasional: market.jam_operasional || { buka: "06:00", tutup: "17:00" },
               operations: market.operations
             } : null} 
             onClose={handleClose} 
             branchId={activeBranchContext} 
             profile={profile} 
             branchWilayah={branchWilayah}
           />
        </div>
     </div>
  );
}

