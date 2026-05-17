import React, { useMemo } from 'react';
import { Loader2, PackageX } from 'lucide-react';
import { motion } from 'motion/react';
import type { ImageData } from '../../components/explore/ImageDetailView';
import { useGeaGetra, GeaGetraItem } from '../../hooks/useGeaGetra';

const convertToThumbnailLink = (url: string): string => {
    if (!url) return '';
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}`;
    }
    return '';
};


const ImageCard = ({ item, onClick }: { item: GeaGetraItem, onClick: () => void, key?: string | number }) => {
  const [isError, setIsError] = React.useState(false);
  const thumbnailUrl = useMemo(() => convertToThumbnailLink(item.url || ''), [item.url]);

  if (!thumbnailUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full aspect-square cursor-pointer overflow-hidden rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 group"
      onClick={onClick}
    >
        {isError ? (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-center p-2 text-zinc-400">
                Gagal memuat
            </div>
        ) : (
            <img
                src={thumbnailUrl}
                alt={item.caption}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                onError={() => setIsError(true)}
            />
        )}
    </motion.div>
  );
};


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
      <div className="p-8 text-center bg-red-50 dark:bg-red-500/10 rounded-2xl max-w-sm mx-auto mt-10">
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
            <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-4">
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
            {filteredData.map((item) => (
                <ImageCard key={item.id} item={item} onClick={() => handleImageClick(item)} />
            ))}
        </div>
    </div>
  );
}

