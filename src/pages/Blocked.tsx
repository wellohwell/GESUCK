import React from "react";
import { auth } from "../firebase/config";
import { LogOut, XCircle } from "lucide-react";

export default function Blocked() {
  return (
    <div className="min-h-screen bg-red-50 dark:bg-[#050000] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-8">
        <XCircle className="w-10 h-10 text-red-500" />
      </div>
      
      <h1 className="text-2xl font-display font-medium tracking-tight mb-2 text-red-600 dark:text-red-500">
        Akses Ditangguhkan
      </h1>
      
      <p className="text-zinc-500 dark:text-red-500/40 max-w-xs text-sm mb-10 leading-relaxed">
        Maaf, akun Anda telah dinonaktifkan atau ditolak oleh sistem. Hubungi administrator jika Anda merasa ini adalah kesalahan.
      </p>

      <button
        onClick={() => auth.signOut()}
        className="w-full max-w-xs py-4 bg-white dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-all shadow-sm"
      >
        <LogOut className="w-4 h-4" />
        Keluar
      </button>
    </div>
  );
}
