import { useState, useEffect } from "react";
import { subscribeClients } from "../services/clientService";
import { Client } from "../types/CRMTypes";

export function useClients(role: string, uid: string) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!role || !uid) return;
    setLoading(true);
    const unsub = subscribeClients(role, uid, (data) => {
      setClients(data);
      setLoading(false);
    });
    return () => unsub();
  }, [role, uid]);

  return { clients, loading };
}
