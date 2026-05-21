export type Stage = 'survey' | 'acc' | 'archive';

export interface Order {
  id: string;
  nama: string;
  nomor: string;
  usaha?: string;
  alamat?: string;
  barang: string;
  angsuran: number;
  tenor: number;
  tenorType: string;
  stage: Stage;
  deliveryStatus?: string;
  pendingNote?: string;
  createdAt: any;
  clientId?: string;
}

export interface Client {
  id: string;
  nama: string;
  nomor: string;
  alamat?: string;
  orderCount: number;
  customerType: string;
  lastOrderAt?: any;
}
