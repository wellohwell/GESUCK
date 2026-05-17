import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ArrowUpDown } from 'lucide-react';
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
  
  // Tab handling menggunakan state lokal (kompatibel penuh dengan Vite/React Router)
  const [activeTab, setActiveTab] = useState<'pricelist' | 'gea'>('pricelist');
  const [sortBy, setSortBy] = useState<SortType>('default');
  const [selectedMerk, setSelectedMerk] = useState<string>('all');

  // Extract unique brands dynamically based on search and current data source
  const brands = useMemo(() => {
    let sourceData = [];
    
    if (activeTab === 'pricelist') {
      if (!pricelistData) return [];
      sourceData = pricelistData;

      // Apply search filter to sourceData to get contextual brands
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

      // Apply search filter
      if (currentSearch.trim()) {
        const searchTerms = currentSearch.toLowerCase().split(' ').filter(term => term.trim() !== '');
        sourceData = sourceData.filter(item => {
          const combinedText = `${(item.caption || '').toLowerCase()} ${(item.filename || '').toLowerCase()}`;
          return searchTerms.every(term => combinedText.includes(term));
        });
      }

      // For GEA/GETRA, we can try to extract brands from the caption or filename
      // Common brands in GEA/GETRA sheet
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


  // Reset state when tab changes
  React.useEffect(() => {
    setSelectedImage(null);
    setSelectedMerk('all');
  }, [activeTab]);

  // Handle resetting selectedMerk if it's not in the dynamic brands list
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
    <div className={`min-h-screen ${isMobile ? 'bg-black' : 'bg-background'} text-foreground flex flex-col font-sans transition-colors duration-300`}>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-3 sm:pt-6">
        <div className="flex flex-col gap-4">
            
            {/* Header / Logo */}
            <div className="flex flex-col items-center justify-center">
                <div className="relative">
                  {!isMobile && <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-75" />}
                  <img
                      src="/login-illustration.png"
                      alt="Logo"
                      className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-2xl relative z-10"
                      referrerPolicy="no-referrer"
                  />
                </div>
                <h1 className="mt-2 text-xl font-black uppercase tracking-[0.4em] text-foreground transition-all">VORK</h1>
                <div className="h-0.5 w-6 bg-primary rounded-full mt-1" />
            </div>

            {/* Sticky Search Bar & Filter Row */}
            <div className="sticky top-2 z-40 w-full max-w-sm mx-auto flex flex-col gap-2">
              <div className="p-0.5 rounded-xl floating-panel transition-all">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        placeholder="Cari barang atau unit..."
                        defaultValue={currentSearch}
                        onChange={handleSearchChange}
                        className="w-full bg-transparent border-none pl-11 pr-5 h-8 text-[9px] font-black focus:outline-none text-foreground placeholder:text-muted-foreground/50 uppercase tracking-widest"
                    />
                </div>
              </div>

              {!selectedImage && (
                <div className="flex items-center gap-2 justify-center">
                  {/* Merk Dropdown */}
                  <div className="relative group/select min-w-[100px]">
                    <select
                      value={selectedMerk}
                      onChange={(e) => setSelectedMerk(e.target.value)}
                      className="w-full appearance-none bg-muted/10 border border-border/20 rounded-lg px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-foreground focus:outline-none focus:border-primary/40 focus:bg-muted/20 transition-all cursor-pointer"
                    >
                      <option value="all">MERK</option>
                      {brands.map(brand => (
                        <option key={brand} value={brand || ''}>{brand?.toUpperCase()}</option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                      <ArrowUpDown className="w-2 h-2" />
                    </div>
                  </div>

                  {/* Harga/Sort Dropdown */}
                  {activeTab === 'pricelist' && (
                    <div className="relative group/select min-w-[100px]">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortType)}
                        className="w-full appearance-none bg-muted/10 border border-border/20 rounded-lg px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-foreground focus:outline-none focus:border-primary/40 focus:bg-muted/20 transition-all cursor-pointer"
                      >
                        {sortOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                        <ArrowUpDown className="w-2 h-2" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Custom Tabs List */}
            <div className="flex justify-center w-full">
              <div className="inline-flex items-center justify-center p-1 bg-muted/50 rounded-xl border border-border/40">
                <button 
                  onClick={() => setActiveTab('pricelist')}
                  className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'pricelist' ? 'bg-background shadow-soft text-foreground scale-[1.02]' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Pricelist
                </button>
                <button 
                  onClick={() => setActiveTab('gea')}
                  className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'gea' ? 'bg-background shadow-soft text-foreground scale-[1.02]' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Gea & Getra
                </button>
              </div>
            </div>

            {/* Tabs Content */}
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
