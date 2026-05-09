import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase/config";
import { motion } from "motion/react";
import { toast } from "react-toastify";

export default function Login() {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Berhasil masuk!");
    } catch (error: any) {
      if (error.code === "auth/user-cancelled") {
        return;
      }

      console.error(error);
      toast.error("Gagal masuk dengan Google.");
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 bg-[#f8f9fa] overflow-hidden select-none">
      
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 w-full h-[60%] bg-white" />

        <div
          className="absolute bottom-0 w-full h-[40%] bg-brand-primary"
          style={{
            clipPath: "ellipse(100% 100% at 50% 100%)",
          }}
        />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[280px] bg-white rounded-[32px] shadow-[0_15px_40px_rgba(0,0,0,0.08)] overflow-hidden"
      >
        
        {/* Header Image */}
        <div className="p-4">
          <div className="w-full h-48 rounded-[24px] overflow-hidden bg-white flex items-center justify-center">
            
            <img
              src="/login-illustration.png"
              alt="Login Illustration"
              loading="eager"
              decoding="async"
              draggable={false}
              className="w-full h-full object-contain"
            />

          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-8 pt-2 flex flex-col items-center text-center">
          
          {/* Login Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleGoogleLogin}
            className="inline-flex items-center justify-center gap-2 px-6 h-10 bg-brand-primary text-white rounded-full font-semibold text-[11px] shadow-md hover:shadow-lg transition-all uppercase tracking-wider"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-3.5 h-3.5 brightness-0 invert"
            />

            Login with Google
          </motion.button>

          {/* Footer */}
          <div className="mt-6">
            <p className="text-[9px] text-gray-400 font-bold leading-tight uppercase tracking-wider">
              By continuing, you agree to our
              <br />

              <span className="text-brand-primary/60 hover:text-brand-primary transition-colors cursor-pointer underline underline-offset-2">
                Terms
              </span>

              {" & "}

              <span className="text-brand-primary/60 hover:text-brand-primary transition-colors cursor-pointer underline underline-offset-2">
                Privacy
              </span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}