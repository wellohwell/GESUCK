import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { IconButton } from '../../../components/ui/buttons';
import { ClientForm } from '../components/ClientForm';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { handleFirestoreError, OperationType } from '../../../lib/services';
import { toast } from 'react-toastify';

interface EditClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
}

export function EditClientDialog({ isOpen, onClose, client }: EditClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    nama: '',
    nomor: '',
    usaha: '',
    alamat: '',
    barang: '',
    angsuran: '',
    tenor: '30',
    tenorType: 'hari'
  });

  // Load existing values when client changes
  useEffect(() => {
    if (client) {
      setForm({
        nama: client.nama || '',
        nomor: client.nomor || '',
        usaha: client.usaha || '',
        alamat: client.alamat || '',
        barang: client.produk || '',
        angsuran: client.angsuran ? String(client.angsuran) : '',
        tenor: client.tenor ? String(client.tenor) : '30',
        tenorType: client.tenorType || 'hari'
      });
    }
  }, [client, isOpen]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nama || !form.nomor || !form.alamat || !form.barang || !form.angsuran || !form.tenor) {
      toast.error("Mohon lengkapi semua field wajib (*)");
      return;
    }

    setIsSubmitting(true);
    try {
      const angsuranNum = Number(form.angsuran.replace(/\D/g, ''));
      const tenorNum = Number(form.tenor);
      const omset = angsuranNum * tenorNum;

      const updates = {
        nama: form.nama,
        nomor: form.nomor,
        usaha: form.usaha || '',
        alamat: form.alamat,
        produk: form.barang,
        angsuran: angsuranNum,
        tenor: tenorNum,
        tenorType: form.tenorType,
        omset: omset,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, "clients", client.id), updates);
      toast.success("Data Konsumen Berhasil Diperbarui");
      onClose();
    } catch (err) {
      console.error("Firestore update error:", err);
      handleFirestoreError(err, OperationType.UPDATE, "clients");
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
          className="fixed inset-0 z-[10000] bg-black/40 flex justify-center items-center p-0 md:p-6"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full h-full md:h-auto md:w-[800px] md:max-h-[90vh] bg-white dark:bg-zinc-950 md:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100"
          >
            <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-wide">Edit Data Konsumen</h2>
              <IconButton onClick={onClose} icon={ChevronRight} className="rotate-90" />
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <ClientForm 
                form={form}
                setForm={setForm}
                onSubmit={handleUpdate}
                isSubmitting={isSubmitting}
                title="Edit Konsumen"
                submitLabel="Update"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
