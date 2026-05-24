import React from 'react';
import { cn } from '../../../lib/utils';

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-zinc-200/50 dark:border-white/[0.05] bg-zinc-50/50 dark:bg-zinc-950/20 backdrop-blur-md shrink-0 flex items-center justify-end gap-3",
        className
      )}
    >
      {children}
    </div>
  );
};
