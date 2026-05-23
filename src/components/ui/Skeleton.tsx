import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
}

export function Skeleton({ className, variant = 'rectangular', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-secondary/80 relative overflow-hidden",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/10 dark:after:via-white/5 after:to-transparent",
        variant === 'text' && "h-4 w-3/4 rounded-lg",
        variant === 'circular' && "rounded-full",
        variant === 'rectangular' && "rounded-2xl",
        variant === 'card' && "rounded-3xl p-6 h-36 border border-border/40",
        className
      )}
      {...props}
    />
  );
}

// Pre-built layout skeletons for high-performance rendering
export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-3xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="w-1/2 h-5" />
          <Skeleton variant="text" className="w-1/3 h-3.5" />
        </div>
        <Skeleton variant="circular" className="w-10 h-10" />
      </div>
      <div className="pt-2 border-t border-border/50 flex items-center justify-between">
        <Skeleton variant="text" className="w-24 h-4" />
        <Skeleton variant="rectangular" className="w-16 h-6 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonFeed({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonLineItem() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border">
      <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-2/3 h-4" />
        <Skeleton variant="text" className="w-1/3 h-3" />
      </div>
      <Skeleton variant="rectangular" className="w-12 h-6" />
    </div>
  );
}
