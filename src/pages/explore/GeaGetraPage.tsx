import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, PackageX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ImageData } from '../../components/explore/ImageDetailView';

interface GeaGetraItem {
  filename: string;
  caption: string;
  gdrive_link: string;
  imageUrl?: string;
  id: string;
  url: string;
  title: string;
  fullResUrl?: string; 
  source: string;
}

const parseGoogleSheetJSON = (jsonString: string): { data: GeaGetraItem[], error: string | null } => {
  try {
    const jsonObject = JSON.parse(jsonString.substring(jsonString.indexOf('(') + 1, jsonString.lastIndexOf(')')));
    
    if (!jsonObject.table || !jsonObject.table.rows) {
      throw new Error("Invalid Google Sheets JSON format.");
    }

    const data = jsonObject.table.rows.map((row: any, index: number): GeaGetraItem => {
        const filename = row.c[0]?.v ?? '';
        const caption = row.c[1]?.v ?? '';
        const gdrive_link = row.c[2]?.v ?? '';
        return {
            filename: filename,
            caption: caption,
            gdrive_link: gdrive_link,
            id: `${filename}-${gdrive_link}-${index}`,
            url: gdrive_link, 
            title: caption || filename,
            source: 'Google Drive (GEA & GETRA)',
        }
    }).filter((item: any) => item.gdrive_link); 

    return { data, error: null };
  } catch (e: any) {
    console.error("Failed to parse Google Sheet JSON:", e);
    return { data: [], error: e.message || "Gagal memproses data dari Google Sheet." };
  }
};

const convertToThumbnailLink = (url: string): string => {
    if (!url) return '';
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}`;
    }
    return '';
};


const ImageCard = ({ item, onClick }: { item: GeaGetraItem, onClick: () => void, key?: string | number }) => {
  const [isError, setIsError] = useState(false);
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


export default function GeaGetraPage({ searchQuery, onImageClick }: { searchQuery: string, onImageClick: (image: ImageData, imageList: ImageData[]) => void }) {
  const [data, setData] = useState<GeaGetraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/16ifxXxqttStNA4sYIJfDoV6Rw5fX0z8A5tcDd9U1BXQ/gviz/tq?tqx=out:json&sheet=CACHE');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        const { data: parsedData, error: parseError } = parseGoogleSheetJSON(text);

        if (parseError) {
          setError(parseError);
        } else {
           setData(parsedData);
        }

      } catch (e: any) {
        console.error("Fetch error:", e);
        setError(e.message || "Gagal mengambil data dari Google Sheet.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    if (!searchQuery) return [];
    const searchTerms = searchQuery.toLowerCase().split(' ').filter(term => term.trim() !== '');
    if (searchTerms.length === 0) return [];

    return data.filter((item: GeaGetraItem) => {
      const combinedText = `${(item.caption || '').toLowerCase()} ${(item.filename || '').toLowerCase()}`;
      return searchTerms.every(term => combinedText.includes(term));
    });
  }, [searchQuery, data]);
  
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
    <div className="w-full pb-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredData.map((item) => (
                <ImageCard key={item.id} item={item} onClick={() => handleImageClick(item)} />
            ))}
        </div>
    </div>
  );
}
