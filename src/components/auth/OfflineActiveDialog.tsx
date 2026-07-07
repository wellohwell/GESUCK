import React from 'react';
import { WifiOff, Loader2 } from 'lucide-react';

interface OfflineActiveDialogProps {
  isOpen: boolean;
}

export const OfflineActiveDialog: React.FC<OfflineActiveDialogProps> = ({ isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div className="max-w-sm w-full mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
        
        {/* Animated icon container */}
        <div className="flex justify-center">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20">
            <WifiOff className="w-6 h-6 text-amber-500 animate-pulse" />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white font-sans tracking-tight">
            Koneksi Terputus
          </h2>
          <p className="text-zinc-400 text-xs leading-relaxed font-sans">
            Menghubungkan kembali... Transaksi dan permintaan baru dijeda sementara sampai koneksi Anda pulih secara normal.
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs font-medium font-sans bg-zinc-950/50 py-2 px-4 rounded-xl">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
          <span>Menunggu sinyal...</span>
        </div>

      </div>
    </div>
  );
};
