import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { usePricelist } from '../../hooks/usePricelist';
import { useGeaGetra } from '../../hooks/useGeaGetra';
import { PricelistPage } from './PricelistPage';
import GeaGetraPage from './GeaGetraPage';
import { ImageDetailView, ImageData } from '../../components/explore/ImageDetailView';

export type SortType = 'default' | 'merk_asc' | 'merk_desc' | 'price_low' | 'price_high';

export default function ExplorePage() {
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
  
  const currentSearch = searchParams.get('search') || '';
  
  const { data: pricelistData } = usePricelist();
  const { data: geaData } = useGeaGetra();
  
  const [activeTab, setActiveTab] = useState<'pricelist' | 'gea'>('pricelist');
  const [sortBy, setSortBy] = useState<SortType>('default');
  const [selectedMerk, setSelectedMerk] = useState<string>('all');

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-3 sm:pt-6">
        <div className="flex flex-col gap-4">
            
          {/* Header / Logo */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex flex-col w-fit items-center">
              <h1 className="mt-2 text-xl font-black uppercase tracking-[0.25em] text-foreground transition-all flex items-center gap-1">
                VORK<span className="font-normal text-foreground">TEAM</span>
              </h1>
              <div className="h-0.5 w-full bg-primary rounded-full mt-1" />
            </div>
          </div>

          {/* Sticky Search Bar & Filter */}
          <div className="sticky top-2 z-40 w-full max-w-sm mx-auto flex flex-col gap-2">
            
            {/* Search Input - Single Border Only */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
              <input
                placeholder="Cari barang atau unit..."
                defaultValue={currentSearch}
                onChange={handleSearchChange}
                className="w-full bg-card/70 border border-border/60 backdrop-blur-md 
                           pl-11 pr-5 h-11 text-sm font-medium focus:outline-none 
                           placeholder:text-muted-foreground rounded-2xl
                           focus:border-primary/50 focus:bg-background/90 transition-all"
              />
            </div>

            {!selectedImage && currentSearch.trim().length > 0 && brands.length > 0 && (
              <div className="flex flex-col gap-1.5 bg-card/65 border border-border/40 backdrop-blur-md p-2.5 rounded-2xl shadow-sm transition-all">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                  Merk Terkait ({brands.length})
                </span>
                <div 
                  className="flex gap-1.5 overflow-x-auto pb-1 max-w-full scroll-smooth"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <button
                    onClick={() => setSelectedMerk('all')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border whitespace-nowrap ${
                      selectedMerk === 'all'
                        ? 'bg-foreground text-background border-transparent'
                        : 'bg-background hover:bg-zinc-100 dark:hover:bg-zinc-850 border-border/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Semua
                  </button>
                  {brands.map(brand => (
                    <button
                      key={brand}
                      onClick={() => setSelectedMerk(selectedMerk === brand ? 'all' : brand)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border whitespace-nowrap ${
                        selectedMerk === brand
                          ? 'bg-primary text-primary-foreground border-transparent'
                          : 'bg-background hover:bg-zinc-100 dark:hover:bg-zinc-850 border-border/50 text-muted-foreground hover:text-foreground'
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
            <div className="inline-flex items-center justify-center gap-2">
              <button 
                onClick={() => setActiveTab('pricelist')}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'pricelist' 
                    ? 'bg-card shadow-soft text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pricelist
              </button>
              <button 
                onClick={() => setActiveTab('gea')}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'gea' 
                    ? 'bg-card shadow-soft text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Gea & Getra
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="mt-1">
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
      </main>
    </div>
  );
}