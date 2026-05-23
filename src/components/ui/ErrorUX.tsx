import React from 'react';
import { ShieldAlert, RefreshCw, WifiOff, FileLock } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ErrorUXProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  fallbackTitle?: string;
}

export function ErrorUX({ error, onRetry, className, fallbackTitle }: ErrorUXProps) {
  let errorMsg = error instanceof Error ? error.message : String(error);
  let isPermission = false;
  let isOffline = !navigator.onLine || errorMsg.includes("client is offline") || errorMsg.includes("Could not reach Cloud Firestore backend") || errorMsg.includes("offline");

  try {
    // Attempt parsing JSON-formatted handleFirestoreError outputs
    if (errorMsg.startsWith('{') && errorMsg.endsWith('}')) {
      const parsed = JSON.parse(errorMsg);
      errorMsg = parsed.error || errorMsg;
      if (parsed.error?.includes("permission") || parsed.operationType === "PERMISSION_DENIED") {
        isPermission = true;
      }
    }
  } catch (e) {
    // Fail silently, use default mapping
  }

  if (errorMsg.toLowerCase().includes("permission-denied") || errorMsg.toLowerCase().includes("insufficient permissions")) {
    isPermission = true;
  }

  const Icon = isOffline ? WifiOff : (isPermission ? FileLock : ShieldAlert);
  const title = fallbackTitle || (isOffline ? "Koneksi Terputus" : (isPermission ? "Akses Terbatas" : "Terjadi Kendala Sistem"));
  const description = isOffline 
    ? "Aplikasi mendeteksi koneksi internet kurang stabil. Beberapa data mungkin belum sinkron." 
    : (isPermission 
      ? "Anda tidak memiliki wewenang untuk melihat data ini. Harap hubungi administrator cabang." 
      : "Terjadi kesalahan saat memproses data. Silakan coba beberapa saat lagi.");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center text-center p-6 md:p-8",
        "bg-red-50/50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-900/30 rounded-3xl",
        className
      )}
    >
      <div className="p-3.5 rounded-2xl bg-red-100/60 dark:bg-red-900/40 mb-4 text-red-600 dark:text-red-400">
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-1">
        {title}
      </h3>

      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 max-w-sm mb-4 leading-relaxed">
        {description}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-md"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Segarkan
        </button>
      )}
    </motion.div>
  );
}
