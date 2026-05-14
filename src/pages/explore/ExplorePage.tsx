import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PricelistPage } from './PricelistPage';

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const currentSearch = searchParams.get('search') || '';
  
  // Tab handling menggunakan state lokal (kompatibel penuh dengan Vite/React Router)
  const [activeTab, setActiveTab] = useState<'gambar' | 'pricelist' | 'gea'>('pricelist');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (newSearchTerm) {
      params.set('search', newSearchTerm);
    } else {
      params.delete('search');
    }
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-10">
        <div className="flex flex-col gap-6">
            
            {/* Header / Logo */}
            <div className="flex justify-center mb-2">
                <img
                    src="/app-logo.png"
                    alt="Logo"
                    className="w-24 h-24 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=LOGO';
                    }}
                />
            </div>

            {/* Sticky Search Bar Mobile */}
            <div className="sticky top-2 z-40 w-full max-w-lg mx-auto p-1.5 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-sm backdrop-blur-xl">
              <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <input
                      placeholder="Cari konten di semua tab..."
                      defaultValue={currentSearch}
                      onChange={handleSearchChange}
                      className="w-full bg-transparent border-none pl-12 pr-4 h-11 text-sm font-medium focus:outline-none text-zinc-900 dark:text-white"
                  />
              </div>
            </div>

            {/* Custom Tabs List */}
            <div className="flex justify-center w-full">
              <div className="inline-flex items-center justify-center p-1 bg-zinc-100 dark:bg-white/5 rounded-full">
                <button 
                  onClick={() => setActiveTab('gambar')}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'gambar' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                  Gambar
                </button>
                <button 
                  onClick={() => setActiveTab('pricelist')}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'pricelist' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                  Pricelist
                </button>
                <button 
                  onClick={() => setActiveTab('gea')}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'gea' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                  Gea & Getra
                </button>
              </div>
            </div>

            {/* Tabs Content */}
            <div className="mt-4">
              {activeTab === 'pricelist' && (
                <PricelistPage searchQuery={currentSearch} />
              )}
              {activeTab === 'gambar' && (
                <div className="py-20 text-center text-zinc-500 text-sm">Tab Gambar Module (Belum Diimplementasi)</div>
              )}
              {activeTab === 'gea' && (
                <div className="py-20 text-center text-zinc-500 text-sm">Tab Gea & Getra Module (Belum Diimplementasi)</div>
              )}
            </div>
        </div>
      </main>
    </div>
  );
}
