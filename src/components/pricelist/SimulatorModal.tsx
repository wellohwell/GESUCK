import React, { useState, useMemo } from 'react';
import { X, Copy, Share2 } from 'lucide-react';
import { Product } from '../../types/pricelist';
import { simulateInstallment, formatRp } from '../../lib/pricing/simulateInstallment';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const TENOR_OPTIONS = [6, 12, 18, 24, 30, 36];

export function SimulatorModal({ isOpen, onClose, product }: Props) {
  const [dpPribadi, setDpPribadi] = useState<number>(0);
  const [subsidi, setSubsidi] = useState<number>(0);
  const [tenor, setTenor] = useState<number>(12);

  const result = useMemo(() => {
    if (!product) return null;
    return simulateInstallment(product.harga, product.marginRate, { dpPribadi, subsidi, tenor });
  }, [product, dpPribadi, subsidi, tenor]);

  if (!product || !result) return null;

  const summaryText = `*SIMULASI ANGSURAN*\nProduk: ${product.nama}\nKategori: ${product.kategori}\nHarga OTR: ${formatRp(product.harga)}\nDP Pribadi: ${formatRp(dpPribadi)}\nSubsidi/Diskon: ${formatRp(subsidi)}\nTenor: ${tenor} Bulan\n\n*Angsuran: ${formatRp(result.angsuranPerBulan)} / bulan*\n*Total Omset: ${formatRp(result.totalOmset)}*`;

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    alert('Teks simulasi berhasil disalin!');
  };

  const handleShareWA = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
    window.open(url, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ y: "100%", opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-white/10">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Simulasi Angsuran</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 hide-scrollbar">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 mb-6 border border-zinc-100 dark:border-white/5">
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider mb-1">Produk ({product.kategori})</div>
                <div className="text-sm font-bold text-zinc-900 dark:text-white leading-tight mb-2">{product.nama}</div>
                <div className="text-lg font-black text-zinc-900 dark:text-[#C6FF00] tracking-tight">{formatRp(product.harga)}</div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">Pilihan Tenor (Bulan)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TENOR_OPTIONS.map(t => (
                      <button
                        key={t}
                        onClick={() => setTenor(t)}
                        className={`py-2 rounded-xl text-sm font-bold transition-all border ${tenor === t ? 'border-zinc-900 bg-zinc-900 text-white dark:border-[#C6FF00] dark:bg-[#C6FF00]/10 dark:text-[#C6FF00]' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                      >
                        {t}X
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">DP Pribadi</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">Rp</span>
                    <input 
                      type="number" 
                      value={dpPribadi || ''} 
                      onChange={(e) => setDpPribadi(Number(e.target.value))}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700/50 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-[#C6FF00] transition-colors"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">Subsidi / Diskon</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">Rp</span>
                    <input 
                      type="number" 
                      value={subsidi || ''} 
                      onChange={(e) => setSubsidi(Number(e.target.value))}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700/50 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-[#C6FF00] transition-colors"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 dark:bg-black rounded-2xl p-5 text-white shadow-inner">
                <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-4">
                  <div>
                    <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-1">Angsuran / Bln</div>
                    <div className="text-3xl font-black text-[#C6FF00] tracking-tighter leading-none">{formatRp(result.angsuranPerBulan)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Total Omset</div>
                    <div className="text-sm font-bold text-white/90">{formatRp(result.totalOmset)}</div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="flex-1 bg-white/10 hover:bg-white/20 transition-colors py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                    <Copy className="w-4 h-4" /> Salin
                  </button>
                  <button onClick={handleShareWA} className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-black transition-colors py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2">
                    <Share2 className="w-4 h-4" /> WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
