import React from 'react';
import { PrimaryButton } from '../../../components/ui/buttons';

interface ClientFormProps {
  form: any;
  setForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  title: string;
  submitLabel: string;
  isRepeat?: boolean;
}

const formatIDR = (val: string | number) => {
  const num = typeof val === 'string' ? Number(val.replace(/\D/g, '')) : val;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(num || 0);
};

export function ClientForm({ form, setForm, onSubmit, isSubmitting, title, submitLabel, isRepeat }: ClientFormProps) {
  const inputClass = "w-full px-4 h-11 bg-zinc-50 bg-card border border-border/50 dark:border-white/[0.05] focus:border-primary/40 focus:bg-card dark:focus:bg-zinc-950 focus:ring-4 focus:ring-primary/10 transition-all outline-none rounded-[1.5rem] text-sm font-semibold placeholder:text-zinc-400 dark:placeholder:text-zinc-650";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {!isRepeat && (
        <div className="space-y-3">
          <p className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 tracking-widest ml-1">Data Diri</p>
          <div className="space-y-2">
            <input 
              type="text" 
              placeholder="Nama Lengkap *" 
              required 
              value={form.nama} 
              onChange={e => setForm({...form, nama: e.target.value.replace(/\b\w/g, c => c.toUpperCase())})} 
              className={inputClass} 
            />
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="tel" 
                placeholder="WA / Telepon *" 
                required 
                value={form.nomor} 
                onChange={e => setForm({...form, nomor: e.target.value})} 
                className={inputClass} 
              />
              <input 
                type="text" 
                placeholder="Usaha" 
                value={form.usaha} 
                onChange={e => setForm({...form, usaha: e.target.value.replace(/\b\w/g, c => c.toUpperCase())})} 
                className={inputClass} 
              />
            </div>
            <input 
              type="text" 
              placeholder="Alamat Lengkap / Detail *" 
              required 
              value={form.alamat} 
              onChange={e => setForm({...form, alamat: e.target.value.replace(/\b\w/g, c => c.toUpperCase())})} 
              className={inputClass} 
            />
          </div>
        </div>
      )}

      <div className="space-y-y space-y-3 pt-5 border-t border-zinc-150/60 border-border/50/60">
        <p className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 tracking-widest ml-1">Order Detail</p>
        <div className="space-y-2">
          <input 
            type="text" 
            placeholder="Barang" 
            required 
            value={form.barang} 
            onChange={e => setForm({...form, barang: e.target.value.replace(/\b\w/g, c => c.toUpperCase())})} 
            className={inputClass} 
          />
          <input 
            type="text" 
            placeholder="Angsuran (Rp)" 
            value={form.angsuran ? formatIDR(Number(form.angsuran)) : ''} 
            onChange={e => setForm({...form, angsuran: e.target.value.replace(/\D/g, '')})} 
            className={inputClass} 
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-[1.5rem] border border-border/50 dark:border-white/[0.05] h-11">
              {[
                { id: 'hari', label: 'Hari' },
                { id: 'bulan', label: 'Bulan' }
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setForm({ ...form, tenorType: type.id, tenor: '' })}
                  className={`flex-1 flex items-center justify-center rounded-[1.25rem] text-[10px] font-bold transition-all ${
                    form.tenorType === type.id
                      ? 'bg-card text-primary shadow-sm border border-border/50 dark:border-white/10'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <select 
              value={form.tenor} 
              onChange={e => setForm({...form, tenor: e.target.value})} 
              className={inputClass} 
            >
              <option value="" disabled>Tenor</option>
              {form.tenorType === 'hari' ? (
                ['30', '60', '90', '120', '150', '180'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))
              ) : (
                ['1', '2', '3', '4', '5', '6', '7'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-card dark:bg-black pt-4 pb-2">
        <PrimaryButton type="submit" isLoading={isSubmitting} className="w-full">
          {submitLabel || 'Simpan'}
        </PrimaryButton>
      </div>
    </form>
  );
}
