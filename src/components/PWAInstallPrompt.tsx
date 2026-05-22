import React, { useEffect, useState } from "react";
import { Download, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useToast } from "../hooks/use-toast";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if dismissed
    const isDismissed = localStorage.getItem("pwa_install_dismissed");
    if (isDismissed) return;

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Trigger after a slight delay for better UX
      setTimeout(() => setIsVisible(true), 15000); 
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
      localStorage.removeItem("pwa_install_dismissed");
      toast({
        title: "VORK TEAM installed successfully",
        description: "You can now access VORK TEAM directly from your home screen.",
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa_install_dismissed", "true");
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsVisible(false);
    }
  };

  if (!isVisible || !deferredPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-[9999] md:left-auto md:right-6 md:w-96"
      >
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-[#C6FF2E]/30 rounded-3xl p-5 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex gap-4 items-center flex-1">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
              <Download className="w-6 h-6 text-[#C6FF2E]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-white">Install VORK TEAM</span>
              <span className="text-[11px] text-zinc-400 leading-tight mt-0.5">Faster access, offline support, and realtime notifications.</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handleDismiss}
              className="px-3 py-2 text-[11px] font-bold text-zinc-400 hover:text-white transition-colors"
            >
              Later
            </button>
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-[#C6FF2E] text-black text-[11px] font-black rounded-full hover:bg-[#C6FF2E]/90 transition-colors flex items-center gap-1.5"
            >
              Install
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
