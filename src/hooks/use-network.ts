import { useState, useEffect } from 'react';

export interface NetworkState {
  isOnline: boolean;
  isSlow: boolean;
}

export function useNetwork(): NetworkState {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSlow, setIsSlow] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setIsSlow(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor connection quality using Network Information API if available
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const updateConnectionStatus = () => {
      if (conn) {
        setIsSlow(conn.saveData || ['slow-2g', '2g', '3g'].includes(conn.effectiveType));
      }
    };

    if (conn) {
      conn.addEventListener('change', updateConnectionStatus);
      updateConnectionStatus();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) {
        conn.removeEventListener('change', updateConnectionStatus);
      }
    };
  }, []);

  return { isOnline, isSlow };
}
