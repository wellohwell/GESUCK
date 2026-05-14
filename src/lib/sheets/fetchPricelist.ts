import { Product } from '../../types/pricelist';

// Fallback ID GSheet, bisa diganti lewat environment VITE_PRICELIST_SHEET_ID
const DEFAULT_SHEET_ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"; 
const GID = "0"; 

export async function fetchPricelist(): Promise<Product[]> {
  const sheetId = import.meta.env.VITE_PRICELIST_SHEET_ID || DEFAULT_SHEET_ID;
  
  // Menggunakan API GViz Google Docs untuk raw data tanpa publis JSON ribet
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${GID}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    // Mengupas callback string bawaan GViz ( /*O_o*/ )
    const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonString);

    if (!data.table || !data.table.rows) return [];

    return data.table.rows.map((row: any, index: number) => ({
      id: row.c[0]?.v?.toString() || index.toString(),
      nama: row.c[1]?.v?.toString() || "Tanpa Nama",
      kategori: row.c[2]?.v?.toString() || "Umum",
      harga: Number(row.c[3]?.v) || 0,
      marginRate: Number(row.c[4]?.v) || 0.3,
      gambarUrl: row.c[5]?.v?.toString() || "",
      deskripsi: row.c[6]?.v?.toString() || "",
    }));
  } catch (error) {
    console.error("Gagal mengambil data pricelist:", error);
    return [];
  }
}
