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
        className="fixed z-[9999] px-4 pointer-events-none flex flex-col gap-2.5 items-center left-1/2 -translate-x-1/2 w-full max-w-[420px] top-0"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 16px) + 12px)',
        }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="w-full flex justify-center pointer-events-auto">
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
