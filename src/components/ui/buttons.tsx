import React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

export interface ButtonProps {
  className?: string;
  children?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
}

const baseStyles = "inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out rounded-full font-semibold text-sm tracking-wide h-12 px-6 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

export function PrimaryButton({ className, children, icon: Icon, isLoading, ...props }: ButtonProps) {
  return (
    <button 
      className={cn(baseStyles, "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.35)] hover:brightness-110", className)} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
      {Icon && !isLoading && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

export function SecondaryButton({ className, children, icon: Icon, isLoading, ...props }: ButtonProps) {
  return (
    <button 
      className={cn(baseStyles, "bg-muted/40 text-foreground border border-border/50 hover:bg-muted/60", className)} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />}
      {Icon && !isLoading && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

export function GhostButton({ className, children, icon: Icon, isLoading, ...props }: ButtonProps) {
  return (
    <button 
      className={cn(baseStyles, "bg-transparent text-foreground hover:bg-primary/10 hover:text-primary", className)} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
      {Icon && !isLoading && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

export function IconButton({ className, icon: Icon, isLoading, ...props }: ButtonProps) {
  return (
    <button 
      className={cn("p-2 rounded-xl transition-all duration-200 hover:bg-muted/60", className)} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : Icon && <Icon className="w-5 h-5" />}
    </button>
  );
}
