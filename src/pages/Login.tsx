import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase/config";
import { motion } from "motion/react";
import { toast } from "react-toastify";

export default function Login() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      toast.success("Berhasil masuk!");
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user") {
        return;
      }
      if (error.code === "auth/cancelled-popup-request") {
        return; // Multiple popup requests
      }

      console.error(error);
      toast.error("Gagal masuk dengan Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 bg-background dark overflow-hidden select-none">
      
      {/* Background - Minimalist Dark */}
      <div className="absolute inset-0 z-0 bg-[#050505]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] opacity-40 animate-pulse" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] contrast-150" />
      </div>

      {/* Login Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[340px] flex flex-col items-center"
      >
        
        {/* Header Image (Logo) */}
        <div className="w-full flex items-center justify-center mb-6">
          <div className="w-20 h-20 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-75 animate-pulse" />
            <img
              src="/login-illustration.png"
              alt="Vork Logo"
              loading="eager"
              decoding="async"
              draggable={false}
              className="w-full h-full object-contain relative z-10"
            />
          </div>
        </div>

        {/* App Title */}
        <div className="flex flex-col items-center justify-center mb-10 z-10 relative">
          <h1 className="text-3xl font-black tracking-[0.1em] text-white uppercase">
            VORK
          </h1>
          <p className="text-[8px] text-white/40 tracking-[0.3em] font-black uppercase mt-2">
            A small tools make vork easier.
          </p>
        </div>

        {/* Content */}
        <div className="w-full flex flex-col items-center text-center">
          
          {/* Login Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full max-w-[260px] inline-flex items-center justify-center gap-3 h-11 bg-white text-black rounded-xl font-black text-[10px] shadow-premium hover:shadow-glow-lime transition-all tracking-[0.1em] uppercase disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {loading ? (
              <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
            ) : (
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-4 h-4"
              />
            )}
            {loading ? "Memproses..." : "Masuk dengan Google"}
          </motion.button>

          {/* Footer */}
          <div className="mt-10">
            <p className="text-[10px] text-white/30 font-bold leading-relaxed tracking-widest uppercase">
              Dengan melanjutkan, Anda menyetujui
              <br />
              <span className="text-primary hover:text-white transition-colors cursor-pointer underline underline-offset-4 decoration-primary/30 decoration-1">
                Syarat & Ketentuan
              </span>
              <span className="mx-2 opacity-20">||</span>
              <span className="text-primary hover:text-white transition-colors cursor-pointer underline underline-offset-4 decoration-primary/30 decoration-1">
                Kebijakan Privasi
              </span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}