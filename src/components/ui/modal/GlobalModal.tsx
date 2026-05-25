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

  return (
    <div
      className={cn(
        "fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-6 max-md:items-end max-md:p-0",
        isCalculatorModal && "items-start pt-[56px] md:pt-[68px] max-md:items-start max-md:p-3 max-md:pt-[54px]"
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
        initial={isCalculatorModal ? { opacity: 0, scale: 0.95, y: -30 } : { opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={isCalculatorModal ? { opacity: 0, scale: 0.95, y: -30 } : { opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className={cn(
          "relative flex flex-col bg-white dark:bg-black border border-zinc-200/50 dark:border-white/[0.05] shadow-2xl overflow-hidden rounded-[24px]",
          !isCalculatorModal ? "max-md:rounded-t-[28px] max-md:rounded-b-none" : "max-md:rounded-[20px]",
          "w-full min-w-[280px] max-h-[85vh] md:max-h-[88vh]",
          // Desktop centered size configs
          "md:w-[85vw]", sizeClasses[modal.size || 'md'],
          // Mobile responsive bottom-sheet structure and safe-area adjustments
          !isCalculatorModal ? "max-md:max-h-[92vh] max-md:border-b-0 max-md:pb-[calc(env(safe-area-inset-bottom,20px)+8px)]" : "max-md:max-h-[85vh]",
          modal.className
        )}
      >
        {/* Mobile touch-swipe handle simulator */}
        {!isCalculatorModal && (
          <div 
            className="hidden max-md:flex justify-center py-3 shrink-0 cursor-pointer" 
            onClick={handleClose}
          >
            <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
          </div>
        )}

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
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col min-h-0">
          {modal.content}
        </div>

        {/* Footer actions if specified */}
        {modal.footer && (
          <div className="px-6 py-4 border-t border-zinc-200/50 dark:border-white/[0.05] bg-zinc-50/50 dark:bg-[#151515]/20 backdrop-blur-md shrink-0 flex items-center justify-end gap-3">
            {modal.footer}
          </div>
        )}
      </motion.div>
    </div>
  );
};
