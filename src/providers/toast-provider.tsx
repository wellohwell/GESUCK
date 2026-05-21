import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ToastProps, useToast, toast } from '../hooks/use-toast';
import { Toast } from '../components/ui/toast';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { subscribe, dismiss } = useToast();
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe(setToasts);
    return unsubscribe;
  }, [subscribe]);

  return (
    <>
      {children}
      <div 
        className="fixed z-[9999] p-4 pointer-events-none flex flex-col gap-3 items-center inset-x-0 top-0 sm:top-auto sm:bottom-0 sm:right-0 sm:left-auto sm:items-end w-full sm:w-auto"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 16px) + 16px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)',
        }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id}>
              <Toast toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

// export default toast instance directly so we can just import from here if we want or from use-toast
export { toast };
