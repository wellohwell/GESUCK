import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ChevronDown, ChevronRight, LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/* =========================================================
   BASE FINTECH CARD SURFACE
   ========================================================= */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  glass?: boolean;
  interactive?: boolean;
  depth?: 'soft' | 'medium' | 'deep';
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  key?: React.Key;
}

export function Card({ 
  children, 
  className, 
  glass = true, 
  interactive = false,
  depth = 'soft',
  ...props 
}: CardProps) {
  return (
    <div 
      className={cn(
        "rounded-3xl transition-all duration-300 relative overflow-hidden",
        glass ? "bg-card/40 backdrop-blur-md" : "bg-card",
        depth === 'soft' && "shadow-sm",
        depth === 'medium' && "shadow-soft",
        depth === 'deep' && "shadow-depth",
        interactive && "hover:shadow-depth hover:-translate-y-0.5 active:translate-y-0 cursor-pointer active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {/* Subtle internal gradient glow for premium feel */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent dark:from-white/[0.02] dark:to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* =========================================================
   SUMMARY CARD (Metrics, Omset, Targets)
   ========================================================= */

interface SummaryCardProps extends Omit<CardProps, 'title'> {
  title: string;
  value: string | React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon?: LucideIcon;
  action?: React.ReactNode;
  theme?: 'default' | 'primary' | 'accent' | 'success'; 
}

export function SummaryCard({ 
  title, 
  value, 
  trend, 
  icon: Icon,
  action,
  theme = 'default',
  className,
  ...props 
}: SummaryCardProps) {
  return (
    <Card 
      className={cn(
        "p-5 flex flex-col gap-4 relative overflow-hidden", 
        theme === 'primary' && "bg-primary/10 text-primary border-primary/20",
        theme === 'accent' && "bg-accent/10 border-accent/20",
        theme === 'success' && "bg-emerald-500/10 border-emerald-500/20",
        className
      )} 
      {...props}
    >
      {/* Glow effect for primary theme */}
      {theme === 'primary' && (
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
      )}

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={cn(
              "p-2 rounded-full",
              theme === 'default' ? "bg-background/50 text-text-secondary" : 
              theme === 'primary' ? "bg-primary/20 text-primary" : "bg-background/50 text-current"
            )}>
              <Icon className="w-4 h-4" />
            </div>
          )}
          <h3 className={cn(
            "text-xs font-semibold tracking-wide uppercase",
            theme === 'primary' ? "text-primary/90" : "text-text-muted"
          )}>
            {title}
          </h3>
        </div>
        {action && <div>{action}</div>}
      </div>

      <div className="flex items-end justify-between gap-4 mt-1 relative z-10">
        <div className={cn(
          "text-2xl font-bold tracking-tight",
          theme === 'primary' ? "text-primary" : "text-text-primary"
        )}>
          {value}
        </div>
        
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
            trend.isPositive 
              ? theme === 'primary' ? "bg-primary/20 text-primary" : "bg-emerald-500/10 text-emerald-400"
              : theme === 'primary' ? "bg-primary/20 text-primary" : "bg-destructive/10 text-destructive"
          )}>
            {trend.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}
          </div>
        )}
      </div>
    </Card>
  );
}

/* =========================================================
   OPERATIONAL CARD (Tasks, Clients, Workflow Items)
   ========================================================= */

interface OperationalCardProps extends CardProps {
  title: string;
  subtitle?: string;
  status?: React.ReactNode;
  icon?: LucideIcon;
  avatar?: React.ReactNode;
  rightContent?: React.ReactNode;
  expandableContent?: React.ReactNode;
  isExpandedInitial?: boolean;
}

export function OperationalCard({
  title,
  subtitle,
  status,
  icon: Icon,
  avatar,
  rightContent,
  expandableContent,
  isExpandedInitial = false,
  className,
  interactive = true,
  ...props
}: OperationalCardProps) {
  const [isExpanded, setIsExpanded] = useState(isExpandedInitial);
  
  const hasExpandable = !!expandableContent;

  return (
    <Card 
      className={className} 
      interactive={interactive && !hasExpandable}
      {...props}
    >
      <div 
        className={cn(
          "p-4 flex items-center gap-4 transition-colors",
          hasExpandable && "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
        )}
        onClick={() => hasExpandable && setIsExpanded(!isExpanded)}
      >
        {/* Avatar or Icon */}
        {avatar ? (
          <div className="flex-shrink-0">{avatar}</div>
        ) : Icon ? (
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/30 border border-border/50 flex items-center justify-center text-text-secondary">
            <Icon className="w-5 h-5" />
          </div>
        ) : null}

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-text-primary truncate">{title}</h4>
            {status && <div className="flex-shrink-0">{status}</div>}
          </div>
          {subtitle && (
            <p className="text-xs font-medium text-text-muted truncate">{subtitle}</p>
          )}
        </div>

        {/* Right Content */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {rightContent}
          {hasExpandable && (
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all bg-background/50 text-text-muted",
              isExpanded && "bg-primary/10 text-primary rotate-180"
            )}>
              <ChevronDown className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {hasExpandable && (
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0 border-t border-border/30 mt-2 bg-background/30">
                <div className="pt-4">
                  {expandableContent}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </Card>
  );
}

/* =========================================================
   DETAIL CARD (Information Block, Timeline, Notes)
   ========================================================= */

interface DetailCardProps extends CardProps {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export function DetailCard({ 
  title, 
  icon: Icon,
  action, 
  children, 
  className, 
  ...props 
}: DetailCardProps) {
  return (
    <Card className={cn("overflow-hidden flex flex-col", className)} {...props}>
      <div className="px-5 py-4 border-b border-border/40 bg-card/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          <h3 className="text-sm font-semibold text-text-primary capitalize">{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-5 flex-1 relative z-10 bg-background/30">
        {children}
      </div>
    </Card>
  );
}

/* =========================================================
   ACTION CARD (Shortcuts, Tools, Quick Actions)
   ========================================================= */

interface ActionCardProps extends CardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  onClick?: () => void;
  color?: 'primary' | 'accent' | 'warning' | 'success' | 'default';
}

export function ActionCard({ 
  title, 
  description, 
  icon: Icon, 
  onClick,
  color = 'default',
  className,
  ...props 
}: ActionCardProps) {
  
  const colorMap = {
    default: "bg-secondary/40 text-text-secondary border-border/50",
    primary: "bg-primary/10 text-primary border-primary/20",
    accent: "bg-accent/10 text-accent border-accent/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  };

  return (
    <Card 
      interactive 
      onClick={onClick}
      className={cn("p-4 flex flex-col gap-3 group", className)}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className={cn("p-3 rounded-full w-12 h-12 flex items-center justify-center transition-all shadow-sm", colorMap[color])}>
          <Icon className="w-5 h-5 flex-shrink-0" />
        </div>
        <div className="w-6 h-6 rounded-full bg-background/50 flex items-center justify-center text-text-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>
      
      <div className="mt-1 flex flex-col gap-0.5">
        <h4 className="text-sm font-semibold text-text-primary leading-tight">{title}</h4>
        {description && (
          <p className="text-[11px] font-medium text-text-muted line-clamp-2">{description}</p>
        )}
      </div>
    </Card>
  );
}
