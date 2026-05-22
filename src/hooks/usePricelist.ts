import { useState, useEffect, useMemo } from 'react';
import { fetchPricelist } from '../lib/sheets/fetchPricelist';
import { Product } from '../types/pricelist';
import { useAuth } from '../providers/AuthProvider';

export function usePricelist() {
  const { spreadsheetId } = useAuth();
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchPricelist(spreadsheetId).then(res => {
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
  }, [spreadsheetId]);

  const categories = useMemo(() => {
    // Generate unique tags/category from data
    const cats = Array.from(new Set(data.map(d => d.kategori)));
    return ['Semua', ...cats];
  }, [data]);

  return { data, categories, loading, error };
}
