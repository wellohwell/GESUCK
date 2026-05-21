import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

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

    // Monitor Firebase connectivity / round-trip latency
    let unsubscribe: (() => void) | undefined;
    
    if (navigator.onLine) {
      // Connect to Firestore special connection metadata collection
      // .info/connected is a virtual node containing current status
      try {
        const connectedRef = doc(db, '.info/connected');
        unsubscribe = onSnapshot(connectedRef, (snap) => {
          const isConnected = snap.data()?.connected ?? true;
          setIsOnline(isConnected);
        }, (err) => {
          // If virtual node fails, rely on browser status or latency checks
        });
      } catch (e) {
        // Fallback
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { isOnline, isSlow };
}
