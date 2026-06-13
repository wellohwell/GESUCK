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
  const [isLocating, setIsLocating] = useState(false);
  const [form, setForm] = useState({
    nama: '',
    nomor: '',
    usaha: '',
    alamat: '',
    latitude: null as number | null,
    longitude: null as number | null,
    barang: '',
    angsuran: '',
    tenor: '30',
    tenorType: 'hari'
  });

  const handleGetLocation = () => {
    console.log("[EditClientDialog] handleGetLocation triggered");
    if (!navigator.geolocation) {
      console.warn("[EditClientDialog] Geolocation is not supported by this browser.");
      toast.error("Browser tidak mendukung geolocation");
      return;
    }

    setIsLocating(true);
    console.log("[EditClientDialog] Requesting geolocation...");

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log("[EditClientDialog] Geolocation success:", { latitude, longitude, accuracy });
        
        const formattedAddress = `📍 Lokasi Terkini\n\nLat: ${latitude}\nLng: ${longitude}\n\nhttps://maps.google.com/?q=${latitude},${longitude}`;
        
        setForm(prev => {
          const updated = { 
            ...prev, 
            alamat: formattedAddress,
            latitude: latitude,
            longitude: longitude
          };
          console.log("[EditClientDialog] Updated form state:", updated);
          return updated;
        });
        
        toast.success("Lokasi berhasil diambil!");
        setIsLocating(false);
      },
      (error) => {
        console.error("[EditClientDialog] Geolocation error occurred:", error);
        let errorMessage = "Gagal mendapatkan lokasi perangkat";
        
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Izin lokasi ditolak, silakan aktifkan izin lokasi di browser/perangkat Anda.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Sinyal GPS tidak aktif atau lokasi tidak tersedia.";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Waktu permintaan lokasi habis (timeout). Silakan coba lagi.";
        }
        
        toast.error(errorMessage);
        setIsLocating(false);
      },
      options
    );
  };

  useEffect(() => {
    if (client) {
      setForm({
        nama: client.nama || '',
        nomor: client.nomor || '',
        usaha: client.usaha || '',
        alamat: client.alamat || '',
        latitude: client.latitude || null,
        longitude: client.longitude || null,
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
        latitude: form.latitude || null,
        longitude: form.longitude || null,
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

  const inputClass = "w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900 border border-border/50 translate-y-0 focus:-translate-y-0.5 focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none rounded-xl text-sm font-semibold text-text-primary placeholder:text-text-muted placeholder:font-medium shadow-sm";
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
              <input 
                type="text" 
                placeholder="Nama Lengkap *" 
                value={form.nama} 
                onChange={e => setForm({...form, nama: e.target.value.replace(/\b\w/g, c => c.toUpperCase())})} 
                className={inputClass} 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <input 
                  type="tel" 
                  placeholder="No. WhatsApp *" 
                  value={form.nomor} 
                  onChange={e => setForm({...form, nomor: e.target.value})} 
                  className={inputClass} 
                />
              </div>
              <div>
                <input 
                  type="text" 
                  placeholder="Nama Usaha (Opsional)" 
                  value={form.usaha} 
                  onChange={e => setForm({...form, usaha: e.target.value.replace(/\b\w/g, c => c.toUpperCase())})} 
                  className={inputClass} 
                />
              </div>
            </div>
            <div className="relative">
              <textarea 
                placeholder="Alamat Lengkap *" 
                value={form.alamat} 
                onChange={e => setForm({...form, alamat: e.target.value.replace(/\b\w/g, c => c.toUpperCase())})} 
                className={`${inputClass} min-h-[120px] pr-14 resize-none h-auto`} 
              />
              <button
                type="button"
                disabled={isLocating}
                onClick={handleGetLocation}
                className="absolute top-3 right-3 w-11 h-11 rounded-xl bg-white/20 dark:bg-zinc-800/40 backdrop-blur-md border border-white/30 dark:border-zinc-700/50 flex items-center justify-center shadow-lg hover:bg-white/30 dark:hover:bg-zinc-800/60 active:scale-95 transition-all text-xl z-10 disabled:opacity-50"
                title="Ambil Lokasi Terkini"
              >
                {isLocating ? (
                  <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin block" />
                ) : (
                  <span>📍</span>
                )}
              </button>
            </div>
          </div>
          
          <div className="space-y-5 pt-6 border-t border-border/40">
            <div>
              <h3 className="text-[10px] font-black tracking-widest text-text-muted uppercase mb-3">Detail Order</h3>
            </div>
            <div>
              <input 
                type="text" 
                placeholder="Nama Produk *" 
                value={form.barang} 
                onChange={e => setForm({...form, barang: e.target.value.replace(/\b\w/g, c => c.toUpperCase())})} 
                className={inputClass} 
              />
            </div>
            
            <div className="space-y-5">
              <div>
                <input 
                  type="text" 
                  placeholder="Angsuran (Rp) *" 
                  value={form.angsuran ? formatIDR(Number(form.angsuran)) : ''} 
                  onChange={e => setForm({...form, angsuran: e.target.value.replace(/\D/g, '')})} 
                  className={inputClass} 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tipe Tenor</label>
                  <div className="flex p-1 bg-background rounded-xl border border-border/50">
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
      <div className="sticky bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-border/40 p-4 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-30">
         <button 
            type="button"
            disabled={isSubmitting}
            onClick={handleUpdate}
            className="w-full flex items-center justify-center gap-2 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
          </button>
      </div>
    </div>
  );
}

