import { useState, useEffect } from 'react';
import { clientService } from '../services/client.service';
import { useCurrentUser, useUserProfile } from '../../../lib/services';

export function useClientData() {
  const user = useCurrentUser();
  const { profile } = useUserProfile();
  const [allClients, setAllClients] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.role || !user?.uid) return;
    const unsub = clientService.subscribeClients(profile.role, user.uid, (data) => {
      setAllClients(data);
    }, profile.branchId);
    return () => unsub();
  }, [profile?.role, user?.uid, profile?.branchId]);

  return { allClients };
}
