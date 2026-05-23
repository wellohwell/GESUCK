import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { ModalState } from '../../hooks/use-modal.tsx';
import { cn } from '../../lib/utils';

interface ModalRendererProps {
  modal: ModalState;
  onClose: (id: string) => void;
  index: number;
}

export function ModalRenderer({ modal, onClose, index }: ModalRendererProps) {
  const handleClose = () => onClose(modal.id);

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-6 max-md:items-end max-md:p-0" 
      style={{ zIndex: 999 + index }}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Modal Surface */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className={cn(
          "relative flex flex-col bg-card border border-border shadow-2xl overflow-hidden",
          "w-full min-w-[280px] max-h-[88vh] md:max-h-[90vh]",
          // Desktop sizing: centered card
          "md:w-[85vw] lg:w-full md:max-w-[700px] md:rounded-3xl",
          // Mobile sizing: bottom sheet docked, touch-friendly rounded top corners
          "max-md:rounded-t-[28px] max-md:rounded-b-none max-md:border-b-0 max-md:pb-[calc(env(safe-area-inset-bottom,20px)+8px)]"
        )}
      >
        {/* Mobile Swipe Handle Drag Indicator */}
        <div className="hidden max-md:flex justify-center py-2.5 shrink-0">
          <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        {(modal.title || !modal.hideCloseButton) && (
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-card/85 backdrop-blur-md border-b border-border">
            <div className="flex flex-col">
              {modal.title && <h2 className="text-base font-black uppercase tracking-wider text-text-primary">{modal.title}</h2>}
              {modal.subtitle && <p className="text-xs font-semibold text-text-secondary mt-0.5">{modal.subtitle}</p>}
            </div>
            {!modal.hideCloseButton && (
              <button 
                onClick={handleClose}
                className="p-2 -mr-2 text-text-secondary hover:bg-secondary rounded-xl transition-all active:scale-90"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 no-scrollbar">
          {modal.content}
        </div>

        {/* Footer */}
        {modal.footer && (
          <div className="px-6 py-4 border-t border-border bg-secondary/35 backdrop-blur-md shrink-0">
            {modal.footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}

