import React from 'react';
import { PlanItem } from './PlanItem';
import { PendingIndicator } from './PendingIndicator';
import { Users } from 'lucide-react';

interface Props {
  plans: any[];
  userMap: any;
  activeDate: any;
  actualIsAdmin: boolean;
  handleDelete: (e: React.MouseEvent, id: string) => void;
  loading: boolean;
  pendingUsersCount?: number;
  pendingUsersList?: any[];
  showPendingTooltip?: boolean;
  setShowPendingTooltip?: any;
  pendingTooltipRef?: any;
  isReportView?: boolean;
  topContent?: React.ReactNode;
}

export function SharedMarketPlanRenderer({
  plans,
  userMap,
  activeDate,
  actualIsAdmin,
  handleDelete,
  loading,
  pendingUsersCount = 0,
  pendingUsersList = [],
  showPendingTooltip = false,
  setShowPendingTooltip = () => {},
  pendingTooltipRef = null,
  isReportView = false,
  topContent
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        {/* Rencana Kunjungan Header with Pending Indicator */}
        {!isReportView && (
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <div className="w-4 md:w-5 h-4 md:h-5 bg-primary rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(198,255,46,0.2)]">
                <Users className="w-2.5 md:w-3 h-2.5 md:h-3 text-black" />
              </div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs md:text-sm font-bold tracking-tight text-zinc-800 dark:text-white/90 flex items-center">
                  Rencana Kunjungan
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              {actualIsAdmin && (
                <PendingIndicator 
                  pendingUsersCount={pendingUsersCount}
                  pendingUsersList={pendingUsersList}
                  showPendingTooltip={showPendingTooltip}
                  setShowPendingTooltip={setShowPendingTooltip}
                  pendingTooltipRef={pendingTooltipRef}
                />
              )}
              
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                <span className="text-[9px] md:text-[10px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest leading-none mt-0.5">LIVE</span>
              </div>
            </div>
          </div>
        )}

        <div className={isReportView 
          ? "p-1.5 md:p-2 border border-zinc-300/60 dark:border-zinc-900 bg-zinc-200/60 dark:bg-black rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)] transition-all duration-300"
          : "card-base p-1.5 md:p-2 shadow-soft transition-all duration-300"
        }>
          {topContent}
          {loading ? (
            <div className="py-16 space-y-2">
              <div className="h-1 w-full bg-zinc-50 animate-pulse rounded-full" />
              <div className="h-1 w-[80%] bg-zinc-50 animate-pulse rounded-full" />
            </div>
          ) : plans.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 opacity-10">
              <div className="w-8 h-8 rounded-full border-2 border-zinc-900 flex items-center justify-center">
                <span className="text-xs font-black">?</span>
              </div>
              <span className="text-[8px] font-black tracking-[0.3em] uppercase text-center">SISTEM BELUM MENERIMA DATA</span>
            </div>
          ) : (
            <div className="space-y-1 md:space-y-2 relative z-10 bg-white/0 dark:bg-zinc-900/0">
              {plans.map((plan) => (
                <PlanItem
                  key={plan.id}
                  plan={plan}
                  user={userMap[plan.userId]}
                  activeDate={activeDate}
                  isManager={actualIsAdmin}
                  onDelete={handleDelete}
                  hideDeleteButton={isReportView}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
