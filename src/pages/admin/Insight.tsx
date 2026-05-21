import React, { useState, useMemo } from "react";
import dayjs from "dayjs";
import { MapPin, TrendingUp, Users } from "lucide-react";
import { cn } from "../../lib/utils";
import { useOutletContext } from "react-router-dom";

// Note: Helper components like KPICard may need to be moved to a shared location 
// or redefined here for now if they are not used elsewhere.
// Assuming they are needed inside Insight or should be shared components.

function KPICard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="p-4 flex items-center gap-4 transition-all hover:bg-zinc-100/50 dark:hover:bg-white/5">
      <div className={cn("w-10 h-10 flex items-center justify-center", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-400 dark:text-white/20 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-xl font-black tracking-tight text-zinc-900 dark:text-white leading-none">{value}</p>
      </div>
    </div>
  );
}

export default function AdminInsightPage() {
  const { plans, users, markets } = useOutletContext<any>();
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [trackingUser, setTrackingUser] = useState("");

  // 1. Summary Calculation
  const summary = useMemo(() => {
    const visited = plans.filter((p: any) => p.status === 'visited');
    const activeMarkets = new Set(plans.map((p: any) => p.marketName)).size;
    
    const cityCounts: Record<string, number> = {};
    plans.forEach((p: any) => {
      if (p.city) cityCounts[p.city] = (cityCounts[p.city] || 0) + 1;
    });
    const mostActiveCity = Object.entries(cityCounts).sort((a: any,b: any) => b[1] - a[1])[0]?.[0] || "-";

    return { totalVisits: visited.length, activeMarkets, mostActiveCity };
  }, [plans]);

  // 2. Market Insight Calculation
  const marketInsight = useMemo(() => {
    const stats: Record<string, any> = {};
    
    markets.forEach((m: any) => {
      stats[m.nama_pasar] = {
        name: m.nama_pasar,
        city: m.wilayah,
        visits: 0,
        lastVisit: null,
        users: new Set()
      };
    });

    plans.forEach((p: any) => {
      if (!stats[p.marketName]) {
         stats[p.marketName] = { name: p.marketName, city: p.city, visits: 0, lastVisit: null, users: new Set() };
      }
      stats[p.marketName].visits++;
      stats[p.marketName].users.add(p.userId);
      if (!stats[p.marketName].lastVisit || dayjs(p.dayStart).isAfter(dayjs(stats[p.marketName].lastVisit))) {
        stats[p.marketName].lastVisit = p.dayStart;
      }
    });

    const list = Object.values(stats).map((s: any) => ({
      ...s,
      userCount: s.users.size
    }));

    return {
      mostVisited: [...list].sort((a: any,b: any) => b.visits - a.visits).slice(0, 10),
      all: list
    };
  }, [plans, markets]);

  // 3. User Tracking Calculation
  const userTrackingData = useMemo(() => {
    if (!trackingUser) return null;
    const userPlans = plans.filter((p: any) => p.userId === trackingUser);
    const total = userPlans.length;
    
    const mCounts: any = {};
    const cCounts: any = {};
    userPlans.forEach((p: any) => {
      mCounts[p.marketName] = (mCounts[p.marketName] || 0) + 1;
      if (p.city) cCounts[p.city] = (cCounts[p.city] || 0) + 1;
    });

    const favMarket = Object.entries(mCounts).sort((a: any,b: any) => b[1] - a[1])[0]?.[0] || "-";
    const favCity = Object.entries(cCounts).sort((a: any,b: any) => b[1] - a[1])[0]?.[0] || "-";

    return {
      history: userPlans.sort((a: any,b: any) => dayjs(b.dayStart).unix() - dayjs(a.dayStart).unix()),
      total,
      favMarket,
      favCity
    };
  }, [plans, trackingUser]);

  return (
    <div className="max-w-[800px] mx-auto space-y-6 pb-20">
      {/* Filters Header */}
      <div className="sticky top-[48px] z-40 bg-white/90 dark:bg-black/95 backdrop-blur-md py-3 border-b border-zinc-100 dark:border-white/5 -mx-3 px-3">
         <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-primary">Market Insight</h3>
              </div>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)}
                className="h-9 px-3 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase outline-none"
              />
            </div>
         </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
         <KPICard label="Pasar Aktif" value={summary.activeMarkets} icon={MapPin} color="text-emerald-500" />
         <KPICard label="Kota Teraktif" value={summary.mostActiveCity} icon={TrendingUp} color="text-purple-500" />
      </div>

      {/* Market Insight Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Market Coverage Insight</h4>
        </div>
        
        <div className="overflow-hidden">
           <div className="overflow-x-auto no-scrollbar">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b border-zinc-100 dark:border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                   <th className="px-1 py-4">Nama Pasar</th>
                   <th className="px-5 py-4">Freq</th>
                   <th className="px-5 py-4">Terakhir</th>
                   <th className="px-5 py-4">Users</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                 {marketInsight.mostVisited.slice(0, 4).map((m: any) => (
                   <tr key={m.name} className="text-xs group hover:bg-zinc-100/50 dark:hover:bg-white/5 transition-colors">
                     <td className="px-1 py-3">
                       <p className="font-bold">{m.name}</p>
                       <p className="text-[9px] text-zinc-400 uppercase font-black tracking-tighter">{m.city}</p>
                     </td>
                     <td className="px-5 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full font-black text-[9px]",
                          m.visits > 5 ? "bg-primary/20 text-primary" : "bg-zinc-200 dark:bg-white/10 text-zinc-500"
                        )}>
                          {m.visits}x
                        </span>
                     </td>
                     <td className="px-5 py-3 font-mono text-[10px] opacity-50">
                        {m.lastVisit ? dayjs(m.lastVisit).format("DD/MM") : "-"}
                     </td>
                     <td className="px-5 py-3 font-bold text-primary">
                        {m.userCount}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      </section>

      {/* User Tracking Section */}
      <section className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">User Performance Tracking</h4>
          <select 
            value={trackingUser}
            onChange={e => setTrackingUser(e.target.value)}
            className="h-8 px-3 bg-white dark:bg-white/10 border border-zinc-100 dark:border-white/10 rounded-lg text-[9px] font-black uppercase outline-none"
          >
            <option value="">PILIH USER</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
          </select>
        </div>

        {userTrackingData ? (
          <div className="space-y-4">
             <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 rounded-xl">
                   <p className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">Total Kunjungan</p>
                   <p className="text-lg font-black">{userTrackingData.total}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-xl">
                   <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-1">Fav Market</p>
                   <p className="text-[10px] font-black leading-tight">{userTrackingData.favMarket}</p>
                </div>
                <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 rounded-xl">
                   <p className="text-[8px] font-black text-purple-600 dark:text-purple-400 uppercase mb-1">Fav Kota</p>
                   <p className="text-[10px] font-black leading-tight">{userTrackingData.favCity}</p>
                </div>
             </div>

             <div className="overflow-hidden">
                <div className="p-3 border-b border-border/50">
                   <p className="text-[9px] font-black uppercase tracking-widest">Histori Kunjungan</p>
                </div>
                <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                   {userTrackingData.history.length === 0 ? (
                     <p className="text-center py-10 text-[10px] italic text-zinc-400">Belum ada histori kunjungan</p>
                   ) : (
                     userTrackingData.history.map((h: any, i: number) => (
                       <div key={i} className="px-4 py-3 border-b border-border/30 last:border-0 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                          <div>
                             <p className="text-xs font-bold">{h.marketName}</p>
                             <p className="text-[9px] text-zinc-400 font-mono">{dayjs(h.dayStart).format("dddd, D MMMM YYYY")}</p>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                            h.status === 'visited' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-100 dark:bg-white/10 text-zinc-400"
                          )}>
                            {h.status}
                          </span>
                       </div>
                     ))
                   )}
                </div>
             </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center opacity-20">
             <Users className="w-10 h-10 mb-2" />
             <p className="text-[10px] font-black uppercase tracking-widest">Pilih user untuk melihat insight</p>
          </div>
        )}
      </section>
    </div>
  );
}
