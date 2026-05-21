import React from 'react';
import { AuthGuard } from '../../../components/AuthGuard';
import { HeaderBar } from '../../../components/HeaderBar';
import { useOperationalReport } from '../hooks/useReport';
import { SummaryWidgetGroup } from '../components/SummaryWidgets';
import { OperationalQueueWidget } from '../components/OperationalQueueWidget';
import { SalesPerformanceWidget } from '../components/SalesPerformanceWidget';
import { ReportFilterBar } from '../components/ReportFilterBar';

export default function OperationalReportPage() {
  const { filters, setFilters, data, loading, error } = useOperationalReport({
    datePreset: 'this_month'
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pt-6 pb-20">
        <div className="max-w-5xl mx-auto px-4 lg:px-8 space-y-8">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-foreground">Operational Command</h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time operational intelligence and summary reporting.</p>
          </div>

          <ReportFilterBar filters={filters} onChange={setFilters} />

          {error && (
            <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold uppercase tracking-wide">
              {error}
            </div>
          )}

          {loading ? (
             <div className="flex justify-center items-center py-20">
               <div className="w-8 h-8 md:w-12 md:h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
             </div>
          ) : data ? (
             <div className="space-y-6">
               <SummaryWidgetGroup metrics={data.summary} />
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <OperationalQueueWidget metrics={data.operational} />
                 {data.salesPerformance && data.salesPerformance.length > 0 && (
                   <SalesPerformanceWidget sales={data.salesPerformance} />
                 )}
               </div>
             </div>
          ) : null}

        </div>
      </div>
    </AuthGuard>
  );
}
