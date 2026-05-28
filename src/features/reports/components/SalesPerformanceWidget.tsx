import React from 'react';
import { SalesPerformanceMetrics } from '../types/report.types';
import { UserCircle } from 'lucide-react';

export function SalesPerformanceWidget({ sales }: { sales: SalesPerformanceMetrics[] }) {
  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  if (!sales || sales.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border border-border/50 rounded-[1.5rem] p-6">
      <h3 className="text-sm font-bold uppercase tracking-widest mb-6">Sales Performance</h3>
      <div className="space-y-4">
        {sales.map((s, idx) => (
          <div key={s.userId} className="flex items-center justify-between p-3 bg-muted/30 rounded-[1.25rem]">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                 {idx + 1}
               </div>
               <div>
                 <p className="text-sm font-bold uppercase">{s.userName}</p>
                 <p className="text-xs text-muted-foreground">{s.totalOrders} Orders • {s.activeOrders} Active</p>
               </div>
             </div>
             <div className="text-right">
               <p className="text-sm font-black text-emerald-500">{formatCurrency(s.totalOmset)}</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
