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

export function useGeaGetra() {
  const { runtime, loading: runtimeLoading } = useRuntime();
  const [data, setData] = useState<GeaGetraItem[]>([]);
  const [loading, setLoading] = useState(true);
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

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}`);
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
  }, [sheetId, sheetName, runtimeLoading]);

  return { data, loading, error };
}
