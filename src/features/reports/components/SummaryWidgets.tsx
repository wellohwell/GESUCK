import React from 'react';
import { SummaryMetrics } from '../types/report.types';
import { TrendingUp, Users, Package, CheckCircle, RefreshCcw } from 'lucide-react';
import { SummaryCard } from '../../../components/ui/FintechCard';

export function SummaryWidgetGroup({ metrics }: { metrics: SummaryMetrics }) {
  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard 
        title="Total Omset" 
        value={formatCurrency(metrics.totalOmset)} 
        icon={TrendingUp} 
        theme="primary"
        className="lg:col-span-2"
        trend={{ value: '+12.5%', isPositive: true }}
      />
      <SummaryCard 
        title="Total Orders" 
        value={metrics.totalOrders} 
        icon={Package} 
      />
      <SummaryCard 
        title="Active / Completed" 
        value={`${metrics.activeOrders} / ${metrics.completedOrders}`} 
        icon={CheckCircle} 
      />
    </div>
  );
}
