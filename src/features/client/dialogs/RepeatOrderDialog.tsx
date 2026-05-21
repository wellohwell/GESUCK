import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Search, ShoppingBag, Clock } from 'lucide-react';
import { IconButton } from '../../../components/ui/buttons';
import { ClientForm } from '../components/ClientForm';
import { clientService } from '../services/client.service';
import { toast } from 'react-toastify';
import { cn, formatRelativeTime } from '../../../lib/utils';
import { useClientData } from '../hooks/useClientData';

interface RepeatOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RepeatOrderDialog({ isOpen, onClose }: RepeatOrderDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showRepeatOrderForm, setShowRepeatOrderForm] = useState(false);
  const { allClients } = useClientData();

  const [repeatOrderForm, setRepeatOrderForm] = useState({
    barang: '',
    angsuran: '',
    tenor: '30',
    tenorType: 'hari'
  });

  const filteredClients = allClients.filter(c => 
    c.nama?.toLowerCase().includes(clientSearchQuery.toLowerCase()) || 
    c.nomor?.includes(clientSearchQuery) ||
    c.alamat?.toLowerCase().includes(clientSearchQuery.toLowerCase())
  ).slice(0, 5);

  const handleCreateRepeatOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !repeatOrderForm.barang) {
      toast.error("Barang wajib diisi");
      return;
    }
    setIsSubmitting(true);
    try {
      await clientService.createRepeatOrder(selectedClient.id, {
        ...repeatOrderForm,
        angsuran: Number(repeatOrderForm.angsuran.replace(/\D/g, '')),
        tenor: Number(repeatOrderForm.tenor)
      });
      toast.success("Repeat Order berhasil didaftarkan");
      onClose();
      setSelectedClient(null);
      setRepeatOrderForm({
        barang: '', angsuran: '', tenor: '30', tenorType: 'hari'
      });
    } catch (err) {
      toast.error("Gagal mendaftarkan repeat order");
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
              <h2 className="text-base font-semibold tracking-wide">
                {showRepeatOrderForm ? 'Repeat Order' : 'Cari Konsumen (RO)'}
              </h2>
              <IconButton onClick={onClose} icon={ChevronRight} className="rotate-90" />
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {!showRepeatOrderForm ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="Masukkan nama, nomor, atau alamat..."
                      value={clientSearchQuery}
                      onChange={e => setClientSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 h-11 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Hasil Pencarian ({filteredClients.length})</p>
                    {filteredClients.map(client => (
                      <div 
                        key={client.id}
                        onClick={() => { setSelectedClient(client); setShowRepeatOrderForm(true); }}
                        className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-brand-primary/30 transition-all cursor-pointer"
                      >
                        <h4 className="font-semibold text-sm">{client.nama}</h4>
                        <p className="text-xs text-zinc-500">{client.alamat}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-5">
                  <div className="p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                    <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-1">Pilih Client:</p>
                    <h3 className="text-base font-semibold">{selectedClient.nama}</h3>
                    <p className="text-xs text-zinc-500">{selectedClient.nomor}</p>
                  </div>

                  <ClientForm 
                    form={repeatOrderForm}
                    setForm={setRepeatOrderForm}
                    onSubmit={handleCreateRepeatOrder}
                    isSubmitting={isSubmitting}
                    title="Repeat Order"
                    submitLabel="BUAT REPEAT ORDER"
                    isRepeat
                  />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
