import React from "react";
import { motion } from "motion/react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { toTitleCase } from "../../../utils/format";
import dayjs from "dayjs";
import { auth } from "../../../firebase/config";

interface PlanItemProps {
  plan: any;
  user: any;
  activeDate: any;
  isManager: boolean;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

export const PlanItem = React.memo(({ 
  plan, 
  user, 
  activeDate, 
  isManager, 
  onDelete
}: PlanItemProps) => {
  const iscurrentUser = plan.userId === auth.currentUser?.uid;
  const isVisited = plan.status === 'visited';
  
  return (
    <motion.div
      layout
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className={cn(
        "group py-2 md:py-3 px-1 flex items-center gap-3 md:gap-4 bg-transparent transition-all duration-300 border-b border-white/[0.03] last:border-0",
        iscurrentUser && "relative"
      )}
    >
      {iscurrentUser && (
         <div className="absolute top-0 right-0 w-10 h-10 bg-gradient-to-bl from-primary/5 to-transparent pointer-events-none" />
      )}

      <div className="relative shrink-0">
        <div className={cn(
          "w-7 h-7 md:w-10 md:h-10 rounded-full bg-muted overflow-hidden p-[1px] md:p-[2px] border border-border transition-all duration-300 ring-2 ring-transparent",
          iscurrentUser ? "ring-primary/30 border-primary/20 scale-105" : "group-hover:border-primary/20"
        )}>
          {user?.photoURL || plan.userPhoto ? (
            <img
              src={user?.photoURL || plan.userPhoto}
              className="w-full h-full rounded-full object-cover"
              alt=""
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              loading="lazy"
              data-html2canvas-ignore="true"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-[9px] md:text-xs font-black text-muted-foreground uppercase">
              {toTitleCase((user?.name || plan.userName || "U")).charAt(0)}
            </div>
          )}
        </div>
        {iscurrentUser && (
          <div className="absolute -bottom-0.5 md:-bottom-1 -right-0.5 md:-right-1 w-2.5 h-2.5 md:w-3.5 md:h-3.5 bg-primary rounded-full border-2 md:border-[3px] border-background z-10" />
        )}
      </div>

      <div className="flex-1 min-w-0 md:flex md:flex-col md:justify-center">
        <div className="flex items-center gap-2 mb-0.5 md:mb-1">
          <p className="text-xs md:text-sm font-semibold text-foreground tracking-tight truncate leading-tight flex items-center gap-1.5">
            {toTitleCase(plan.marketName)}
            {isVisited && <CheckCircle2 className="w-2.5 md:w-3.5 h-2.5 md:h-3.5 text-emerald-500" />}
            {(() => {
              const raw = plan.marketType === 'PASARAN_JAWA' 
                ? (plan.marketPasaran?.includes(activeDate.pasaran.toUpperCase()) 
                    ? activeDate.pasaran.toUpperCase() 
                    : plan.marketPasaran?.join(", ") || activeDate.pasaran.toUpperCase())
                : plan.marketType?.replace("PASARAN_", "").replace("PASAR_", "").replace("_", " ");
              const category = toTitleCase(raw);
              return category !== "Umum" ? (
                <span className="opacity-50 ml-1 md:ml-1.5 font-bold text-[8px] md:text-[10px] tracking-tight text-primary uppercase">
                  • {category}
                </span>
              ) : null;
            })()}
          </p>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 text-zinc-500">
          <span className="text-[8px] md:text-[10px] font-black text-primary tracking-widest truncate uppercase leading-none">
            {toTitleCase((user?.name || plan.userName || "User").split(" ")[0])}
          </span>
          <div className="w-[1.5px] h-[1.5px] md:w-1 md:h-1 rounded-full bg-muted-foreground/30 shrink-0" />
          <span className="text-[8px] md:text-[10px] font-medium text-muted-foreground tracking-tight truncate uppercase">
            {toTitleCase(plan.city)}
          </span>
          {plan.marketJam && (
            <>
              <div className="w-[1px] h-[1px] md:w-[1.5px] md:h-[1.5px] rounded-full bg-muted-foreground/30 shrink-0" />
              <span className="text-[8px] md:text-[10px] font-mono font-bold text-muted-foreground/60 tracking-tighter tabular-nums">
                {plan.marketJam.replace(' ', '')}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="text-right flex flex-col items-end gap-1 md:gap-1.5 relative z-10">
        <p className="text-[8px] md:text-xs text-zinc-400 dark:text-white/40 font-medium tracking-tight whitespace-nowrap tabular-nums font-mono">
          {plan.createdAt?.toDate ? dayjs(plan.createdAt.toDate()).format("HH:mm") : "-"}
        </p>
        {(iscurrentUser || isManager) && (
          <button
            data-html2canvas-ignore="true"
            onClick={(e) => onDelete(e, plan.id)}
            className="p-1 md:p-1.5 rounded-md text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-2.5 md:w-3.5 h-2.5 md:h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
});

PlanItem.displayName = "PlanItem";
