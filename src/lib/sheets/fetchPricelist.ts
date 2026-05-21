/// <reference types="vite/client" />
import { Product } from '../../types/pricelist';

// Fallback ID GSheet, bisa diganti lewat environment VITE_PRICELIST_SHEET_ID
const DEFAULT_SHEET_ID = "16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc"; 

export function extractSpreadsheetId(idOrUrl: string): string {
  const clean = idOrUrl.trim();
  if (clean.includes('/d/')) {
    const parts = clean.split('/d/');
    if (parts[1]) {
      return parts[1].split('/')[0];
    }
  }
  return clean;
}

export async function fetchPricelist(): Promise<Product[]> {
  const rawId = import.meta.env.VITE_PRICELIST_SHEET_ID || DEFAULT_SHEET_ID;
  const sheetId = extractSpreadsheetId(rawId);
  
  // Menggunakan API GViz Google Docs untuk raw data tanpa publis JSON ribet
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=List%20Harga`;

  try {
    const response = await fetch(sheetUrl, {
      method: "GET",
      // Important to omit credentials and specify mode to avoid CORS/Cookie issues on public sheets
      credentials: "omit",
      mode: "cors",
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const text = await response.text();
    
    // Extract the JSON object from the function call wrapper google.visualization.Query.setResponse(...)
    const jsonString = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
    const jsonObject = JSON.parse(jsonString);

    if (!jsonObject.table || !jsonObject.table.rows || !jsonObject.table.cols) {
      throw new Error("Format JSON Google Sheets tidak valid. Pastikan sheet berisi tabel data.");
    }

    const headers = jsonObject.table.cols.map((col: any) => (col.label || '').toUpperCase().trim());
    
    const merkIndex = headers.indexOf('MERK');
    const typeIndex = headers.indexOf('TYPE');
    const modelIndex = headers.indexOf('MODEL');
    const fiturIndex = headers.indexOf('FITUR') !== -1 ? headers.indexOf('FITUR') : headers.indexOf('SPEKSIFIKASI / FITUR');
    const hargaIndex = headers.indexOf('JUAL'); 
    const captionIndex = headers.indexOf('CAPTION') !== -1 ? headers.indexOf('CAPTION') : headers.indexOf('KET');

    return jsonObject.table.rows.map((row: any, index: number) => {
      const getVal = (idx: number) => {
        if (idx === -1 || !row.c || !row.c[idx]) return '';
        return row.c[idx].v?.toString() || '';
      };

      const getFormattedVal = (idx: number) => {
        if (idx === -1 || !row.c || !row.c[idx]) return '0';
        return row.c[idx].f || row.c[idx].v?.toString() || '0';
      };

      // Map to internal Product type while keeping original fields for the calculator
      return {
        id: index.toString(),
        merk: getVal(merkIndex),
        type: getVal(typeIndex),
        model: getVal(modelIndex),
        fitur: getVal(fiturIndex),
        jual: getFormattedVal(hargaIndex),
        caption: getVal(captionIndex),
        // Legacy compatibility
        nama: `${getVal(modelIndex)} ${getVal(typeIndex)}`.trim() || "Tanpa Nama",
        kategori: getVal(merkIndex) || "Umum",
        harga: parseFloat(getVal(hargaIndex).replace(/[^0-9.]/g, '')) || 0,
        marginRate: 0.3, // default
        deskripsi: getVal(fiturIndex)
      };
    });
  } catch (error: any) {
    console.error("Gagal mengambil data pricelist:", error);
    if (error.message === "Failed to fetch") {
      throw new Error("Gagal terhubung ke Google Sheets. Pastikan akses Spreadsheet diset ke 'Siapa saja yang memiliki link dapat melihat' (Public) atau periksa koneksi internet Anda.");
    }
    throw error;
  }
}
