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
  const inputClass = "w-full px-4 h-11 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent focus:border-brand-primary/40 focus:bg-white dark:focus:bg-zinc-950/80 focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none rounded-2xl text-sm font-semibold placeholder:text-zinc-400 dark:placeholder:text-zinc-650";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {!isRepeat && (
        <div className="space-y-3">
          <p className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Data Diri</p>
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
                placeholder="Unit Usaha" 
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

      <div className="space-y-y space-y-3 pt-5 border-t border-zinc-150/60 dark:border-zinc-800/60">
        <p className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Proposal Order</p>
        <div className="space-y-2">
          <input 
            type="text" 
            placeholder="Barang / Paket *" 
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
            <input 
              type="number" 
              placeholder="Tenor" 
              value={form.tenor} 
              onChange={e => setForm({...form, tenor: e.target.value})} 
              className={inputClass} 
            />
            <select 
              value={form.tenorType} 
              onChange={e => setForm({...form, tenorType: e.target.value})}
              className={inputClass}
            >
              <option value="hari">HARI</option>
              <option value="bulan">BULAN</option>
            </select>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-white dark:bg-zinc-950 pt-4 pb-2">
        <PrimaryButton type="submit" isLoading={isSubmitting} className="w-full">
          SIMPAN
        </PrimaryButton>
      </div>
    </form>
  );
}
