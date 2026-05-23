import React, { useState } from "react";
import { motion } from "motion/react";
import { Search, Plus, ChevronDown, Edit2, Trash2, Layers, CheckCircle2, Clock } from "lucide-react";
import { cn } from "../../lib/utils";
import { toast } from "../../hooks/use-toast";
import { addMarket, updateMarket, removeMarket } from "../../lib/services";
import { toTitleCase } from "../../utils/format";
import { useOutletContext } from "react-router-dom";

export default function AdminMasterPage() {
  const { 
    markets, 
    handleDeleteMarket, 
    search, 
    setSearch, 
    filterWilayah, 
    setFilterWilayah, 
    filterKategori, 
    setFilterKategori, 
    filterPasaran, 
    setFilterPasaran, 
    filteredMarkets 
  } = useOutletContext<any>();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [marketToEdit, setMarketToEdit] = useState<any>(null);

  const handleOpenForm = (market: any = null) => {
    setMarketToEdit(market);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setMarketToEdit(null);
    setIsFormOpen(false);
  };

  if (isFormOpen) {
    return (
      <div className="w-full">
        <MarketFormContent 
          market={marketToEdit} 
          onClose={handleCloseForm} 
        />
      </div>
    );
  }

  return (
    <MasterDataView
      markets={filteredMarkets}
      onAdd={() => handleOpenForm()}
      onEdit={handleOpenForm}
      onDelete={handleDeleteMarket}
      search={search}
      setSearch={setSearch}
      filters={{
        wilayah: filterWilayah,
        setWilayah: setFilterWilayah,
        kategori: filterKategori,
        setKategori: setFilterKategori,
        pasaran: filterPasaran,
        setPasaran: setFilterPasaran,
      }}
    />
  );
}

export const WILAYAH_OPTIONS = [
    "Kota Yogyakarta", "Sleman", "Bantul", "Gunungkidul", "Kulon Progo", "Purworejo", "Magelang", "Temanggung"
];
  
export const PASARAN_OPTIONS = ["Legi", "Pahing", "Pon", "Wage", "Kliwon"];
  
export const KATEGORI_OPTIONS = [
    { id: "PASAR_UMUM", label: "Pasar Umum" },
    { id: "PASAR_SUBUH", label: "Pasar Pagi/Subuh" },
    { id: "PASARAN_JAWA", label: "Pasaran Jawa" },
];

