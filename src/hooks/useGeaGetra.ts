import { useState, useEffect } from 'react';
import { useRuntime } from '../providers/RuntimeProvider';

export interface GeaGetraItem {
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

// Global memory cache to keep state alive across component re-mounts
let cachedGeaGetra: GeaGetraItem[] | null = null;
const GEA_STORAGE_KEY = 'vorkteam_cached_geagetra';

function getInitialGeaGetra(): GeaGetraItem[] {
  if (cachedGeaGetra) return cachedGeaGetra;
  try {
    const raw = localStorage.getItem(GEA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedGeaGetra = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load geagetra from localStorage:', e);
  }
  return [];
}

export function useGeaGetra() {
  const { runtime, loading: runtimeLoading } = useRuntime();
  const [data, setData] = useState<GeaGetraItem[]>(getInitialGeaGetra);
  const [loading, setLoading] = useState(() => {
    const initial = getInitialGeaGetra();
    return initial.length === 0;
  });
  const [error, setError] = useState<string | null>(null);

  const exploreConfig = runtime?.modules?.explore;
  const sheetId = exploreConfig?.geaDatasource?.spreadsheetId || null;
  const sheetName = encodeURIComponent(exploreConfig?.geaDatasource?.sheetName || "CACHE");

  useEffect(() => {
    if (runtimeLoading) return;
    if (!sheetId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      const initialData = getInitialGeaGetra();
      if (initialData.length === 0) {
        setLoading(true);
      }
      setError(null);
      try {
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        const { data: parsedData, error: parseError } = parseGoogleSheetJSON(text);

        if (!isMounted) return;

        if (parseError) {
          if (data.length === 0) {
            setError(parseError);
          }
        } else {
          setData(parsedData);
          cachedGeaGetra = parsedData;
          try {
            localStorage.setItem(GEA_STORAGE_KEY, JSON.stringify(parsedData));
          } catch (e) {
            console.warn('Failed to save geagetra to localStorage:', e);
          }
        }

      } catch (e: any) {
        if (!isMounted) return;
        if (data.length === 0) {
          setError("Koneksi ke Google Sheets diblokir atau bermasalah (Kemungkinan CORS atau offline).");
        } else {
          console.warn('Background geagetra update failed, using stale cache:', e);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [sheetId, sheetName, runtimeLoading]);

  return { data, loading, error };
}
