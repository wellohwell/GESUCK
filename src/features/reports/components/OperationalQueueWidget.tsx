import React from 'react';
import { OperationalMetrics } from '../types/report.types';

export function OperationalQueueWidget({ metrics }: { metrics: OperationalMetrics }) {
  const queues = [
    { label: 'Survey', value: metrics.queueSurvey, color: 'bg-blue-500' },
    { label: 'Processing', value: metrics.queueProcessing, color: 'bg-orange-500' },
    { label: 'Warehouse', value: metrics.queueWarehouse, color: 'bg-purple-500' },
    { label: 'Delivery', value: metrics.queueDelivery, color: 'bg-indigo-500' },
    { label: 'Completed', value: metrics.queueCompleted, color: 'bg-emerald-500' },
  ];

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6">
      <h3 className="text-sm font-bold uppercase tracking-widest mb-6">Operational Pipeline</h3>
      <div className="space-y-4">
        {queues.map((q) => (
          <div key={q.label}>
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
              <span className="text-muted-foreground">{q.label}</span>
              <span>{q.value}</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${q.color} transition-all duration-1000 ease-out`} 
                style={{ width: `${Math.min(100, Math.max(2, (q.value / 20) * 100))}%` }} 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
