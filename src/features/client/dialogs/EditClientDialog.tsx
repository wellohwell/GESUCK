import React, { useState, useEffect, useMemo } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { handleFirestoreError, OperationType } from '../../../lib/services';
import { toast } from 'react-toastify';

const formatIDR = (val: string | number) => {
  const num = typeof val === 'string' ? Number(val.replace(/\D/g, '')) : val;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(num || 0);
};

export function EditClientContent({ onClose, client }: { onClose: () => void; client: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    nama: '',
    nomor: '',
    usaha: '',
    alamat: '',
    barang: '',
    angsuran: '',
    tenor: '30',
    tenorType: 'hari'
  });

  useEffect(() => {
    if (client) {
      setForm({
        nama: client.nama || '',
        nomor: client.nomor || '',
        usaha: client.usaha || '',
        alamat: client.alamat || '',
        barang: client.produk || '',
        angsuran: client.angsuran ? String(client.angsuran) : '',
        tenor: client.tenor ? String(client.tenor) : '30',
        tenorType: client.tenorType || 'hari'
      });
    }
  }, [client]);

  const omset = useMemo(() => {
    const a = Number(form.angsuran.replace(/\D/g, '')) || 0;
    const t = Number(form.tenor) || 0;
    return a * t;
  }, [form.angsuran, form.tenor]);

  const handleUpdate = async () => {
    if (!form.nama || !form.nomor || !form.alamat || !form.barang || !form.angsuran || !form.tenor) {
      toast.error("Mohon lengkapi semua field wajib (*)");
      return;
    }

    setIsSubmitting(true);
    try {
      const angsuranNum = Number(form.angsuran.replace(/\D/g, ''));
      const tenorNum = Number(form.tenor);

      const updates = {
        nama: form.nama,
        nomor: form.nomor,
        usaha: form.usaha || '',
        alamat: form.alamat,
        produk: form.barang,
        angsuran: angsuranNum,
        tenor: tenorNum,
        tenorType: form.tenorType,
        omset: angsuranNum * tenorNum,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, "clients", client.id), updates);
      toast.success("Data Konsumen Berhasil Diperbarui");
      onClose();
    } catch (err) {
      console.error("Firestore update error:", err);
      handleFirestoreError(err, OperationType.UPDATE, "clients");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900 border border-border/50 translate-y-0 focus:-translate-y-0.5 focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none rounded-2xl text-sm font-semibold text-text-primary placeholder:text-text-muted placeholder:font-medium shadow-sm";
  const labelClass = "block text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="flex flex-col relative w-full h-full min-h-[50vh] bg-white dark:bg-zinc-950">
      {/* Main Container Form Body */}
      <div className="p-6 pb-28">
        <div className="space-y-6">
          <div className="space-y-5">
            <div>
              <h3 className="text-[10px] font-black tracking-widest text-text-muted uppercase mb-3">Data Diri</h3>
            </div>
            <div>
              <label className={labelClass}>Nama Lengkap *</label>
              <input 
                type="text" 
                placeholder="Misal: Budi Santoso" 
                value={form.nama} 
                onChange={e => setForm({...form, nama: e.target.value.replace(/\b\w/g, c => c.toUpperCase())})} 
                className={inputClass} 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>No. WhatsApp *</label>
                <input 
                  type="tel" 
                  placeholder="Misal: 081234..." 
                  value={form.nomor} 
                  onChange={e => setForm({...form, nomor: e.target.value})} 
                  className={inputClass} 
                />
              </div>
              <div>
                <label className={labelClass}>Nama Usaha (Opsional)</label>
                <input 
                  type="text" 
                  placeholder="Misal: Warung Sembako Barokah" 
                  value={form.usaha} 
                  onChange={e => setForm({...form, usaha: e.target.value.replace(/\b\w/g, c => c.toUpperCase())})} 
                  className={inputClass} 
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Alamat Lengkap *</label>
              <textarea 
                placeholder="Alamat detail untuk pengiriman..." 
                value={form.alamat} 
                onChange={e => setForm({...form, alamat: e.target.value.replace(/\b\w/g, c => c.toUpperCase())})} 
                className={`${inputClass} min-h-[100px] resize-none h-auto`} 
              />
            </div>
          </div>
          
          <div className="space-y-5 pt-6 border-t border-border/40">
            <div>
              <h3 className="text-[10px] font-black tracking-widest text-text-muted uppercase mb-3">Detail Order</h3>
            </div>
            <div>
              <label className={labelClass}>Nama Produk *</label>
              <input 
                type="text" 
                placeholder="Misal: Kulkas 2 Pintu..." 
                value={form.barang} 
                onChange={e => setForm({...form, barang: e.target.value.replace(/\b\w/g, c => c.toUpperCase())})} 
                className={inputClass} 
              />
            </div>
            
            <div className="p-4 rounded-3xl border border-border/40 bg-card space-y-4">
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
                  <div className="flex p-1 bg-background rounded-2xl border border-border/50">
                    {[ { id: 'hari', label: 'Harian' }, { id: 'bulan', label: 'Bulanan' } ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setForm({ ...form, tenorType: type.id, tenor: type.id === 'hari' ? '30' : '1' })}
                        className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-xs font-bold transition-all ${
                          form.tenorType === type.id
                            ? 'bg-card text-text-primary shadow-sm'
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
                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                   <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Estimasi Omset</p>
                   <p className="text-lg font-black text-primary">{formatIDR(omset)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-border/40 p-4 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-30">
         <button 
            type="button"
            disabled={isSubmitting}
            onClick={handleUpdate}
            className="w-full flex items-center justify-center gap-2 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-bold text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
          </button>
      </div>
    </div>
  );
}

