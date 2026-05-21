import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ModalState, useModal } from '../hooks/use-modal';
import { ModalRenderer } from '../components/ui/modal';

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const { subscribe, closeModal } = useModal();
  const [modals, setModals] = useState<ModalState[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe(setModals);
    return unsubscribe;
  }, [subscribe]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (modals.length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modals.length]);

  return (
    <>
      {children}
      <AnimatePresence>
        {modals.map((modal, index) => (
          <div key={modal.id}>
            <ModalRenderer 
              modal={modal} 
              onClose={closeModal} 
              index={index}
            />
          </div>
        ))}
      </AnimatePresence>
    </>
  );
}
