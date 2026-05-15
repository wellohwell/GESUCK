import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PricelistPage } from './PricelistPage';
import GeaGetraPage from './GeaGetraPage';
import { ImageDetailView, ImageData } from '../../components/explore/ImageDetailView';

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [currentImageList, setCurrentImageList] = useState<ImageData[]>([]);
  
  const currentSearch = searchParams.get('search') || '';
  
  // Tab handling menggunakan state lokal (kompatibel penuh dengan Vite/React Router)
  const [activeTab, setActiveTab] = useState<'pricelist' | 'gea'>('pricelist');

  React.useEffect(() => {
    setSelectedImage(null);
  }, [activeTab]);

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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-10">
        <div className="flex flex-col gap-6">
            
            {/* Header / Logo */}
            <div className="flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-75" />
                  <img
                      src="/login-illustration.png"
                      alt="Logo"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl relative z-10"
                      referrerPolicy="no-referrer"
                  />
                </div>
                <h1 className="mt-4 text-2xl font-black uppercase tracking-[0.4em] text-foreground transition-all">VORK</h1>
                <div className="h-1 w-8 bg-primary rounded-full mt-2" />
            </div>

            {/* Sticky Search Bar */}
            <div className="sticky top-4 z-40 w-full max-w-sm mx-auto p-1 rounded-2xl floating-panel transition-all">
              <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                      placeholder="Cari barang atau unit..."
                      defaultValue={currentSearch}
                      onChange={handleSearchChange}
                      className="w-full bg-transparent border-none pl-11 pr-5 h-9 text-[10px] font-black focus:outline-none text-foreground placeholder:text-muted-foreground/50 uppercase tracking-widest"
                  />
              </div>
            </div>

            {/* Custom Tabs List */}
            <div className="flex justify-center w-full">
              <div className="inline-flex items-center justify-center p-1.5 bg-muted/50 rounded-2xl border border-border/40">
                <button 
                  onClick={() => setActiveTab('pricelist')}
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pricelist' ? 'bg-background shadow-soft text-foreground scale-[1.02]' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Pricelist
                </button>
                <button 
                  onClick={() => setActiveTab('gea')}
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'gea' ? 'bg-background shadow-soft text-foreground scale-[1.02]' : 'text-muted-foreground hover:text-foreground'}`}
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
                    <PricelistPage searchQuery={currentSearch} />
                  )}
                  {activeTab === 'gea' && (
                    <GeaGetraPage 
                      searchQuery={currentSearch} 
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
