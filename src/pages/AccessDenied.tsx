import React from "react";
import { motion } from "motion/react";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="max-w-md w-full text-center space-y-6 bg-white dark:bg-card border border-zinc-100 dark:border-white/5 p-8 rounded-[2rem] shadow-xl"
      >
        <div className="flex items-center justify-center">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 ring-4 ring-red-500/5 animate-pulse">
            <AlertTriangle className="w-7 h-7" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Akses Ditolak
          </h1>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Maaf, Anda tidak memiliki izin tingkat enterprise yang cukup untuk membuka menu monitoring ini. Akses ini diaudit secara ketat dan hanya dibuka untuk Owner atau Admin utama.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer leading-none"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
          
          <button
            onClick={() => navigate("/")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 shadow-md transition-all cursor-pointer leading-none"
          >
            <Home className="w-4 h-4" /> Menu Utama
          </button>
        </div>
      </motion.div>
    </div>
  );
}
