import React from "react";
import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../../../../lib/utils";

interface SavePlanFABProps {
  onClick: () => void;
  disabled: boolean;
  selectedMarketName?: string;
}

export const SavePlanFAB: React.FC<SavePlanFABProps> = ({
  onClick,
  disabled,
  selectedMarketName,
}) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-3xl border-t border-border/10 p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex justify-center">
      <div className="max-w-3xl mx-auto w-full">
        <motion.button
          whileHover={!disabled ? { scale: 1.01, y: -2 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-center gap-3 h-14 px-8 rounded-full font-black tracking-[0.1em] uppercase transition-all shadow-xl relative overflow-hidden group",
            !disabled
              ? "bg-primary text-black shadow-primary/20 hover:shadow-primary/40"
              : "bg-muted text-muted-foreground/40 cursor-not-allowed grayscale border border-border/5"
          )}
        >
          {/* Subtle Glow Effect when enabled */}
          {!disabled && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
          )}
          
          <CheckCircle2 className={cn("w-5 h-5", !disabled && "animate-pulse")} />
          <span className="text-[12px]">
            {selectedMarketName ? `SIMPAN: ${selectedMarketName}` : 'PILIH PASAR TERLEBIH DAHULU'}
          </span>
          
          {!disabled && (
            <div className="absolute inset-0 rounded-full border-2 border-white/10 pointer-events-none" />
          )}
        </motion.button>
      </div>
    </footer>
  );
};
