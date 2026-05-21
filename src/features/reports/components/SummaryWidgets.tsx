import React from 'react';
import { SummaryMetrics } from '../types/report.types';
import { TrendingUp, Users, Package, CheckCircle, RefreshCcw } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  className?: string;
}

function MetricCard({ title, value, icon, trend, className }: MetricCardProps) {
  return (
    <div className={`bg-card border border-border/50 p-6 rounded-2xl ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-2">{title}</p>
          <h3 className="text-2xl font-black text-foreground">{value}</h3>
          {trend && <p className="text-[10px] text-emerald-500 font-bold mt-2">{trend}</p>}
        </div>
        <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function SummaryWidgetGroup({ metrics }: { metrics: SummaryMetrics }) {
  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard 
        title="Total Omset" 
        value={formatCurrency(metrics.totalOmset)} 
        icon={<TrendingUp size={20} />} 
        className="lg:col-span-2"
      />
      <MetricCard 
        title="Total Orders" 
        value={metrics.totalOrders} 
        icon={<Package size={20} />} 
      />
      <MetricCard 
        title="Active / Completed" 
        value={`${metrics.activeOrders} / ${metrics.completedOrders}`} 
        icon={<CheckCircle size={20} />} 
      />
    </div>
  );
}
