import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, Filter, Download, Upload, MoreVertical, Pencil, Trash2, CheckCircle2, XCircle, FileJson, X, AlignLeft, Building2, MapPin, Loader2, SearchX, ChevronDown, Layers, Clock } from "lucide-react";
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDelete = async (item: MarketMaster) => {
    if (!activeBranchContext) return;
    if (!window.confirm(`PERHATIAN!\nHapus permanen master data pasar:\n${item.name}?\nTindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await deleteDoc(doc(db, `branches/${activeBranchContext}/master_markets`, item.id));
      toast.success("Data berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus data");
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
      <div className="sticky top-6 z-30 mx-4 md:mx-0 flex flex-col md:flex-row gap-2 md:gap-4 p-3 md:p-4 bg-card/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-full shadow-sm md:items-center justify-between mb-6">
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
          <button 
            onClick={handleExport}
            className="h-10 md:h-11 flex items-center gap-2 px-6 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full text-xs md:text-sm font-bold text-zinc-700 dark:text-zinc-200 transition-colors flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Eksport</span>
          </button>
          
          <div className="relative flex-shrink-0">
             <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
             <button className="h-10 md:h-11 flex items-center gap-2 px-6 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full text-xs md:text-sm font-bold text-zinc-700 dark:text-zinc-200 transition-colors pointer-events-none">
              <Upload className="w-4 h-4" />
              <span className="hidden md:inline">Import</span>
             </button>
          </div>

          <button 
            onClick={() => openEditor()}
            className="h-10 md:h-11 flex items-center justify-center gap-1.5 px-6 bg-primary hover:bg-primary/90 active:scale-95 text-black rounded-full text-xs md:text-sm font-black uppercase tracking-wider transition-all shadow-md shadow-primary/20 flex-shrink-0"
          >
            <Plus className="w-5 h-5 text-black font-black" strokeWidth={3.5} />
            <span className="hidden md:inline">Baru</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 md:px-0">
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

                        {/* Status Toggle Button */}
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={cn(
                            "flex-shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider transition-all scale-95 hover:scale-100 cursor-pointer",
                            item.active
                              ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20"
                              : "bg-zinc-100 dark:bg-card/5 text-zinc-500 dark:text-zinc-400 border border-border/50 dark:border-white/10"
                          )}
                        >
                          {item.active ? "Aktif" : "Muted"}
                        </button>
                      </div>

                      {/* Display Multi-Schedule Operations */}
                      <div className="mt-2 space-y-1.5 flex-1">
                        {ops.map((op, oIdx) => {
                          const isJava = op.jenis === "PASAR_JAWA";
                          const isPagi = op.jenis === "PASAR_PAGI";
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
                                {op.hariOperasi?.map((day, dIdx) => (
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
                                ))}
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- NEW MOBILE-FIRST SHEET WRAPPER WITH MOTION ANIMATIONS ---
function MarketEditorSheet({ initialData, onClose, branchId, profile }: { initialData: MarketMaster | null, onClose: () => void, branchId: string, profile: any }) {
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
        <MarketEditorForm initialData={initialData} onClose={onClose} branchId={branchId} profile={profile} />
      </motion.div>
    </div>
  );
}

export const BRANCH_WILAYAH_MAP: Record<string, string[]> = {
  GJY: ["Kota Yogyakarta", "Bantul", "Gunungkidul", "Kulon Progo", "Sleman"], // DIY
  SLA: ["Sleman", "Depok", "Ngaglik", "Mlati", "Kalasan", "Gamping", "Tempel", "Prambanan"], // Sleman
  MGL: ["Kota Magelang", "Kabupaten Magelang", "Muntilan", "Secang", "Borobudur", "Salaman", "Grabag"], // Magelang
  PWR: ["Purworejo", "Kutoarjo", "Bagelen", "Kemiri", "Butuh", "Loano"], // Purworejo
  TMG: ["Temanggung", "Parakan", "Kranggan", "Ngadirejo", "Kedu"] // Temanggung
};

// Inner Component for Editor Form
function MarketEditorForm({ initialData, onClose, branchId, profile }: { initialData: MarketMaster | null, onClose: () => void, branchId: string, profile: any }) {
  const [name, setName] = useState(initialData?.name || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [district, setDistrict] = useState(initialData?.district || "");
  const [active, setActive] = useState(initialData?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [customDaysOps, setCustomDaysOps] = useState<Record<string, boolean>>({});

  const [isKustomCity, setIsKustomCity] = useState(() => {
    if (!initialData?.city) return false;
    const currentOptions = BRANCH_WILAYAH_MAP[branchId?.toUpperCase()] || BRANCH_WILAYAH_MAP["GJY"] || [];
    return !currentOptions.includes(initialData.city);
  });

  const [operations, setOperations] = useState<MarketOperation[]>(() => {
    if (initialData?.operations && initialData.operations.length > 0) {
      return initialData.operations;
    }
    // Safe initialization with fallback mapping of legacy records
    return [
      {
        id: "op-" + Math.random().toString(36).substr(2, 9),
        jenis: (initialData?.kategori?.[0] || "PASAR_UMUM") as any,
        hariOperasi: initialData?.hari_operasi || ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"],
        jamBuka: initialData?.jam_operasional?.buka || "06:00",
        jamTutup: initialData?.jam_operasional?.tutup || "17:00",
        metadata: {}
      }
    ];
  });

  const WEEKDAYS = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];
  const JAWA_DAYS = ["LEGI", "PAHING", "PON", "WAGE", "KLIWON"];

  const handleAddOperation = () => {
    setOperations(prev => [
      ...prev,
      {
        id: "op-" + Math.random().toString(36).substr(2, 9),
        jenis: "PASAR_UMUM",
        hariOperasi: ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"],
        jamBuka: "06:00",
        jamTutup: "17:00",
        metadata: {}
      }
    ]);
    toast.success("Operasional baru ditambahkan ke daftar");
  };

  const handleRemoveOperation = (id: string) => {
    if (operations.length === 1) {
      toast.error("Wajib menyisakan minimal 1 jadwal operasional utama!");
      return;
    }
    setOperations(prev => prev.filter(op => op.id !== id));
  };

  const handleChangeJenis = (id: string, newJenis: "PASAR_UMUM" | "PASAR_PAGI" | "PASAR_JAWA") => {
    setOperations(prev => prev.map(op => {
      if (op.id !== id) return op;
      
      let defaultBuka = op.jamBuka;
      let defaultTutup = op.jamTutup;
      let defaultHari = op.hariOperasi;

      if (newJenis === "PASAR_PAGI") {
        defaultBuka = "04:00";
        defaultTutup = "11:00";
        defaultHari = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];
      } else if (newJenis === "PASAR_JAWA") {
        defaultBuka = "05:00";
        defaultTutup = "12:00";
        defaultHari = ["LEGI"];
      } else {
        defaultBuka = "06:00";
        defaultTutup = "17:00";
        defaultHari = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];
      }

      return {
        ...op,
        jenis: newJenis,
        hariOperasi: defaultHari,
        jamBuka: defaultBuka,
        jamTutup: defaultTutup
      };
    }));
  };

  const handleToggleEveryday = (id: string) => {
    setOperations(prev => prev.map(op => {
      if (op.id !== id) return op;
      const isEvery = WEEKDAYS.every(d => op.hariOperasi.includes(d));
      return {
        ...op,
        hariOperasi: isEvery ? [] : [...WEEKDAYS]
      };
    }));
  };

  const handleToggleDay = (id: string, day: string) => {
    setOperations(prev => prev.map(op => {
      if (op.id !== id) return op;
      const isExist = op.hariOperasi.includes(day);
      const newHari = isExist 
        ? op.hariOperasi.filter(d => d !== day)
        : [...op.hariOperasi, day];
      return {
        ...op,
        hariOperasi: newHari
      };
    }));
  };

  const handleChangeTime = (id: string, field: "jamBuka" | "jamTutup", val: string) => {
    setOperations(prev => prev.map(op => {
      if (op.id !== id) return op;
      return {
        ...op,
        [field]: val
      };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nama Pasar wajib diisi");
    if (!city.trim()) return toast.error("Wilayah/Kota wajib diisi");
    if (operations.length === 0) return toast.error("Minimal harus memiliki 1 jadwal operasional");

    setSaving(true);
    try {
      const nameSanitized = toTitleCase(name);
      const citySanitized = toTitleCase(city);
      const districtSanitized = district ? toTitleCase(district) : "";

      // Re-map category, days, work hours to top-level fields for existing legacy query filters
      const kategori = Array.from(new Set(operations.map(o => o.jenis)));
      const hari_operasi = Array.from(new Set(operations.flatMap(o => o.hariOperasi)));
      const firstOp = operations[0];
      const jam_operasional = {
        buka: firstOp?.jamBuka || "06:00",
        tutup: firstOp?.jamTutup || "17:00"
      };

      const finalPayload = {
        name: nameSanitized,
        nama_pasar: nameSanitized, // Legacy
        city: citySanitized,
        wilayah: citySanitized, // Legacy
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

      // Save primary master market details
      batch.set(marketRef, {
        ...finalPayload,
        ...(initialData?.id ? {} : { createdAt: new Date().toISOString(), createdBy: profile?.email || "System/Admin User" })
      }, { merge: true });

      // Reconcile and prune obsolete operations from Firestore subcollection
      const oldOps = initialData?.operations || [];
      const newIds = new Set(operations.map(o => o.id));
      const deletedOps = oldOps.filter(o => !newIds.has(o.id));

      for (const dOp of deletedOps) {
        const opRef = doc(db, `branches/${branchId}/master_markets/${marketId}/operations`, dOp.id);
        batch.delete(opRef);
      }

      // Write active operation models into the subcollection
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-card/95 bg-card/95 backdrop-blur-md border-b border-border/50/80 dark:border-white/5">
        <div>
          <h3 className="text-base font-black uppercase tracking-wider text-zinc-900 dark:text-white">
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
        {/* SECTION 1: Master Market Information */}
        <div className="bg-card border border-border/50 dark:border-white/5 rounded-[1.5rem] p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-white/5 pb-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Informasi Utama Pasar
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
              Wilayah / Kota <span className="text-red-500">*</span>
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
                {(BRANCH_WILAYAH_MAP[branchId?.toUpperCase()] || BRANCH_WILAYAH_MAP["GJY"] || []).map(opt => (
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

        {/* SECTION 2: Operational Schedule List */}
        <div className="space-y-3.5 pb-10">
          <div className="flex items-center gap-2 pl-1 mb-1">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Daftar Jadwal Operasional
            </h3>
          </div>

          {operations.map((op, opIdx) => {
            const isJava = op.jenis === "PASAR_JAWA";
            return (
              <div 
                key={op.id} 
                className="bg-card border border-border/50 dark:border-white/5 rounded-[1.5rem] p-4 shadow-sm relative space-y-4"
              >
                {/* Micro Header with Prune Option */}
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center border border-primary/25 font-mono">
                      {opIdx + 1}
                    </span>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 font-mono">
                      Jadwal #{opIdx + 1}
                    </h4>
                  </div>
                  {operations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOperation(op.id)}
                      className="p-1 px-2 text-[10px] font-black rounded-lg hover:bg-red-50 text-red-500 dark:hover:bg-red-500/10 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">
                    Jenis Pasar
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 dark:bg-zinc-950 rounded-[1.25rem] border border-transparent dark:border-white/5">
                    {[
                      { id: "PASAR_UMUM", label: "Pasar Umum" },
                      { id: "PASAR_PAGI", label: "Pasar Pagi" },
                      { id: "PASAR_JAWA", label: "Pasar Jawa" }
                    ].map((typeItem) => {
                      const isSelected = op.jenis === typeItem.id;
                      return (
                        <button
                          type="button"
                          key={typeItem.id}
                          onClick={() => handleChangeJenis(op.id, typeItem.id as any)}
                          className={cn(
                            "h-9 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer uppercase",
                            isSelected
                              ? "bg-primary text-primary-foreground font-bold shadow"
                              : "text-zinc-550 dark:text-zinc-450 hover:text-zinc-900 dark:hover:text-zinc-100"
                          )}
                        >
                          {typeItem.label.replace("Pasar ", "")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hari Operasi Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">
                      Hari Operasi
                    </label>
                  </div>

                  {/* Dynamic Chips Row */}
                  {isJava ? (
                    <div className="flex flex-wrap gap-1">
                      {JAWA_DAYS.map((day) => {
                        const isActive = op.hariOperasi.includes(day);
                        return (
                          <button
                            type="button"
                            key={day}
                            onClick={() => handleToggleDay(op.id, day)}
                            className={cn(
                              "flex-1 min-w-[55px] h-9 rounded-lg text-[9px] font-bold tracking-wider border transition-all cursor-pointer",
                              isActive
                                ? "bg-primary/10 border-primary text-primary shadow-sm"
                                : "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950/40 border-border/50 dark:border-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-300"
                            )}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  ) : (() => {
                    const isEveryday = WEEKDAYS.every(d => op.hariOperasi.includes(d));
                    const showCustom = customDaysOps[op.id] ?? !isEveryday;

                    if (!showCustom) {
                      return (
                        <div className="flex items-center justify-between p-3 rounded-[1.25rem] bg-primary/5 dark:bg-primary/5 border border-primary/15">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-[#10B981]" />
                            <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                              Buka Setiap Hari (Senin - Minggu)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomDaysOps(prev => ({ ...prev, [op.id]: true }))}
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
                            Kustom ({op.hariOperasi.length} Hari Aktif)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomDaysOps(prev => ({ ...prev, [op.id]: false }));
                              setOperations(prevOps => prevOps.map(item => item.id === op.id ? { ...item, hariOperasi: [...WEEKDAYS] } : item));
                            }}
                            className="text-[9px] font-bold text-emerald-600 dark:text-primary hover:underline uppercase tracking-wider cursor-pointer"
                          >
                            Setiap Hari
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {WEEKDAYS.map((day) => {
                            const isActive = op.hariOperasi.includes(day);
                            const shortLabel = day.slice(0, 3);
                            return (
                              <button
                                type="button"
                                key={day}
                                onClick={() => handleToggleDay(op.id, day)}
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
                  })()}
                </div>

                {/* Time Settings */}
                <div className="grid grid-cols-2 gap-3.5 pt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">
                      Jam Buka
                    </label>
                    <input
                      type="time"
                      required
                      value={op.jamBuka}
                      onChange={(e) => handleChangeTime(op.id, "jamBuka", e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border/50 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold text-center text-zinc-900 dark:text-white outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">
                      Jam Tutup
                    </label>
                    <input
                      type="time"
                      required
                      value={op.jamTutup}
                      onChange={(e) => handleChangeTime(op.id, "jamTutup", e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border/50 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold text-center text-zinc-900 dark:text-white outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Actions Action Panel (SafeArea optimized) */}
      <div className="sticky bottom-0 z-10 p-4 bg-card/95 bg-card/95 backdrop-blur-md border-t border-border/50 dark:border-white/5 flex gap-3">
        <button
          type="button"
          onClick={handleAddOperation}
          className="flex-1 h-12 flex items-center justify-center gap-1.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-card/5 dark:hover:bg-card/10 text-zinc-800 dark:text-zinc-200 border border-border/50 dark:border-white/10 rounded-[1.25rem] text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-zinc-550 dark:text-zinc-400" strokeWidth={3} />
          Jadwal
        </button>
        <button
          type="submit"
          disabled={saving}
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
           />
        </div>
     </div>
  );
}

