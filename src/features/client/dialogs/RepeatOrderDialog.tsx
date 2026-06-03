import React, { useState, useMemo, useEffect } from 'react';
import { CollectionReference, addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { handleFirestoreError, OperationType } from '../../../lib/services';
import { toast } from 'react-toastify';
import { Search, UserCheck, ArrowRight, Package } from 'lucide-react';
import { useClientData } from '../hooks/useClientData';
import { clientService } from '../services/client.service';
import { getNormalizedClient } from '../../../lib/utils';

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
  
  useEffect(() => {
    console.log("RepeatOrderDialog loaded clients raw dump:", JSON.stringify(allClients, null, 2));
  }, [allClients]);

  const [form, setForm] = useState({
    barang: '',
    angsuran: '',
    tenor: '30',
    tenorType: 'hari'
  });

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery) return allClients.slice(0, 8); // Show recent if no query
    const q = clientSearchQuery.toLowerCase();
    return allClients.filter(c => 
      String(c.nama || '').toLowerCase().includes(q) || 
      String(c.nomor || '').toLowerCase().includes(q) ||
      String(c.alamat || '').toLowerCase().includes(q) ||
      String(c.usaha || '').toLowerCase().includes(q)
    ).slice(0, 20); // Increase result count
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

      const orderId = await clientService.createRepeatOrder(selectedClient.id, {
        barang: form.barang,
        angsuran: angsuranNum,
        tenor: tenorNum,
        tenorType: form.tenorType
      });

      toast.success("Repeat Order Berhasil Disimpan");
      onClose();
    } catch (err) {
      console.error("Firestore error (RO):", err);
      // Removed the addDoc and instead used clientService.createRepeatOrder which handle logic
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full h-9 px-3 bg-input border border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all outline-none rounded-md text-[11px] font-semibold text-text-primary placeholder:text-text-muted/75 placeholder:font-medium shadow-sm";
  const labelClass = "block text-[9px] font-extrabold text-text-muted uppercase tracking-wider mb-1 ml-0.5";

  if (!selectedClient) {
    return (
      <div className="flex flex-col relative w-full h-full min-h-[50vh] bg-background">
        <div className="sticky top-0 z-20 px-4 py-3 bg-card/85 backdrop-blur-xl border-b border-border/40 shrink-0 space-y-2">
          <div>
            <h2 className="text-[12px] font-black text-text-primary uppercase tracking-wider">Cari Konsumen</h2>
            <p className="text-[10px] text-text-muted">Pilih konsumen yang sudah ada dari database.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text" 
              autoFocus
              placeholder="Cari nama, nomor WhatsApp, alamat..."
              value={clientSearchQuery}
              onChange={e => setClientSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 h-9 bg-muted border-none rounded-md text-[11px] font-semibold text-text-primary placeholder:text-text-muted-foreground outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="p-4 space-y-2">
          {filteredClients.length > 0 ? (
            <div className="space-y-2">
              {!clientSearchQuery && (
                <p className="text-[8px] font-extrabold text-text-muted uppercase tracking-widest pl-0.5">Konsumen Terbaru</p>
              )}
              <div className="space-y-1.5">
                {filteredClients.map(client => {
                  const norm = getNormalizedClient(client);
                  return (
                    <button 
                      key={client.id}
                      onClick={() => setSelectedClient(norm)}
                      className="w-full flex items-center justify-between p-2.5 bg-card border border-border/50 rounded-lg hover:border-primary/50 hover:shadow-sm transition-all group text-left shadow-sm"
                    >
                      <div className="min-w-0 pr-2">
                        <h4 className="font-bold text-xs text-text-primary group-hover:text-primary transition-colors truncate">{norm.nama}</h4>
                        <p className="text-[10px] text-text-muted font-medium mt-0.5 truncate">{norm.alamat}</p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-secondary/50 group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center shrink-0 transition-colors">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs font-bold text-text-primary mb-0.5">
                {clientSearchQuery ? "Tidak ditemukan" : "Belum ada data konsumen"}
              </p>
              <p className="text-[10px] text-text-muted">
                {clientSearchQuery 
                  ? "Konsumen dengan kata kunci tersebut tidak ada." 
                  : "Konsumen belum tersedia di database."}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col relative w-full h-full min-h-[50vh] bg-background">
      <div className="sticky top-0 z-20 px-4 py-2 bg-card/85 backdrop-blur-xl border-b border-border/40 shrink-0">
        <div className="p-1.5 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-2 h-11">
          <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center text-primary shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-bold text-primary tracking-widest leading-none">TERPILIH</p>
            <h3 className="text-xs font-black text-text-primary truncate mt-0.5 leading-none">{selectedClient.nama}</h3>
          </div>
          <button onClick={() => setSelectedClient(null)} className="text-[9px] font-semibold text-text-muted hover:text-text-primary underline px-1.5 py-1">Ubah</button>
        </div>
      </div>

      <div className="p-4 pb-20">
        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-1">
             <h2 className="text-[12px] font-black text-text-primary uppercase tracking-wider">Detail Order Baru</h2>
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
                <div className="flex p-0.5 bg-muted rounded-md border border-border/50 h-8">
                  {[ { id: 'hari', label: 'Harian' }, { id: 'bulan', label: 'Bulanan' } ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setForm({ ...form, tenorType: type.id, tenor: type.id === 'hari' ? '30' : '1' })}
                      className={`flex-1 flex items-center justify-center py-1 rounded-md text-[10px] font-bold transition-all ${
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
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/40 p-2 shrink-0 shadow-md z-30">
         <button 
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-1.5 h-8.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-md font-bold text-[11px] uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50"
          >
            <Package className="w-3.5 h-3.5" />
            {isSubmitting ? 'Menyimpan...' : 'Submit Repeat Order'}
          </button>
      </div>
    </div>
  );
}

