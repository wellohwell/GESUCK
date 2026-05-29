import React, { useState, useMemo } from 'react';
import { CollectionReference, addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { handleFirestoreError, OperationType } from '../../../lib/services';
import { toast } from 'react-toastify';
import { Search, UserCheck, ArrowRight, Package } from 'lucide-react';
import { useClientData } from '../hooks/useClientData';

const formatIDR = (val: string | number) => {
  const num = typeof val === 'string' ? Number(val.replace(/\D/g, '')) : val;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(num || 0);
};

export function RepeatOrderContent({ onClose }: { onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const { allClients } = useClientData();

  const [form, setForm] = useState({
    barang: '',
    angsuran: '',
    tenor: '30',
    tenorType: 'hari'
  });

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery) return [];
    return allClients.filter(c => 
      c.nama?.toLowerCase().includes(clientSearchQuery.toLowerCase()) || 
      c.nomor?.includes(clientSearchQuery) ||
      c.alamat?.toLowerCase().includes(clientSearchQuery.toLowerCase())
    ).slice(0, 8);
  }, [allClients, clientSearchQuery]);

  const omset = useMemo(() => {
    const a = Number(form.angsuran.replace(/\D/g, '')) || 0;
    const t = Number(form.tenor) || 0;
    return a * t;
  }, [form.angsuran, form.tenor]);

  const handleSubmit = async () => {
    if (!selectedClient) {
      toast.error("Konsumen belum dipilih");
      return;
    }
    if (!form.barang || !form.angsuran || !form.tenor) {
      toast.error("Mohon lengkapi Detail Order");
      return;
    }

    setIsSubmitting(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Unauthorized");

      const userDoc = await getDoc(doc(db, "users", uid));
      const branchId = userDoc.exists() ? userDoc.data().branchId : null;

      const angsuranNum = Number(form.angsuran.replace(/\D/g, ''));
      const tenorNum = Number(form.tenor);

      const payload = {
        nama: selectedClient.nama,
        nomor: selectedClient.nomor,
        alamat: selectedClient.alamat || "",
        usaha: selectedClient.usaha || "",
        produk: form.barang,
        angsuran: angsuranNum,
        tenor: tenorNum,
        tenorType: form.tenorType,
        omset: angsuranNum * tenorNum,
        kategori: "repeat",
        orderStatus: "submitted",
        currentStep: "survey",
        stage: "pipeline",
        survey: { status: "submitted", note: "", updatedAt: serverTimestamp(), updatedBy: auth.currentUser?.email || uid },
        warehouse: { status: "pending", updatedAt: serverTimestamp(), updatedBy: "" },
        archiveReason: "",
        ownerId: uid,
        branchId: branchId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "survey"
      };

      await addDoc(collection(db, "clients") as CollectionReference, payload);
      toast.success("Repeat Order Berhasil Disimpan");
      onClose();
    } catch (err) {
      console.error("Firestore error (RO):", err);
      handleFirestoreError(err, OperationType.CREATE, "clients");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900 border border-border/50 translate-y-0 focus:-translate-y-0.5 focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none rounded-2xl text-sm font-semibold text-text-primary placeholder:text-text-muted placeholder:font-medium shadow-sm";
  const labelClass = "block text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1";

  if (!selectedClient) {
    return (
      <div className="flex flex-col relative w-full h-full min-h-[50vh] bg-white dark:bg-zinc-950">
        <div className="sticky top-0 z-20 px-6 py-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-border/40 shrink-0 space-y-4">
          <div>
            <h2 className="text-xl font-black text-text-primary tracking-tight mb-1">Cari Konsumen</h2>
            <p className="text-xs text-text-muted">Pilih konsumen yang sudah ada dari database.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input 
              type="text" 
              autoFocus
              placeholder="Cari nama, nomor WhatsApp, alamat..."
              value={clientSearchQuery}
              onChange={e => setClientSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl text-sm font-semibold text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="p-6">
          {clientSearchQuery ? (
            filteredClients.length > 0 ? (
              <div className="space-y-3">
                {filteredClients.map(client => (
                  <button 
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-border/50 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all group text-left"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors">{client.nama}</h4>
                      <p className="text-[11px] text-text-muted font-medium mt-1 pr-4">{client.alamat}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary/50 group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center shrink-0 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm font-bold text-text-primary mb-1">Tidak ditemukan</p>
                <p className="text-xs text-text-muted">Konsumen dengan kata kunci tersebut tidak ada.</p>
              </div>
            )
          ) : (
            <div className="text-center py-12 opacity-50 flex flex-col items-center">
              <Search className="w-12 h-12 text-text-muted mb-4" />
              <p className="text-sm font-bold text-text-primary mb-1">Ketik untuk mencari</p>
              <p className="text-xs text-text-muted">Sistem akan mencari di seluruh riwayat konsumen.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col relative w-full h-full min-h-[50vh] bg-white dark:bg-zinc-950">
      <div className="sticky top-0 z-20 px-6 py-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-border/40 shrink-0">
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary tracking-widest mb-0.5">TERPILIH</p>
            <h3 className="text-sm font-black text-text-primary truncate">{selectedClient.nama}</h3>
          </div>
          <button onClick={() => setSelectedClient(null)} className="text-[10px] font-bold text-text-muted hover:text-text-primary underline px-2 py-1">Ubah</button>
        </div>
      </div>

      <div className="p-6 pb-28">
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-4">
             <h2 className="text-xl font-black text-text-primary tracking-tight">Detail Order Baru</h2>
             <p className="text-xs text-text-muted mt-1">Order tambahan (RO) untuk {selectedClient.nama}.</p>
          </div>
          
          <div>
            <label className={labelClass}>Nama Produk *</label>
            <input 
              type="text" 
              autoFocus
              placeholder="Misal: Kulkas 2 Pintu..." 
              value={form.barang} 
              onChange={e => setForm({...form, barang: e.target.value.replace(/\b\w/g, c => c.toUpperCase())})} 
              className={inputClass} 
            />
          </div>
          
          <div className="p-4 rounded-3xl border border-primary/20 bg-primary/5 space-y-4">
            <div>
              <label className={labelClass}>Angsuran (Rp) *</label>
              <input 
                type="text" 
                placeholder="Rp 0" 
                value={form.angsuran ? formatIDR(Number(form.angsuran)) : ''} 
                onChange={e => setForm({...form, angsuran: e.target.value.replace(/\D/g, '')})} 
                className={inputClass} 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Tipe Tenor</label>
                <div className="flex p-1 bg-zinc-200/50 dark:bg-zinc-900 rounded-2xl border border-border/50">
                  {[ { id: 'hari', label: 'Harian' }, { id: 'bulan', label: 'Bulanan' } ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setForm({ ...form, tenorType: type.id, tenor: type.id === 'hari' ? '30' : '1' })}
                      className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-xs font-bold transition-all ${
                        form.tenorType === type.id
                          ? 'bg-white dark:bg-zinc-800 text-text-primary shadow-sm'
                          : 'text-text-muted'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Lama Tenor</label>
                <select 
                  value={form.tenor} 
                  onChange={e => setForm({...form, tenor: e.target.value})} 
                  className={inputClass} 
                >
                  <option value="" disabled>Pilih</option>
                  {form.tenorType === 'hari' ? (
                    ['30', '60', '90', '120', '150', '180'].map(v => <option key={v} value={v}>{v} Hari</option>)
                  ) : (
                    ['1', '2', '3', '4', '5', '6', '7', '12'].map(v => <option key={v} value={v}>{v} Bulan</option>)
                  )}
                </select>
              </div>
            </div>
            
            {omset > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-primary/20">
                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Estimasi Omset</p>
                 <p className="text-lg font-black text-primary">{formatIDR(omset)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-border/40 p-4 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-30">
         <button 
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-bold text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            <Package className="w-4 h-4" />
            {isSubmitting ? 'Menyimpan...' : 'Submit Repeat Order'}
          </button>
      </div>
    </div>
  );
}

