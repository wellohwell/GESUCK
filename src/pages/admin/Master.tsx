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

// Models
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
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminMasterPage() {
  const { activeBranchContext } = useRuntime();
  const { profile } = useAuth();
  
  const [data, setData] = useState<MarketMaster[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  
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
        return {
          id: d.id,
          name: docData.name || docData.nama_pasar || "Unnamed Market",
          city: docData.city || docData.wilayah || "-",
          district: docData.district || "-",
          type: docData.type || docData.kategori || "Umum",
          active: docData.active ?? true,
          hari_operasi: docData.hari_operasi || [],
          jam_operasional: docData.jam_operasional || { buka: "06:00", tutup: "17:00" },
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
    const modalId = openModal({
      title: item ? "Edit Data Master" : "Form Tambah Pasar",
      size: 'md',
      content: (
        <MarketEditorForm 
           initialData={item || null} 
           onClose={() => closeModal(modalId)} 
           branchId={activeBranchContext!} 
           profile={profile}
        />
      ),
    });
  };

  return (
    <div className="w-full flex-1 flex flex-col pt-2 pb-24">
      {/* Sticky Action Bar */}
      <div className="sticky top-4 z-30 mx-4 md:mx-0 flex flex-col md:flex-row gap-2 md:gap-4 p-3 md:p-4 bg-white/95 dark:bg-black/95 backdrop-blur-md border border-zinc-200 dark:border-white/10 rounded-2xl md:rounded-3xl shadow-sm md:items-center justify-between mb-6">
        <div className="flex-1 flex items-center gap-2 relative">
          <Search className="absolute left-3 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari master pasar..."
            className="w-full h-10 md:h-11 bg-zinc-50 dark:bg-white/5 border-transparent focus:border-zinc-300 dark:focus:border-white/20 rounded-xl pl-9 pr-4 text-sm font-medium outline-none text-zinc-900 dark:text-white transition-all"
          />
        </div>
         <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          <button 
            onClick={handleExport}
            className="h-10 md:h-11 flex items-center gap-2 px-4 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs md:text-sm font-bold text-zinc-700 dark:text-zinc-300 transition-colors flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Eksport</span>
          </button>
          
          <div className="relative flex-shrink-0">
             <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
             <button className="h-10 md:h-11 flex items-center gap-2 px-4 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs md:text-sm font-bold text-zinc-700 dark:text-zinc-300 transition-colors pointer-events-none">
              <Upload className="w-4 h-4" />
              <span className="hidden md:inline">Import</span>
             </button>
          </div>

          <button 
            onClick={() => openEditor()}
            className="h-10 md:h-11 flex items-center gap-2 px-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all shadow-sm flex-shrink-0"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden md:inline">Baru</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 md:px-0">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-zinc-100 dark:bg-white/5 animate-pulse rounded-2xl w-full" />
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                <SearchX className="w-8 h-8 text-zinc-400" />
             </div>
             <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Data Master Kosong</h3>
             <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">Tidak ditemukan data pasar pada cabang terpilih.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
             {filteredData.map(item => (
                <div 
                  key={item.id} 
                  className={cn(
                    "group relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 transition-all hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-500"
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                     <div className="space-y-1 pr-8">
                       <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
                         {item.name}
                       </h3>
                       <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                          <MapPin className="w-3 h-3 text-zinc-400" />
                          <span>{item.city} {item.district ? `• ${item.district}` : ''}</span>
                       </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mb-3 bg-zinc-50 dark:bg-black/20 p-2 rounded-lg">
                    <Clock className="w-3 h-3" />
                    <span>{item.jam_operasional.buka} - {item.jam_operasional.tutup} • {item.hari_operasi.length} Hari</span>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-100 dark:border-white/5">
                     <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                       {item.type}
                     </span>
                     <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditor(item)} className="p-1.5 text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-400 bg-zinc-50 hover:bg-blue-50 dark:bg-white/5 dark:hover:bg-blue-500/10 rounded-md transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 bg-zinc-50 hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-500/10 rounded-md transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                     </div>
                  </div>
                </div>
             ))}
          </div>
        )}
      </div>

      {/* Editor Modal / Bottom Sheet */}
    </div>
  );
}