export function MasterDataView({
  markets,
  onAdd,
  onEdit,
  onDelete,
  search,
  setSearch,
  filters,
}: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
    >
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(toTitleCase(e.target.value))}
            placeholder="Cari berdasarkan nama pasar atau wilayah..."
            className="w-full h-11 bg-white dark:bg-white/5 pl-11 pr-4 rounded-xl border border-zinc-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-brand-primary/20 dark:focus:ring-brand-primary/10 transition-all font-sans text-[13px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/20 shadow-sm"
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={onAdd}
            className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-widest shadow-md hover:translate-y-[-1px] hover:shadow-lg transition-all duration-200 active:scale-95 gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Pasar
          </button>
        </div>

        {/* Filters Hub */}
        <div className="grid grid-cols-3 gap-2">
          <div className="relative">
            <select
              value={filters.wilayah}
              onChange={(e) => filters.setWilayah(e.target.value)}
              className="w-full h-[38px] bg-white dark:bg-white/5 px-2.5 rounded-[10px] text-sm font-medium border border-zinc-100 dark:border-white/5 outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer transition-colors shadow-sm"
            >
              <option value="" className="bg-white dark:bg-black">WILAYAH</option>
              {WILAYAH_OPTIONS.map((w) => (
                <option key={w} value={w} className="bg-white dark:bg-black">
                  {w.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filters.kategori}
              onChange={(e) => filters.setKategori(e.target.value)}
              className="w-full h-[38px] bg-white dark:bg-white/5 px-2.5 rounded-[10px] text-sm font-medium border border-zinc-100 dark:border-white/5 outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer transition-colors shadow-sm"
            >
              <option value="" className="bg-white dark:bg-black">KATEGORI</option>
              {KATEGORI_OPTIONS.map((k) => (
                <option key={k.id} value={k.id} className="bg-white dark:bg-black">
                  {k.label.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filters.pasaran}
              onChange={(e) => filters.setPasaran(e.target.value)}
              className="w-full h-[38px] bg-white dark:bg-white/5 px-2.5 rounded-[10px] text-sm font-medium border border-zinc-100 dark:border-white/5 outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer transition-colors shadow-sm"
            >
              <option value="" className="bg-white dark:bg-black">PASARAN</option>
              {PASARAN_OPTIONS.map((p) => (
                <option key={p} value={p} className="bg-white dark:bg-black">
                  {p.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="bg-transparent md:bg-white md:dark:bg-white/[0.02] md:rounded-2xl md:overflow-hidden md:border md:border-zinc-100 md:dark:border-white/10 md:shadow-xl transition-colors">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-white/[0.05] text-sm  font-medium tracking-tight text-zinc-400 dark:text-white/60">
                <th className="px-6 py-4">Informasi Pasar</th>
                <th className="px-6 py-4">Wilayah</th>
                <th className="px-6 py-4">Kategori Detail</th>
                <th className="px-6 py-4">Operasional</th>
                <th className="px-6 py-4">Jadwal Buka</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {markets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-zinc-500 dark:text-white/40 text-sm font-medium tracking-tight">
                    Data Tidak Ditemukan
                  </td>
                </tr>
              ) : (
                markets.map((m: any) => (
                  <tr key={m.id} className="group hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-all">
                    <td className="px-6 py-4 font-medium text-sm tracking-tight text-zinc-900 dark:text-white">{toTitleCase(m.nama_pasar)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-zinc-500 dark:text-white/60">{toTitleCase(m.wilayah)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(m.kategori) ? m.kategori : [m.kategori]).map((id: any, idx: number) => (
                          <span key={typeof id === 'string' ? `${id}-${idx}` : `kat-${idx}`} className="px-2 py-0.5 rounded-md bg-brand-secondary/10 dark:bg-brand-secondary/20 text-brand-secondary/80 text-xs font-medium">
                            {KATEGORI_OPTIONS.find((o) => (typeof id === 'object' ? o.id === id.id : o.id === id))?.label.replace("Pasar ", "").toUpperCase() || String(typeof id === 'object' ? (id.id || id.label) : id).replace("PASAR_", "")}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {m.buka_harian ? (
                        <span className="text-sm text-emerald-600 dark:text-brand-primary font-medium tracking-tight border border-emerald-200 dark:border-brand-primary/20 px-2 py-0.5 rounded-md">HARIAN</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {m.pasaran?.map((p: string, pIdx: number) => (
                            <span key={`${p}-${pIdx}`} className="text-xs px-2 py-0.5 bg-amber-50 dark:bg-yellow-500/10 text-amber-600 dark:text-yellow-400 rounded-md border border-amber-200 dark:border-yellow-500/20 font-medium">{p}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {typeof m.jam_buka === "object" && m.jam_buka !== null
                          ? Object.entries(m.jam_buka).map(([cat, jam], jamIdx) => {
                              const label = String(KATEGORI_OPTIONS.find((o) => o.id === cat)?.label || cat);
                              const jamStr = typeof jam === "object" ? "" : String(jam);
                              return (
                                <div key={`${cat}-${jamIdx}`} className="flex items-center gap-2 text-sm">
                                  <span className="text-zinc-400 dark:text-brand-primary/60 font-medium">{label.replace("Pasar ", "").substring(0, 5).toUpperCase()}:</span>
                                  <span className="text-zinc-600 dark:text-white/60 font-mono">{jamStr}</span>
                                </div>
                              );
                            })
                          : <span className="text-zinc-600 dark:text-white/40 font-mono text-sm">{String(m.jam_buka || "")}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(m)} className="w-9 h-9 flex items-center justify-center bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 rounded-xl text-zinc-500 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white transition-all border border-zinc-200 dark:border-transparent shadow-sm"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(m.id, m.nama_pasar)} className="w-9 h-9 flex items-center justify-center bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/30 rounded-xl text-red-400 dark:text-red-500/60 hover:text-red-600 dark:hover:text-red-400 transition-all border border-red-100 dark:border-transparent shadow-sm"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden space-y-3 p-3">
          {markets.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 dark:text-white/40 text-xs font-medium tracking-tight">
              Data Tidak Ditemukan
            </div>
          ) : (
            markets.map((m: any) => (
              <div key={m.id} className="bg-white dark:bg-white/5 p-4 rounded-xl border border-zinc-200 dark:border-white/10 shadow-sm flex justify-between items-center group">
                <div>
                  <h3 className="font-medium text-[13px] text-zinc-900 dark:text-white">{toTitleCase(m.nama_pasar)}</h3>
                  <p className="text-xs text-zinc-500 dark:text-white/60">{toTitleCase(m.wilayah)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(m)} className="p-2 bg-zinc-100 dark:bg-white/10 rounded-lg text-zinc-500 dark:text-white/60"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onDelete(m.id, m.nama_pasar)} className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg text-red-400 dark:text-red-500/60"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function MarketFormContent({ market, onClose }: any) {
  const [formData, setFormData] = useState({
    nama_pasar: market?.nama_pasar || "",
    wilayah: market?.wilayah || "Kota Yogyakarta",
    buka_harian: market?.buka_harian ?? true,
    pasaran: market?.pasaran || [],
    jam_buka: (() => {
      if (typeof market?.jam_buka === "object" && market?.jam_buka !== null) {
        const sanitized = {} as any;
        Object.entries(market.jam_buka).forEach(([k, v]) => {
          if (k !== "[object Object]") sanitized[String(k)] = v;
        });
        return sanitized;
      }

      const kategoriArray = Array.isArray(market?.kategori)
        ? market.kategori.map((k: any) =>
            typeof k === "object" ? String(k.id || "PASAR_UMUM") : String(k),
          )
        : market?.kategori
          ? [
              typeof market.kategori === "object"
                ? String(market.kategori.id || "PASAR_UMUM")
                : String(market.kategori),
            ]
          : ["PASAR_UMUM"];

      const newJam = {} as any;
      kategoriArray.forEach((k: string) => {
        if (k && k !== "undefined" && k !== "[object Object]") {
          newJam[k] = typeof market?.jam_buka === "string" ? market.jam_buka : "";
        }
      });
      return newJam;
    })(),
    kategori: Array.isArray(market?.kategori)
      ? market.kategori
          .map((k: any) =>
            typeof k === "object" ? String(k.id || "PASAR_UMUM") : String(k),
          )
          .filter((k: string) => k !== "[object Object]" && k !== "undefined")
      : market?.kategori
        ? [
            typeof market.kategori === "object"
              ? String(market.kategori.id || "PASAR_UMUM")
              : String(market.kategori),
          ].filter((k) => k !== "[object Object]" && k !== "undefined")
        : ["PASAR_UMUM"],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePasaran = (p: string) => {
    const upperP = p.toUpperCase();
    if (formData.pasaran.includes(upperP)) {
      setFormData({
        ...formData,
        pasaran: formData.pasaran.filter((x: string) => x !== upperP),
      });
    } else {
      setFormData({ ...formData, pasaran: [...formData.pasaran, upperP] });
    }
  };

  const toggleKategori = (id: string) => {
    if (formData.kategori.includes(id)) {
      setFormData({
        ...formData,
        kategori: formData.kategori.filter((x: string) => x !== id),
      });
    } else {
      setFormData({ ...formData, kategori: [...formData.kategori, id] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_pasar) return toast.error("Nama Pasar wajib diisi");
    if (!formData.jam_buka) return toast.error("Jam Buka wajib diisi");
    if (!formData.buka_harian && formData.pasaran.length === 0)
      return toast.error("Pilih minimal satu hari pasaran");

    setIsSubmitting(true);
    try {
      if (market?.id) {
        await updateMarket(market.id, formData);
        toast.success("Pasar berhasil diperbarui");
      } else {
        await addMarket(formData);
        toast.success("Pasar berhasil ditambahkan");
      }
      onClose();
    } catch (e) {
      toast.error("Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col h-full bg-white dark:bg-black rounded-lg sm:rounded-2xl border border-border shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">
          {market?.id ? "Edit Pasar" : "Tambah Pasar"}
        </h2>
        <button 
          onClick={onClose} 
          type="button"
          className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 bg-muted rounded-md"
        >
          Kembali
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 relative h-full max-w-3xl mx-auto w-full">
          <div className="p-5 space-y-6 pb-6">
            <div className="space-y-2">
            <label className="text-sm text-zinc-400 dark:text-white/60 tracking-tight font-medium block pl-1">
              Nama Pasar Target
            </label>
            <input
              type="text"
              value={formData.nama_pasar}
              onChange={(e) => setFormData({ ...formData, nama_pasar: toTitleCase(e.target.value) })}
              placeholder="Masukan nama lengkap pasar..."
              className="w-full h-12 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl px-4 outline-none focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary transition-all text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-white/10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 dark:text-white/60 tracking-tight font-medium block pl-1">
                Wilayah Kabupaten
              </label>
              <div className="relative">
                <select
                  value={formData.wilayah}
                  onChange={(e) => setFormData({ ...formData, wilayah: e.target.value })}
                  className="w-full h-12 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl px-4 outline-none appearance-none cursor-pointer text-sm font-medium text-zinc-900 dark:text-white"
                >
                  {WILAYAH_OPTIONS.map((o) => (
                    <option key={o} value={o} className="bg-white dark:bg-black">{o}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 dark:text-white/60 tracking-tight font-medium block pl-1">
                Kategori Operasi
              </label>
              <div className="flex flex-wrap gap-2">
                {KATEGORI_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleKategori(o.id)}
                    className={cn(
                      "flex-1 min-w-[90px] h-10 rounded-xl border text-sm font-medium tracking-tight transition-all",
                      formData.kategori.includes(o.id)
                        ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/10"
                        : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-400 dark:text-white/40",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-sm text-zinc-400 dark:text-white/60 tracking-tight font-medium">
                Konfigurasi Jam Buka
              </label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, buka_harian: !formData.buka_harian })}
                className={cn(
                  "h-10 px-4 rounded-xl border flex items-center justify-center gap-2 font-medium text-sm tracking-tight transition-all ",
                  formData.buka_harian
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-zinc-50 dark:bg-white/10 border-zinc-200 dark:border-white/20 text-zinc-500 dark:text-white/60",
                )}
              >
                {formData.buka_harian ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                {formData.buka_harian ? "Setiap Hari" : "Pasaran"}
              </button>
            </div>

            <div className="space-y-3 bg-zinc-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-zinc-100 dark:border-white/10">
              {formData.kategori.map((cat, idx) => (
                <div key={`${cat}-${idx}`} className="space-y-1.5">
                  <div className="flex items-center gap-2 px-1">
                    <Layers className="w-3 h-3 text-brand-primary/60" />
                    <span className="text-sm text-zinc-500 dark:text-white/80 font-medium tracking-wider">
                      {KATEGORI_OPTIONS.find((o) => o.id === cat)?.label}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formData.jam_buka[cat] || ""}
                    onChange={(e) => setFormData({ ...formData, jam_buka: { ...formData.jam_buka, [cat]: e.target.value } })}
                    placeholder="Contoh: 02:00 - 10:00"
                    className="w-full h-11 bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-4 outline-none text-xs font-mono font-medium text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-white/10 focus:border-brand-primary/40"
                  />
                </div>
              ))}
            </div>
          </div>

          {!formData.buka_harian && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-2"
            >
              <label className="text-sm text-zinc-400 dark:text-white/60 tracking-tight font-medium block pl-1">
                Pilih Hari Pasaran
              </label>
              <div className="flex flex-wrap gap-2">
                {PASARAN_OPTIONS.map((p, pIdx) => (
                  <button
                    key={`${p}-${pIdx}`}
                    type="button"
                    onClick={() => togglePasaran(p)}
                    className={cn(
                      "flex-1 min-w-[80px] h-10 rounded-xl border text-sm font-medium tracking-tight transition-all",
                      formData.pasaran.includes(p.toUpperCase())
                        ? "bg-brand-secondary text-black border-brand-secondary shadow-lg shadow-brand-secondary/10"
                        : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-400 dark:text-white/40",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          </div>

          <div className="sticky bottom-0 p-5 mt-auto bg-card border-t border-border flex justify-center gap-3 z-20">
            <button
              type="button"
              onClick={onClose}
              className="w-full max-w-[140px] h-11 bg-muted rounded-xl font-black tracking-widest text-[10px] uppercase text-muted-foreground hover:bg-muted/80 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full max-w-[200px] h-11 bg-primary text-primary-foreground rounded-xl font-black tracking-widest text-[10px] uppercase shadow-lg transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 flex items-center justify-center"
            >
              {isSubmitting ? "Processing..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
  );
}
