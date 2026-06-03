import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ModalState, closeModal } from './useModal';
import { cn } from '../../../lib/utils';
import { ModalHeader } from './ModalHeader';

interface GlobalModalProps {
  modal: ModalState;
  index: number;
}

export const GlobalModal: React.FC<GlobalModalProps> = ({ modal, index }) => {
  const handleClose = () => {
    if (modal.persistent) return;
    closeModal(modal.id);
  };

  // Close when pressing the ESC button unless persistent is enabled
  useEffect(() => {
    if (modal.persistent) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modal.persistent]);

  // Handle responsive configurations
  const sizeClasses = {
    sm: "md:max-w-sm",
    md: "md:max-w-md",
    lg: "md:max-w-lg",
    xl: "md:max-w-2xl",
    fullscreen: "md:max-w-none md:w-screen md:h-screen md:rounded-none"
  };

  const isCalculatorModal = modal.className?.includes("is-calculator-modal");
  const isBelowTopBar = modal.className?.includes("below-top-bar") || isCalculatorModal;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-6 max-md:items-center max-md:p-4",
        isBelowTopBar && "items-start pt-16 md:pt-20 max-md:items-start max-md:p-3 max-md:pt-[102px]"
      )}
      style={{ zIndex: 999 + index }}
    >
      {/* Backdrop with elegant glass overlay blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-sm"
      />

      {/* Modal Surface Box */}
      <motion.div
        initial={isBelowTopBar ? { opacity: 0, scale: 0.95, y: -30 } : { opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={isBelowTopBar ? { opacity: 0, scale: 0.95, y: -30 } : { opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className={cn(
          "relative flex flex-col bg-card border border-border/50 shadow-2xl overflow-hidden",
          modal.size === 'sm' ? "rounded-2xl" : modal.size === 'lg' || modal.size === 'xl' || modal.size === 'full' ? "rounded-[20px]" : "rounded-[18px]",
          "w-full min-w-[280px] max-h-[85vh] md:max-h-[88vh]",
          // Desktop centered size configs
          "md:w-[85vw]", sizeClasses[modal.size || 'md'],
          // Mobile responsive centered structure
          "max-md:max-h-[85vh]",
          modal.className
        )}
      >
        {/* Dynamic header if specified in the call */}
        {(modal.title || !modal.hideCloseButton) && (
          <ModalHeader
            title={modal.title}
            subtitle={modal.subtitle}
            onClose={() => closeModal(modal.id)}
            showCloseButton={!modal.hideCloseButton}
          />
        )}

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col min-h-0 bg-background">
          {modal.content}
        </div>

        {/* Footer actions if specified */}
        {modal.footer && (
          <div className="px-6 py-4 border-t border-border/50/50 dark:border-white/[0.05] bg-card shrink-0 flex items-center justify-end gap-3">
            {modal.footer}
          </div>
        )}
      </motion.div>
    </div>
  );
};
