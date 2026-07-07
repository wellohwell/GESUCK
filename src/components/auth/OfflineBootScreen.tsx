import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineBootScreenProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export const OfflineBootScreen: React.FC<OfflineBootScreenProps> = ({ onRetry, isRetrying = false }) => {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Glow pulsing ring with wifi-off icon */}
        <div className="flex justify-center">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20">
            <div className="absolute inset-0 rounded-full bg-red-500/5 animate-ping duration-1000"></div>
            <WifiOff className="w-10 h-10 text-red-500" />
          </div>
        </div>

        {/* Title and message */}
        <div className="space-y-3">
          <h1 className="text-xl font-bold tracking-tight text-white font-sans">
            Tidak Ada Koneksi Internet
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed font-sans px-2">
            Aplikasi ini memerlukan koneksi internet aktif untuk dapat beroperasi dengan aman. Silakan periksa koneksi data atau Wi-Fi perangkat Anda.
          </p>
        </div>

        {/* Retry Button */}
        <div className="pt-2">
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white rounded-2xl text-sm font-semibold tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Memeriksa...' : 'Coba Lagi'}
          </button>
        </div>

      </div>
    </div>
  );
};
