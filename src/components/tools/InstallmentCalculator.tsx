import React, { useState, useEffect } from 'react';
import { ChevronDown, Copy } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';
import { RupiahInput } from '../ui/RupiahInput';

type TipeProduk = 'HP' | 'Royal' | 'Furniture' | 'Guhdo' | 'Elektronik';
type Tenor = 30 | 60 | 90 | 120 | 150 | 180;

interface PricelistItem {
  MERK: string;
  TYPE: string;
  MODEL: string;
  JUAL: string;
  caption?: string;
  lastUpdate?: string;
}

const aturanMargin: Record<TipeProduk, { maksHari: number, margin: number }[]> = {
  HP: [ 
    { maksHari: 60, margin: 0.26 }, 
    { maksHari: 90, margin: 0.31 }, 
    { maksHari: 120, margin: 0.41 }, 
    { maksHari: 150, margin: 0.46 },
    { maksHari: 180, margin: 0.51 }
  ],
  Royal: [ { maksHari: 90, margin: 0.36 }, { maksHari: 180, margin: 0.51 } ],
  Furniture: [ { maksHari: 90, margin: 0.36 }, { maksHari: 180, margin: 0.51 } ],
  Guhdo: [ { maksHari: 90, margin: 0.46 }, { maksHari: 180, margin: 0.66 } ],
  Elektronik: [ { maksHari: 90, margin: 0.31 }, { maksHari: 180, margin: 0.46 } ]
};

const aturanPotongan: Partial<Record<TipeProduk, number>> = {
  Royal: 0.17,
  Guhdo: 0.38
};