// Inner Component for Editor Form 
function MarketEditorForm({ initialData, onClose, branchId, profile }: { initialData: MarketMaster | null, onClose: () => void, branchId: string, profile: any }) {
  const [formData, setFormData] = useState({
     name: initialData?.name || "",
     city: initialData?.city || "",
     district: initialData?.district || "",
     kategori: initialData?.kategori || ["PASAR_UMUM"],
     hari_operasi: initialData?.hari_operasi || ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"],
     jam_operasional: initialData?.jam_operasional || { buka: "06:00", tutup: "17:00" },
     active: initialData?.active ?? true
  });
  const [saving, setSaving] = useState(false);

  const applyTemplate = (category: string) => {
     if (!window.confirm("Gunakan jadwal default kategori ini? Jadwal saat ini akan tertimpa.")) return;
     if (category === "PASAR_PAGI") {
       setFormData(prev => ({ ...prev, kategori: [category], hari_operasi: ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"], jam_operasional: { buka: "04:00", tutup: "11:00" } }));
     } else if (category === "PASAR_JAWA") {
       setFormData(prev => ({ ...prev, kategori: [category], hari_operasi: ["LEGI"], jam_operasional: { buka: "05:00", tutup: "12:00" } }));
     } else {
       setFormData(prev => ({ ...prev, kategori: [category], hari_operasi: ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"], jam_operasional: { buka: "06:00", tutup: "17:00" } }));
     }
  }

  const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!formData.name.trim()) return toast.error("Nama wajib diisi");
     setSaving(true);
     try {
       const finalSanitized = {
         ...formData,
         name: toTitleCase(formData.name),
         updatedAt: new Date().toISOString()
       };

       if (initialData?.id) {
         await setDoc(doc(db, `branches/${branchId}/master_markets`, initialData.id), finalSanitized, { merge: true });
         toast.success("Perubahan disimpan");
       } else {
         const newRef = doc(collection(db, `branches/${branchId}/master_markets`));
         await setDoc(newRef, {
           ...finalSanitized,
           createdAt: new Date().toISOString(),
           createdBy: profile?.email || "System/Admin User"
         });
         toast.success("Master data ditambahkan");
       }
       onClose();
     } catch (err: any) {
       toast.error("Gagal menyimpan: " + err.message);
     } finally {
       setSaving(false);
     }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
       <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest pl-1">Nama Pasar</label>
          <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors" placeholder="Contoh: Pasar Beringharjo" />
       </div>

       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest pl-1">Wilayah</label>
            <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors" placeholder="Contoh: Kota Yogyakarta" />
         </div>
         <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest pl-1">Jenis Pasar</label>
            <div className="flex flex-wrap gap-2">
              {["PASAR_UMUM", "PASAR_PAGI", "PASAR_JAWA"].map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => {
                    const newKat = formData.kategori.includes(cat)
                      ? formData.kategori.filter((c) => c !== cat)
                      : [...formData.kategori, cat];
                    setFormData({ ...formData, kategori: newKat });
                    if (!formData.kategori.includes(cat)) applyTemplate(cat);
                  }}
                  className={cn(
                    "px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                    formData.kategori.includes(cat)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-transparent"
                  )}
                >
                  {cat.replace("_", " ")}
                </button>
              ))}
            </div>
         </div>
       </div>

       <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest pl-1">Hari Operasi</label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                const ALL_DAYS = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];
                const isEveryDay = ALL_DAYS.every(d => formData.hari_operasi.includes(d));
                if (isEveryDay) {
                  setFormData(prev => ({ ...prev, hari_operasi: [] }));
                } else {
                  setFormData(prev => ({ ...prev, hari_operasi: ALL_DAYS }));
                }
              }}
              className={cn(
                "w-full h-12 flex items-center justify-between px-4 rounded-xl border text-sm font-medium transition-all",
                ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"].every(d => formData.hari_operasi.includes(d))
                  ? "bg-blue-600/10 border-blue-500 text-blue-700 dark:text-blue-300"
                  : "bg-zinc-100 dark:bg-zinc-800 border-transparent text-zinc-600 dark:text-zinc-400"
              )}
            >
              <span>Buka Setiap Hari 🕐</span>
              {["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"].every(d => formData.hari_operasi.includes(d)) && <CheckCircle2 className="w-4 h-4" />}
            </button>

            {!["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"].every(d => formData.hari_operasi.includes(d)) && (
              <>
                {formData.hari_operasi.map((day, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select
                      value={day}
                      onChange={(e) => {
                        const newHari = [...formData.hari_operasi];
                        newHari[idx] = e.target.value;
                        setFormData({ ...formData, hari_operasi: newHari });
                      }}
                      className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm font-medium text-zinc-900 dark:text-white"
                    >
                      <option value="">Pilih Hari...</option>
                      {["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU", "LEGI", "PAHING", "PON", "WAGE", "KLIWON"].map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, hari_operasi: formData.hari_operasi.filter((_, i) => i !== idx) })}
                      className="px-3 rounded-xl bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                    >
                      x
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setFormData({ ...formData, hari_operasi: [...formData.hari_operasi, "SENIN"] })} className="w-full py-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 text-sm font-medium hover:bg-zinc-50 transition-colors">
                  + Tambah Hari
                </button>
              </>
            )}
          </div>
        </div>

       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-1.5">
           <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest pl-1">Jam Buka</label>
           <input type="time" value={formData.jam_operasional.buka} onChange={(e) => setFormData(prev=>({...prev, jam_operasional: {...prev.jam_operasional, buka: e.target.value}}))} className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-900 dark:text-white outline-none" />
         </div>
         <div className="space-y-1.5">
           <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest pl-1">Jam Tutup</label>
           <input type="time" value={formData.jam_operasional.tutup} onChange={(e) => setFormData(prev=>({...prev, jam_operasional: {...prev.jam_operasional, tutup: e.target.value}}))} className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-900 dark:text-white outline-none" />
         </div>
       </div>

       <div className="pt-6">
          <button type="submit" disabled={saving} className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black uppercase tracking-widest disabled:opacity-50 transition-all active:scale-[0.98] shadow-md shadow-blue-500/20">
             {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> MENYIMPAN...</> : "SIMPAN DATA MASTER"}
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
    <div className="p-4 border border-zinc-200 dark:border-white/10 rounded-2xl bg-white dark:bg-white/5 opacity-50">
       <p className="text-zinc-500 text-sm font-medium text-center">Tampilan legacy Data Master telah dipindahkan. Mohon gunakan panel admin utama.</p>
    </div>
  );
}

export function MarketFormContent({ market, onClose }: any) {
  // Map generic to new form directly bypassing context for now or just return a warning placeholder if needed
  // Since AdminLayout still hooks to it via a manual open, we'll render the modern MarketEditorForm here!
  // It requires branchId, profile, which are missing here.
  // We'll wrap it!
  const { activeBranchContext } = useRuntime();
  const { profile } = useAuth();
  
  if (!activeBranchContext) return <div className="p-10 text-center">Branch context missing</div>;
  
  return (
     <div className="w-full flex-1 flex flex-col h-full bg-white dark:bg-black rounded-lg border border-border shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Edit Pasar (Legacy Form Mount)</h2>
          <button onClick={onClose} className="text-[10px] font-black uppercase text-muted-foreground">Kembali</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
           {/* Auto-map legacy item to new interface */}
           <MarketEditorForm 
             initialData={market ? {
               id: market.id,
               name: market.name || market.nama_pasar || "",
               city: market.city || market.wilayah || "",
               district: market.district || "",
               type: market.type || market.kategori || "Umum",
               active: market.active ?? true
             } : null} 
             onClose={onClose} 
             branchId={activeBranchContext} 
             profile={profile} 
           />
        </div>
     </div>
  );
}

