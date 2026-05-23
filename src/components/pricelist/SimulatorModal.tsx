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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm mx-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-40px)] p-5 overflow-y-auto no-scrollbar border border-zinc-250/20 dark:border-white/[0.05] pb-10"
          >
            <button 
              onClick={onClose} 
              className="absolute right-4 top-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-all border border-border/10"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            {/* BODY - Content Calculator */}
            <div className="flex-1 mt-2">
              <InstallmentCalculator itemDefaults={itemDefaults} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}