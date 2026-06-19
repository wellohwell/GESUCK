import { useState, useEffect, useMemo } from 'react';
import { fetchPricelist } from '../lib/sheets/fetchPricelist';
import { Product } from '../types/pricelist';
import { useRuntime } from '../providers/RuntimeProvider';

// Global memory cache to keep state alive across component re-mounts
let cachedPricelist: Product[] | null = null;
const STORAGE_KEY = 'vorkteam_cached_pricelist';

function getInitialPricelist(): Product[] {
  if (cachedPricelist) return cachedPricelist;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedPricelist = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load pricelist from localStorage:', e);
  }
  return [];
}

export function usePricelist() {
  const { runtime, loading: runtimeLoading } = useRuntime();
  const [data, setData] = useState<Product[]>(getInitialPricelist);
  const [loading, setLoading] = useState(() => {
    const initial = getInitialPricelist();
    return initial.length === 0;
  });
  const [error, setError] = useState<string | null>(null);

  const exploreConfig = runtime?.modules?.explore;
  const sheetId = exploreConfig?.datasource?.spreadsheetId || null;
  const sheetName = exploreConfig?.datasource?.sheetName || null;

  useEffect(() => {
    if (runtimeLoading) return;

    if (!sheetId) {
      setData([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    
    // If we have no cache yet, show loading spinner immediately
    const initialData = getInitialPricelist();
    if (initialData.length === 0) {
      setLoading(true);
    }

    const loadData = () => {
      fetchPricelist(sheetId, sheetName).then(res => {
        if (isMounted) {
          setData(res);
          setLoading(false);
          cachedPricelist = res;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
          } catch (e) {
            console.warn('Failed to save pricelist to localStorage:', e);
          }
        }
      }).catch(err => {
        if (isMounted) {
          // If we already have cached data in state, do not override with a hard blocking error
          if (data.length === 0) {
            setError(err.message);
          } else {
            console.warn('Background pricelist update failed, using stale cache:', err);
          }
          setLoading(false);
        }
      });
    };

    loadData();

    // Listen to background sync / app resume events
    const handleResumeSync = () => {
      console.log("[usePricelist] App resume detected! Triggering background update...");
      loadData();
    };

    window.addEventListener("pwa_app_resume", handleResumeSync);

    return () => { 
      isMounted = false; 
      window.removeEventListener("pwa_app_resume", handleResumeSync);
    };
  }, [sheetId, sheetName, runtimeLoading]);

  const categories = useMemo(() => {
    // Generate unique tags/category from data
    const cats = Array.from(new Set(data.map(d => d.kategori)));
    return ['Semua', ...cats];
  }, [data]);

  return { data, categories, loading, error };
}
