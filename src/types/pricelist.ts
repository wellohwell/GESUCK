export interface Product {
  id: string;
  nama: string;
  kategori: string;
  harga: number;
  marginRate: number; // contoh: 0.3 untuk margin 30% pada hutang
  gambarUrl: string;
  deskripsi?: string;
}

export interface SimulationConfig {
  dpPribadi: number;
  subsidi: number;
  tenor: number;
}

export interface SimulationResult {
  pokokHutang: number;
  totalMargin: number;
  totalHutang: number;
  angsuranPerBulan: number;
  totalOmset: number;
}
