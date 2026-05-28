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

const baseStyles = "inline-flex items-center justify-center gap-2 transition-all duration-300 ease-out font-black uppercase tracking-widest disabled:opacity-50 disabled:pointer-events-none active:scale-[0.95] group";

export function PrimaryButton({ className, children, icon: Icon, isLoading, ...props }: ButtonProps) {
  return (
    <button 
      className={cn(
        baseStyles, 
        "h-10 md:h-12 px-6 md:px-8 rounded-xl md:rounded-2xl",
        "bg-primary text-black shadow-lg shadow-primary/20 hover:brightness-110", 
        "text-[10px] md:text-xs",
        className
      )} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />}
      {Icon && !isLoading && <Icon className="w-3.5 md:w-4 h-3.5 md:h-4 group-hover:rotate-90 transition-transform duration-300" />}
      {children}
    </button>
  );
}

export function ActionButton({ className, children, icon: Icon, isLoading, ...props }: ButtonProps) {
  return (
    <button 
      className={cn(
        baseStyles, 
        "h-10 md:h-12 px-6 md:px-8 rounded-xl md:rounded-2xl",
        "bg-foreground text-background shadow-xl hover:opacity-90", 
        "text-[10px] md:text-xs",
        className
      )} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />}
      {Icon && !isLoading && <Icon className="w-3.5 md:w-4 h-3.5 md:h-4 group-hover:rotate-90 transition-transform duration-300" />}
      {children}
    </button>
  );
}

export function SecondaryButton({ className, children, icon: Icon, isLoading, ...props }: ButtonProps) {
  return (
    <button 
      className={cn(
        baseStyles, 
        "h-10 md:h-12 px-6 md:px-8 rounded-xl md:rounded-2xl",
        "bg-muted/40 text-foreground border border-border/50 hover:bg-muted/60", 
        "text-[10px] md:text-xs",
        className
      )} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />}
      {Icon && !isLoading && <Icon className="w-3.5 md:w-4 h-3.5 md:h-4 transition-transform group-hover:rotate-90 duration-300" />}
      {children}
    </button>
  );
}

export function GhostButton({ className, children, icon: Icon, isLoading, ...props }: ButtonProps) {
  return (
    <button 
      className={cn(
        baseStyles, 
        "h-10 md:h-12 px-6 md:px-8 rounded-xl md:rounded-2xl",
        "bg-transparent text-foreground hover:bg-white/5", 
        "text-[10px] md:text-xs",
        className
      )} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
      {Icon && !isLoading && <Icon className="w-3.5 md:w-4 h-3.5 md:h-4 transition-transform group-hover:rotate-90 duration-300" />}
      {children}
    </button>
  );
}

export function IconButton({ className, icon: Icon, isLoading, ...props }: ButtonProps) {
  return (
    <button 
      className={cn("p-2 rounded-[1.25rem] transition-all duration-200 hover:bg-muted/60", className)} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : Icon && <Icon className="w-5 h-5" />}
    </button>
  );
}
