import React from "react";
import { auth } from "../firebase/config";
import { LogOut, Clock, ShieldAlert } from "lucide-react";

export default function PendingApproval() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center mb-8 animate-pulse text-brand-primary">
        <Clock className="w-10 h-10" />
      </div>
      
      <h1 className="text-2xl font-display font-medium tracking-tight mb-2">
        Menunggu Persetujuan
      </h1>
      
      <p className="text-white/40 max-w-xs text-sm mb-10 leading-relaxed">
        Akun Anda sedang diverifikasi oleh admin.<br />Silakan tunggu aktivasi akun.
      </p>

      <div className="w-full max-w-xs space-y-3">
        <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/[0.05] flex items-center gap-3 text-left">
          <ShieldAlert className="w-5 h-5 text-brand-primary/60 shrink-0" />
          <p className="text-[11px] font-medium text-white/30 italic">
            Status: <span className="text-brand-primary not-italic">Pending Verification</span>
          </p>
        </div>

        <button
          onClick={() => auth.signOut()}
          className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white hover:bg-white/[0.08] transition-all"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </div>
  );
}
