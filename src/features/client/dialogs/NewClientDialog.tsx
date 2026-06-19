import React, { useState, useMemo } from 'react';
import { CollectionReference, addDoc, collection, serverTimestamp, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { handleFirestoreError, OperationType } from '../../../lib/services';
import { toast } from 'react-toastify';
import { ChevronRight, User, Package, ArrowLeft, ArrowRight, Check } from 'lucide-react';

const formatIDR = (val: string | number) => {
  const num = typeof val === 'string' ? Number(val.replace(/\D/g, '')) : val;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(num || 0);
};

export function NewClientContent({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [form, setForm] = useState({
    customerStatus: 'baru' as 'baru' | 'eks',
    tanggal: new Date().toISOString().split('T')[0],
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
    console.log("[NewClientDialog] handleGetLocation triggered");
    if (!navigator.geolocation) {
      console.warn("[NewClientDialog] Geolocation is not supported by this browser.");
      toast.error("Browser tidak mendukung geolocation");
      return;
    }

    setIsLocating(true);
    console.log("[NewClientDialog] Requesting geolocation...");

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log("[NewClientDialog] Geolocation success:", { latitude, longitude, accuracy });
        
        let formattedAddress = `Lat: ${latitude}, Lng: ${longitude}`;

        try {
          // Use OpenStreetMap Nominatim for Reverse Geocoding (No API Key Required)
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              formattedAddress = data.display_name;
            }
          }
        } catch (error) {
          console.error("Geocoding failed", error);
        }
        
        setForm(prev => {
          const updated = { 
            ...prev, 
            alamat: formattedAddress,
            latitude: latitude,
            longitude: longitude
          };
          console.log("[NewClientDialog] Updated form state:", updated);
          return updated;
        });
        
        toast.success("Lokasi berhasil diambil!");
        setIsLocating(false);
      },
      (error) => {
        console.error("[NewClientDialog] Geolocation error occurred:", error);
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

  const omset = useMemo(() => {
    const a = Number(form.angsuran.replace(/\D/g, '')) || 0;
    const t = Number(form.tenor) || 0;
    return a * t;
  }, [form.angsuran, form.tenor]);

  const handleNext = () => {
    if (!form.nama || !form.nomor || !form.alamat) {
      toast.error("Mohon lengkapi Data Diri (Nama, WA, Alamat)");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!form.barang || !form.angsuran || !form.tenor) {
      toast.error("Mohon lengkapi Detail Order");
      return;
    }

    setIsSubmitting(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Unauthorized: Anda harus login.");

      const userDoc = await getDoc(doc(db, "users", uid));
      const branchId = userDoc.exists() ? userDoc.data().branchId : null;

      const angsuranNum = Number(form.angsuran.replace(/\D/g, ''));
      const tenorNum = Number(form.tenor);

      const payload = {
        customerStatus: form.customerStatus,
        tanggal: Timestamp.fromDate(new Date(form.tanggal)),
        nama: form.nama,
        nomor: form.nomor,
        alamat: form.alamat,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        usaha: form.usaha || "",
        produk: form.barang,
        angsuran: angsuranNum,
        tenor: tenorNum,
        tenorType: form.tenorType,
        omset: angsuranNum * tenorNum,
        kategori: "baru",
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
      toast.success("Konsumen & Order Berhasil Disimpan");
      onClose();
    } catch (err) {
      console.error("Firestore error:", err);
      handleFirestoreError(err, OperationType.CREATE, "clients");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900 border border-border/50 translate-y-0 focus:-translate-y-0.5 focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none rounded-xl text-sm font-semibold text-text-primary placeholder:text-text-muted placeholder:font-medium shadow-sm";
  const labelClass = "block text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="flex flex-col relative w-full h-full min-h-[50vh] bg-transparent">
      {/* Step Indicator Header */}
      <div className="sticky top-0 z-20 px-6 py-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-text-muted'}`}>1</div>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${step >= 1 ? 'text-text-primary' : 'text-text-muted'}`}>Konsumen</span>
          <div className="flex-1 h-px bg-border/50 mx-2" />
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-text-muted'}`}>2</div>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${step >= 2 ? 'text-text-primary' : 'text-text-muted'}`}>Order</span>
        </div>
      </div>

      {/* Main Container Form Body */}
      <div className="p-6 pb-28">
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-5 items-end">
              <div>
                <label className={labelClass}>Status *</label>
                <div className="flex p-1 bg-zinc-200/50 dark:bg-zinc-900 rounded-xl border border-border/50 h-[40px] items-center">
                  {[ { id: 'baru', label: 'Baru' }, { id: 'eks', label: 'Eks' } ].map((status) => (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => setForm({ ...form, customerStatus: status.id as 'baru' | 'eks' })}
                      className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-all h-full ${
                        form.customerStatus === status.id
                          ? 'bg-white dark:bg-zinc-800 text-text-primary shadow-sm'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Tanggal *</label>
                <input 
                  type="date"
                  value={form.tanggal}
                  onChange={e => setForm({...form, tanggal: e.target.value})}
                  className={`${inputClass} !h-[40px]`}
                />
              </div>
            </div>
            <div>
              <input 
                type="text" 
                autoFocus
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
                onChange={e => setForm({...form, alamat: e.target.value.replace(/\b\w/g, c => c.toUpperCase()), latitude: null, longitude: null})} 
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
        )}

        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-2">
              <h2 className="text-xl font-black text-text-primary tracking-tight">Detail Order</h2>
            </div>
            <div>
              <input 
                type="text" 
                autoFocus
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
                  inputMode="numeric"
                  placeholder="Angsuran (Rp) *" 
                  value={form.angsuran ? formatIDR(Number(form.angsuran)) : ''} 
                  onChange={e => setForm({...form, angsuran: e.target.value.replace(/\D/g, '')})} 
                  className={inputClass} 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tipe Tenor</label>
                  <div className="flex p-1 bg-zinc-200/50 dark:bg-zinc-900 rounded-xl border border-border/50">
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
        )}
      </div>

      {/* Floating Footers */}
      <div className="sticky bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-border/40 p-4 shrink-0 flex items-center justify-between gap-3 z-30 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        {step === 1 ? (
          <button 
            type="button"
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all"
          >
            Simpan
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <>
            <button 
              type="button"
              onClick={() => setStep(1)}
              className="h-14 px-6 bg-secondary/50 hover:bg-secondary text-text-primary rounded-xl font-bold transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button 
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Submit Order Baru'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}


