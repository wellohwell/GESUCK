import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { IconButton } from '../../../components/ui/buttons';
import { ClientForm } from '../components/ClientForm';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { handleFirestoreError, OperationType } from '../../../lib/services';
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
    console.log("Submit process started...", newOrderForm);

    // 1. Validation
    if (!newOrderForm.nama || !newOrderForm.nomor || !newOrderForm.alamat || !newOrderForm.barang || !newOrderForm.angsuran || !newOrderForm.tenor) {
      toast.error("Mohon lengkapi semua field wajib (*)");
      return;
    }

    setIsSubmitting(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Unauthorized: Anda harus login untuk menyimpan data.");

      // Fetch user branch context for security rules
      const userDoc = await getDoc(doc(db, "users", uid));
      const branchId = userDoc.exists() ? userDoc.data().branchId : null;

      const angsuranNum = Number(newOrderForm.angsuran.replace(/\D/g, ''));
      const tenorNum = Number(newOrderForm.tenor);
      const omset = angsuranNum * tenorNum;

      // 2. Data Structure as requested
      const payload = {
        nama: newOrderForm.nama,
        nomor: newOrderForm.nomor,
        alamat: newOrderForm.alamat,
        usaha: newOrderForm.usaha || "",

        produk: newOrderForm.barang,
        angsuran: angsuranNum,
        tenor: tenorNum,
        tenorType: newOrderForm.tenorType,
        omset: omset,

        kategori: "baru",

        orderStatus: "submitted",
        currentStep: "survey",
        stage: "pipeline", // for backwards compatibility with query listeners

        survey: {
          status: "submitted",
          note: "",
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.email || uid
        },

        warehouse: {
          status: "pending",
          updatedAt: serverTimestamp(),
          updatedBy: ""
        },

        archiveReason: "",

        ownerId: uid,
        branchId: branchId,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // Keep legacy status field to make sure no breakages happen in rest of app
        status: "survey"
      };

      console.log("Saving payload to Firestore 'clients' collection:", payload);

      // 3. Save to Firestore
      const docRef = await addDoc(collection(db, "clients"), payload);
      console.log("Successfully saved with ID:", docRef.id);

      toast.success("Konsumen & Order Berhasil Disimpan");
      
      // 4. Reset Form
      setNewOrderForm({
        nama: '', 
        nomor: '', 
        usaha: '', 
        alamat: '', 
        barang: '', 
        angsuran: '', 
        tenor: '30', 
        tenorType: 'hari'
      });
      
      onClose();
    } catch (err) {
      console.error("Firestore submission error:", err);
      handleFirestoreError(err, OperationType.CREATE, "clients");
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
          className="fixed inset-0 z-[9999] bg-black/40 flex justify-center items-center md:items-center p-0 md:p-6"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full h-full md:h-auto md:w-[800px] md:max-h-[90vh] bg-background md:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="sticky top-0 z-10 bg-background border-b border-border/50 px-4 py-3 flex items-center justify-between">
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
                submitLabel="Simpan"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
