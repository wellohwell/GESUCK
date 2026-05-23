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
        "bg-card border border-border rounded-3xl shadow-sm",
        className
      )}
    >
      <div className="p-4 rounded-2xl bg-secondary mb-4 text-text-muted">
        <Icon className="w-8 h-8" />
      </div>
      
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-1">
        {title}
      </h3>
      
      <p className="text-xs font-medium text-text-secondary max-w-xs mb-6">
        {description}
      </p>

      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-md"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
