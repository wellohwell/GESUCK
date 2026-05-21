import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { IconButton } from '../../../components/ui/buttons';
import { ClientForm } from '../components/ClientForm';
import { clientService } from '../services/client.service';
import { toast } from 'react-toastify';

interface NewClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewClientDialog({ isOpen, onClose }: NewClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    nama: '',
    nomor: '',
    usaha: '',
    alamat: '',
    barang: '',
    angsuran: '',
    tenor: '30',
    tenorType: 'hari'
  });

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.nama || !newOrderForm.nomor || !newOrderForm.barang) {
      toast.error("Nama, Nomor, dan Barang wajib diisi");
      return;
    }
    setIsSubmitting(true);
    try {
      await clientService.createClientAndOrder({
        ...newOrderForm,
        angsuran: Number(newOrderForm.angsuran.replace(/\D/g, '')),
        tenor: Number(newOrderForm.tenor)
      });
      toast.success("Konsumen baru & Order berhasil didaftarkan");
      onClose();
      setNewOrderForm({
        nama: '', nomor: '', usaha: '', alamat: '', barang: '', 
        angsuran: '', tenor: '30', tenorType: 'hari'
      });
    } catch (err) {
      toast.error("Gagal mendaftarkan konsumen");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex justify-center items-center md:items-center p-0 md:p-6"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full h-full md:h-auto md:w-[800px] md:max-h-[90vh] bg-white dark:bg-zinc-950 md:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-wide">Konsumen Baru</h2>
              <IconButton onClick={onClose} icon={ChevronRight} className="rotate-90" />
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <ClientForm 
                form={newOrderForm}
                setForm={setNewOrderForm}
                onSubmit={handleCreateOrder}
                isSubmitting={isSubmitting}
                title="Konsumen Baru"
                submitLabel="DAFTARKAN KONSUMEN"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
