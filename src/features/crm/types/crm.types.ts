import { Timestamp } from 'firebase/firestore';

export type CustomerStatus = 'lead' | 'active' | 'repeat_order' | 'inactive';

export interface Customer {
  id?: string;
  name: string;
  phone: string;
  address?: string;
  businessName?: string; // usaha
  
  branchId?: string;
  
  createdBy: string;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
  
  totalOrders: number;
  totalOmset?: number;
  
  latestOrderAt?: Timestamp | any;
  
  status: CustomerStatus;

  ownerId?: string; // Legacy support
  nomor?: string; // Legacy support
  nama?: string; // Legacy support
  alamat?: string; // Legacy support
  usaha?: string; // Legacy support
  customerType?: string; // Legacy support
  kategori?: string; // Legacy support
  orderCount?: number; // Legacy support
  lastOrderAt?: Timestamp | any; // Legacy support
}

export interface OrderEntity {
  id?: string;
  customerId: string;
  
  itemName: string; // barang
  tenor: number;
  installment: number; // angsuran
  omset?: number;
  
  branchId?: string;
  
  createdBy: string;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;

  status: string;

  // Legacy mappings
  barang?: string;
  angsuran?: number;
  ownerId?: string;
  clientId?: string;
  stage?: string;
  deliveryStatus?: string;
  tenorType?: string;
  tenorDays?: number;
  nama?: string; // denormalization
  alamat?: string;
  nomor?: string;
  usaha?: string;
}
