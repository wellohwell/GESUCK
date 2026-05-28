import React from 'react';
import { OperationalMetrics } from '../types/report.types';
import { DetailCard } from '../../../components/ui/FintechCard';
import { LayoutGrid } from 'lucide-react';

export function OperationalQueueWidget({ metrics }: { metrics: OperationalMetrics }) {
  const queues = [
    { label: 'Survey', value: metrics.queueSurvey, color: 'bg-blue-500', barColor: 'bg-blue-500/20' },
    { label: 'Processing', value: metrics.queueProcessing, color: 'bg-orange-500', barColor: 'bg-orange-500/20' },
    { label: 'Warehouse', value: metrics.queueWarehouse, color: 'bg-purple-500', barColor: 'bg-purple-500/20' },
    { label: 'Delivery', value: metrics.queueDelivery, color: 'bg-indigo-500', barColor: 'bg-indigo-500/20' },
    { label: 'Completed', value: metrics.queueCompleted, color: 'bg-emerald-500', barColor: 'bg-emerald-500/20' },
  ];

  return (
    <DetailCard title="Operational Pipeline" icon={LayoutGrid} className="h-full">
      <div className="space-y-4">
        {queues.map((q) => (
          <div key={q.label}>
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
              <span className="text-text-muted">{q.label}</span>
              <span className="text-text-primary">{q.value}</span>
            </div>
            <div className={`h-2 w-full rounded-full overflow-hidden ${q.barColor}`}>
              <div 
                className={`h-full ${q.color} transition-all duration-1000 ease-out`} 
                style={{ width: `${Math.min(100, Math.max(2, (q.value / 20) * 100))}%` }} 
              />
            </div>
          </div>
        ))}
      </div>
    </DetailCard>
  );
}
