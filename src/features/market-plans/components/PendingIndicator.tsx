import React from 'react';
import { Users, CheckCircle2 } from 'lucide-react';
import { toTitleCase } from '../../../utils/format';

interface Props {
  pendingUsersCount: number;
  pendingUsersList: any[];
  showPendingTooltip: boolean;
  setShowPendingTooltip: React.Dispatch<React.SetStateAction<boolean>>;
  pendingTooltipRef: React.RefObject<HTMLDivElement>;
}

export function PendingIndicator({
  pendingUsersCount,
  pendingUsersList,
  showPendingTooltip,
  setShowPendingTooltip,
  pendingTooltipRef
}: Props) {
  return (
    <div className="flex">
      {pendingUsersCount > 0 ? (
        <div 
          ref={pendingTooltipRef}
          className="relative group"
          onMouseEnter={() => setShowPendingTooltip(true)}
          onMouseLeave={() => setShowPendingTooltip(false)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPendingTooltip(prev => !prev);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(180,255,0,0.18)] backdrop-blur-md transition-transform active:scale-95"
            data-html2canvas-ignore="true"
          >
            <Users className="w-3 h-3 text-[#d9ff00]" />
            <span className="text-[11px] font-bold text-[#d9ff00] leading-none mt-0.5">
              {pendingUsersCount}
            </span>
            <span className="text-[11px] font-medium text-black/40 dark:text-white/60 leading-none mt-0.5">
              Pending
            </span>
          </button>
          
          {/* Active status for export if needed (usually tooltip is hidden during export) */}
          <div data-html2canvas-ignore="true"
            className={`absolute top-[calc(100%+8px)] right-0 w-52 sm:w-56 bg-[rgba(15,15,15,0.88)] backdrop-blur-xl border border-white/10 rounded-[18px] p-3 shadow-2xl transition-all duration-200 z-[120] text-left origin-top-right ${
              showPendingTooltip 
                ? 'opacity-100 translate-y-0 visible pointer-events-auto scale-100' 
                : 'opacity-0 -translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible pointer-events-none scale-95'
            }`}
          >
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
              <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                Belum Input
              </span>
              <span className="text-[10px] font-black text-[#d9ff00]">
                {pendingUsersCount} User
              </span>
            </div>
            
            <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar pr-1">
              {pendingUsersList.map((u: any) => (
                <div key={u.id} className="flex items-center gap-2">
                  {u.photoURL ? (
                    <img 
                      src={u.photoURL} 
                      alt={u.displayName || u.name || "User"} 
                      className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 ring-1 ring-white/10">
                      <span className="text-[9px] font-bold text-white uppercase">
                        {(u.displayName || u.name || "U").charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[11px] text-white font-bold truncate leading-tight">
                      {toTitleCase((u.displayName || u.name || "User").split(' ')[0])}
                    </span>
                    {u.city && (
                      <span className="text-[9px] text-white/50 truncate leading-tight mt-0.5">
                        {toTitleCase(u.city)}
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] text-zinc-400 font-medium whitespace-nowrap bg-white/5 px-2 py-0.5 rounded text-right shrink-0">
                    Belum Input
                  </span>
                </div>
              ))}
            </div>
            
            {/* Pointer Arrow */}
            <div className="absolute -top-[5px] right-6 w-2.5 h-2.5 bg-[rgba(15,15,15,0.88)] border-t border-l border-white/10 rotate-45" />
          </div>
        </div>
      ) : (
        <div data-html2canvas-ignore="true" className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 backdrop-blur-md">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span className="text-[11px] font-bold text-green-500/80 leading-none mt-0.5">
            All Synced
          </span>
        </div>
      )}
    </div>
  );
}
