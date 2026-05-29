import React from 'react';
import { cn } from '../../../lib/utils';
import { toTitleCase } from '../../../utils/format';

interface Props {
  marketTemperature: {
    isLowData: boolean;
    hot: any[];
    cold: any[];
  };
}

export function MarketTemperature({ marketTemperature }: Props) {
  return (
    <div className="flex justify-center md:justify-start">
      <div className="w-full max-w-[340px] md:max-w-full grid grid-cols-2 gap-x-3 card-base p-2 md:p-4 shadow-soft divide-x divide-border/20 relative overflow-hidden group">
        {marketTemperature.isLowData ? (
          <div className="col-span-2 py-4 md:py-8 flex flex-col items-center justify-center">
            <p className="text-[8px] md:text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-1">
              Waiting for more activity
            </p>
            <p className="text-[7px] md:text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest">
              Not enough visit data to rank
            </p>
          </div>
        ) : (
          <>
            {/* HOT COLUMN */}
            <div className="text-left pr-3 md:pr-4 group cursor-default">
              <div className="flex items-center gap-1.5 mb-1.5 md:mb-3">
                <span className="text-[8px] md:text-[10px] font-black tracking-[0.1em] md:tracking-[0.2em] text-red-500 uppercase leading-none px-1.5 py-0.5 md:py-1 bg-red-500/5 rounded-sm shadow-[0_0_10px_-2px_rgba(239,68,68,0.2)]">
                  HOT
                </span>
                <div className="h-[1px] flex-1 bg-red-500/10" />
              </div>
              <div className="space-y-1 md:space-y-2">
                {marketTemperature.hot.map((m: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between gap-1.5 h-4 md:h-5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div className="w-1 h-1 rounded-full bg-red-500/40 shrink-0" />
                      <p className="text-[9px] md:text-xs font-bold text-foreground/80 truncate leading-none md:mt-0.5">
                        {toTitleCase(m.name)}
                      </p>
                    </div>
                    <div className="flex justify-end w-4">
                      <span className={cn(
                        "text-[9px] md:text-sm font-black shrink-0 leading-none",
                        m.trend === 'up' ? "text-green-500" : m.trend === 'down' ? "text-red-500" : "text-muted-foreground/30"
                      )}>
                        {m.trend === 'up' ? "↑" : m.trend === 'down' ? "↓" : "→"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLD COLUMN */}
            <div className="text-left pl-3 md:pl-4 group cursor-default">
              <div className="flex items-center gap-1.5 mb-1.5 md:mb-3">
                <span className="text-[8px] md:text-[10px] font-black tracking-[0.1em] md:tracking-[0.2em] text-blue-500 uppercase leading-none px-1.5 py-0.5 md:py-1 bg-blue-500/5 rounded-sm shadow-[0_0_10px_-2px_rgba(59,130,246,0.2)]">
                  COLD
                </span>
                <div className="h-[1px] flex-1 bg-blue-500/10" />
              </div>
              <div className="space-y-1 md:space-y-2">
                {marketTemperature.cold.map((m: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between gap-1.5 h-4 md:h-5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div className="w-1 h-1 rounded-full bg-blue-500/40 shrink-0" />
                      <p className="text-[9px] md:text-xs font-bold text-foreground/80 truncate leading-none md:mt-0.5">
                        {toTitleCase(m.name)}
                      </p>
                    </div>
                    <div className="flex justify-end w-4">
                      <span className={cn(
                        "text-[9px] md:text-sm font-black shrink-0 leading-none",
                        m.status === 'LOW ACTIVITY' ? "text-muted-foreground/40" : "text-muted-foreground/20"
                      )}>
                        {m.status === 'LOW ACTIVITY' ? '•' : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
