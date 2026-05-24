import React from 'react';
import { cn } from '../../../lib/utils';

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalBody: React.FC<ModalBodyProps> = ({ children, className }) => {
  return (
    <div className={cn("flex-1 overflow-y-auto px-6 py-5 no-scrollbar min-h-0", className)}>
      {children}
    </div>
  );
};
