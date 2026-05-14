import React, { useState, useMemo } from 'react';
import { Loader2, PackageX } from 'lucide-react';
import { usePricelist } from '../../hooks/usePricelist';
import { PricelistCard } from '../../components/pricelist/PricelistCard';
import { SimulatorModal } from '../../components/pricelist/SimulatorModal';
import { Product } from '../../types/pricelist';

interface Props {
  searchQuery: string;
}

export function PricelistPage({ searchQuery }: Props) {
  const { data, loading, categories, error } = usePricelist();
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = item.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.kategori.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'Semua' || item.kategori === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [data, searchQuery, selectedCategory]);

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 dark:bg-red-500/10 rounded-2xl max-w-sm mx-auto mt-10">
        <p className="text-red-500 text-sm font-semibold">Gagal memuat data:</p>
        <p className="text-red-400 text-xs mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-20">
      {/* Categories Filter */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {!loading && categories.map(cat => (
           <button
             key={cat}
             onClick={() => setSelectedCategory(cat)}
             className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all ${
               selectedCategory === cat 
               ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md scale-105' 
               : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
             }`}
           >
             {cat}
           </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
         <div className="flex flex-col items-center justify-center py-20 opacity-50">
           <Loader2 className="w-8 h-8 animate-spin text-zinc-900 dark:text-[#C6FF00] mb-4" />
           <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Sinkronisasi Katalog...</p>
         </div>
      ) : (
        /* Grid View */
        filteredData.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredData.map(product => (
              <PricelistCard 
                key={product.id} 
                product={product} 
                onOpenSimulator={setSelectedProduct} 
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-4">
              <PackageX className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Produk Tidak Ditemukan</h3>
            <p className="text-zinc-500 dark:text-white/50 text-sm max-w-xs">
              Tidak ada produk yang cocok dengan pencarian "{searchQuery}" pada kategori {selectedCategory}.
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
