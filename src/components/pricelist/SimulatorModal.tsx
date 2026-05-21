import React from 'react';
import { X } from 'lucide-react';
import { Product } from '../../types/pricelist';
import { motion, AnimatePresence } from 'motion/react';
import { InstallmentCalculator } from '../tools/InstallmentCalculator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function SimulatorModal({ isOpen, onClose, product }: Props) {
  if (!product) return null;

  // Adapt Product to PricelistItem expected by InstallmentCalculator
  const itemDefaults = {
    MERK: product.merk || product.kategori || '',
    TYPE: product.type || '',
    MODEL: product.model || product.nama || '',
    JUAL: product.jual || product.harga.toString(),
    caption: product.caption || ''
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[380px] bg-white dark:bg-zinc-900 sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="absolute right-3 top-3 z-10">
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 hide-scrollbar">
               <InstallmentCalculator itemDefaults={itemDefaults} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
