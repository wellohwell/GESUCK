import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePricelist } from '../../hooks/usePricelist';
import { useGeaGetra } from '../../hooks/useGeaGetra';
import { PricelistPage } from './explore/PricelistPage';
import GeaGetraPage from './explore/GeaGetraPage';
import { ImageDetailView, ImageData } from '../../components/explore/ImageDetailView';
import { useRuntime } from '../../providers/RuntimeProvider';

export type SortType = 'default' | 'merk_asc' | 'merk_desc' | 'price_low' | 'price_high';

export default function ExplorePage() {
  const { loading: runtimeLoading, error: runtimeError, runtime, branch } = useRuntime();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [currentImageList, setCurrentImageList] = useState<ImageData[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Temporarily add runtime debug logging for cross-branch configuration audit
  React.useEffect(() => {
    if (runtime) {
      console.log(`[Runtime Audit] branchId: ${branch?.id || 'unknown'}`);
      console.log(`[Runtime Audit] loaded runtime:`, runtime);
      console.log(`[Runtime Audit] active datasource:`, runtime.modules?.explore?.datasource);
      console.log(`[Runtime Audit] spreadsheetId being used: ${runtime.modules?.explore?.datasource?.spreadsheetId || 'none'}`);
    }
  }, [runtime, branch]);
  
  const currentSearch = searchParams.get('search') || '';
  
  const { data: pricelistData } = usePricelist();
  const { data: geaData } = useGeaGetra();
  
  const [activeTab, setActiveTab] = useState<'pricelist' | 'gea'>('pricelist');
  const [sortBy, setSortBy] = useState<SortType>('default');
  const [selectedMerk, setSelectedMerk] = useState<string>('all');

  const exploreConfig = runtime?.modules?.explore;

  // Render initialization loading spinner
  const renderedLoading = useMemo(() => {
    if (runtimeLoading) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-xs font-mono tracking-widest uppercase text-muted-foreground animate-pulse">
              Menginisialisasi Runtime...
            </p>
          </div>
        </div>
      );
    }
    return null;
  }, [runtimeLoading]);

  // Render disabled state or missing config fallbacks
  const renderedFallback = useMemo(() => {
    if (runtimeLoading) return null;

    if (runtimeError || !exploreConfig) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 rounded-[1.5rem] bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-black uppercase tracking-wider text-foreground">
              Akses Terbatas / Konfigurasi Saluran Hilang
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {runtimeError || "Konfigurasi cabang Anda tidak dapat ditemukan di server kami. Silakan hubungi admin Anda untuk mengaktifkan modul pencarian produk."}
            </p>
          </div>
        </div>
      );
    }

    if (!exploreConfig.datasource?.spreadsheetId) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.1)]">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-black uppercase tracking-wider text-foreground">
                Cabang Belum Dikonfigurasi
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tautan spreadsheet untuk Cabang Anda belum dikonfigurasi. Silakan hubungi administrator pusat.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (!exploreConfig.enabled) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(198,255,46,0.1)]">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-lg font-black uppercase tracking-wider text-foreground">
              Modul Explore Dinonaktifkan
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Modul Explore untuk Cabang Anda sedang dinonaktifkan oleh administrator sistem.
            </p>
          </div>
        </div>
      );
    }

    return null;
  }, [runtimeLoading, runtimeError, exploreConfig]);

  const brands = useMemo(() => {
    let sourceData = [];
    
    if (activeTab === 'pricelist') {
      if (!pricelistData) return [];
      sourceData = pricelistData;

      if (currentSearch.trim()) {
        const searchTerms = currentSearch.toLowerCase().split(' ').filter(term => term.trim() !== '');
        sourceData = sourceData.filter(item => {
          const combinedText = [
            item.model || '',
            item.merk || '',
            item.type || '',
            item.fitur || '',
            item.caption || ''
          ].join(' ').toLowerCase();
          return searchTerms.every(term => combinedText.includes(term));
        });
      }
      
      const uniqueBrands = Array.from(new Set(sourceData.map(item => item.merk).filter(Boolean)));
      return uniqueBrands.sort((a, b) => (a || '').localeCompare(b || ''));
    } else {
      if (!geaData) return [];
      sourceData = geaData;

      if (currentSearch.trim()) {
        const searchTerms = currentSearch.toLowerCase().split(' ').filter(term => term.trim() !== '');
        sourceData = sourceData.filter(item => {
          const combinedText = `${(item.caption || '').toLowerCase()} ${(item.filename || '').toLowerCase()}`;
          return searchTerms.every(term => combinedText.includes(term));
        });
      }

      const knownBrands = ['GEA', 'GETRA', 'ARISA', 'ARISTON', 'BACK MASS', 'BMB', 'DAIKIN', 'GREE', 'HONDA', 'INDACHI', 'IPHONE', 'KRISBOW', 'LG', 'LONCIN', 'MITOCHIBA', 'MIYAKO', 'MODENA', 'OB FIT', 'OPPO', 'POLYTRON', 'SAMSUNG', 'SHARP', 'TCL', 'TOSHIBA'];
      
      const brandsFound = new Set<string>();
      sourceData.forEach(item => {
        const text = `${item.caption} ${item.filename}`.toUpperCase();
        knownBrands.forEach(b => {
          if (text.includes(b)) brandsFound.add(b);
        });
      });

      return Array.from(brandsFound).sort();
    }
  }, [activeTab, pricelistData, geaData, currentSearch]);

  React.useEffect(() => {
    setSelectedImage(null);
    setSelectedMerk('all');
  }, [activeTab]);

  React.useEffect(() => {
    if (selectedMerk !== 'all' && !brands.includes(selectedMerk)) {
      setSelectedMerk('all');
    }
  }, [brands, selectedMerk]);

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

  const sortOptions: { label: string; value: SortType }[] = [
    { label: 'HARGA', value: 'default' },
    { label: 'TERMURAH', value: 'price_low' },
    { label: 'TERMAHAL', value: 'price_high' },
  ];

  if (renderedLoading) return renderedLoading;
  if (renderedFallback) return renderedFallback;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300 relative">
      
      {/* Sticky Brand Header - Separated */}
      <div className="sticky top-0 z-50 pt-2 pb-3 bg-gradient-to-b from-background via-background/95 to-transparent w-full">
        <div className="max-w-5xl mx-auto flex flex-col items-center justify-center">
          <div className="flex flex-col w-fit items-center">
            <h1 className="text-lg font-black uppercase tracking-[0.25em] text-foreground transition-all flex items-center gap-1">
              VORK<span className="font-normal text-foreground">TEAM</span>
            </h1>
            <div className="h-0.5 w-full bg-primary rounded-full mt-0.5" />
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6">
        <div className="flex flex-col gap-1">
          {/* Scrollable Interactive Content */}
          <div className="flex flex-col gap-2.5">
            {/* Search Bar & Filter */}
            <div className="w-full max-w-sm mx-auto flex flex-col gap-1 px-0.5">
              
              {/* Search Input */}
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                <input
                  placeholder="Cari barang atau unit..."
                  defaultValue={currentSearch}
                  onChange={handleSearchChange}
                  className="w-full bg-card/70 border border-border/60 backdrop-blur-md 
                             pl-9 pr-4 h-8 text-[11px] font-medium focus:outline-none 
                             placeholder:text-muted-foreground rounded-full
                             focus:border-primary/50 focus:bg-background/90 transition-all"
                />
              </div>

              {!selectedImage && currentSearch.trim().length > 0 && brands.length > 0 && (
                <div className="flex flex-col gap-1 transition-all">
                  <div 
                    className="flex gap-1.5 overflow-x-auto pb-1 max-w-full scroll-smooth no-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    <button
                      onClick={() => setSelectedMerk('all')}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        selectedMerk === 'all'
                          ? 'bg-[#C6FF00] text-black'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-foreground'
                      }`}
                    >
                      Semua
                    </button>
                    {brands.map(brand => (
                      <button
                        key={brand}
                        onClick={() => setSelectedMerk(selectedMerk === brand ? 'all' : brand)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                          selectedMerk === brand
                            ? 'bg-[#C6FF00] text-black'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-foreground'
                        }`}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex justify-center w-full">
              <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-card/70 border border-border/40 backdrop-blur-md">
                <button 
                  onClick={() => setActiveTab('pricelist')}
                  className={cn(
                    "px-4 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-300",
                    activeTab === 'pricelist' 
                      ? 'bg-[#C6FF00] text-black shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Pricelist
                </button>
                <button 
                  onClick={() => setActiveTab('gea')}
                  className={cn(
                    "px-4 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-300",
                    activeTab === 'gea' 
                      ? 'bg-[#C6FF00] text-black shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Gea & Getra
                </button>
              </div>
            </div>

            {/* Content Results */}
            <div className="mt-0">
              {selectedImage ? (
                <ImageDetailView 
                  image={selectedImage} 
                  imageList={currentImageList}
                  onBack={() => setSelectedImage(null)}
                  onSelectImage={(img) => setSelectedImage(img)}
                />
              ) : (
                <>
                  {activeTab === 'pricelist' && (
                    <PricelistPage searchQuery={currentSearch} sortBy={sortBy} selectedMerk={selectedMerk} />
                  )}
                  {activeTab === 'gea' && (
                    <GeaGetraPage 
                      searchQuery={currentSearch} 
                      selectedMerk={selectedMerk}
                      onImageClick={(img, list) => {
                        setSelectedImage(img);
                        setCurrentImageList(list);
                      }} 
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}