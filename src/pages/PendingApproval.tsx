import React from "react";
import { auth } from "../firebase/config";
import { LogOut, Clock, ShieldAlert } from "lucide-react";

export default function PendingApproval() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      
      {/* Icon Container */}
      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 animate-pulse border border-primary/20">
        <Clock className="w-10 h-10 text-primary" />
      </div>
      
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-3">
        Menunggu Persetujuan
      </h1>
      
      <p className="text-muted-foreground max-w-xs text-[15px] mb-10 leading-relaxed">
        Akun Anda sedang diverifikasi oleh admin.<br />
        Mohon tunggu sebentar hingga akun diaktifkan.
      </p>

      <div className="w-full max-w-xs space-y-4">
        {/* Status Card */}
        <div className="p-5 bg-card border border-border rounded-3xl flex items-start gap-4">
          <div className="mt-0.5">
            <ShieldAlert className="w-6 h-6 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Status Akun</p>
            <p className="text-primary font-semibold mt-1">Pending Verification</p>
            <p className="text-xs text-muted-foreground mt-2">
              Admin sedang memeriksa data Anda
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => auth.signOut()}
          className="w-full py-4 bg-transparent border border-border hover:border-primary/50 rounded-3xl flex items-center justify-center gap-3 text-foreground font-semibold transition-all active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>

      {/* Neon Lime Accent Bottom */}
      <div className="absolute bottom-8 text-[10px] font-mono tracking-[2px] text-primary/40">
        VORK • WAITING APPROVAL
      </div>
    </div>
  );
}