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

export const glassmorphism = "bg-white/70 backdrop-blur-md border border-white/20 shadow-xl";
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
