import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function formatRelativeTime(date: any) {
  if (!date) return "";
  const d = date.toDate ? date.toDate() : new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return d.toLocaleDateString();
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const glassmorphism = "bg-card/70 backdrop-blur-md border border-white/20 shadow-xl";
export const innerShadow = "shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}

export function calculateOmset(angsuran: number, tenor: number) {
  return angsuran * tenor;
}

export function formatWhatsApp(number: string) {
  // Remove non-numeric characters
  const cleaned = number.replace(/\D/g, '');
  // Replace 0 with 62 if it starts with 0
  if (cleaned.startsWith('0')) {
    return '62' + cleaned.substring(1);
  }
  return cleaned;
}

const FIXED_HOLIDAYS = [
  '01-01', // Tahun Baru Masehi
  '05-01', // Hari Buruh
  '06-01', // Hari Lahir Pancasila
  '08-17', // Hari Kemerdekaan RI
  '12-25', // Hari Natal
];

const VARIABLE_HOLIDAYS_2026 = [
  '2026-01-29', // Tahun Baru Imlek
  '2026-02-15', // Isra Mikraj
  '2026-03-19', // Hari Suci Nyepi
  '2026-03-20', // Idul Fitri Hari 1
  '2026-03-21', // Idul Fitri Hari 2
  '2026-04-03', // Wafat Isa Almasih
  '2026-05-14', // Kenaikan Isa Almasih
  '2026-05-27', // Hari Raya Idul Adha
  '2026-06-18', // Hari Baru Islam
  '2026-08-27', // Maulid Nabi Muhammad
];

export function isHoliday(date: Date): boolean {
  const day = date.getDay();
  if (day === 0) return true; // Sunday

  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();
  const mmdd = `${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
  
  if (FIXED_HOLIDAYS.includes(mmdd)) return true;
  
  const yyyymmdd = date.toISOString().split('T')[0];
  if (VARIABLE_HOLIDAYS_2026.includes(yyyymmdd)) return true;
  
  return false;
}

export function calculateEstimasiLunas(startDate: any, tenor: number, tenorType: string = 'hari'): Date {
  let start: Date;
  if (!startDate) {
    start = new Date();
  } else if (typeof startDate.toDate === 'function') {
    start = startDate.toDate();
  } else if (startDate instanceof Date) {
    start = new Date(startDate.getTime());
  } else if (startDate.seconds) {
    start = new Date(startDate.seconds * 1000);
  } else {
    start = new Date(startDate);
  }

  let current = new Date(start.getTime());
  current.setHours(0, 0, 0, 0);
  
  let targetBusinessDays = tenor;
  
  // If tenor is in months, convert to roughly 26 business days per month 
  // or just treat it as a number of installments that happen on business days.
  // Given the requirement "exclude Sunday", it's likely daily installments.
  if (tenorType?.toLowerCase() === 'bulan') {
    targetBusinessDays = tenor * 26; 
  }
  
  let addedDays = 0;
  while (addedDays < targetBusinessDays) {
    current.setDate(current.getDate() + 1);
    if (!isHoliday(current)) {
      addedDays++;
    }
  }
  
  return current;
}
