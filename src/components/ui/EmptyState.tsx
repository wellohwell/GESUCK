import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  onAction,
  actionLabel,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 md:p-12",
        "bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-3xl shadow-sm",
        className
      )}
    >
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 mb-4 text-zinc-400 dark:text-zinc-500">
        <Icon className="w-8 h-8" />
      </div>
      
      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 mb-1">
        {title}
      </h3>
      
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 max-w-xs mb-6">
        {description}
      </p>

      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-primary text-black hover:opacity-90 active:scale-95 transition-all shadow-md"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
