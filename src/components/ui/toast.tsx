import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Loader2 } from 'lucide-react';
import { ToastProps, useToast, toast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';

export function Toast({ toast: t, onDismiss }: { toast: ToastProps; onDismiss: (id: string) => void }) {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (t.type === 'loading' || isHovered) return;
    const timer = setTimeout(() => onDismiss(t.id), t.duration || 4000);
    return () => clearTimeout(timer);
  }, [t, isHovered, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
    loading: <Loader2 className="w-5 h-5 text-primary shrink-0 animate-spin" />,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
      whileHover={{ scale: 1.02 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={(e, { offset, velocity }) => {
        if (Math.abs(offset.x) > 100 || Math.abs(velocity.x) > 500) {
          onDismiss(t.id);
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "pointer-events-auto relative flex w-full sm:w-auto min-w-[300px] max-w-[400px] items-start gap-4 rounded-2xl p-4 shadow-xl",
        "bg-card/80 backdrop-blur-xl border border-border/50 text-foreground"
      )}
      style={{
        boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.05)',
      }}
    >
      <div className="mt-0.5">{icons[t.type || 'info']}</div>
      <div className="flex-1 flex flex-col gap-1">
        <h3 className="text-[14px] font-semibold leading-tight">{t.title}</h3>
        {t.description && (
          <p className="text-[13px] font-medium text-muted-foreground leading-snug">{t.description}</p>
        )}
        {t.action && (
          <button
            onClick={() => {
              t.action?.onClick();
              onDismiss(t.id);
            }}
            className="mt-2 w-fit rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
          >
            {t.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        className="absolute right-3 top-3 rounded-full p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 sm:opacity-50"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </motion.div>
  );
}
