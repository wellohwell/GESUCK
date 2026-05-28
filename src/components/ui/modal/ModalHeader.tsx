import React from 'react';
import { X } from 'lucide-react';

interface ModalHeaderProps {
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  onClose,
  showCloseButton = true
}) => {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-card dark:bg-black border-b border-border/50/50 dark:border-white/[0.05]">
      <div className="flex flex-col pr-4">
        {title && (
          <h2 className="text-sm md:text-base font-bold text-zinc-900 dark:text-zinc-100 font-sans">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-[10px] md:text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-[1.25rem] transition-all active:scale-90"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
