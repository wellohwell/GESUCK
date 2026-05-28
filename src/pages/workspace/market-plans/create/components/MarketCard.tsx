import React from "react";
import { Users, CheckCircle2 } from "lucide-react";
import { cn } from "../../../../../lib/utils";
import { toTitleCase } from "../../../../../utils/format";
import { KATEGORI_TYPES } from "../../constants";

interface MarketCardProps {
  market: any;
  isTaken: boolean;
  takerName?: string;
  isSelected: boolean;
  selectedSubCategory: string;
  onMarketClick: (m: any) => void;
  onSubCategorySelect: (id: string) => void;
}

export const MarketCard: React.FC<MarketCardProps> = ({
  market: m,
  isTaken,
  takerName,
  isSelected,
  selectedSubCategory,
  onMarketClick,
  onSubCategorySelect,
}) => {
  return (
    <div
      onClick={() => !isTaken && onMarketClick(m)}
      className={cn(
        "flex flex-col p-4 transition-all rounded-[1.5rem] relative overflow-hidden group border",
        isTaken
          ? "opacity-60 bg-zinc-100/30 dark:bg-zinc-950/20 cursor-not-allowed border-transparent"
          : cn(
              "active:scale-[0.985] cursor-pointer bg-muted/10 dark:bg-muted/5 hover:bg-muted/20 dark:hover:bg-zinc-900 border-border/10 hover:border-primary/20",
              isSelected && "bg-primary/[0.03] dark:bg-primary/[0.05] border-primary/30 ring-1 ring-primary/20 shadow-primary/5 shadow-md"
            )
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div className="min-w-0 flex-1 pr-1">
          <h4 className={cn(
            "font-black text-[13px] md:text-sm leading-tight tracking-tight truncate transition-colors uppercase",
            isSelected && !isTaken ? "text-primary" : "text-foreground",
            isTaken && "text-muted-foreground/60"
          )}>
            {toTitleCase(m.nama_pasar)}
          </h4>
          <div className="text-[10px] font-black text-muted-foreground/60 tracking-wider mt-0.5 uppercase">
            {toTitleCase(m.wilayah)}
          </div>
        </div>

        {isSelected && !isTaken && (
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-[0_0_12px_rgba(198,255,46,0.3)] shrink-0">
            <CheckCircle2 className="w-3 h-3 text-black" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 mt-3">
        {(Array.isArray(m.kategori) ? m.kategori : [m.kategori]).map((kat: any, kIdx: number) => {
          const katId = typeof kat === "object" ? kat.kode || kat.id : kat;
          const isPasaranJawa = katId === "PASARAN_JAWA";

          let infoLabel = "";
          if (isPasaranJawa) {
            infoLabel = (m.pasaran || []).map((p: string) => p.toUpperCase()).join(", ") || "HARI INI";
          } else {
            const labelText = KATEGORI_TYPES.find((t) => t.id === katId)?.label || katId;
            infoLabel = String(labelText).replace("Pasar ", "").toUpperCase();
          }

          let scheduleText = "";
          if (typeof m.jam_buka === "object" && m.jam_buka !== null) {
            scheduleText = m.jam_buka[katId] || Object.values(m.jam_buka)[0] || "";
          } else {
            scheduleText = m.jam_buka || "";
          }

          return (
            <div key={`${m.id}-kat-${kIdx}`} className="flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase">
              <span className="opacity-40 group-hover:rotate-12 transition-transform h-3">🕐</span>
              <span className="text-primary">{infoLabel} - {scheduleText}</span>
            </div>
          );
        })}
      </div>

      {isTaken && (
        <div className="mt-3 text-[9px] font-black text-rose-500 bg-rose-500/5 px-3 py-1 rounded-full border border-rose-500/10 w-fit tracking-wider uppercase flex items-center gap-1.5">
          <Users className="w-3 h-3" />
          <span>PASAR INI TELAH DIPILIH {takerName}</span>
        </div>
      )}

      {isSelected && !isTaken && Array.isArray(m.kategori) && m.kategori.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1.5 p-1 rounded-[1.25rem] w-full bg-black/5 dark:bg-white/5">
          {m.kategori.map((kat: any, katIdx: number) => {
            const katIdVal = typeof kat === "object" ? kat.kode || kat.id || katIdx : kat;
            const labelValue = typeof kat === "object" ? kat.label : KATEGORI_TYPES.find((k) => k.id === kat)?.label || kat;
            const labelStr = typeof labelValue === "object" ? String(labelValue.label || katIdVal) : String(labelValue);
            const isKatSelected = String(selectedSubCategory) === String(katIdVal);

            return (
              <button
                key={`${m.id}-choice-${katIdVal}-${katIdx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSubCategorySelect(String(katIdVal));
                }}
                className={cn(
                  "flex-1 px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all duration-200 border",
                  isKatSelected
                    ? "bg-primary text-black border-primary shadow-[0_4px_12px_rgba(198,255,46,0.2)] scale-[1.02]"
                    : "bg-muted/40 dark:bg-white/5 text-muted-foreground border-transparent hover:bg-muted/60 dark:hover:bg-white/10"
                )}
              >
                {labelStr.replace("Pasar ", "")}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
