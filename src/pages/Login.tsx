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
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 bg-[#050505] overflow-hidden select-none">
      
      {/* Background - Minimalist Dark */}
      <div className="absolute inset-0 z-0 bg-[#050505]">
        {/* Subtle grid or abstract glow if wanted, but keeping it simple dark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[100px] opacity-50" />
      </div>

      {/* Login Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[320px] flex flex-col items-center"
      >
        
        {/* Header Image (Logo) */}
        <div className="w-full flex items-center justify-center">
          <div className="w-28 h-28 flex items-center justify-center">
            <img
              src="/login-illustration.png"
              alt="Vork Logo"
              loading="eager"
              decoding="async"
              draggable={false}
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
        </div>

        {/* App Title */}
        <div className="flex flex-col items-center justify-center mb-10 z-10 relative mt-1">
          <h1 className="text-4xl font-display font-semibold tracking-tight text-white ">
            VORK
          </h1>
          <p className="text-xs text-white/40 tracking-tight font-medium  mt-1.5">
            Field Operation System
          </p>
        </div>

        {/* Content */}
        <div className="w-full flex flex-col items-center text-center">
          
          {/* Login Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-[85%] max-w-[240px] inline-flex items-center justify-center gap-2.5 h-10 bg-white text-black rounded-full font-medium text-sm shadow-lg hover:shadow-xl transition-all tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
            ) : (
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-3.5 h-3.5"
              />
            )}
            {loading ? "Memproses..." : "Masuk dengan Google"}
          </motion.button>

          {/* Footer */}
          <div className="mt-8">
            <p className="text-xs text-white/30 font-medium leading-[1.6]  tracking-tight">
              Dengan melanjutkan, Anda menyetujui
              <br />
              <span className="text-white/50 hover:text-white transition-colors cursor-pointer underline underline-offset-[3px]">
                Syarat & Ketentuan
              </span>
              <span className="mx-1.5 opacity-40">serta</span>
              <span className="text-white/50 hover:text-white transition-colors cursor-pointer underline underline-offset-[3px]">
                Privasi
              </span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}