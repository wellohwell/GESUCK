import { useState, useEffect } from 'react';
import { reportService } from '../services/report.service';
import { BaseReportFilters, ReportData } from '../types/report.types';
import { useAuth } from '../../../providers/AuthProvider';
import { ROLES } from '../../../config/roles';

export function useOperationalReport(initialFilters: BaseReportFilters) {
  const [filters, setFilters] = useState<BaseReportFilters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { userProfile } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function loadReport() {
      if (!userProfile) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Automatically scope access based on role
        let scopedFilters = { ...filters };
        
        if (userProfile.role === ROLES.SALES || userProfile.role === ROLES.SURVEY) {
          scopedFilters.userId = userProfile.uid;
        } else if (userProfile.role === ROLES.STAFF || userProfile.role === ROLES.SPV) {
          scopedFilters.branchId = userProfile.branchId;
        }
        
        const reportData = await reportService.getOperationalReport(scopedFilters);
        
        if (mounted) {
          setData(reportData);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to load report");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadReport();

    return () => { mounted = false; };
  }, [filters, userProfile]);

  return { filters, setFilters, data, loading, error };
}
