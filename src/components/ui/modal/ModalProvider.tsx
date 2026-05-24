import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ModalState, useModal } from './useModal';
import { GlobalModal } from './GlobalModal';

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { subscribe } = useModal();
  const [modals, setModals] = useState<ModalState[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe(setModals);
    return unsubscribe;
  }, [subscribe]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (modals.length > 0) {
      document.body.style.overflow = 'hidden';
      // Reserve sidebar offset spacing to prevent layout shift if scrollbars are visible
      document.body.style.paddingRight = 'var(--removed-body-scroll-bar-size, 0px)';
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [modals.length]);

  return (
    <>
      {children}
      <AnimatePresence>
        {modals.map((modal, index) => (
          <GlobalModal
            key={modal.id}
            modal={modal}
            index={index}
          />
        ))}
      </AnimatePresence>
    </>
  );
};
