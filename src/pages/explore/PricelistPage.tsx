import React, { useState, useMemo } from 'react';
import { Loader2, PackageX, ChevronRight } from 'lucide-react';
import { usePricelist } from '../../hooks/usePricelist';
import { SimulatorModal } from '../../components/pricelist/SimulatorModal';
import { Product } from '../../types/pricelist';
import { formatRp } from '../../lib/pricing/simulateInstallment';

interface Props {
  searchQuery: string;
}

export function PricelistPage({ searchQuery }: Props) {
  const { data, loading, error } = usePricelist();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredData = useMemo(() => {
    const searchTerms = searchQuery.toLowerCase().split(' ').filter(term => term.trim() !== '');
    
    // Result should be empty if no search term is entered
    if (searchTerms.length === 0) return [];

    return data.filter(item => {
      // Combined text for searching
      const combinedText = [
        item.model || '',
        item.type || '',
        item.fitur || '',
        item.merk || '',
        item.caption || '',
        item.nama || '',
        item.kategori || ''
      ].join(' ').toLowerCase();

      return searchTerms.every(term => combinedText.includes(term));
    });
  }, [data, searchQuery]);

  // If search query is empty, return null or empty UI
  if (!searchQuery.trim()) {
    return null;
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 dark:bg-red-500/10 rounded-2xl max-w-sm mx-auto mt-10">
        <p className="text-red-500 text-sm font-semibold">Gagal memuat data:</p>
        <p className="text-red-400 text-xs mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-10">
      {/* Loading State */}
      {loading ? (
         <div className="flex flex-col items-center justify-center py-20 opacity-50">
           <Loader2 className="w-8 h-8 animate-spin text-zinc-900 dark:text-[#C6FF00] mb-4" />
           <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Sinkronisasi Katalog...</p>
         </div>
      ) : (
        /* List View */
        filteredData.length > 0 ? (
          <div className="bg-white dark:bg-[#111] overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 shadow-xl dark:shadow-black/50">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-[1fr_2fr_2fr_1.5fr] items-center gap-4 px-6 py-3 bg-zinc-50/80 dark:bg-white/5 border-b border-zinc-200 dark:border-white/10">
               <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">MERK</div>
               <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">MODEL</div>
               <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">TYPE</div>
               <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-right pr-4">HARGA / MODAL</div>
            </div>

            {/* List Body */}
            <div className="flex flex-col divide-y divide-zinc-100 dark:divide-white/5">
              {filteredData.map((product, index) => (
                <div 
                  key={product.id || index} 
                  onClick={() => setSelectedProduct(product)}
                  className="grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr_1.5fr] items-center gap-2 md:gap-4 px-6 py-3.5 md:py-2.5 hover:bg-zinc-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors group"
                >
                   {/* Mobile Layout (Table-like rows) */}
                   <div className="flex items-center justify-between md:hidden w-full gap-4">
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{product.merk}</span>
                          <div className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-white/10" />
                          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 truncate">{product.type}</span>
                        </div>
                        <span className="font-bold text-[13px] text-zinc-900 dark:text-zinc-100 leading-tight truncate">{product.model}</span>
                        {(product.fitur || product.caption) && (
                           <span className="text-[9px] text-zinc-400 dark:text-zinc-500 italic truncate tracking-tight">
                             {product.fitur || product.caption}
                           </span>
                        )}
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <span className="font-black text-[#86b100] dark:text-[#C6FF00] text-sm tracking-tighter">
                          {product.jual || formatRp(product.harga)}
                        </span>
                      </div>
                   </div>
                   
                   {/* Desktop Layout (Hidden on mobile) */}
                   <div className="hidden md:block text-[11px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                     {product.merk}
                   </div>
                   <div className="hidden md:block text-sm font-bold text-zinc-900 dark:text-white truncate">
                     {product.model}
                   </div>
                   <div className="hidden md:block text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                     {product.type}
                   </div>
                   
                   {/* Price - Right Aligned on Desktop */}
                   <div className="hidden md:flex items-center justify-end pr-4 gap-3">
                     <span className="font-black text-sm text-[#86b100] dark:text-[#C6FF00]">
                       {product.jual || formatRp(product.harga)}
                     </span>
                     <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-white/10 group-hover:text-[#C6FF00] transition-colors" />
                   </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-4">
              <PackageX className="w-7 h-7 text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Produk Tidak Ditemukan</h3>
            <p className="text-zinc-500 dark:text-white/50 text-sm max-w-xs">
              Tidak ada produk yang cocok dengan pencarian "{searchQuery}".
            </p>
          </div>
        )
      )}

      {/* Simulator Modal */}
      <SimulatorModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        product={selectedProduct} 
      />
    </div>
  );
}
