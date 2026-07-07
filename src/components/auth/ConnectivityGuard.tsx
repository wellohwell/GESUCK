import React, { useState, useEffect } from 'react';
import { BootstrapSplash } from './AppBootstrap';
import { OfflineBootScreen } from './OfflineBootScreen';
import { OfflineActiveDialog } from './OfflineActiveDialog';

interface ConnectivityGuardProps {
  children: React.ReactNode;
}

export const ConnectivityGuard: React.FC<ConnectivityGuardProps> = ({ children }) => {
  const [bootStatus, setBootStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // 1. Brief splash delay for app initialization & check connection
    const timer = setTimeout(() => {
      if (navigator.onLine) {
        setBootStatus('online');
      } else {
        setBootStatus('offline');
      }
    }, 800);

    // 2. Real-time online/offline event handlers
    const handleOnline = () => {
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    // Simulate a brief retry delay
    setTimeout(() => {
      setIsRetrying(false);
      if (navigator.onLine) {
        setBootStatus('online');
        setIsOnline(true);
      } else {
        setBootStatus('offline');
        setIsOnline(false);
      }
    }, 1000);
  };

  if (bootStatus === 'checking') {
    return <BootstrapSplash />;
  }

  if (bootStatus === 'offline') {
    return <OfflineBootScreen onRetry={handleRetry} isRetrying={isRetrying} />;
  }

  return (
    <>
      {children}
      <OfflineActiveDialog isOpen={!isOnline} />
    </>
  );
};
