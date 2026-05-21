import { useState } from 'react';
import { crmService } from '../services/crm.service';

export function useCRMSearch() {
  const [loading, setLoading] = useState(false);
  
  const searchByPhone = async (phone: string, branchId?: string) => {
    setLoading(true);
    try {
      return await crmService.searchCustomersByPhone(phone, branchId);
    } finally {
      setLoading(false);
    }
  };

  return { searchByPhone, loading };
}
