import React from 'react';
import { ModalProvider as NewModalProvider } from '../components/ui/modal/ModalProvider';

export function ModalProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(NewModalProvider, null, children);
}
