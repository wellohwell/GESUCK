'use client';

import React, { useEffect, useState } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { Loader2, LogIn, AlertTriangle, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setAuthError(null);
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Login failed', error);
      const errorMsg = error?.message || "";
      const errorCode = error?.code || "";
      if (
        errorCode === "auth/internal-error" || 
        errorMsg.includes("internal-error") || 
        errorMsg.includes("auth/internal-error") ||
        errorMsg.includes("storage-unsupported")
      ) {
        setAuthError("iframe-restriction");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-card p-8 rounded-[18px] shadow-xl border border-slate-100 text-center"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-xl mx-auto mb-6 flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <LogIn size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Rewang CRM</h2>
          <p className="text-slate-500 mb-8 font-medium">Silakan login untuk mengakses sistem CRM operasional.</p>
          <button
            onClick={handleLogin}
            className="w-full py-4 rounded-xl bg-card border-2 border-slate-100 font-bold text-slate-700 flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-blue-200 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>

          {authError === "iframe-restriction" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200/60 text-left"
            >
              <div className="flex items-start gap-2 mb-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Batasan Iframe Sandbox
                </h3>
              </div>
              <p className="text-[11px] text-amber-700 font-medium leading-relaxed mb-3">
                Browser Anda memblokir cookie pihak ketiga di dalam iframe preview ini. Silakan buka aplikasi pada tab baru mandiri agar login Google berjalan lancar tanpa kendala.
              </p>
              <button
                onClick={() => window.open(window.location.origin, "_blank")}
                className="w-full h-10 bg-amber-500 hover:bg-amber-600 active:scale-95 text-black font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
              >
                <ExternalLink size={14} />
                Buka di Tab Baru
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
};
