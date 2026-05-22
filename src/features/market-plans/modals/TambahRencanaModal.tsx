import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface TambahRencanaModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

export function TambahRencanaModal({ isOpen, onClose, children, title }: TambahRencanaModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden', 'market-modal-active');
    } else {
      document.body.classList.remove('overflow-hidden', 'market-modal-active');
    }
    return () => document.body.classList.remove('overflow-hidden', 'market-modal-active');
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[99999] flex flex-col bg-background"
        >
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border py-4 px-6 flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight">{title}</h2>
            <button
               onClick={onClose}
               className="w-10 h-10 rounded-full bg-muted/40 hover:bg-muted/60 flex items-center justify-center border border-border/10 text-muted-foreground transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto p-6 md:p-8">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
