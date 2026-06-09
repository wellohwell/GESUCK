import React, { useEffect, useRef } from 'react';
import { Product } from '../../types/pricelist';
import { InstallmentCalculator } from '../tools/InstallmentCalculator';
import { useModal } from '../ui/modal/useModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function SimulatorModal({ isOpen, onClose, product }: Props) {
  const { openModal, closeModal } = useModal();
  const activeModalIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      const itemDefaults = {
        MERK: product.merk || product.kategori || '',
        TYPE: product.type || '',
        MODEL: product.model || product.nama || '',
        JUAL: product.jual || product.harga.toString(),
        caption: product.caption || '',
        lastUpdate: product.lastUpdate || ''
      };

      // Open inside our beautiful new responsive global modal
      const modalId = openModal({
        size: "sm",
        className: "is-calculator-modal",
        content: React.createElement(InstallmentCalculator, { itemDefaults }),
        onClose: () => {
          activeModalIdRef.current = null;
          onClose();
        }
      });
      activeModalIdRef.current = modalId;
    } else if (!isOpen && activeModalIdRef.current) {
      closeModal(activeModalIdRef.current);
      activeModalIdRef.current = null;
    }

    return () => {
      if (activeModalIdRef.current) {
        closeModal(activeModalIdRef.current);
        activeModalIdRef.current = null;
      }
    };
  }, [isOpen, product, openModal, closeModal, onClose]);

  return null;
}
