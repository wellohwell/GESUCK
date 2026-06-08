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

    let modelIndex = 1;
    let typeIndex = 4;
    let hargaIndex = 6; // Column G (0-indexed: G is 6)
    let fiturIndex = 7; // Column H (0-indexed: H is 7)
    let merkIndex = 8;  // Column I (0-indexed: I is 8)
    let captionIndex = 9; // Column J (0-indexed: J is 9)

    const isListHarga = sheetName.toUpperCase().includes("LIST HARGA");

    if (!isListHarga) {
      const findIndexByKeywords = (keywords: string[], defaultIdx: number) => {
        // 1. Check Row 0 cells (most reliable for "List Harga" when columns are empty in cols)
        if (jsonObject.table.rows && jsonObject.table.rows.length > 0 && jsonObject.table.rows[0].c) {
          for (let idx = 0; idx < jsonObject.table.rows[0].c.length; idx++) {
            const cell = jsonObject.table.rows[0].c[idx];
            const val = (cell?.f || cell?.v || '').toString().toUpperCase().trim();
            if (keywords.some(k => val.includes(k))) {
              return idx;
            }
          }
        }
        // 2. Check cols labels
        for (let idx = 0; idx < jsonObject.table.cols.length; idx++) {
          const val = (jsonObject.table.cols[idx].label || '').toUpperCase().trim();
          if (keywords.some(k => val.includes(k))) {
            return idx;
          }
        }
        return defaultIdx;
      };

      modelIndex = findIndexByKeywords(['MODEL'], 1);
      typeIndex = findIndexByKeywords(['TYPE'], 4);
      fiturIndex = findIndexByKeywords(['FITUR', 'SPEKSIFIKASI', 'SPEC'], 7);
      merkIndex = findIndexByKeywords(['MERK', 'BRAND'], 8);
      
      let detectedCaptionIndex = findIndexByKeywords(['CAPTION'], -1);
      if (detectedCaptionIndex === -1) {
        detectedCaptionIndex = findIndexByKeywords(['KET'], -1);
      }
      captionIndex = detectedCaptionIndex === -1 ? 9 : detectedCaptionIndex;

      // Smartly find harga Index
      let detectedHargaIndex = -1;
      if (jsonObject.table.rows && jsonObject.table.rows.length > 0 && jsonObject.table.rows[0].c) {
        for (let idx = 0; idx < jsonObject.table.rows[0].c.length; idx++) {
          const cell = jsonObject.table.rows[0].c[idx];
          const val = (cell?.f || cell?.v || '').toString().toUpperCase().trim();
          if (['JUAL', 'HARGA', 'CASH', 'PRICE'].some(k => val === k)) {
            detectedHargaIndex = idx;
            break;
          }
        }
      }
      if (detectedHargaIndex === -1) {
        for (let idx = 0; idx < jsonObject.table.cols.length; idx++) {
          const val = (jsonObject.table.cols[idx].label || '').toUpperCase().trim();
          if (['JUAL', 'HARGA', 'PRICE'].some(k => val.includes(k)) && !val.includes('FITUR') && !val.includes('SPEK')) {
            detectedHargaIndex = idx;
            break;
          }
        }
      }
      if (detectedHargaIndex === -1 && jsonObject.table.cols.length > 6) {
        // Default fallback for Column G (index 6) which contains the price in your List Harga sheet
        detectedHargaIndex = 6;
      }
      hargaIndex = detectedHargaIndex;
    }

    // Detect if Row 0 contains header names to skip it
    const firstRowIsHeader = jsonObject.table.rows[0]?.c?.some((cell: any) => {
      const val = (cell?.f || cell?.v || '').toString().toUpperCase().trim();
      return val === 'MODEL' || val === 'TYPE' || val === 'SPEKSIFIKASI / FITUR' || val === 'KET';
    }) || isListHarga;

    const startIndex = firstRowIsHeader ? 1 : 0;

    const parsedRows = jsonObject.table.rows.slice(startIndex).map((row: any, index: number) => {
      const getVal = (idx: number) => {
        if (idx === -1 || !row.c || !row.c[idx]) return '';
        return row.c[idx].v?.toString() || '';
      };

      const getFormattedVal = (idx: number) => {
        if (idx === -1 || !row.c || !row.c[idx]) return '0';
        return row.c[idx].f || row.c[idx].v?.toString() || '0';
      };

      const currentModel = getVal(modelIndex);
      const currentType = getVal(typeIndex);
      const currentFitur = getVal(fiturIndex);
      const currentMerk = getVal(merkIndex);
      const currentCaption = getVal(captionIndex);
      const currentHarga = getFormattedVal(hargaIndex);

      // Clean up price string to number
      const cleanPriceStr = getVal(hargaIndex).replace(/[^0-9]/g, '');
      const parsedPrice = parseFloat(cleanPriceStr) || 0;

      return {
        id: (index + startIndex).toString(),
        merk: currentMerk,
        type: currentType,
        model: currentModel,
        fitur: currentFitur,
        jual: currentHarga,
        caption: currentCaption,
        nama: `${currentModel} ${currentType}`.trim() || 'Tanpa Nama',
        kategori: currentMerk || 'Umum',
        harga: parsedPrice,
        marginRate: 0.3,
        deskripsi: currentFitur
      };
    });

    // Remove completely empty rows
    return parsedRows.filter((p: any) => p.model.trim() !== '' || p.type.trim() !== '');
  } catch (error: any) {
    console.error("Gagal mengambil data pricelist:", error);
    if (error.message === "Failed to fetch") {
      throw new Error("Gagal terhubung ke Google Sheets. Pastikan akses Spreadsheet diset ke 'Siapa saja yang memiliki link dapat melihat' (Public) atau periksa koneksi internet Anda.");
    }
    throw error;
  }
}
