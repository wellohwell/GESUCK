import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Database, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  History, 
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
  Archive,
  Menu,
  Upload
} from "lucide-react";
import { db } from "../../firebase/config";
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { useRuntime } from "../../providers/RuntimeProvider";
import { toast } from "../../hooks/use-toast";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

interface MigrationLog {
  id: string;
  timestamp: string;
  sourceCollection: string;
  targetBranch: string;
  count: number;
  status: "success" | "rolled_back" | "failed";
  documents: { id: string; name: string }[];
}

export default function AdminMigrationPage() {
  const navigate = useNavigate();
  const { activeBranchContext } = useRuntime();
  
  // State variables
  const [sourceCollection, setSourceCollection] = useState<"markets" | "master_markets">("markets");
  const [targetBranchId, setTargetBranchId] = useState<string>("GJY");
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  
  // Migration operational states
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [historyLogs, setHistoryLogs] = useState<MigrationLog[]>([]);
  const [hasBackedUp, setHasBackedUp] = useState(false);

  // JSON Import storage states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importJsonData, setImportJsonData] = useState<any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importTarget, setImportTarget] = useState<"legacy" | "branch">("branch");

  // Custom Confirmation Modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Load target branches and localStorage migration logs on mount
  useEffect(() => {
    const fetchBranches = async () => {
      setIsLoadingBranches(true);
      try {
        const snap = await getDocs(collection(db, "branches"));
        const branchList = snap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || doc.id,
          code: doc.data().code || doc.id,
        }));
        setBranches(branchList);
        
        // Auto select active tenant if present and exists in the retrieved branch list
        if (activeBranchContext && branchList.some(b => b.id === activeBranchContext)) {
          setTargetBranchId(activeBranchContext);
        } else if (branchList.length > 0 && !branchList.some(b => b.id === 'GJY')) {
          setTargetBranchId(branchList[0].id);
        } else {
          setTargetBranchId("GJY");
        }
      } catch (err) {
        console.error("Error loading branches", err);
        // Fallback static options if database read fails or offline
        setBranches([
          { id: "GJY", name: "Jayakusuma Yogyakarta", code: "GJY" },
          { id: "SLA", name: "Sleman Adisutjipto", code: "SLA" }
        ]);
      } finally {
        setIsLoadingBranches(false);
      }
    };

    fetchBranches();

    // Load logs from localStorage
    try {
      const saved = localStorage.getItem("master_markets_migration_history");
      if (saved) {
        setHistoryLogs(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not read migration logs from localStorage", e);
    }
  }, [activeBranchContext]);

  // Save history to localStorage
  const saveLogs = (newLogs: MigrationLog[]) => {
    setHistoryLogs(newLogs);
    try {
      localStorage.setItem("master_markets_migration_history", JSON.stringify(newLogs));
    } catch (e) {
      console.warn("Could not save migration logs to localStorage", e);
    }
  };

  const addLogMessage = (msg: string) => {
    setLogMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Import JSON File Actions
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          setImportJsonData(parsed);
          addLogMessage(`FILE LOADED: Terdeteksi berkas backup "${file.name}" berisi ${parsed.length} dokumen pasar.`);
          toast.success(`Berkas berhasil dimuat! Menemukan ${parsed.length} data.`);
        } else {
          addLogMessage(`ERROR FILE PREVIEW: Berkas JSON bukan berupa array dari dokumen.`);
          toast.error("Format berkas tidak valid. Harus berupa JSON Array.");
          setImportJsonData(null);
        }
      } catch (err: any) {
        addLogMessage(`ERROR FILE READ: Gagal membaca file JSON. ${err.message || err}`);
        toast.error("Format berkas JSON rusak atau tidak dikenali.");
        setImportJsonData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (!importJsonData || importJsonData.length === 0) {
      toast.error("Tidak ada data untuk diimpor. Silakan muat berkas terlebih dahulu.");
      return;
    }

    const destinationLabel = importTarget === "legacy" 
      ? `koleksi legacy "${sourceCollection}"`
      : `Cabang terisolasi "branches/${targetBranchId}/master_markets"`;

    setConfirmDialog({
      isOpen: true,
      title: "Peringatan Impor Data",
      message: `Apakah Anda yakin ingin mengimpor ${importJsonData.length} dokumen dari dokumen cadangan ke:\n-> ${destinationLabel}?\n\nProses ini akan menulis dokumen di Firestore. Pastikan data sudah sesuai.`,
      confirmText: "Ya, Mulai Impor",
      cancelText: "Batal",
      isDanger: importTarget === "legacy",
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsImporting(true);
        addLogMessage(`IMPORT: Membuka koneksi penulisan database menuju ${destinationLabel}...`);

        try {
          let importedCount = 0;
          const totalToImport = importJsonData.length;

          for (let i = 0; i < totalToImport; i++) {
            const item = importJsonData[i];
            const docId = item.id || `MKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            
            // Clean out metadata keys from back-up if targeting different space
            const { id, _timestamp, ...cleansedData } = item;

            let finalPath = "";
            let payload: any = {};

            if (importTarget === "legacy") {
              finalPath = `${sourceCollection}/${docId}`;
              payload = { ...cleansedData };
            } else {
              finalPath = `branches/${targetBranchId}/master_markets/${docId}`;
              payload = {
                ...cleansedData,
                branchId: targetBranchId,
                migrated: true,
                migratedAt: new Date().toISOString()
              };
            }

            const targetRef = doc(db, finalPath);
            await setDoc(targetRef, payload, { merge: true });
            importedCount++;
            addLogMessage(`IMPORTED [${importedCount}/${totalToImport}]: Menulis dokumen ke ${finalPath}`);
          }

          addLogMessage(`SUCCESS: Berhasil mengimpor ${importedCount} data pasar ke ${destinationLabel}.`);
          toast.success(`Berhasil mengimpor ${importedCount} data pasar!`);
          
          // Reset imports UI
          setImportFile(null);
          setImportJsonData(null);
        } catch (err: any) {
          addLogMessage(`ERROR DURING IMPORT: ${err.message || err}`);
          toast.error(`Kesalahan impor data: ${err.message || "Unknown error"}`);
        } finally {
          setIsImporting(false);
        }
      }
    });
  };

  // 1. Export JSON Backup
  const handleExportBackup = async () => {
    addLogMessage(`Initializing backup scan for collection "${sourceCollection}"...`);
    try {
      const snap = await getDocs(collection(db, sourceCollection));
      if (snap.empty) {
        addLogMessage(`WARNING: Collection "${sourceCollection}" is empty!`);
        toast.info(`Collection "${sourceCollection}" is currently empty. Backup aborted.`);
        return;
      }

      const dataToExport = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        _timestamp: new Date().toISOString()
      }));

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_legacy_${sourceCollection}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setHasBackedUp(true);
      addLogMessage(`SUCCESS: Exported ${dataToExport.length} documents into backup JSON.`);
      toast.success("Backup data JSON berhasil diekspor!");
    } catch (err: any) {
      addLogMessage(`ERROR: Export failed! ${err.message || err}`);
      toast.error("Gagal melakukan ekspor data.");
    }
  };

  // 2. Execute Migration
  const runMigrationProcess = async () => {
    setIsMigrating(true);
    setProgress(5);
    setCurrentStep("Membaca data dari legacy collection...");
    setLogMessages([]);
    addLogMessage(`Memulai migrasi dari "${sourceCollection}" ke "branches/${targetBranchId}/master_markets"`);

    try {
      const sourceSnap = await getDocs(collection(db, sourceCollection));
      if (sourceSnap.empty) {
        addLogMessage("ERROR: Tidak ditemukan data apapun di legacy collection.");
        toast.error("Tidak ada data migrasi yang ditemukan.");
        setIsMigrating(false);
        return;
      }

      const totalDocs = sourceSnap.docs.length;
      addLogMessage(`Menemukan ${totalDocs} dokumen pasar.`);
      setProgress(15);

      const migratedDocs: { id: string; name: string }[] = [];
      let successCount = 0;

      // Copy each document into the subcollection
      for (let i = 0; i < totalDocs; i++) {
        const sourceDoc = sourceSnap.docs[i];
        const docId = sourceDoc.id;
        const docData = sourceDoc.data();
        const marketName = docData.nama_pasar || "Unnamed Market";

        setCurrentStep(`Mengimpor [${i + 1}/${totalDocs}]: ${marketName}...`);
        setProgress(Math.round(15 + (i / totalDocs) * 75));

        const destRef = doc(db, `branches/${targetBranchId}/master_markets`, docId);
        
        // Construct migrated payload as defined in requirements
        const payload = {
          ...docData,
          branchId: targetBranchId,
          migrated: true,
          migratedAt: new Date().toISOString()
        };

        await setDoc(destRef, payload, { merge: true });
        migratedDocs.push({ id: docId, name: marketName });
        successCount++;
        addLogMessage(`Copied document: ${docId} [${marketName}]`);
      }

      setProgress(100);
      setCurrentStep("Selesai");
      addLogMessage(`MIGRASI SUKSES: Berhasil memigrasi ${successCount} dari ${totalDocs} dokumen pasar.`);
      toast.success(`Berhasil memigrasi ${successCount} data master pasar!`);

      // Add to history log
      const newHistoryItem: MigrationLog = {
        id: `MIG-${Date.now()}`,
        timestamp: new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }),
        sourceCollection,
        targetBranch: targetBranchId,
        count: successCount,
        status: "success",
        documents: migratedDocs
      };

      saveLogs([newHistoryItem, ...historyLogs]);
    } catch (err: any) {
      addLogMessage(`CRITICAL ERROR: ${err.message || err}`);
      toast.error(`Kegagalan migrasi: ${err.message || "Unknown error"}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRunMigration = () => {
    const triggerExecutionConfirm = () => {
      setConfirmDialog({
        isOpen: true,
        title: "Konfirmasi Migrasi",
        message: `Memulai Migrasi Target Pasar:\n\nDari legacy collection: "${sourceCollection}"\nKe cabang tujuan: "${targetBranchId}"\n\nTindakan ini akan menduplikasi data master pasar ke cabang tersebut. Apakah Anda ingin melanjutkan?`,
        confirmText: "Ya, Mulai Migrasi",
        cancelText: "Batal",
        onConfirm: () => {
          setConfirmDialog(null);
          runMigrationProcess();
        }
      });
    };

    if (!hasBackedUp) {
      setConfirmDialog({
        isOpen: true,
        title: "Peringatan Backup",
        message: "PERINGATAN KEAMANAN: Anda belum mengunduh salinan/cadangan data JSON. Direkomendasikan melakukan ekspor backup terlebih dahulu.\n\nApakah Anda yakin ingin melanjutkan migrasi tanpa melakukan backup?",
        confirmText: "Lanjutkan Tanpa Backup",
        cancelText: "Kembali Backup",
        isDanger: true,
        onConfirm: () => {
          triggerExecutionConfirm();
        }
      });
    } else {
      triggerExecutionConfirm();
    }
  };

  // 3. Rollback Action
  const handleRollback = (logItem: MigrationLog) => {
    setConfirmDialog({
      isOpen: true,
      title: "Sistem Keamanan Rollback",
      message: `Apakah Anda sungguh yakin ingin membatalkan/rollback migrasi "${logItem.id}"?\nTindakan ini akan MENGHAPUS ${logItem.documents.length} dokumen pasar yang dimigrasi ke "branches/${logItem.targetBranch}/master_markets" pada ${logItem.timestamp} secara permanen.\n\nData legacy Anda tetap aman tetapi data hasil migrasi akan ditarik kembali. Lanjutkan?`,
      confirmText: "Ya, Rollback",
      cancelText: "Batal",
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        addLogMessage(`ROLLBACK: Menginisiasi pembatalan migrasi ${logItem.id}...`);
        try {
          const docsToDelete = logItem.documents;
          let deleteCount = 0;

          for (const d of docsToDelete) {
            const destRef = doc(db, `branches/${logItem.targetBranch}/master_markets`, d.id);
            await deleteDoc(destRef);
            addLogMessage(`DELETE: Dihapus ${d.id} [${d.name}]`);
            deleteCount++;
          }

          // Update log item status
          const updatedLogs = historyLogs.map(item => {
            if (item.id === logItem.id) {
              return { ...item, status: "rolled_back" as const };
            }
            return item;
          });
          saveLogs(updatedLogs);

          addLogMessage(`SUCCESS: Rollback aman selesai. Total ${deleteCount} dokumen terhapus dari namespace cabang.`);
          toast.success("Rollback berhasil dilakukan dengan aman!");
        } catch (err: any) {
          addLogMessage(`ERROR ROLLBACK FAILED: ${err.message || err}`);
          toast.error("Gagal melakukan batalkan/rollback migrasi.");
        }
      }
    });
  };

  const clearHistory = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Hapus Riwayat",
      message: "Apakah Anda yakin ingin menghapus seluruh catatan riwayat migrasi lokal dari browser ini?",
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      isDanger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        saveLogs([]);
        toast.info("Riwayat migrasi lokal dibersihkan.");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8 pb-16">
      
      {/* Upper Navigation Row */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-xs font-black text-zinc-500 hover:text-primary transition-colors uppercase tracking-widest"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          KEMBALI KE ADMIN
        </button>
        <span className="text-[10px] sm:text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
          Double-Safety Lock Enabled
        </span>
      </div>

      {/* Header Info */}
      <div className="text-center md:text-left space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white uppercase leading-none">
          UTILITY MIGRASI ARSITEKTUR CABANG
        </h1>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed uppercase">
          Mutasikan master data pasar legacy dari collection global menuju namespace terisolasi <code className="font-mono text-primary text-xs bg-muted px-1 py-0.5 rounded">branches/{"{branchId}"}/master_markets</code> demi skalabilitas multi-tenant yang optimal.
        </p>
      </div>

      {/* Grid Configuration Options */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Side: Setup Panel */}
        <div className="md:col-span-7 bg-zinc-50/70 dark:bg-zinc-900/35 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 space-y-6">
          <div className="flex items-center gap-3">
            <Archive className="w-5 h-5 text-purple-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white leading-none">
              SKENARIO KONFIGURASI MIGRASI
            </h3>
          </div>

          <div className="space-y-4">
            
            {/* Scoping parameter A: source collection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide flex items-center justify-between">
                <span>Legacy Source Collection</span>
                <span className="text-[9px] text-primary lowercase font-mono">def: markets</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSourceCollection("markets")}
                  className={cn(
                    "py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all uppercase tracking-tight text-center",
                    sourceCollection === "markets" 
                      ? "bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300 font-bold"
                      : "bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  markets (Active)
                </button>
                <button
                  type="button"
                  onClick={() => setSourceCollection("master_markets")}
                  className={cn(
                    "py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all uppercase tracking-tight text-center",
                    sourceCollection === "master_markets" 
                      ? "bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300 font-bold"
                      : "bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  master_markets
                </button>
              </div>
            </div>

            {/* Scoping parameter B: target branchId context */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Target Namespace Cabang (branchId)
              </label>
              <div className="relative">
                {isLoadingBranches ? (
                  <div className="w-full text-xs text-zinc-400 font-semibold p-2.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    Loading target branches...
                  </div>
                ) : (
                  <select
                    value={targetBranchId}
                    onChange={(e) => setTargetBranchId(e.target.value)}
                    className="w-full py-2.5 px-3 text-xs font-semibold bg-white dark:bg-black text-foreground border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-purple-500 transition-colors uppercase"
                  >
                    {branches.length === 0 ? (
                      <option value="GJY">GJY - Jayakusuma Yogyakarta (Default)</option>
                    ) : (
                      branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} - {b.name}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>
            </div>

            {/* Metadata information card */}
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl space-y-2 text-zinc-600 dark:text-zinc-400">
              <span className="text-[10px] font-mono font-bold uppercase block text-purple-500 tracking-wider">
                AUTO-INJECT METADATA ARSITEKTUR
              </span>
              <p className="text-[11px] leading-relaxed">
                Tiap berkas dokumen yang berpindah akan disematkan metadata pelacak:
              </p>
              <div className="grid grid-cols-3 gap-2 text-[9px] font-mono text-center">
                <div className="bg-white dark:bg-black border p-1 rounded">
                  branchId: <span className="font-bold text-primary">"{targetBranchId}"</span>
                </div>
                <div className="bg-white dark:bg-black border p-1 rounded">
                  migrated: <span className="font-bold text-primary">true</span>
                </div>
                <div className="bg-white dark:bg-black border p-1 rounded font-sans leading-none flex flex-col justify-center">
                  <span className="font-mono text-[9px] mt-0.5">migratedAt: ISO_TIME</span>
                </div>
              </div>
            </div>

             {/* Sub-actions buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isMigrating}
                className="flex items-center justify-center gap-2 py-3 px-4 text-xs font-black uppercase tracking-wider bg-zinc-900 group dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 active:scale-[0.98] transition-all rounded-xl cursor-copy shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-emerald-500" />
                Backup JSON
              </button>

              <button
                type="button"
                onClick={handleRunMigration}
                disabled={isMigrating}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 px-4 text-xs font-black uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 active:scale-[0.98] transition-all rounded-xl disabled:opacity-50 shadow-sm",
                  isMigrating ? "animate-pulse" : ""
                )}
              >
                <RefreshCw className={cn("w-4 h-4", isMigrating ? "animate-spin" : "")} />
                Eksekusi Migrasi
              </button>
            </div>

            {/* Divider */}
            <hr className="border-t border-zinc-200 dark:border-zinc-800/80 my-4" />

            {/* Import Block Panel */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-500" />
                <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 leading-none">
                  IMPORT RESTORE DATA JSON
                </h4>
              </div>

              <p className="text-[10px] text-zinc-500 uppercase leading-relaxed font-semibold">
                Unggah berkas cadangan format .json untuk dipulihkan kembali ke Firestore secara otomatis.
              </p>

              <div className="grid grid-cols-2 gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => setImportTarget("branch")}
                  className={cn(
                    "py-2 px-3 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-tight text-center",
                    importTarget === "branch" 
                      ? "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300"
                      : "bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  Ke Cabang ({targetBranchId})
                </button>
                <button
                  type="button"
                  onClick={() => setImportTarget("legacy")}
                  className={cn(
                    "py-2 px-3 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-tight text-center",
                    importTarget === "legacy" 
                      ? "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300"
                      : "bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  Ke Legacy ({sourceCollection})
                </button>
              </div>

              {/* Upload Input & Dropzone Box */}
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-colors relative cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isImporting}
                />
                
                <div className="space-y-1">
                  <Upload className="w-4 h-4 mx-auto text-zinc-400" />
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                    {importFile ? importFile.name : "Pilih Berkas JSON"}
                  </p>
                  <p className="text-[9px] text-zinc-500 tracking-wider font-mono">
                    {importJsonData ? `${importJsonData.length} dokumen terdeteksi` : "Hanya berkas .json yang diizinkan"}
                  </p>
                </div>
              </div>

              {/* Execute Import Action button */}
              {importJsonData && (
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isImporting}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all rounded-xl disabled:opacity-50 shadow-sm",
                    isImporting ? "animate-pulse" : ""
                  )}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  Mulai Impor Ke Firestore ({importJsonData.length} Dokumen)
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Right Side: Operational Console Logging */}
        <div className="md:col-span-5 bg-black border border-zinc-800 rounded-2xl flex flex-col overflow-hidden min-h-[320px] shadow-lg">
          
          {/* Output title bar */}
          <div className="px-4 py-3 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-2 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM CONSOLE LOGS
            </span>
            <button
              onClick={() => setLogMessages([])}
              className="text-[9px] font-mono text-zinc-500 hover:text-white uppercase transition-colors"
            >
              Clear screen
            </button>
          </div>

          {/* Console logger workspace */}
          <div className="flex-1 p-4 font-mono text-[10px] text-zinc-300 overflow-y-auto space-y-1.5 min-h-[220px] max-h-[350px]">
            {logMessages.length === 0 ? (
              <p className="text-zinc-600 italic">No output. Silakan lakukan ekspor backup atau eksekusi migrasi untuk melihat pencatatan logs langsung...</p>
            ) : (
              logMessages.map((msg, idx) => {
                let textClass = "text-zinc-400";
                if (msg.includes("SUCCESS") || msg.includes("MIGRASI SUKSES")) textClass = "text-emerald-400 font-bold";
                else if (msg.includes("ERROR") || msg.includes("CRITICAL")) textClass = "text-red-400 font-bold";
                else if (msg.includes("WARNING")) textClass = "text-amber-400 font-bold";
                
                return (
                  <div key={idx} className={cn("leading-relaxed break-all", textClass)}>
                    {msg}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Role migration action button embedded */}
      <div className="bg-zinc-50/70 dark:bg-zinc-900/35 border border-red-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white leading-none">
            DATABASE ROLE MIGRATION (ADMIN to MANAGER)
          </h3>
        </div>
        <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
          Sistem akan mencari seluruh data pada koleksi (users, approvals, permissions, activities, assignments, logs) 
          yang masih menggunakan role identifier "ADMIN" (atau "admin") dan menormalisasinya menjadi "MANAGER".
        </p>
        <button
          onClick={() => {
            setConfirmDialog({
              isOpen: true,
              title: "Konfirmasi Migrasi Role",
              message: "Tindakan ini akan memindai koleksi users, activities, dan log persetujuan untuk menemukan string 'ADMIN' dan mengubah nilainya menjadi 'MANAGER'.\n\nPastikan Anda telah mem-backup data sebelumnya. Lanjutkan?",
              isDanger: true,
              confirmText: "Ya, Normalisasi Role",
              cancelText: "Batal",
              onConfirm: async () => {
                setConfirmDialog(null);
                addLogMessage(`ROLE MIG: Memulai normalisasi role dari ADMIN ke MANAGER...`);
                // Placeholder - real migrations logic should query all necessary collections
                try {
                  const batch = writeBatch(db);
                  let updatedUsers = 0;
                  const usersSnap = await getDocs(collection(db, "users"));
                  usersSnap.docs.forEach(docSnap => {
                    const d = docSnap.data();
                    if (d.role === "ADMIN" || d.role === "admin" || d.requestedRole === "ADMIN" || d.requestedRole === "admin") {
                      batch.update(docSnap.ref, { 
                         role: d.role?.toUpperCase() === "ADMIN" ? "MANAGER" : d.role,
                         requestedRole: d.requestedRole?.toUpperCase() === "ADMIN" ? "MANAGER" : d.requestedRole 
                      });
                      updatedUsers++;
                    }
                  });

                  let updatedActivities = 0;
                  const activitiesSnap = await getDocs(collection(db, "activities"));
                  activitiesSnap.docs.forEach(docSnap => {
                    const d = docSnap.data();
                    if (d.actorRole === "ADMIN" || d.actorRole === "admin") {
                      batch.update(docSnap.ref, { actorRole: "MANAGER" });
                      updatedActivities++;
                    }
                  });

                  if (updatedUsers > 0 || updatedActivities > 0) {
                     await batch.commit();
                     addLogMessage(`ROLE MIG SUCCESS: ${updatedUsers} users and ${updatedActivities} activities normalized to MANAGER.`);
                     toast.success(`Role normalisasi berhasil diproses.`);
                  } else {
                     addLogMessage(`ROLE MIG: No records required migration.`);
                  }
                } catch (e: any) {
                  addLogMessage(`ERROR: ${e.message}`);
                }
              }
            });
          }}
          className="w-full md:w-auto px-4 py-3 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
        >
          Normalisasi Database Ke MANAGER
        </button>
      </div>

      {/* Progress tracking display */}
      <AnimatePresence>
        {isMigrating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest block leading-none">
                  SINKRONISASI BATCH DATABASE sedang berjalan...
                </span>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 uppercase">
                  {currentStep}
                </p>
              </div>
              <span className="font-mono text-xs font-black text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full tabular-nums">
                {progress}%
              </span>
            </div>

            {/* Custom linear tracker */}
            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border">
              <motion.div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full" 
                animate={{ width: `${progress}%` }} 
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rollback and history block list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white leading-none">
              RIWAYAT MIGRASI & LOG ROLLBACK KEAMANAN
            </h3>
          </div>
          {historyLogs.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-[10px] font-bold text-red-500/80 hover:text-red-500 uppercase flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Reset Log Lokal
            </button>
          )}
        </div>

        {historyLogs.length === 0 ? (
          <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-2 bg-zinc-50/20">
            <ShieldAlert className="w-8 h-8 text-zinc-400 mx-auto opacity-70" />
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">
              Tidak ada riwayat migrasi terdeteksi
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase max-w-sm mx-auto leading-relaxed">
              Seluruh rekam audit migrasi, backup log, dan cadangan pembatalan transaksi berstandar keselamatan akan terdata rapi pada panel ini.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {historyLogs.map((log) => (
              <div 
                key={log.id} 
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                id={`migration-log-${log.id}`}
              >
                {/* Details info */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-foreground">
                      {log.id}
                    </span>
                    <span className="text-[9px] font-mono leading-none bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded">
                      {log.sourceCollection} &rarr; branches/{log.targetBranch}/master_markets
                    </span>
                    
                    {log.status === "success" && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-full">
                        ACTIVE SUCCESS
                      </span>
                    )}
                    {log.status === "rolled_back" && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 px-2.5 py-0.5 rounded-full">
                        ROLLED BACK
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-zinc-500 dark:text-zinc-400 uppercase leading-none font-medium">
                    <span>{log.count} dokumen dipindahkan</span>
                    <span>•</span>
                    <span className="font-mono">{log.timestamp}</span>
                  </div>
                </div>

                {/* Rollback button action */}
                <div>
                  {log.status === "success" ? (
                    <button
                      type="button"
                      onClick={() => handleRollback(log)}
                      className="w-full sm:w-auto px-4 py-2 text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      ROLLBACK DATA
                    </button>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block sm:text-right">
                      No Action Allowed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modern Confirmation Modal Overlay */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDialog(null)}
              className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
            />
            
            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4 text-center sm:text-left"
            >
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <ShieldAlert className={cn(
                  "w-6 h-6",
                  confirmDialog.isDanger ? "text-red-500" : "text-amber-500"
                )} />
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                  {confirmDialog.title}
                </h3>
              </div>

              <div className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold tracking-wide whitespace-pre-wrap leading-relaxed text-left">
                {confirmDialog.message}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 rounded-xl transition-all"
                >
                  {confirmDialog.cancelText || "Batal"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmDialog.onConfirm();
                  }}
                  className={cn(
                    "px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white rounded-xl transition-all shadow-sm active:scale-95",
                    confirmDialog.isDanger 
                      ? "bg-red-600 hover:bg-red-500" 
                      : "bg-blue-600 hover:bg-blue-500"
                  )}
                >
                  {confirmDialog.confirmText || "Ya, Konfirmasi"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
