import { useState, useEffect, useMemo } from 'react';
import { fetchPricelist } from '../lib/sheets/fetchPricelist';
import { Product } from '../types/pricelist';
import { useRuntime } from '../providers/RuntimeProvider';

export function usePricelist() {
  const { runtime, loading: runtimeLoading } = useRuntime();
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    fetchPricelist(sheetId, sheetName).then(res => {
      if (isMounted) {
        setData(res);
        setLoading(false);
      }
    }).catch(err => {
      if (isMounted) {
        setError(err.message);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [sheetId, sheetName, runtimeLoading]);

  const categories = useMemo(() => {
    // Generate unique tags/category from data
    const cats = Array.from(new Set(data.map(d => d.kategori)));
    return ['Semua', ...cats];
  }, [data]);

  return { data, categories, loading, error };
}
