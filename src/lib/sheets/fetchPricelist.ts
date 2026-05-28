/// <reference types="vite/client" />
import { Product } from '../../types/pricelist';

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

export async function fetchPricelist(customSpreadsheetId?: string | null, customSheetName?: string | null): Promise<Product[]> {
  if (!customSpreadsheetId) {
    throw new Error("Konfigurasi spreadsheetId tidak ditemukan. Tidak dapat mengambil data.");
  }
  const sheetId = extractSpreadsheetId(customSpreadsheetId);
  const sheetName = customSheetName || "List Harga";
  
  let text = '';
  let fetchedSuccessful = false;
  let fetchErrorMsg = '';

  // 1. Coba lewat proxy API backend terlebih dahulu
  const proxyUrl = `/api/pricelist?sheetId=${sheetId}&sheetName=${encodeURIComponent(sheetName)}`;
  try {
    console.log("Mencoba mengambil pricelist melalui proxy:", proxyUrl);
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const resText = await response.text();
      const trimmed = resText.trim();
      const isHtml = trimmed.startsWith('<!') || 
                     trimmed.toLowerCase().includes('<html') || 
                     trimmed.toLowerCase().includes('<body') || 
                     trimmed.toLowerCase().includes('<div');
      
      if (!isHtml) {
        text = resText;
        fetchedSuccessful = true;
      } else {
        console.warn("Proxy mengembalikan dokumen HTML (kemungkinan static routing fallback). Mencoba Direct Google Sheets URL...");
      }
    } else {
      console.warn(`Proxy mengembalikan HTTP status ${response.status}. Mencoba Direct Google Sheets URL...`);
    }
  } catch (err: any) {
    console.warn("Gagal fetching dari proxy:", err);
  }

  // 2. Jika proxy gagal atau mengembalikan HTML (misal karena static hosting), coba fetch langsung dari Google Sheets
  if (!fetchedSuccessful) {
    const directUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    try {
      console.log("Mencoba mengambil pricelist secara langsung:", directUrl);
      const response = await fetch(directUrl);
      if (!response.ok) {
        throw new Error(`Direct fetch HTTP error! status: ${response.status}`);
      }
      const resText = await response.text();
      const trimmed = resText.trim();
      const isHtml = trimmed.startsWith('<!') || 
                     trimmed.toLowerCase().includes('<html') || 
                     trimmed.toLowerCase().includes('<body') || 
                     trimmed.toLowerCase().includes('<div');
      
      if (isHtml) {
        throw new Error(`Google Sheets mengembalikan halaman web (HTML). Pastikan spreadsheet diset ke "Siapa saja yang memiliki link dapat melihat" (Public/Pembaca) dan Nama Sheet "${sheetName}" sudah tertera dengan benar di Spreadsheet.`);
      }
      text = resText;
      fetchedSuccessful = true;
    } catch (err: any) {
      console.error("Gagal fetching secara langsung dari Google Sheets:", err);
      fetchErrorMsg = err.message || "Gagal mengambil data.";
    }
  }

  if (!fetchedSuccessful) {
    throw new Error(
      fetchErrorMsg || 
      `Google Sheets mengembalikan halaman web (HTML) atau tidak dapat diakses. Pastikan spreadsheet diset ke "Siapa saja yang memiliki link dapat melihat" (Public/Pembaca) dan Nama Sheet "${sheetName}" sudah benar.`
    );
  }

  try {
    let jsonString = '';
    let jsonObject: any = null;

    if (text.includes('google.visualization.Query.setResponse')) {
      const startIdx = text.indexOf('(');
      const endIdx = text.lastIndexOf(')');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonString = text.substring(startIdx + 1, endIdx);
      } else {
        jsonString = text;
      }
    } else {
      jsonString = text;
    }

    try {
      jsonObject = JSON.parse(jsonString);
    } catch (parseError: any) {
      const sampleText = text.substring(0, 100).replace(/\r?\n|\r/g, " ");
      throw new Error(`Data tidak dapat diparse sebagai JSON. Pastikan ID Spreadsheet "${sheetId}" benar. (Cuplikan data: "${sampleText}...")`);
    }

    if (!jsonObject || !jsonObject.table || !jsonObject.table.rows || !jsonObject.table.cols) {
      throw new Error("Format data Google Sheets tidak berisi tabel yang valid. Pastikan Spreadsheet memiliki kolom dan baris yang sesuai.");
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
