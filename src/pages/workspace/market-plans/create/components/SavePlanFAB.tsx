import React from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../../../../lib/utils";
import { toTitleCase } from "../../../../../utils/format";
import { KATEGORI_TYPES } from "../../constants";

interface SavePlanFABProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedMarketName: string;
  selectedMarketCity: string;
  selectedMarket?: any;
  selectedSubCategory: string;
  onSubCategorySelect: (id: string) => void;
  pasaranWarning?: string | null;
}

export const SavePlanFAB: React.FC<SavePlanFABProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedMarketName,
  selectedMarketCity,
  selectedMarket,
  selectedSubCategory,
  onSubCategorySelect,
  pasaranWarning,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl p-6 text-white overflow-hidden z-10"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center mt-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>

              <h3 className="text-sm font-black tracking-wider uppercase mb-1">
                Simpan Rencana Kunjungan
              </h3>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-6">
                Apakah Anda yakin ingin berkunjung ke pasar ini?
              </p>

              <div className="w-full bg-zinc-900/60 rounded-2xl p-4 border border-zinc-800/80 mb-6 text-left">
                <h4 className="font-black text-sm text-primary uppercase truncate">
                  {toTitleCase(selectedMarketName)}
                </h4>
                <p className="text-[10px] text-zinc-400 font-bold tracking-wider uppercase mt-0.5">
                  {toTitleCase(selectedMarketCity)}
                </p>

                {/* Multiple categories inside the modal */}
                {selectedMarket && Array.isArray(selectedMarket.kategori) && selectedMarket.kategori.length > 1 && (
                  <div className="mt-4">
                    <span className="text-[8px] font-black tracking-widest text-zinc-500 uppercase block mb-1.5">PILIH JAM BUKA / JALUR:</span>
                    <div className="flex flex-col gap-1.5">
                      {selectedMarket.kategori.map((kat: any, katIdx: number) => {
                        const katIdVal = typeof kat === "object" ? kat.kode || kat.id || katIdx : kat;
                        const labelValue = typeof kat === "object" ? kat.label : KATEGORI_TYPES.find((k) => k.id === kat)?.label || kat;
                        const labelStr = typeof labelValue === "object" ? String(labelValue.label || katIdVal) : String(labelValue);
                        const isKatSelected = String(selectedSubCategory) === String(katIdVal);

                        return (
                          <button
                            key={`modal-choice-${katIdVal}-${katIdx}`}
                            type="button"
                            onClick={() => onSubCategorySelect(String(katIdVal))}
                            className={cn(
                              "w-full px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all duration-200 border text-left flex items-center justify-between",
                              isKatSelected
                                ? "bg-primary text-black border-primary font-black"
                                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"
                            )}
                          >
                            <span>{labelStr.replace("Pasar ", "")}</span>
                            <span className={cn("text-[8px] font-medium tracking-normal", isKatSelected ? "text-black/70" : "text-zinc-500")}>
                              {(() => {
                                const sType = typeof selectedMarket.jam_buka;
                                if (sType === "object" && selectedMarket.jam_buka !== null) {
                                  return selectedMarket.jam_buka[katIdVal] || "";
                                }
                                return selectedMarket.jam_buka || "";
                              })()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Warning label inside modal */}
                {pasaranWarning && (
                  <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-yellow-500/90 font-black leading-relaxed uppercase tracking-tight">
                      {pasaranWarning}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal actions */}
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={onConfirm}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-black rounded-full font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-xl active:scale-[0.97]"
                >
                  <span>SIMPAN</span>
                </button>

                <button
                  onClick={onClose}
                  className="w-full h-12 flex items-center justify-center text-zinc-400 hover:text-white font-black text-xs uppercase tracking-wider transition-all active:scale-[0.97]"
                >
                  BATAL
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
