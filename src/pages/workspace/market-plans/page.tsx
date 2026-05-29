import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Users,
  Search,
} from "lucide-react";
import {
  subscribeMarketPlans,
  subscribeAllMarketPlans,
  subscribeMarkets,
  subscribeUsers,
  deleteMarketPlan,
} from "../../../lib/services";
import { auth } from "../../../firebase/config";
import { toast } from "../../../hooks/use-toast";
import { cn } from "../../../lib/utils";
import { getActiveSystemDate } from "../../../utils/javaneseDate";
import { toTitleCase } from "../../../utils/format";
import dayjs from "dayjs";
import { useRole, useBranch } from "../../../hooks/authHooks";
import { useModal } from "../../../hooks/use-modal";
import { ROLES } from "../../../config/roles";
import { ActionButton } from "../../../components/ui/buttons";
import { MasterDataView } from "../../admin/Master";
import { PlanItem } from "../../../features/market-plans/components/PlanItem";
import { motion } from "motion/react";

export default function MarketPlansPage() {
  const navigate = useNavigate();
  const { branchId } = useBranch();
  const role = useRole();
  const canAccessMaster = [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.SPV].includes(role as any);
  
  const [plans, setPlans] = useState<any[]>([]);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDate] = useState(getActiveSystemDate());
  const [showPendingTooltip, setShowPendingTooltip] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'plans' | 'master') || 'plans';
  const setActiveTab = (tab: 'plans' | 'master') => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (!branchId) return;

    const unsubPlans = subscribeMarketPlans(activeDate.isoDate, (data) => {
      setPlans(
        data
          .filter(p => !p.branchId || p.branchId === branchId)
          .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)),
      );
      setLoading(false);
    });

    const unsubMarkets = subscribeMarkets(setMarkets, branchId);
    const unsubAllPlans = subscribeAllMarketPlans(setAllPlans); 
    const unsubUsers = subscribeUsers(setUsers, branchId);

    return () => {
      unsubPlans();
      unsubMarkets();
      unsubAllPlans();
      unsubUsers();
    };
  }, [activeDate.isoDate, branchId]);

  const userMap = useMemo(() => {
    const map: Record<string, { name: string; photoURL?: string }> = {};
    users.forEach((u) => {
      if (u.id) {
        map[u.id] = {
          name: u.displayName || u.name || "User",
          photoURL: u.photoURL || u.photoUrl,
        };
      }
    });
    return map;
  }, [users]);

  const pendingSpvCount = useMemo(() => {
    const spvUsers = users.filter(u => u.role === 'spv');
    const spvWithPlansIds = new Set(plans.map(p => p.userId));
    return spvUsers.filter(u => !spvWithPlansIds.has(u.id)).length;
  }, [users, plans]);

  const marketTemperature = useMemo(() => {
    if (allPlans.length < 5) return { hot: [], cold: [], isLowData: true };
    const now = dayjs();
    const scores: Record<string, any> = {};

    allPlans.forEach((plan) => {
      const planDate = dayjs(plan.dayStart);
      const diffDays = Math.abs(now.diff(planDate, 'day'));
      let weight = 0.2;
      if (diffDays === 0) weight = 1.0;
      else if (diffDays <= 7) weight = 0.8;
      else if (diffDays <= 30) weight = 0.5;

      const key = plan.marketName;
      if (!scores[key]) {
        scores[key] = { score: 0, name: plan.marketName, currentWeekVisits: 0, prevWeekVisits: 0 };
      }
      scores[key].score += weight;
      if (diffDays <= 7) scores[key].currentWeekVisits += 1;
      else if (diffDays > 7 && diffDays <= 14) scores[key].prevWeekVisits += 1;
    });

    const sorted = Object.values(scores).sort((a: any, b: any) => b.score - a.score);
    const hot = sorted.slice(0, 4).map((m: any) => ({
      ...m,
      trend: m.currentWeekVisits > m.prevWeekVisits ? 'up' : m.currentWeekVisits < m.prevWeekVisits ? 'down' : 'stable'
    }));

    const hotNames = new Set(hot.map((h: any) => h.name));
    const cold = sorted
      .filter((m: any) => !hotNames.has(m.name))
      .reverse()
      .slice(0, 4)
      .map((m: any) => ({
        ...m,
        trend: m.currentWeekVisits > m.prevWeekVisits ? 'up' : m.currentWeekVisits < m.prevWeekVisits ? 'down' : 'stable'
      }));

    return { hot, cold, isLowData: false };
  }, [allPlans]);

  const { openConfirm } = useModal();

  const handleDeletePlan = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    openConfirm({
      title: "Hapus Rencana",
      description: "Apakah Anda yakin ingin menghapus rencana kunjungan ini?",
      confirmText: "Ya, Hapus",
      confirmVariant: "danger",
      cancelVariant: "success",
      onConfirm: async () => {
        try {
          await deleteMarketPlan(id);
          toast.success("Rencana berhasil dihapus");
        } catch (error) {
          toast.error("Gagal menghapus rencana");
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-x-hidden pt-4 pb-24">
       {/* Background Polish */}
       <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/[0.02] blur-[80px] rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.035] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] contrast-125" />
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-8 relative z-10 w-full pt-2">
        {activeTab === 'plans' ? (
          <div className="md:grid md:grid-cols-12 md:gap-8 md:items-start w-full relative">
            {/* Left Section: Stats & Info */}
            <section className="mb-4 md:mb-0 md:col-span-5 lg:col-span-4 md:sticky md:top-24">
              <div className="text-center md:text-left mb-4">
                <h1 className="text-lg md:text-2xl font-black leading-none tracking-tight mb-0.5 capitalize">
                  {activeDate.dayName} <span className="text-primary">{activeDate.pasaran}</span>
                </h1>
                <p className="text-[8px] md:text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60">
                  {activeDate.fullDate}
                </p>
              </div>

              {/* Market Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-3 px-1">
                  <div className="h-[1px] flex-1 bg-white/[0.05]" />
                  <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.5em] flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Market Temperature
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  </h2>
                  <div className="h-[1px] flex-1 bg-white/[0.05]" />
                </div>

                <div className="grid grid-cols-2 gap-2 py-3 px-1">
                  {marketTemperature.isLowData ? (
                    <div className="col-span-2 py-6 text-center opacity-30 text-[8px] font-black uppercase tracking-widest">
                      CALLECTING DATA...
                    </div>
                  ) : (
                    <>
                      <div className="pr-1.5 flex flex-col items-stretch text-left">
                        <div className="flex flex-col items-start gap-0.5 mb-3">
                          <span className="text-sm leading-tight">🔥</span>
                          <p className="text-[7.5px] text-muted-foreground/40 font-bold uppercase tracking-wider leading-none text-left">Paling Sering Dipilih</p>
                        </div>
                        <div className="space-y-1.5">
                          {marketTemperature.hot.map((m: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between gap-1 group/item w-full">
                              <p className="text-[9px] font-bold text-foreground/80 truncate leading-none text-left">{toTitleCase(m.name)}</p>
                              <span className={cn("text-[8px] font-black transition-transform group-hover/item:scale-110", m.trend === 'up' ? "text-green-500" : m.trend === 'down' ? "text-red-500" : "text-zinc-500")}>
                                {m.trend === 'up' ? "↑" : m.trend === 'down' ? "↓" : "→"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pl-2 flex flex-col items-stretch text-right">
                        <div className="flex flex-col items-end gap-0.5 mb-3">
                          <span className="text-sm leading-tight text-right">❄️</span>
                          <p className="text-[7.5px] text-muted-foreground/40 font-bold uppercase tracking-wider leading-none text-right">Jarang Terjangkau</p>
                        </div>
                        <div className="space-y-1.5">
                          {marketTemperature.cold.map((m: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between gap-1 group/item w-full">
                              <span className={cn("text-[8px] font-black transition-transform group-hover/item:scale-110", m.trend === 'up' ? "text-green-500" : m.trend === 'down' ? "text-red-500" : "text-zinc-500")}>
                                {m.trend === 'up' ? "↑" : m.trend === 'down' ? "↓" : "→"}
                              </span>
                              <p className="text-[9px] font-bold text-foreground/60 truncate leading-none text-right">{toTitleCase(m.name)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* Right Section: Plans List */}
            <section className="md:col-span-7 lg:col-span-8">
              <div className="flex items-center justify-between mb-4 px-1" data-html2canvas-ignore="true">
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center shadow-md shadow-primary/10">
                    <Users className="w-2.5 h-2.5 text-black" />
                  </div>
                  <h2 className="text-[10px] font-bold tracking-tight text-foreground/90 uppercase tracking-wider">Rencana Kunjungan</h2>
                </div>
              </div>



              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 py-3 border-b border-white/[0.03]">
                      <div className="w-10 h-10 rounded-full bg-white/[0.03] animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/3 bg-white/[0.03] animate-pulse rounded" />
                        <div className="h-2 w-1/4 bg-white/[0.02] animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : plans.length > 0 ? (
                <div className="space-y-1.5">
                  {plans.map((plan) => (
                    <PlanItem 
                      key={plan.id} 
                      plan={plan} 
                      user={userMap[plan.userId]} 
                      activeDate={activeDate}
                      isManager={canAccessMaster} 
                      onDelete={handleDeletePlan}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-muted/10 flex items-center justify-center mb-2">
                    <Search className="w-3 h-3 text-muted-foreground/20" />
                  </div>
                  
                  <p className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-[0.3em] mb-3">Belum Ada Rencana</p>
                  
                  <div data-html2canvas-ignore="true" className="flex justify-center mb-4">
                    <ActionButton
                      onClick={() => navigate("/workspace/market-plans/create")}
                      icon={Plus}
                      className="text-[8.5px] font-black px-4 py-1.5"
                    >
                      TAMBAH RENCANA
                    </ActionButton>
                  </div>
                  
                  <p className="text-[6px] font-medium text-muted-foreground/15 uppercase tracking-[0.1em] max-w-[140px] leading-relaxed mx-auto">Mulai buat rencana kunjungan pertamamu</p>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="w-full">
            <MasterDataView 
               markets={markets} 
               onDelete={async () => {}} // Placeholder as these will use existing services
               onEdit={() => {}}
               onAdd={() => {}}
            />
          </div>
        )}
      </main>


    </div>
  );
}
