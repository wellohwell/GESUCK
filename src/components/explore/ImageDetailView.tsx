import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Share2, AlertTriangle, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';

export interface ImageData {
  id: string;
  title: string;
  url: string;
  source?: string;
}

// Using a reliable image proxy to handle CORS and formatting issues
const getProxiedUrl = (url: string | undefined): string => {
    if (!url) return '';
    // For Google Drive links, we need to ensure we use a direct-ish link for the proxy
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
        // Construct a known good URL format for google user content before proxying
        const gdriveUrl = `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
        return `https://images.weserv.nl/?url=${encodeURIComponent(gdriveUrl)}`;
    }
    // For other URLs, proxy them directly
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
};


const getThumbnailUrl = (url: string | undefined): string => {
    if (!url) return '';
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}`;
    }
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=200&h=200&fit=cover`;
};

const MainImage = ({ src, alt }: { src: string; alt: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  
  useEffect(() => {
    setIsLoaded(false);
    setIsError(false);
  }, [src]);

  return (
    <div className="w-full aspect-square relative bg-zinc-100 dark:bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden">
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-zinc-200 dark:bg-white/10 animate-pulse rounded-2xl" />
      )}
      {isError && (
        <div className="text-center text-red-500 p-4 flex flex-col items-center gap-2">
            <AlertTriangle className="w-8 h-8" />
            <p className="text-sm font-semibold">Gagal memuat gambar</p>
            <p className="text-xs opacity-70">Link mungkin rusak atau memerlukan izin.</p>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
            'w-full h-full object-contain transition-opacity duration-300', 
            isLoaded && !isError ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsError(true)}
        crossOrigin="anonymous"
      />
    </div>
  );
};

const RelatedImagesGrid = ({ images, onSelect, currentImageId }: { images: ImageData[]; onSelect: (image: ImageData) => void; currentImageId: string; }) => (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
      {images.map(img => (
        <button 
          key={img.id} 
          onClick={() => onSelect(img)} 
          className={cn(
            "w-full aspect-square bg-secondary rounded-lg overflow-hidden relative transition-all",
             img.id === currentImageId ? "ring-2 ring-primary scale-95" : "hover:opacity-80"
          )}
        >
          <img src={getThumbnailUrl(img.url)} alt={img.title} className="w-full h-full object-cover" loading="lazy" />
        </button>
      ))}
    </div>
);

interface ImageDetailViewProps {
    image: ImageData;
    imageList: ImageData[];
    onBack: () => void;
    onSelectImage: (image: ImageData) => void;
}

export function ImageDetailView({ image, imageList, onBack, onSelectImage }: ImageDetailViewProps) {
  const [mainImage, setMainImage] = useState(image);

  useEffect(() => {
    setMainImage(image);
  }, [image]);

  const proxiedUrl = getProxiedUrl(mainImage.url);

  const handleDownload = async () => {
    if (!proxiedUrl) {
      toast.error('URL gambar tidak valid.');
      return;
    }
    const toastId = toast.loading('Mengunduh gambar...');
    try {
      const response = await fetch(proxiedUrl);
      if (!response.ok) throw new Error(`Gagal mengambil gambar: ${response.statusText}`);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const fileName = (mainImage.title.replace(/[^a-zA-Z0-9\s]/g, '') || 'image') + '.jpg';
      link.href = url;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Gambar berhasil diunduh!', { id: toastId });
    } catch (error) {
      console.error('Gagal mengunduh gambar:', error);
      window.open(proxiedUrl, '_blank');
      toast.error('Gagal mengunduh otomatis. Coba simpan manual.', { id: toastId });
    }
  };

  const handleShare = async () => {
    if (!proxiedUrl) {
      toast.error("URL Gambar tidak valid.");
      return;
    }

    if (!navigator.share) {
      toast.error("Berbagi tidak didukung. Link disalin.");
      navigator.clipboard.writeText(mainImage.url);
      return;
    }

    const toastId = toast.loading("Mempersiapkan gambar...");
    try {
      const response = await fetch(proxiedUrl);
      const blob = await response.blob();
      const file = new File([blob], 'image.jpg', { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: mainImage.title,
          text: `Lihat gambar ini: ${mainImage.title}`,
        });
        toast.dismiss(toastId);
      } else {
        await navigator.share({
            title: mainImage.title,
            text: `Lihat gambar ini: ${mainImage.title}`,
            url: mainImage.url,
        });
        toast.dismiss(toastId);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Gagal membagikan:', error);
        toast.error("Gagal membagikan link.", { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    }
  };


  return (
    <div className="w-full space-y-4 max-w-lg mx-auto">
      <header className="flex items-center gap-3">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest truncate">{mainImage.title}</span>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
            key={mainImage.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
        >
            <MainImage src={proxiedUrl} alt={mainImage.title} />
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={handleDownload} 
          className="flex items-center justify-center gap-2 py-3 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-900 dark:text-white rounded-2xl transition-all"
        >
            <Download className="w-4 h-4"/>
            <span className="text-xs font-bold">Unduh</span>
        </button>
         <button 
            onClick={handleShare} 
            className="flex items-center justify-center gap-2 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl transition-all hover:opacity-90"
         >
            <Share2 className="w-4 h-4"/>
            <span className="text-xs font-bold">Bagikan</span>
        </button>
      </div>

      {imageList.length > 1 && (
          <div className="space-y-3 pt-6">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-center text-zinc-400 dark:text-zinc-500">Gambar Terkait</h2>
            <RelatedImagesGrid images={imageList} onSelect={onSelectImage} currentImageId={mainImage.id} />
          </div>
      )}
    </div>
  );
}