const formatRupiah = (value: number) => {
  if (isNaN(value) || value === null || value === 0) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function InstallmentCalculator({ itemDefaults }: { itemDefaults?: PricelistItem | null }) {
  const [modal, setModal] = useState<number | undefined>()
  const [dp, setDp] = useState<number | undefined>()
  const [tipe, setTipe] = useState<TipeProduk | ''>('')
  const [tenor, setTenor] = useState<Tenor | ''>('')
  const [nawar, setNawar] = useState<number | undefined>()
  
  const [productDetails, setProductDetails] = useState({ model: '', merk: '', type: '', lastUpdate: '' });

  const [angsuranHarian, setAngsuranHarian] = useState<number>(0)
  const [estimasiPotongan, setEstimasiPotongan] = useState<number>(0)

  useEffect(() => {
    if (tipe === 'HP' && typeof tenor === 'number' && tenor > 180) {
      setTenor('');
    }
  }, [tipe, tenor]);
  
  useEffect(() => {
    if (itemDefaults) {
        // Add '000' by multiplying by 1000 parsing the string like "3.850"
        const cleanPrice = itemDefaults.JUAL.replace(/[^0-9]/g, '');
        const priceValue = (parseFloat(cleanPrice) * 1000);
        setModal(priceValue);
        
        const typeMap: { [key: string]: TipeProduk } = {
            'ROYAL': 'Royal',
            'GUHDO': 'Guhdo',
            'ELEKTRONIK': 'Elektronik',
            'FURNITURE': 'Furniture',
            'HP': 'HP',
        };
        let productType = typeMap[itemDefaults.MERK.toUpperCase()] || 'Elektronik';
        
        if (itemDefaults.caption && itemDefaults.caption.toUpperCase().includes('HP')) {
            productType = 'HP';
        }
        
        setTipe(productType);

        setProductDetails({
            model: itemDefaults.MODEL,
            merk: itemDefaults.MERK,
            type: itemDefaults.TYPE,
            lastUpdate: itemDefaults.lastUpdate || ''
        });
    } else {
        setProductDetails({ model: '', merk: '', type: '', lastUpdate: '' });
    }
  }, [itemDefaults]);


  useEffect(() => {
    const calculate = () => {
      const modalAwalNum = modal || 0;
      const dpNum = dp || 0;
      const tenorNum = tenor as number;
      const nawarNum = nawar || 0;

      if (!modalAwalNum || !tipe || !tenorNum) {
        setAngsuranHarian(0);
        setEstimasiPotongan(0);
        return;
      }

      if (tipe === 'HP' && dpNum < 100000) {
        setAngsuranHarian(0);
        setEstimasiPotongan(0);
        return;
      }
      
      let modalNum = modalAwalNum;
      
      const potonganTipe = aturanPotongan[tipe];
      if (potonganTipe) {
          modalNum = modalAwalNum * (1 - potonganTipe);
      }
      
      const sisaModal = modalNum - dpNum;
      if (sisaModal < 0) {
        setAngsuranHarian(0);
        setEstimasiPotongan(0);
        return;
      }
      
      const aturan = aturanMargin[tipe];
      let margin = 0;
      const sortedRules = [...aturan].sort((a,b) => a.maksHari - b.maksHari);

      for (const rule of sortedRules) {
          if (tenorNum <= rule.maksHari || rule.maksHari === 0) {
              margin = rule.margin;
              break;
          }
      }
       if (margin === 0 && sortedRules.length > 0) {
        margin = sortedRules[sortedRules.length - 1].margin;
      }


      const hargaJual = sisaModal * (1 + margin);
      const angsuran = hargaJual / tenorNum;
      setAngsuranHarian(angsuran);

      let potongan = 0;
      if (nawarNum > 0) {
        const selisihHarian = angsuran - nawarNum;
        const totalSelisih = selisihHarian * tenorNum;
        potongan = totalSelisih / (1 + margin);
      }
      setEstimasiPotongan(potongan);
    };

    calculate();
  }, [modal, dp, tipe, tenor, nawar]);
  
  const copyToClipboard = () => {
    const nawarNum = nawar || 0;
    const dpNum = dp || 0;

    let angsuranText = formatRupiah(angsuranHarian);
    if (nawarNum > 0) {
      angsuranText = `~${formatRupiah(angsuranHarian)}~ *${formatRupiah(nawarNum)}*`;
    }

    if ((nawarNum > 0 ? nawarNum : angsuranHarian) < 5000) {
      toast.error('Minimal angsuran per hari adalah Rp 5.000');
      return;
    }

    let potonganText = '';
    if (dpNum > 0 || nawarNum > 0) {
        potonganText = `Est. Potongan/DP: ${formatRupiah(estimasiPotongan)}`;
    }

    const textToCopy = `
Simulasi Angsuran
${productDetails.model || ''} ${productDetails.merk || ''} ${productDetails.type || ''}
-----------------
DP: ${formatRupiah(dpNum)}
Tenor: ${tenor} hari
Angsuran/Hari: ${angsuranText}
${potonganText ? `${potonganText}\n` : ''}-----------------
    `.trim();

    navigator.clipboard.writeText(textToCopy);
    toast.success('Hasil simulasi disalin ke clipboard!');
  };

  const isNawarFilled = (nawar || 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center px-4">
          <h2 className="text-lg font-bold dark:text-white">Simulasi Angsuran</h2>
          {productDetails.model && (
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-0.5 leading-tight">
                  {productDetails.model} {productDetails.merk} {productDetails.type}
              </p>
          )}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Harga / Modal</label>
                <RupiahInput placeholder="0" value={modal} onValueChange={setModal} autoMultiply={true} className="py-2.5" />
            </div>
            
            <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Tipe Produk</label>
                <select 
                  value={tipe} 
                  onChange={(e) => setTipe(e.target.value as TipeProduk)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="">Pilih Tipe Produk</option>
                  {Object.keys(aturanMargin).map((key) => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">DP / Uang Muka</label>
                <RupiahInput placeholder="0" value={dp} onValueChange={setDp} className="py-2.5" />
                {tipe === 'HP' && (dp || 0) < 100000 && (
                  <p className="text-[9px] text-red-500 font-bold ml-1">Minimal DP Rp 100.000</p>
                )}
            </div>
            <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Tenor (Hari)</label>
                <select 
                  value={tenor} 
                  onChange={(e) => setTenor(Number(e.target.value) as Tenor)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="">Pilih Tenor</option>
                  {[30, 60, 90, 120, 150, 180]
                    .filter(hari => tipe !== 'HP' || hari <= 180)
                    .map((hari) => (
                    <option key={hari} value={hari}>{hari} Hari</option>
                  ))}
                </select>
            </div>
        </div>
        
        <div className="flex justify-between items-center bg-primary text-primary-foreground px-4 h-12 rounded-xl shadow-sm mt-2">
            <span className="font-black text-[9px] uppercase tracking-wider opacity-80 mt-[1px]">Angsuran / Hari</span>
            <span className={cn(
              "angsuran-value font-black text-lg leading-none mt-[1px]",
              isNawarFilled ? "has-nawar" : ""
            )}>
              {formatRupiah(angsuranHarian)}
            </span>
        </div>
        {angsuranHarian > 0 && angsuranHarian < 5000 && (
          <p className="text-[9px] text-red-500 font-bold ml-1 text-center -mt-1 uppercase animate-pulse">
            Minimal angsuran / hari Rp 5.000
          </p>
        )}

        <div className="space-y-1 text-left">
            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Harga Nawar</label>
            <RupiahInput 
              placeholder="0" 
              value={nawar} 
              onValueChange={setNawar}
              className={cn("py-2.5", isNawarFilled && "border-red-500 ring-red-500 ring-1")}
              autoMultiply={true}
            />
        </div>

        <div className="relative flex flex-col">
          <div className={cn(
              "flex justify-between items-center px-4 h-12 rounded-xl z-20 relative transition-all duration-300",
              isNawarFilled 
                  ? "bg-red-500 text-white shadow-sm" 
                  : "bg-white text-black shadow-sm"
          )}>
              <span className={cn(
                  "font-black text-[9px] uppercase tracking-wider opacity-60 mt-[1px]",
                  isNawarFilled ? "text-white" : "text-black"
              )}>Est. Potongan / DP</span>
              
              <div className="flex flex-col items-end text-right justify-center mt-[1px]">
                  <span className="font-black text-lg leading-none">{formatRupiah(estimasiPotongan)}</span>
              </div>
          </div>
          
          <div 
              style={{ backgroundColor: '#FACC15', color: '#000000' }}
              className={cn(
              "flex justify-between items-center px-4 shadow-sm transition-all duration-300 ease-in-out transform origin-top z-10",
              (dp || 0) > 0 ? "opacity-100 h-12 mt-2 rounded-xl translate-y-0" : "opacity-0 h-0 mt-0 rounded-xl -translate-y-4 overflow-hidden"
          )}>
              <span className="font-black text-[9px] uppercase tracking-wider opacity-80 mt-[1px]">Est. Total DP</span>
              <span className="inline-block font-black text-lg leading-none transition-all duration-250 ease-in-out mt-[1px]">
                  {formatRupiah((estimasiPotongan || 0) + (dp || 0))}
              </span>
          </div>
        </div>

        <button 
          onClick={copyToClipboard} 
          disabled={!modal || !tipe || !tenor || (angsuranHarian > 0 && angsuranHarian < 5000 && !isNawarFilled)}
          className="w-full bg-white text-zinc-900 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
            <Copy className="w-4 h-4 text-zinc-900" />
            <span className="text-sm">Salin Hasil</span>
        </button>
      </div>
    </div>
  )
}
