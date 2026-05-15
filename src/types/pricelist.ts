export interface Product {
  id: string;
  nama: string;
  kategori: string;
  harga: number;
  marginRate: number;
  gambarUrl?: string;
  deskripsi?: string;
  // User provided fields
  merk?: string;
  type?: string;
  model?: string;
  fitur?: string;
  jual?: string;
  caption?: string;
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
