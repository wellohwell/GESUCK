import React from 'react';
import { Product } from '../../types/pricelist';
import { formatRp } from '../../lib/pricing/simulateInstallment';
import { Package, Smartphone } from 'lucide-react';

interface Props {
  product: Product;
  onOpenSimulator: (product: Product) => void;
}

export function PricelistCard({ product, onOpenSimulator }: Props) {
  return (
    <div 
      className="group bg-white dark:bg-[#111] border border-zinc-200 dark:border-white/10 rounded-[24px] overflow-hidden hover:border-zinc-300 dark:hover:border-white/20 transition-all flex flex-col h-full hover:shadow-xl dark:hover:shadow-black/50"
    >
      <div className="relative aspect-square w-full bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-white/5 overflow-hidden flex items-center justify-center p-6">
        <div className="absolute top-4 left-4 bg-white/80 dark:bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-wider border border-white/20 shadow-sm z-10">
          {product.kategori}
        </div>
        
        {product.gambarUrl ? (
           <img 
              src={product.gambarUrl} 
              alt={product.nama}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=No+Image';
              }}
           />
        ) : (
           <div className="text-zinc-300 dark:text-zinc-700 group-hover:scale-105 transition-transform duration-500">
             <Package className="w-16 h-16" />
           </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-[15px] leading-snug mb-1 line-clamp-2">
          {product.nama}
        </h3>
        
        {product.deskripsi && (
          <p className="text-zinc-500 dark:text-zinc-500 text-xs line-clamp-2 mb-4 leading-relaxed">
            {product.deskripsi}
          </p>
        )}

        <div className="mt-auto pt-4 flex flex-col sm:flex-row items-center sm:justify-between gap-4">
          <div className="flex flex-col text-left w-full sm:w-auto">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Harga OTR</span>
            <span className="font-extrabold text-[#C6FF00] dark:text-[#C6FF00] text-lg sm:text-lg tracking-tight leading-none drop-shadow-sm">
              {formatRp(product.harga)}
            </span>
          </div>
          
          <button
            onClick={() => onOpenSimulator(product)}
            className="w-full sm:w-auto bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2.5 rounded-full text-xs font-bold transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 flex items-center justify-center gap-1.5 shadow-md flex-shrink-0"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Simulasi</span>
            <span className="sm:hidden">Hitung Cicilan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
