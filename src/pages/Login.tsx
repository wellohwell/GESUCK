import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase/config";
import { motion } from "motion/react";
import { LogIn, ShoppingBag } from "lucide-react";
import { toast } from "react-toastify";

export default function Login() {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Berhasil masuk!");
    } catch (error: any) {
      if (error.code === 'auth/user-cancelled') {
        return;
      }
      console.error(error);
      toast.error("Gagal masuk dengan Google.");
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 bg-[#f8f9fa] overflow-hidden select-none">
      {/* Background with Modern Color Split */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 w-full h-[60%] bg-white" />
        <div className="absolute bottom-0 w-full h-[40%] bg-brand-primary" 
          style={{ 
            clipPath: 'ellipse(100% 100% at 50% 100%)' 
          }} 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[340px] bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden"
      >
        {/* Card Header Image */}
        <div className="p-4">
          <div className="w-full h-48 rounded-[32px] overflow-hidden shadow-inner">
            <img 
              src="/_404_.png" 
              alt="Team" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Card Content */}
        <div className="px-8 pb-10 pt-4 flex flex-col items-center">
          <h2 className="text-2xl font-black text-gray-800 mb-8 uppercase tracking-tight">Login</h2>

          {/* Login Button Styled as Primary Action */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            className="w-full h-12 bg-brand-primary text-white flex items-center justify-center gap-3 rounded-full font-black text-sm shadow-[0_8px_20px_rgba(255,59,48,0.2)] hover:shadow-[0_10px_25px_rgba(255,59,48,0.3)] transition-all uppercase tracking-widest"
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
              className="w-4.5 h-4.5 brightness-0 invert"
            />
            Login with Google
          </motion.button>
          
          {/* Footer Text */}
          <div className="mt-8 text-center">
            <p className="text-[10px] text-gray-400 font-bold leading-relaxed uppercase tracking-wider">
              By continuing, you agree to our<br />
              <span className="text-brand-primary/60 hover:text-brand-primary transition-colors cursor-pointer underline underline-offset-2">Terms</span> & <span className="text-brand-primary/60 hover:text-brand-primary transition-colors cursor-pointer underline underline-offset-2">Privacy</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
