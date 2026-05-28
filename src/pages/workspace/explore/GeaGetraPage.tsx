import React, { useMemo } from 'react';
import { Loader2, PackageX } from 'lucide-react';
import { motion } from 'motion/react';
import type { ImageData } from '../../../components/explore/ImageDetailView';
import { useGeaGetra, GeaGetraItem } from '../../../hooks/useGeaGetra';

const convertToThumbnailLink = (url: string): string => {
    if (!url) return '';
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}`;
    }
    return '';
};


const ImageCard = React.memo(({ item, onClick }: { item: GeaGetraItem, onClick: () => void, key?: string | number }) => {
  const [isError, setIsError] = React.useState(false);
  const thumbnailUrl = useMemo(() => convertToThumbnailLink(item.url || ''), [item.url]);

  if (!thumbnailUrl) return null;

  return (
    <motion.div
      className="w-full aspect-square cursor-pointer overflow-hidden rounded-xl bg-zinc-100 dark:bg-card/5 group"
      onClick={onClick}
    >
        {isError ? (
            <div className="w-full h-full flex items-center justify-center text-[9px] text-center p-2 text-zinc-400 font-bold uppercase tracking-tighter">
                Gagal memuat
            </div>
        ) : (
            <img
                src={thumbnailUrl}
                alt={item.caption}
                className="w-full h-full object-cover transition-transform duration-500 will-change-transform"
                loading="lazy"
                onError={() => setIsError(true)}
            />
        )}
    </motion.div>
  );
});

ImageCard.displayName = "ImageCard";


export default function GeaGetraPage({ 
  searchQuery, 
  onImageClick,
  selectedMerk
}: { 
  searchQuery: string, 
  onImageClick: (image: ImageData, imageList: ImageData[]) => void,
  selectedMerk?: string 
}) {
  const { data, loading, error } = useGeaGetra();
  const [displayLimit, setDisplayLimit] = React.useState(20);
  
  const filteredData = useMemo(() => {
    if (!searchQuery) return [];
    const searchTerms = searchQuery.toLowerCase().split(' ').filter(term => term.trim() !== '');
    if (searchTerms.length === 0) return [];

    return data.filter((item: GeaGetraItem) => {
      // 1. Contextual search filter
      const combinedText = `${(item.caption || '').toLowerCase()} ${(item.filename || '').toLowerCase()}`;
      const matchesSearch = searchTerms.every(term => combinedText.includes(term));
      if (!matchesSearch) return false;

      // 2. Merk filter
      if (selectedMerk && selectedMerk !== 'all') {
        const textToSearch = `${item.caption} ${item.filename}`.toUpperCase();
        if (!textToSearch.includes(selectedMerk.toUpperCase())) return false;
      }

      return true;
    });
  }, [searchQuery, data, selectedMerk]);

  // Reset limit on search change
  React.useEffect(() => {
    setDisplayLimit(20);
  }, [searchQuery, selectedMerk]);

  const displayedData = useMemo(() => filteredData.slice(0, displayLimit), [filteredData, displayLimit]);
  
  const handleImageClick = (clickedItem: GeaGetraItem) => {
    const imageList: ImageData[] = filteredData.map(item => ({
        id: item.id,
        url: item.gdrive_link,
        title: item.title,
        source: item.source,
    }));
    const selectedImageData: ImageData = {
        id: clickedItem.id,
        url: clickedItem.gdrive_link,
        title: clickedItem.title,
        source: clickedItem.source,
    };
    onImageClick(selectedImageData, imageList);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-50">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-4" />
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Memuat Data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 dark:bg-red-500/10 rounded-[1.5rem] max-w-sm mx-auto mt-10">
          <p className="text-sm font-bold text-red-500">{error}</p>
      </div>
    );
  }
  
  if (!searchQuery.trim()) {
    return null;
  }

  if (filteredData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-card/5 flex items-center justify-center mb-4">
              <PackageX className="w-7 h-7 text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Gambar Tidak Ditemukan</h3>
            <p className="text-zinc-500 dark:text-white/50 text-sm max-w-xs">
              Tidak ditemukan gambar yang cocok dengan kata kunci kamu.
            </p>
      </div>
    );
  }
  
  return (
    <div className="w-full pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {displayedData.map((item) => (
                <ImageCard key={item.id} item={item} onClick={() => handleImageClick(item)} />
            ))}
        </div>
        
        {filteredData.length > displayLimit && (
          <div className="flex justify-center mt-6">
            <button 
              onClick={() => setDisplayLimit(prev => prev + 20)}
              className="px-8 h-10 rounded-full bg-zinc-100 dark:bg-card/5 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-foreground transition-all"
            >
              Lihat Lebih Banyak ({filteredData.length - displayLimit} lagi)
            </button>
          </div>
        )}
    </div>
  );
}

