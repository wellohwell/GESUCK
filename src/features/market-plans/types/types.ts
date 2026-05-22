export interface MarketPlan {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  marketName: string;
  marketType: string;
  marketPasaran?: string[];
  city: string;
  marketJam?: string;
  status?: string;
  createdAt?: any;
  dayStart: string;
}

export interface Market {
  id: string;
  nama_pasar: string;
  wilayah: string;
  kategori: any;
  pasaran?: string[];
  jam_buka?: any;
  buka_harian?: boolean;
}
