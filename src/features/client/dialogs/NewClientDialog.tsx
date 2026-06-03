import React, { useState, useMemo } from 'react';
import { CollectionReference, addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
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
        nama: form.nama,
        nomor: form.nomor,
        alamat: form.alamat,
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

  const inputClass = "w-full h-9 px-3 bg-zinc-50 dark:bg-zinc-900 border border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all outline-none rounded-md text-[11px] font-semibold text-text-primary placeholder:text-text-muted/75 placeholder:font-medium shadow-sm";
  const labelClass = "block text-[9px] font-extrabold text-text-muted uppercase tracking-wider mb-1 ml-0.5";

  return (
    <div className="flex flex-col relative w-full h-full min-h-[50vh] bg-white dark:bg-zinc-900">
      {/* Step Indicator Header */}
      <div className="sticky top-0 z-20 px-4 py-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-border/40 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-text-muted'}`}>1</div>
          <span className={`text-[9px] font-extrabold uppercase tracking-widest ${step >= 1 ? 'text-text-primary' : 'text-text-muted'}`}>Konsumen</span>
          <div className="flex-1 h-px bg-border/50 mx-1.5" />
          <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-text-muted'}`}>2</div>
          <span className={`text-[9px] font-extrabold uppercase tracking-widest ${step >= 2 ? 'text-text-primary' : 'text-text-muted'}`}>Order</span>
        </div>
      </div>

      {/* Main Container Form Body */}
      <div className="p-4 pb-20">
        {step === 1 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-1">
              <h2 className="text-[12px] font-black text-text-primary tracking-wider uppercase">Data Konsumen Baru</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <div>
              <textarea 
                placeholder="Alamat Lengkap *" 
                value={form.alamat} 
                onChange={e => setForm({...form, alamat: e.target.value.replace(/\b\w/g, c => c.toUpperCase())})} 
                className={`${inputClass} min-h-[60px] py-1.5 resize-none h-auto`} 
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-1">
              <h2 className="text-[12px] font-black text-text-primary tracking-wider uppercase">Detail Order</h2>
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
            
            <div className="space-y-3">
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
                  <div className="flex p-0.5 bg-zinc-200/50 dark:bg-zinc-900 rounded-md border border-border/50 h-8">
                    {[ { id: 'hari', label: 'Harian' }, { id: 'bulan', label: 'Bulanan' } ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setForm({ ...form, tenorType: type.id, tenor: type.id === 'hari' ? '30' : '1' })}
                        className={`flex-1 flex items-center justify-center py-1 rounded-md text-[10px] font-bold transition-all ${
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
                    className="w-full h-8 px-2 bg-zinc-50 dark:bg-zinc-900 border border-border/50 outline-none rounded-md text-[11px] font-semibold text-text-primary"
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
                <div className="flex items-center justify-between pt-2.5 border-t border-primary/20">
                   <p className="text-[9px] font-extrabold text-text-muted uppercase tracking-wider">Estimasi Omset</p>
                   <p className="text-sm font-black text-primary">{formatIDR(omset)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Footers */}
      <div className="sticky bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-border/40 p-2 shrink-0 flex items-center justify-between gap-2 z-30 shadow-md">
        {step === 1 ? (
          <button 
            type="button"
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-1.5 h-8.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-bold text-[11px] uppercase tracking-wider active:scale-95 transition-all"
          >
            Simpan
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <>
            <button 
              type="button"
              onClick={() => setStep(1)}
              className="h-8.5 px-3 bg-secondary/50 hover:bg-secondary text-text-primary rounded-md font-bold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button 
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-1.5 h-8.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-bold text-[11px] uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Submit Order Baru'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}


