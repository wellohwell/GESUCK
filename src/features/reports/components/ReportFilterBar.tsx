import React from 'react';
import { BaseReportFilters } from '../types/report.types';
import { useAuth } from '../../../providers/AuthProvider';
import { ROLES } from '../../../config/roles';

interface ReportFilterBarProps {
  filters: BaseReportFilters;
  onChange: (f: BaseReportFilters) => void;
}

export function ReportFilterBar({ filters, onChange }: ReportFilterBarProps) {
  const { userProfile } = useAuth();
  const canSeeBranches = userProfile?.role === ROLES.OWNER || userProfile?.role === ROLES.MANAGER || userProfile?.role === ROLES.STAFF;

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card text-card-foreground p-4 rounded-xl border border-border/50">
      <div className="flex items-center gap-2 overflow-x-auto w-full no-scrollbar">
        {['today', 'this_week', 'this_month'].map((preset) => (
          <button
            key={preset}
            onClick={() => onChange({ ...filters, datePreset: preset as any })}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
              filters.datePreset === preset 
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {preset.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto">
        {canSeeBranches && (
          <select
            className="w-full md:w-48 bg-muted text-muted-foreground text-xs font-bold uppercase tracking-wider rounded-lg px-4 py-2 border-none outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
            value={filters.branchId || ''}
            onChange={(e) => onChange({ ...filters, branchId: e.target.value || undefined })}
          >
            <option value="">All Branches</option>
            {/* Real branches should map here from a context or config */}
            <option value="branch_1">Branch 1</option>
            <option value="branch_2">Branch 2</option>
          </select>
        )}
      </div>
    </div>
  );
}
