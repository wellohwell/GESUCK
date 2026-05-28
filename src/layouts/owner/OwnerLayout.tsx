import React, { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function OwnerLayout() {
  useEffect(() => {
    console.log("Owner mounted");
    return () => console.log("Owner unmounted");
  }, []);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-background text-foreground transition-colors duration-300">
      {/* EXECUTIVE APP BAR */}
      <header className="sticky top-0 z-[40] border-b border-white/10 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xs font-black uppercase tracking-widest text-foreground">
            OWNER <span className="text-primary">PORTAL</span>
          </div>
        </div>

        <button
          onClick={() => navigate("/workspace/home")}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all active:scale-95 uppercase tracking-wider"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Exit</span>
        </button>
      </header>

      <main className="w-full h-full p-4 md:p-8 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
