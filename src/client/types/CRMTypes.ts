export type Stage = 'survey' | 'acc' | 'archive' | 'pending' | 'batal';

export interface Client {
  id: string;
  nama: string;
  nomor: string;
  usaha?: string;
  alamat?: string;
  customerType?: 'baru' | 'lama';
  orderCount?: number;
  lastOrderAt?: any;
}

export interface Order {
  id: string;
  clientId: string;
  nama: string;
  nomor: string;
  usaha?: string;
  alamat?: string;
  barang: string;
  angsuran: number;
  tenor: number;
  tenorType: 'hari' | 'bulan';
  stage: Stage;
  deliveryStatus?: string;
  pendingNote?: string;
  createdAt: any;
  ownerId: string;
}

