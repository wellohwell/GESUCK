import React, { useState, useEffect } from "react";
import { 
  Sliders, 
  Clock, 
  Flame, 
  Snowflake, 
  CheckCircle2, 
  XCircle, 
  Save, 
  Loader2, 
  Play, 
  Bell, 
  FileText, 
  Settings, 
  Info,
  Layers,
  ArrowLeft,
  Database,
  Trash2,
  AlertCircle,
  RefreshCw,
  Plus,
  Filter,
  BookOpen,
  Search,
  Phone,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { db, auth } from "../../firebase/config";
import { doc, onSnapshot, setDoc, collection, query, orderBy, deleteDoc, getDocs, where, updateDoc } from "firebase/firestore";
import { toast } from "../../hooks/use-toast";
import { cn } from "../../lib/utils";
import { motion } from "motion/react";
import { User as UserIcon, Shield as ShieldIcon } from "lucide-react";
import dayjs from "dayjs";
import { sendWhatsApp } from "../../services/waClient";

// Firestore Error Types matching the firebase-integration skill requirements
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Configuration interface
interface AutomationSettings {
  enabled: boolean;
  visitPlanReminderEnabled: boolean;
  firstReminderTime: string;
  finalReminderTime: string;
  firstReminderTemplate?: string;
  finalReminderTemplate?: string;
}

const parseTimeString = (timeStr: string) => {
  if (!timeStr) return null;
  // Match a sequence of digits separated by ':' or '.' or '-' or space
  const match = timeStr.trim().match(/^(\d{1,2})[\s.:\-]+(\d{2})/);
  if (match) {
    const hour = parseInt(match[1], 10);
    const min = parseInt(match[2], 10);
    if (!isNaN(hour) && !isNaN(min) && hour >= 0 && hour < 24 && min >= 0 && min < 60) {
      return { hour, min };
    }
  }
  // Fallback search anywhere in the string
  const generalMatch = timeStr.match(/(\d{1,2})[\s.:\-]+(\d{2})/);
  if (generalMatch) {
    const hour = parseInt(generalMatch[1], 10);
    const min = parseInt(generalMatch[2], 10);
    if (!isNaN(hour) && !isNaN(min) && hour >= 0 && hour < 24 && min >= 0 && min < 60) {
      return { hour, min };
    }
  }
  return null;
};

const DEFAULT_SETTINGS: AutomationSettings = {
  enabled: true,
  visitPlanReminderEnabled: true,
  firstReminderTime: "18:30",
  finalReminderTime: "19:45",
  firstReminderTemplate: "Halo {name}, Anda belum mengisi Rencana Kunjungan (Visit Plan) untuk besok ({date}). Harap segera lengkapi di aplikasi.",
  finalReminderTemplate: "PERINGATAN AKHIR: Halo {name}, besok Anda belum memiliki agenda kunjungan terdaftar. Segera isi Rencana Kunjungan Anda malam ini sebelum sistem ditutup!"
};

export default function AdminAutomationPage() {
  const [settings, setSettings] = useState<AutomationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [targetDate, setTargetDate] = useState<string>(
    dayjs().add(1, "day").format("YYYY-MM-DD")
  );
  const [cycleActive, setCycleActive] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // Collapse/Expand states for lists/tables
  const [isQueueExpanded, setIsQueueExpanded] = useState<boolean>(false);
  const [isPrefsExpanded, setIsPrefsExpanded] = useState<boolean>(false);

  const detectedSPVsCount = users.filter(u => {
    const uStatusLower = (u.status || "").toLowerCase();
    const isApproved = uStatusLower === "active" || uStatusLower === "approved";
    const rLower = (u.role || "").toLowerCase();
    return isApproved && (rLower === "spv" || rLower === "supervisor" || rLower.includes("spv") || rLower.includes("supervisor"));
  }).length;

  // Load user notification preferences list
  useEffect(() => {
    const usersRef = collection(db, "users");
    const q = query(usersRef);
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          name: d.displayName || d.name || d.nama || "-",
          email: d.email || "-",
          role: d.role || "-",
          status: d.status || "active",
          phone: d.phone || d.telepon || d.noHp || d.whatsapp || "-",
          notifications: d.notifications || {},
          photoURL: d.photoURL || d.photoUrl || d.picture || ""
        });
      });
      // Resilient alphabet sort in client memory
      list.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(list);
      setUsersLoading(false);
    }, (error) => {
      console.error("Gagal memuat preferensi pengguna:", error);
      setUsersLoading(false);
    });

    return () => unsubscribeUsers();
  }, []);

  // Load configuration from Firestore path: automation_settings/global
  useEffect(() => {
    const docPath = "automation_settings/global";
    const docRef = doc(db, "automation_settings", "global");

    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const snapData = snap.data();
        setSettings({
          enabled: snapData.enabled ?? DEFAULT_SETTINGS.enabled,
          visitPlanReminderEnabled: snapData.visitPlanReminderEnabled ?? DEFAULT_SETTINGS.visitPlanReminderEnabled,
          firstReminderTime: snapData.firstReminderTime ?? DEFAULT_SETTINGS.firstReminderTime,
          finalReminderTime: snapData.finalReminderTime ?? DEFAULT_SETTINGS.finalReminderTime,
          firstReminderTemplate: snapData.firstReminderTemplate ?? DEFAULT_SETTINGS.firstReminderTemplate,
          finalReminderTemplate: snapData.finalReminderTemplate ?? DEFAULT_SETTINGS.finalReminderTemplate,
        });
      } else {
        // Document doesn't exist yet, fallback to default configurations
        setSettings(DEFAULT_SETTINGS);
      }
      setIsLoading(false);
    }, (error) => {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      try {
        handleFirestoreError(error, OperationType.GET, docPath);
      } catch (err: any) {
        toast.error("Gagal memuat pengaturan", {
          description: "Terjadi kesalahan hak akses atau sistem."
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Load items from notification_queue
  useEffect(() => {
    const queueRef = collection(db, "notification_queue");
    const q = query(queueRef);
    const unsubscribeQueue = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          ...d
        });
      });
      // Sort client-side safely in case createdAt is stored as ISO string or timestamp
      list.sort((a, b) => {
        const timeA = a.createdAt ? (typeof a.createdAt.toDate === "function" ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
        const timeB = b.createdAt ? (typeof b.createdAt.toDate === "function" ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
        return timeB - timeA;
      });
      setQueueItems(list);
      setQueueLoading(false);
    }, (error) => {
      console.error("Gagal memuat antrean notifikasi:", error);
      setQueueLoading(false);
    });

    return () => unsubscribeQueue();
  }, []);

  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});

  const toggleMessageExpand = (id: string) => {
    setExpandedMessages(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [currentTimeWIB, setCurrentTimeWIB] = useState<string>("");
  const [currentDateWIB, setCurrentDateWIB] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      try {
        const timeFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        });
        const dateFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Jakarta",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        });
        
        const now = new Date();
        const timeParts = timeFormatter.formatToParts(now);
        let hour = timeParts.find(p => p.type === "hour")?.value || "00";
        if (hour === "24") hour = "00";
        // Safe 2-digit padding
        hour = hour.padStart(2, "0");
        const minute = (timeParts.find(p => p.type === "minute")?.value || "00").padStart(2, "0");
        const second = (timeParts.find(p => p.type === "second")?.value || "00").padStart(2, "0");
        setCurrentTimeWIB(`${hour}:${minute}:${second}`);
        
        const parts = dateFormatter.formatToParts(now);
        const year = parts.find(p => p.type === "year")?.value || "2026";
        const month = (parts.find(p => p.type === "month")?.value || "06").padStart(2, "0");
        const day = (parts.find(p => p.type === "day")?.value || "01").padStart(2, "0");
        setCurrentDateWIB(`${year}-${month}-${day}`);
      } catch (e) {
        setCurrentTimeWIB(dayjs().format("HH:mm:ss"));
        setCurrentDateWIB(dayjs().format("YYYY-MM-DD"));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Secure target date synchronization (WIB Tomorrow alignment)
  useEffect(() => {
    if (currentDateWIB) {
      setTargetDate(dayjs(currentDateWIB).add(1, "day").format("YYYY-MM-DD"));
    }
  }, [currentDateWIB]);

  // AUTOMATIC CLIENT-SIDE CRON EMULATION WITH RESILIENT COMPARATORS
  useEffect(() => {
    if (isLoading || queueLoading || usersLoading || users.length === 0 || !settings.enabled || !settings.visitPlanReminderEnabled || !cycleActive) {
      return;
    }

    const checkAndTriggerAutoScans = async () => {
      if (!currentDateWIB || !currentTimeWIB) return;
      
      const tomorrowWIB = dayjs(currentDateWIB).add(1, "day").format("YYYY-MM-DD");
      const [currHour, currMin] = currentTimeWIB.split(":").map(Number);
      
      const compareTimePast = (targetTimeStr: string) => {
        const parsed = parseTimeString(targetTimeStr);
        if (!parsed) return false;
        const { hour: targHour, min: targMin } = parsed;
        
        if (currHour > targHour) return true;
        if (currHour === targHour) return currMin >= targMin;
        return false;
      };

      // 1. LEVEL 1 REMINDER AUTO TRIGGER (e.g. 18:30)
      if (compareTimePast(settings.firstReminderTime)) {
        const hasL1Queue = queueItems.some(q => 
          q.metadata?.reminderLevel === 1 && 
          q.metadata?.targetDate === tomorrowWIB
        );
        const l1Key = `auto_run_l1_${tomorrowWIB}`;
        if (!hasL1Queue && !localStorage.getItem(l1Key)) {
          localStorage.setItem(l1Key, "true");
          toast.success(`🤖 AUTOMATOR: Mendeteksi Jam > ${settings.firstReminderTime} WIB`, {
            description: `Menjalankan pencarian/auto-scan Pengingat #1 otomatis untuk Tanggal Kunjungan ${dayjs(tomorrowWIB).format("dddd, D MMMM YYYY")}.`
          });
          await handleRunReminderScan(1, tomorrowWIB);
        }
      }

      // 2. LEVEL 2 REMINDER AUTO TRIGGER (e.g. 19:45)
      if (compareTimePast(settings.finalReminderTime)) {
        const hasL2Queue = queueItems.some(q => 
          q.metadata?.reminderLevel === 2 && 
          q.metadata?.targetDate === tomorrowWIB
        );
        const l2Key = `auto_run_l2_${tomorrowWIB}`;
        if (!hasL2Queue && !localStorage.getItem(l2Key)) {
          localStorage.setItem(l2Key, "true");
          toast.success(`🚨 AUTOMATOR: Mendeteksi Jam > ${settings.finalReminderTime} WIB`, {
            description: `Menjalankan pencarian/auto-scan Pengingat Final #2 otomatis untuk Tanggal Kunjungan ${dayjs(tomorrowWIB).format("dddd, D MMMM YYYY")}.`
          });
          await handleRunReminderScan(2, tomorrowWIB);
        }
      }
    };

    checkAndTriggerAutoScans();
  }, [currentTimeWIB, currentDateWIB, isLoading, queueLoading, usersLoading, users, settings, cycleActive, queueItems]);

  const handleProcessQueue = async () => {
    const pendingItems = queueItems.filter(i => i.status === "pending");
    if (pendingItems.length === 0) {
      toast.info("Tidak ada antrean pending", {
        description: "Semua pesan dalam antrean sudah selesai diproses."
      });
      return;
    }

    setIsProcessingQueue(true);
    const toastId = "queue-processing-toast";
    toast.info("Memulai pemrosesan antrean...", {
      id: toastId,
      description: `Sedang mengirimkan ${pendingItems.length} pesan di antrean.`
    });

    let successCount = 0;
    let failCount = 0;
    let index = 0;

    try {
      for (const item of pendingItems) {
        index++;
        const itemRef = doc(db, "notification_queue", item.id);
        
        // Update user on current progress
        toast.info(`Memproses Antrean (${index}/${pendingItems.length})`, {
          id: toastId,
          description: `Mengirim pesan ke nomor ${item.phone || item.to || "N/A"}...`
        });

        // Update status to processing
        await setDoc(itemRef, {
          status: "processing",
          updatedAt: new Date().toISOString()
        }, { merge: true });

        const phoneToSend = item.phone || item.to;
        if (!phoneToSend || phoneToSend === "-" || phoneToSend.trim() === "") {
          await setDoc(itemRef, {
            status: "failed",
            error: "Nomor telepon kosong atau tidak valid",
            updatedAt: new Date().toISOString()
          }, { merge: true });
          failCount++;
          continue;
        }

        const cleanMessage = item.message || "";
        const result = await sendWhatsApp(phoneToSend, cleanMessage);

        if (result.success) {
          await setDoc(itemRef, {
            status: "sent",
            response: result.response || null,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          successCount++;
        } else {
          await setDoc(itemRef, {
            status: "failed",
            error: result.error || "Gagal mengirim melalui WhatsApp API",
            updatedAt: new Date().toISOString()
          }, { merge: true });
          failCount++;
        }

        // Apply a safe, human-like delay between messages to prevent WhatsApp bans
        // Only delay if there are more items waiting to be sent
        if (index < pendingItems.length) {
          const delayMs = Math.floor(Math.random() * (4000 - 2500 + 1)) + 2500; // 2.5s to 4s random delay
          toast.info(`Jeda Aman Anti-Banned...`, {
            id: toastId,
            description: `Mengambil cooling pause ${(delayMs / 1000).toFixed(1)} detik sebelum mengirim pesan berikutnya.`
          });
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      toast.success("Pemrosesan antrean selesai!", {
        id: toastId,
        description: `Berhasil terkirim: ${successCount} | Gagal: ${failCount}`
      });
    } catch (err: any) {
      console.error(err);
      toast.error("Terjadi kegagalan saat menjalankan antrean", {
        id: toastId,
        description: err.message || "Kesalahan koneksi atau hak akses."
      });
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const handleCreateTestJob = async (type: string) => {
    const randomUser = users[Math.floor(Math.random() * users.length)] || {
      id: auth.currentUser?.uid || "mock_uid",
      name: "Test User",
      phone: "+6281234567890",
      email: "test@example.com"
    };

    let phone = randomUser.phone || "+6281234567890";
    if (phone === "-") phone = "+6281234567890";

    let title = "";
    let message = "";
    let priority = 1;
    let reminderLevel: number | null = null;

    const formattedTargetDate = dayjs().add(1, "day").format("dddd, D MMMM YYYY");

    switch (type) {
      case "visit_plan_reminder_1":
      case "visit_plan_reminder": {
        title = "Pengingat Rencana Kunjungan";
        const rawTemplate = settings.firstReminderTemplate || DEFAULT_SETTINGS.firstReminderTemplate || "";
        message = rawTemplate
          .replace(/{name}/g, randomUser.name)
          .replace(/{date}/g, formattedTargetDate);
        priority = 2;
        reminderLevel = 1;
        break;
      }
      case "visit_plan_reminder_2": {
        title = "PENTING: Tenggat Rencana Kunjungan";
        const rawTemplate = settings.finalReminderTemplate || DEFAULT_SETTINGS.finalReminderTemplate || "";
        message = rawTemplate
          .replace(/{name}/g, randomUser.name)
          .replace(/{date}/g, formattedTargetDate);
        priority = 2;
        reminderLevel = 2;
        break;
      }
      case "account_approved":
        title = "Akun Disetujui";
        message = `Selamat ${randomUser.name}, registrasi akun Anda telah disetujui oleh Administrator. Anda sekarang dapat mengakses layanan penuh kami.`;
        priority = 1;
        break;
      case "account_rejected":
        title = "Akun Ditolak";
        message = `Registrasi akun Anda ditolak oleh Administrator karena ketidaksesuaian data. Silakan hubungi support.`;
        priority = 1;
        break;
      case "daily_summary":
        title = "Ringkasan Harian Aktivitas";
        message = `Halo Team, berikut ringkasan hari ini: 15 Kunjungan Berhasil, 3 Tertunda, dan 2 Klien baru diakuisisi.`;
        priority = 3;
        break;
      case "broadcast":
        title = "Pengumuman Penting";
        message = "BREAKING: Pemeliharaan sistem terjadwal pada pukul 23.00 WIB malam ini. Silakan simpan semua pekerjaan Anda.";
        priority = 1;
        break;
      case "follow_up":
        title = "Tindak Lanjut Klien";
        message = `Ada klien potensial baru yang membutuhkan respons cepat Anda. Silakan periksa tab Pipeline Anda.`;
        priority = 2;
        break;
      default:
        title = "Tes Notifikasi";
        message = "Ini adalah pesan percobaan dari sistem pusat automasi.";
        priority = 1;
    }

    try {
      const docRef = doc(collection(db, "notification_queue"));
      await setDoc(docRef, {
        type,
        uid: randomUser.id || randomUser.uid || "system_simulated",
        phone,
        title,
        message,
        status: "pending",
        priority,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          reminderLevel,
          source: type,
          targetDate: dayjs().add(1, "day").format("YYYY-MM-DD")
        }
      });
      toast.success(`Pekerjaan antrean (${type}) berhasil dibuat`, {
        description: "Pekerjaan ditambahkan dalam status 'pending' untuk diproses oleh OpenClaw."
      });
    } catch (err) {
      console.error(err);
      toast.error("Gagal menambahkan pekerjaan antrean");
    }
  };

  const handleUpdateQueueStatus = async (itemId: string, newStatus: "pending" | "processing" | "sent" | "failed") => {
    try {
      const docRef = doc(db, "notification_queue", itemId);
      await setDoc(docRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success(`Status antrean diperbarui ke ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memperbarui status antrean");
    }
  };

  const handleDeleteQueueItem = async (itemId: string) => {
    try {
      const docRef = doc(db, "notification_queue", itemId);
      await deleteDoc(docRef);
      toast.success("Berhasil menghapus item antrean");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghapus item antrean");
    }
  };

  // WhatsApp Sandbox Live States
  const [testPhone, setTestPhone] = useState<string>("");
  const [testMessage, setTestMessage] = useState<string>("");
  const [isTestingWA, setIsTestingWA] = useState<boolean>(false);
  const [waTestResult, setWaTestResult] = useState<any>(null);
  const [phoneBookSearch, setPhoneBookSearch] = useState<string>("");
  const [phoneBookRole, setPhoneBookRole] = useState<string>("ALL");
  const [isPhoneBookDropdownOpen, setIsPhoneBookDropdownOpen] = useState<boolean>(false);
  const [scanReport, setScanReport] = useState<{
    date: string;
    totalUsers: number;
    activeUsers: number;
    missingPlans: number;
    alreadyInQueue: number;
    jobsCreated: number;
    logs: string[];
  } | null>(null);

  // Mark Tomorrow's Cycle Active at 17:00 (Simulation Trigger)
  const handleToggleCycleAt17 = () => {
    const nextStatus = !cycleActive;
    setCycleActive(nextStatus);
    
    // Clear auto-trigger flags from localStorage when cycle is toggled back to active
    // so administrators can test the cron auto-run multiple times
    if (nextStatus) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("auto_run_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }

    toast.success(
      nextStatus 
        ? "Siklus Rencana Kunjungan besok diaktifkan secara internal" 
        : "Siklus Rencana Kunjungan dinonaktifkan",
      {
        description: nextStatus 
          ? "Status persiapan internal diperbarui (Aturan Reset 17:00 WIB). Flag scan dinormalisasi."
          : "Status persiapan internal dinonaktifkan."
      }
    );
  };

  // Trigger Live WhatsApp Send with Intelligent Hybrid Fallback execution from Sandbox
  const handleSendWASandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) {
      toast.error("Formulir tidak lengkap", {
        description: "Nomor WhatsApp target dan isi pesan wajib diisi."
      });
      return;
    }

    setIsTestingWA(true);
    setWaTestResult(null);

    try {
      console.log(`Initiating sandbox send for matching queue: ${testPhone}`);
      const result = await sendWhatsApp(testPhone, testMessage, {
        tenant_id: "default",
        type: "manual_sandbox",
        title: "Live WhatsApp Sandbox Sim",
        metadata: {
          initiator: "live_developer_sandbox",
          engine: "waClient_v1"
        }
      });

      setWaTestResult(result);

      if (result.success) {
        toast.success("WhatsApp Berhasil Terkirim!", {
          description: "Gateway eksternal memposting data dan merespon sukses."
        });
      } else {
        toast.error("Hybrid Fallback Aktif!", {
          description: "Gagal terhubung ke API Gateway. Pesan telah dialihkan & disimpan di Firestore 'notification_queue' (status: pending)."
        });
      }
    } catch (err: any) {
      console.error("Sandbox error:", err);
      toast.error("Gagal menjalankan sandbox:", {
        description: err.message || "Terjadi error internal aplikasi."
      });
    } finally {
      setIsTestingWA(false);
    }
  };

  // Handle toggling of individual user's notification preference (visitPlanReminder toggle)
  const handleToggleUserReminder = async (userId: string, currentStatus: boolean) => {
    const userDocRef = doc(db, "users", userId);
    try {
      await updateDoc(userDocRef, {
        "notifications.visitPlanReminder": !currentStatus
      });
      toast.success("Preferensi diperbarui", {
        description: "Status pengingat kunjungan pengguna berhasil diubah."
      });
    } catch (error) {
      console.error("Gagal mengubah preferensi:", error);
      try {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      } catch (err) {
        toast.error("Gagal memperbarui", {
          description: "Terjadi kesalahan hak akses atau sistem."
        });
      }
    }
  };

  const handleRunReminderScan = async (level: 1 | 2, overrideDate?: string) => {
    const dateToScan = overrideDate || targetDate;
    if (!settings.visitPlanReminderEnabled || !settings.enabled) {
      toast.error("Automasi dinonaktifkan", {
        description: "Harap aktifkan status automasi global dan opsi pengingat rencana kunjungan terlebih dahulu."
      });
      return;
    }

    if (!cycleActive) {
      toast.error("Siklus belum aktif", {
        description: "Siklus rencana kunjungan besok dinyatakan tidak aktif. Aktifkan/simulasikan jam 17:00 terlebih dahulu."
      });
      return;
    }

    setIsGenerating(true);
    const logsList: string[] = [];
    logsList.push(`[${dayjs().format("HH:mm:ss")}] Membuka scan pemicu pengingat Tingkat ${level} untuk tanggal ${dateToScan}`);
    
    try {
      // 1. Fetch market plans for tomorrow (dateToScan)
      logsList.push(`[${dayjs().format("HH:mm:ss")}] Mengambil data rencana kunjungan di Firestore...`);
      const plansSnap = await getDocs(
        query(collection(db, "market_plans"), where("dayStart", "==", dateToScan))
      );
      const plansList = plansSnap.docs.map(d => ({
        id: d.id,
        userId: d.data().userId
      }));
      logsList.push(`[${dayjs().format("HH:mm:ss")}] Ditemukan ${plansList.length} rencana kunjungan aktif pada tanggal target.`);

      // 2. Identify active users
      // Users with active/approved status, preferences enabled, and role SPV/Supervisor
      const eligibleUsers = users.filter(u => {
        const uStatusLower = (u.status || "").toLowerCase();
        const isApproved = uStatusLower === "active" || uStatusLower === "approved";
        const prefEnabled = u.notifications?.visitPlanReminder ?? true; // defaults to true
        const rLower = (u.role || "").toLowerCase();
        const isSPV = rLower === "spv" || rLower === "supervisor" || rLower.includes("spv") || rLower.includes("supervisor");
        return isApproved && prefEnabled && isSPV;
      });

      logsList.push(`[${dayjs().format("HH:mm:ss")}] Menyaring pengguna aktif posisi SPV dengan preferensi WA aktif: ${eligibleUsers.length} dari ${users.length} total pengguna.`);

      let jobsCreatedCount = 0;
      let missingPlansCount = 0;
      let alreadyInQueueCount = 0;

      for (const user of eligibleUsers) {
        // Did they submit a plan?
        const hasPlan = plansList.some(p => p.userId === user.id);
        
        if (!hasPlan) {
          missingPlansCount++;
          
          // Check duplication rules (same user, same date, same reminderLevel)
          const isDuplicated = queueItems.some(q => 
            q.uid === user.id && 
            q.metadata?.reminderLevel === level && 
            q.metadata?.targetDate === dateToScan
          );

          if (isDuplicated) {
            alreadyInQueueCount++;
            logsList.push(`[SKIP DUPLIKAT] ${user.name} (${user.email || "No Email"}) belum memiliki rencana, namun sudah ada di antrean Pengingat L${level} untuk ${dateToScan}.`);
            continue;
          }

          // Safe check: skip user safely if phone is missing or in bad shape
          if (!user.phone || user.phone === "-" || user.phone.trim() === "") {
            logsList.push(`[FAIL SAFETY SKIP] ${user.name} tidak memiliki nomor telepon valid. Dilewati dengan aman.`);
            continue;
          }

          // Create the queue item!
          const type = `visit_plan_reminder_${level}`;
          const title = level === 1 
            ? "Pengingat Rencana Kunjungan"
            : "PENTING: Tenggat Rencana Kunjungan";
          
          const formattedTargetDate = dayjs(dateToScan).format("dddd, D MMMM YYYY");
          const rawTemplate = level === 1
            ? (settings.firstReminderTemplate || DEFAULT_SETTINGS.firstReminderTemplate || "")
            : (settings.finalReminderTemplate || DEFAULT_SETTINGS.finalReminderTemplate || "");

          const message = rawTemplate
            .replace(/{name}/g, user.name)
            .replace(/{date}/g, formattedTargetDate);

          logsList.push(`[ANTREKAN JOB] Menjadwalkan Pengingat L${level} untuk ${user.name} ke nomor ${user.phone}...`);

          const docRef = doc(collection(db, "notification_queue"));
          await setDoc(docRef, {
            type,
            uid: user.id,
            phone: user.phone,
            title,
            message,
            status: "pending",
            priority: 2,
            retryCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
              reminderLevel: level,
              source: "visit_plan_reminder",
              targetDate: dateToScan
            }
          });

          jobsCreatedCount++;
        } else {
          logsList.push(`[OK PATUH] ${user.name} sudah mengisi Rencana Kunjungan.`);
        }
      }

      logsList.push(`[${dayjs().format("HH:mm:ss")}] Operasi selesai. Diterbitkan: ${jobsCreatedCount} antrean baru.`);
      
      setScanReport({
        date: dateToScan,
        totalUsers: users.length,
        activeUsers: eligibleUsers.length,
        missingPlans: missingPlansCount,
        alreadyInQueue: alreadyInQueueCount,
        jobsCreated: jobsCreatedCount,
        logs: logsList
      });

      if (jobsCreatedCount > 0) {
        toast.success(`Berhasil membuat ${jobsCreatedCount} pekerjaan antrean`, {
          description: `Semua draf antrean berstatus pending dan siap diproses oleh OpenClaw.`
        });
      } else {
        toast.info("Tidak ada antrean baru yang perlu diterbangkan", {
          description: "Semua pengguna terpantau patuh atau item antrean sudah pernah dibuat."
        });
      }

    } catch (err: any) {
      console.error(err);
      logsList.push(`[ERROR INT] Terjadi kegagalan scan automasi: ${err.message}`);
      toast.error("Gagal menjalankan generator scan");
    } finally {
      setIsGenerating(false);
    }
  };

  // Save configurations to Firestore
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const docPath = "automation_settings/global";

    try {
      const docRef = doc(db, "automation_settings", "global");
      await setDoc(docRef, {
        enabled: settings.enabled,
        visitPlanReminderEnabled: settings.visitPlanReminderEnabled,
        firstReminderTime: settings.firstReminderTime,
        finalReminderTime: settings.finalReminderTime,
        firstReminderTemplate: settings.firstReminderTemplate ?? DEFAULT_SETTINGS.firstReminderTemplate,
        finalReminderTemplate: settings.finalReminderTemplate ?? DEFAULT_SETTINGS.finalReminderTemplate,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Clear auto-trigger flags from localStorage when configuration changes
      // so the system can immediately re-evaluate and trigger for newly schedule times
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("auto_run_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      toast.success("Konfigurasi Berhasil Disimpan", {
        description: "Pengaturan automasi global dan aturan pengingat kunjungan telah diperbarui.",
      });
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, docPath);
      } catch (err) {
        toast.error("Gagal menyimpan konfigurasi", {
          description: "Terjadi gangguan saat menyimpan ke database."
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleGlobal = () => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleToggleVisitReminder = () => {
    setSettings(prev => ({ ...prev, visitPlanReminderEnabled: !prev.visitPlanReminderEnabled }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">
          Memuat Sistem Automasi...
        </p>
      </div>
    );
  }

  const filteredQueue = queueItems.filter(item => {
    if (statusFilter === "all") return true;
    return item.status === statusFilter;
  });

  const getTimerStatus = (targetTimeStr: string, level: number) => {
    if (!currentDateWIB || !currentTimeWIB || !targetTimeStr) {
      return { status: "loading", badge: "Memuat...", countdown: "00:00:00", isPast: false };
    }

    const tomorrowWIB = dayjs(currentDateWIB).add(1, "day").format("YYYY-MM-DD");
    const lKey = `auto_run_l${level}_${tomorrowWIB}`;
    const hasQueue = queueItems.some(q => 
      q.metadata?.reminderLevel === level && 
      q.metadata?.targetDate === tomorrowWIB
    );
    const alreadySavedRun = localStorage.getItem(lKey) === "true";
    const isTriggered = hasQueue || alreadySavedRun;

    const parsed = parseTimeString(targetTimeStr);
    if (!parsed) {
      return { status: "invalid", badge: "Format Salah", countdown: "00:00:00", isPast: false };
    }
    const { hour: targHour, min: targMin } = parsed;

    const [currHour, currMin, currSec] = currentTimeWIB.split(":").map(Number);
    const currentTotalSec = currHour * 3600 + currMin * 60 + (currSec || 0);
    const targetTotalSec = targHour * 3600 + targMin * 60;
    
    const diffSec = targetTotalSec - currentTotalSec;
    const isPast = diffSec <= 0;

    if (isTriggered) {
      return { 
        status: "triggered", 
        badge: "TERPICU ✅", 
        countdown: "Sudah Berjalan",
        isPast 
      };
    }

    if (isPast) {
      return { 
        status: "past_untriggered", 
        badge: "WAIT RUN ⚠️", 
        countdown: "Sistem Menunggu",
        isPast 
      };
    }

    // Counting down
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    const countdown = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    return { 
      status: "counting", 
      badge: countdown, 
      countdown: `${countdown} sisa`,
      isPast 
    };
  };

  const handleResetTriggerFlags = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("auto_run_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    toast.success("Flag Auto-Trigger Berhasil Direset", {
      description: "Anda sekarang dapat menguji kembali pemicu otomatis untuk sisa hari ini secara instan."
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground uppercase">
            Automation Center
          </h2>
          <p className="text-[10px] md:text-[11px] font-black text-muted-foreground mt-1.5 tracking-widest uppercase">
            BETA V1 • INFRASTRUKTUR NOTIFIKASI & ENGINE PENJADWALAN
          </p>
        </div>
      </div>

      {/* Grid Layout Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Hand: Settings form (Overview & Settings) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SECTION 1: Overview Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 md:p-6 rounded-[2rem] border border-border/40 backdrop-blur-sm space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-2xl bg-primary/10 w-fit">
                <Sliders className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full animate-pulse flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  WIB ACTIVE CLOCK: {currentTimeWIB || "Checking..."}
                </span>
                <span className="text-[8px] font-mono text-muted-foreground mr-1.5 font-bold">
                  {currentDateWIB}
                </span>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-[11px] md:text-xs font-black uppercase tracking-widest text-foreground">
                Sistem Pusat Automasi
              </h3>
              <p className="text-[11px] md:text-xs leading-relaxed text-muted-foreground font-medium">
                Pusat administrasi aturan automasi, jadwal pemicu, dan manajemen notifikasi latar belakang. Fitur integrasi otomatisasi seperti WhatsApp Delivery dan webhooks API (OpenClaw) saat ini nonaktif sampai rilis versi lanjutan stabil.
              </p>
            </div>

            {/* Info Callout for Workflow understanding */}
            <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2.5 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 block">
                ⚡ SISTEM CRON AUTOMATOR AKTIF
              </span>
              <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                Aplikasi dilengkapi **Dual-Engine Auto-Trigger**! Bila waktu lokal WIB saat ini ({currentTimeWIB}) sudah melewati **{settings.firstReminderTime}** (Pengingat #1) atau **{settings.finalReminderTime}** (Final #2), sistem secara otomatis memindai dan membuat seluruh antrean di Firestore secara instan tanpa perlu diklik manual.
              </p>
              <div className="text-[9.5px] text-muted-foreground font-semibold space-y-1.5 pt-1.5 border-t border-border/15">
                <p>💡 **Panduan & Status Penggunaan:**</p>
                <div className="pl-3.5 space-y-1.5 font-medium list-decimal list-inside">
                  <p>1. **Auto-Trigger**: Saat Anda atau admin lain membuka dashboard, otomatisasi memeriksa jam saat ini. Jika waktu pengingat terlampaui dan belum ada antrean untuk jadwal target besok, pencarian dijalankan di latar belakang.</p>
                  <p>2. **Force Scan Manual**: Anda juga bebas mengklik tombol <span className="text-primary font-bold">"Scan Pengingat"</span> di bagian Generator di bawah kapan saja untuk memaksa pemindaian ulang secara instan.</p>
                  <p>3. **Kirim Antrean**: Setelah antrean terbuat, klik tombol hijau berkedip di pojok kanan tabel Queue Monitor untuk mengirimkan seluruh pesan satu demi satu.</p>
                </div>
              </div>
            </div>

            {/* Global Master Switch */}
            <div className="pt-3 border-t border-border/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-foreground">
                  Master Switch (Sistem Automasi)
                </span>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Aktifkan atau matikan seluruh pemrosesan cron/automasi secara instan.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleGlobal}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  settings.enabled ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-800"
                )}
                role="switch"
                aria-checked={settings.enabled}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    settings.enabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </motion.div>

          {/* SECTION 2: Automation Settings Form */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-5 md:p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-5">
              <Settings className="w-4 h-4 text-primary" />
              <h3 className="text-[11px] md:text-xs font-black uppercase tracking-widest text-foreground">
                Pengaturan Aturan Pengingat
              </h3>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Reminder Switch */}
              <div className="flex items-center justify-between pb-4 border-b border-border/30">
                <div className="space-y-0.5 pr-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-foreground">
                    Pengingat Rencana Kunjungan
                  </span>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Kirim pengingat otomatis bagi staff yang belum membuat agenda kunjungan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleVisitReminder}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    settings.visitPlanReminderEnabled ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-800"
                  )}
                  role="switch"
                  aria-checked={settings.visitPlanReminderEnabled}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      settings.visitPlanReminderEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Time Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5ID">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                    Waktu Pengingat Pertama (#1)
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={settings.firstReminderTime}
                      onChange={(e) => setSettings(prev => ({ ...prev, firstReminderTime: e.target.value }))}
                      disabled={!settings.visitPlanReminderEnabled || !settings.enabled}
                      className={cn(
                        "w-full px-4 py-3 bg-card rounded-xl border text-xs font-bold font-mono transition-colors outline-none",
                        (!settings.visitPlanReminderEnabled || !settings.enabled)
                          ? "opacity-50 cursor-not-allowed border-border/20 text-muted-foreground"
                          : "border-border/50 hover:border-border focus:border-primary/60"
                      )}
                    />
                    <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                    Waktu Pengingat Final (#2)
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={settings.finalReminderTime}
                      onChange={(e) => setSettings(prev => ({ ...prev, finalReminderTime: e.target.value }))}
                      disabled={!settings.visitPlanReminderEnabled || !settings.enabled}
                      className={cn(
                        "w-full px-4 py-3 bg-card rounded-xl border text-xs font-bold font-mono transition-colors outline-none",
                        (!settings.visitPlanReminderEnabled || !settings.enabled)
                          ? "opacity-50 cursor-not-allowed border-border/20 text-muted-foreground"
                          : "border-border/50 hover:border-border focus:border-primary/60"
                      )}
                    />
                    <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Template Message Fields */}
              <div className="space-y-4 pt-4 border-t border-border/30">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                      Template Pesan Pengingat Pertama (#1)
                    </label>
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-500 font-mono font-bold px-1.5 py-0.5 rounded">
                      Hanya SPV
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={settings.firstReminderTemplate ?? ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, firstReminderTemplate: e.target.value }))}
                    disabled={!settings.visitPlanReminderEnabled || !settings.enabled}
                    placeholder="Halo {name}, Anda belum mengisi Rencana Kunjungan..."
                    className={cn(
                      "w-full px-4 py-2 text-xs bg-card rounded-xl border font-medium focus:border-primary/60 outline-none leading-normal resize-none",
                      (!settings.visitPlanReminderEnabled || !settings.enabled)
                        ? "opacity-50 cursor-not-allowed border-border/20 text-muted-foreground text-opacity-50"
                        : "border-border/50 hover:border-border"
                    )}
                  />
                  <p className="text-[8.5px] text-muted-foreground font-semibold">
                    Dukung label: <code className="text-primary font-mono font-bold px-1 bg-zinc-800/50 rounded">{`{name}`}</code> (Nama SPV) & <code className="text-primary font-mono font-bold px-1 bg-zinc-800/50 rounded">{`{date}`}</code> (Hari & tanggal target).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                      Template Pesan Pengingat Final (#2)
                    </label>
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-500 font-mono font-bold px-1.5 py-0.5 rounded">
                      Hanya SPV
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={settings.finalReminderTemplate ?? ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, finalReminderTemplate: e.target.value }))}
                    disabled={!settings.visitPlanReminderEnabled || !settings.enabled}
                    placeholder="PERINGATAN AKHIR: Halo {name}..."
                    className={cn(
                      "w-full px-4 py-2 text-xs bg-card rounded-xl border font-medium focus:border-primary/60 outline-none leading-normal resize-none",
                      (!settings.visitPlanReminderEnabled || !settings.enabled)
                        ? "opacity-50 cursor-not-allowed border-border/20 text-muted-foreground text-opacity-50"
                        : "border-border/50 hover:border-border"
                    )}
                  />
                  <p className="text-[8.5px] text-muted-foreground font-semibold">
                    Dukung label: <code className="text-primary font-mono font-bold px-1 bg-zinc-800/50 rounded">{`{name}`}</code> (Nama SPV) & <code className="text-primary font-mono font-bold px-1 bg-zinc-800/50 rounded">{`{date}`}</code> (Hari & tanggal target).
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/95 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Pengaturan</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* SECTION 5: Visit Plan Reminder Generator */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="p-5 md:p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-sm space-y-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-4 h-4 text-primary" />
              <h3 className="text-[11px] md:text-xs font-black uppercase tracking-widest text-foreground">
                Visit Plan Reminder Generator (Phase 4 Engine)
              </h3>
            </div>

            <div className="space-y-4">
              {/* Target Date Picker */}
              <div className="space-y-1.5 align-middle">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                  Tanggal Target Scan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="px-4 py-2 bg-card rounded-xl border border-border/50 text-xs font-bold font-mono text-foreground focus:border-primary/60 outline-none"
                  />
                  <div className="flex items-center justify-center px-3.5 py-2 bg-primary/10 border border-primary/20 rounded-xl text-primary font-bold text-[10px] uppercase tracking-wider">
                    {dayjs(targetDate).format("dddd, D MMMM YYYY")}
                  </div>
                </div>
              </div>

              {/* 17:00 Reset Simulator */}
              <div className="p-3.5 rounded-2xl border border-border/30 bg-card/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground">
                      17:00 WIB Reset Logic
                    </span>
                    <p className="text-[9px] text-muted-foreground leading-normal font-medium">
                      Menandai siklus kunjungan besok aktif untuk persiapan internal.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleCycleAt17}
                    className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all",
                      cycleActive 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" 
                        : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    )}
                  >
                    {cycleActive ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>

              {/* Checklist Syarat Automasi & Reset Trigger */}
              <div className="p-3.5 bg-zinc-950/30 border border-border/20 rounded-2xl space-y-3 text-[10px]">
                <div className="flex items-center justify-between border-b border-border/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <div className="flex flex-col">
                      <span className="font-extrabold uppercase tracking-wider text-muted-foreground text-[8px]">
                        Syarat Auto-Trigger Cron ({currentTimeWIB || "--:--:--"})
                      </span>
                      <span className="text-[9px] text-zinc-500 font-medium">Validasi engine real-time WIB</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetTriggerFlags}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-extrabold uppercase text-[8px] transition cursor-pointer"
                      title="Reset semua flag auto-run di localStorage agar cron dapat mendeteksi ulang"
                    >
                      Reset Flag Scan
                    </button>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border",
                      (settings.enabled && settings.visitPlanReminderEnabled && cycleActive && detectedSPVsCount > 0)
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    )}>
                      {(settings.enabled && settings.visitPlanReminderEnabled && cycleActive && detectedSPVsCount > 0) ? "READY" : "OFFLINE"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9px] text-muted-foreground font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", settings.enabled ? "bg-emerald-500" : "bg-rose-500")} />
                    <span className={settings.enabled ? "text-zinc-300 font-semibold" : "text-zinc-500"}>Master Switch</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", settings.visitPlanReminderEnabled ? "bg-emerald-500" : "bg-rose-500")} />
                    <span className={settings.visitPlanReminderEnabled ? "text-zinc-300 font-semibold" : "text-zinc-500"}>Pengingat Kunjungan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cycleActive ? "bg-emerald-500" : "bg-rose-500")} />
                    <span className={cycleActive ? "text-zinc-300 font-semibold" : "text-zinc-500"}>Siklus 17:00 WIB</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", users.length > 0 ? "bg-emerald-500" : "bg-rose-500")} />
                    <span className={users.length > 0 ? "text-zinc-300 font-semibold" : "text-zinc-500"}>{users.length} User Terdaftar</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2 mt-0.5 pt-1 border-t border-border/10">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", detectedSPVsCount > 0 ? "bg-emerald-500" : "bg-rose-500")} />
                    <span className={detectedSPVsCount > 0 ? "text-zinc-200 font-bold" : "text-rose-400 font-bold"}>
                      {detectedSPVsCount} Supervisor (SPV) Terdeteksi
                    </span>
                  </div>
                </div>
              </div>

              {/* Countdown Live Matrix */}
              <div className="grid grid-cols-2 gap-3 text-center">
                {(() => {
                  const s1 = getTimerStatus(settings.firstReminderTime, 1);
                  const s2 = getTimerStatus(settings.finalReminderTime, 2);
                  return (
                    <>
                      <div className="p-3 rounded-2xl border border-border/30 bg-card/10 flex flex-col justify-between items-center space-y-1">
                        <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">COUNTDOWN #1</span>
                        <div className={cn(
                          "text-base font-black font-mono leading-none tracking-tight py-1",
                          s1.status === "triggered" ? "text-emerald-500" : s1.status === "past_untriggered" ? "text-amber-500" : "text-primary hover:scale-105 transition-transform"
                        )}>
                          {s1.countdown}
                        </div>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded font-mono text-[7.5px] font-extrabold uppercase shrink-0",
                          s1.status === "triggered" ? "bg-emerald-500/10 text-emerald-500" : s1.status === "past_untriggered" ? "bg-amber-500/10 text-amber-500" : "bg-zinc-800 text-zinc-400"
                        )}>
                          {s1.badge}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl border border-border/30 bg-card/10 flex flex-col justify-between items-center space-y-1">
                        <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">COUNTDOWN #2</span>
                        <div className={cn(
                          "text-base font-black font-mono leading-none tracking-tight py-1",
                          s2.status === "triggered" ? "text-emerald-500" : s2.status === "past_untriggered" ? "text-amber-500" : "text-rose-500 hover:scale-105 transition-transform"
                        )}>
                          {s2.countdown}
                        </div>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded font-mono text-[7.5px] font-extrabold uppercase shrink-0",
                          s2.status === "triggered" ? "bg-emerald-500/10 text-emerald-500" : s2.status === "past_untriggered" ? "bg-amber-500/10 text-amber-500" : "bg-zinc-800 text-zinc-400"
                        )}>
                          {s2.badge}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Reminder Scan Trigger Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleRunReminderScan(1)}
                  disabled={isGenerating || !settings.enabled || !settings.visitPlanReminderEnabled || !cycleActive}
                  className="flex flex-col items-center justify-center gap-1.5 px-4 py-3 bg-card hover:bg-card/85 border border-border/50 text-foreground rounded-xl active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                  <div className="flex items-center gap-2">
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0 group-hover:rotate-12 transition-transform" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-wider">Scan Pengingat #1</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono font-bold">Target: {settings.firstReminderTime} WIB</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunReminderScan(2)}
                  disabled={isGenerating || !settings.enabled || !settings.visitPlanReminderEnabled || !cycleActive}
                  className="flex flex-col items-center justify-center gap-1.5 px-4 py-3 bg-card hover:bg-card/85 border border-border/50 text-foreground rounded-xl active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                  <div className="flex items-center gap-2">
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-wider">Scan Final #2</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono font-bold">Target: {settings.finalReminderTime} WIB</span>
                </button>
              </div>

              {/* Terminal Logs & Scan report summary */}
              {scanReport && (
                <div className="space-y-2.5 pt-3 border-t border-border/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground">
                      Scan Summary Report
                    </span>
                    <button
                      type="button"
                      onClick={() => setScanReport(null)}
                      className="text-[9px] font-mono text-muted-foreground hover:text-foreground"
                    >
                      [Clear Log]
                    </button>
                  </div>

                  {/* Micro dashboard report */}
                  <div className="grid grid-cols-3 gap-2 text-[9px] font-bold text-center">
                    <div className="p-2 rounded-xl bg-card border border-border/40">
                      <span className="text-muted-foreground block text-[8px] uppercase font-black">Scan Users</span>
                      <span className="text-foreground">{scanReport.activeUsers}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-card border border-border/40">
                      <span className="text-muted-foreground block text-[8px] uppercase font-black">Missing Plan</span>
                      <span className="text-amber-500">{scanReport.missingPlans}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-card border border-border/40">
                      <span className="text-muted-foreground block text-[8px] uppercase font-black">New Jobs</span>
                      <span className="text-emerald-500 font-extrabold">+{scanReport.jobsCreated}</span>
                    </div>
                  </div>

                  {/* Terminal emulator container */}
                  <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 text-[10px] font-mono text-zinc-300 leading-normal max-h-[160px] overflow-y-auto space-y-1 scrollbar-none">
                    {scanReport.logs.map((logLine, idx) => {
                      let color = "text-zinc-300";
                      if (logLine.includes("[ANTREKAN JOB]")) color = "text-emerald-400 font-bold";
                      else if (logLine.includes("[SKIP DUPLIKAT]")) color = "text-amber-400";
                      else if (logLine.includes("[FAIL SAFETY SKIP]")) color = "text-rose-400";
                      else if (logLine.includes("[ERROR")) color = "text-rose-500 font-bold";
                      
                      return (
                        <div key={idx} className={cn("text-[9px] break-all", color)}>
                          {logLine}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* SECTION 6: WhatsApp Client API Live Sandbox */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="p-5 md:p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-sm space-y-5 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/30">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-500 animate-pulse" />
                <h3 className="text-[11px] md:text-xs font-black uppercase tracking-widest text-foreground">
                  WhatsApp API Gateway & Sandbox (Phase 5 Engine)
                </h3>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground bg-muted/40 px-2 py-1 rounded-lg">
                <BookOpen className="w-3 h-3 text-primary" />
                <span>Interaktif Phone Book Terintegrasi</span>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground leading-normal font-medium">
              Uji coba konektivitas WhatsApp API eksternal secara instan. Jika gateway offline atau mengalami kegagalan transmisi, sistem secara cerdas akan mengaktifkan <strong>Hybrid Fallback Mode</strong> untuk menyimpan pesan sebagai antrean <code className="bg-zinc-800 dark:bg-zinc-900 px-1 py-0.5 rounded text-primary font-mono text-[9px]">pending</code> di Firestore agar diproses oleh worker.
            </p>

            <div className="space-y-4">
              {/* Form Tester */}
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/30 mb-2 font-mono">
                  [ GATEWAY PLAYGROUND TESTER ]
                </div>
                
                <form onSubmit={handleSendWASandbox} className="space-y-4">
                  <div className="space-y-3">
                    {/* Phone input */}
                    <div className="space-y-1.5 relative">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Nomor WhatsApp / HP Target
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={testPhone}
                          onChange={(e) => {
                            setTestPhone(e.target.value);
                            setIsPhoneBookDropdownOpen(true);
                          }}
                          onFocus={() => setIsPhoneBookDropdownOpen(true)}
                          placeholder="Ketik nama koordinator, email, atau no HP target..."
                          className="w-full pl-10 pr-24 py-2 bg-card rounded-xl border border-border/50 text-xs font-bold text-foreground focus:border-primary/60 outline-none placeholder:text-muted-foreground/45 placeholder:font-normal"
                        />
                        {/* Book logo left inside */}
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                        </div>
                        {/* Toggle button on the right inside */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          {testPhone && (
                            <button
                              type="button"
                              onClick={() => {
                                setTestPhone("");
                                setIsPhoneBookDropdownOpen(true);
                              }}
                              className="text-[8px] bg-muted hover:bg-muted/95 border border-border/30 text-muted-foreground hover:text-foreground font-black uppercase px-1.5 py-0.5 rounded cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsPhoneBookDropdownOpen(!isPhoneBookDropdownOpen)}
                            className={cn(
                              "text-[8px] px-2 py-0.5 rounded-lg border border-border/40 font-black uppercase tracking-wider select-none cursor-pointer transition-all",
                              isPhoneBookDropdownOpen
                                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted/70"
                            )}
                          >
                            {isPhoneBookDropdownOpen ? "Tutup" : "Daftar"}
                          </button>
                        </div>
                      </div>

                      {/* Dropdown phonebook overlay */}
                      {isPhoneBookDropdownOpen && (
                        <div className="absolute left-0 right-0 z-50 mt-1 bg-zinc-950/95 dark:bg-black/95 backdrop-blur-md border border-border/70 rounded-2xl shadow-2xl p-3.5 space-y-3.5 max-h-[300px] overflow-y-auto scrollbar-thin">
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground font-black uppercase tracking-wider pb-1.5 border-b border-border/20">
                            <span>Saran Buku Telepon (Integrated Link)</span>
                            <span className="text-emerald-500 font-bold">{users.length} Kontak Terdaftar</span>
                          </div>

                          <div className="space-y-1.5">
                            {users.filter(u => {
                              if (!testPhone.trim()) return true;
                              const searchStr = `${u.name} ${u.email} ${u.phone} ${u.role}`.toLowerCase();
                              return searchStr.includes(testPhone.toLowerCase());
                            }).length === 0 ? (
                              <div className="p-4 text-center rounded-xl bg-card/25 border border-dashed border-border/30">
                                <UserIcon className="w-5 h-5 text-muted-foreground/30 mx-auto mb-1" />
                                <p className="text-[10px] text-muted-foreground font-semibold">
                                  Tidak ada kontak cocok dengan "{testPhone}"
                                </p>
                              </div>
                            ) : (
                              users.filter(u => {
                                if (!testPhone.trim()) return true;
                                const searchStr = `${u.name} ${u.email} ${u.phone} ${u.role}`.toLowerCase();
                                return searchStr.includes(testPhone.toLowerCase());
                              }).map((u) => {
                                const isNoPhone = !u.phone || u.phone === "-";
                                return (
                                  <div
                                    key={u.id}
                                    onClick={() => {
                                      if (isNoPhone) {
                                        toast.error("Tidak ada nomor kontak", {
                                          description: `Pengguna ${u.name} tidak memiliki nomor telepon terdaftar.`
                                        });
                                        return;
                                      }
                                      setTestPhone(u.phone);
                                      setTestMessage(`Halo ${u.name}, Rencana Kunjungan besok ({date}) masih belum terisi. Mohon segera melengkapi Rencana Kunjungan Anda.\n\n_Automated message from Vork App_`);
                                      setIsPhoneBookDropdownOpen(false);
                                      toast.success(`Mengisi target: ${u.name}`, {
                                        description: `Nomor ${u.phone} berhasil dimasukkan ke form.`
                                      });
                                    }}
                                    className={cn(
                                      "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer group border-border/30 text-left",
                                      isNoPhone 
                                        ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20" 
                                        : "bg-zinc-900/40 hover:bg-zinc-900/90 border-border/30 hover:border-primary/50"
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={cn(
                                        "w-6 h-6 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center border shrink-0",
                                        u.role?.toLowerCase() === "spv" || u.role?.toLowerCase() === "supervisor"
                                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                      )}>
                                        {u.name ? u.name.substring(0, 2) : "US"}
                                      </div>
                                      <div className="space-y-0.5 text-left">
                                        <div className="text-[10px] font-extrabold text-foreground flex items-center gap-1.5">
                                          <span>{u.name}</span>
                                          <span className="text-[7.5px] px-1 py-0.2 rounded bg-zinc-805 uppercase text-zinc-400 font-mono">
                                            {u.role}
                                          </span>
                                        </div>
                                        <div className="text-[8.5px] text-muted-foreground font-semibold flex items-center gap-1">
                                          <Phone className="w-2.5 h-2.5 opacity-60 text-emerald-500" />
                                          <span>{u.phone}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      {isNoPhone ? (
                                        <span className="text-[7.5px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold uppercase tracking-wider border border-rose-500/20 animate-pulse">
                                          Kosong
                                        </span>
                                      ) : (
                                        <span className="text-[7.5px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider border border-emerald-500/20 group-hover:bg-primary group-hover:text-white transition-all whitespace-nowrap">
                                          Pilih
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}

                      {testPhone.trim() && (
                        <div className="text-[9px] font-bold text-muted-foreground flex items-center gap-1.5 mt-1">
                          <span>Normalisasi sistem:</span>
                          <span className="font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {testPhone.startsWith("0") ? "62" + testPhone.substring(1).replace(/[^0-9]/g, "") : testPhone.replace(/[^0-9]/g, "")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Message input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Isi Pesan WhatsApp
                      </label>
                      <textarea
                        rows={3}
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        placeholder="Tulis pesan pengingat atau sales follow-up disini..."
                        className="w-full px-4 py-2 bg-card rounded-xl border border-border/50 text-xs font-medium text-foreground focus:border-primary/60 outline-none placeholder:text-muted-foreground/30"
                      />
                    </div>
                  </div>

                  {/* Action and Output block */}
                  <div className="space-y-3 pt-1">
                    <button
                      type="submit"
                      disabled={isTestingWA}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isTestingWA ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengirim Transmisi...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Kirim via WA API / Fallback</span>
                        </>
                      )}
                    </button>

                    {waTestResult && (
                      <div className="p-3.5 bg-zinc-950 dark:bg-black rounded-2xl border border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="font-bold text-zinc-400">Sandbox Response Out:</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                            waTestResult.success 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          )}>
                            {waTestResult.success ? "API SUCCESS" : "GATEWAY FAIL (FALLBACK ACTIVE)"}
                          </span>
                        </div>

                        <pre className="text-[9px] font-mono text-zinc-300 overflow-x-auto max-h-[120px] scrollbar-none whitespace-pre-wrap leading-normal">
                          {JSON.stringify(waTestResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Hand: Stats / active rules, and logs */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* SECTION 3: Active Rules */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 md:p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-sm space-y-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-primary" />
              <h3 className="text-[11px] md:text-xs font-black uppercase tracking-widest text-foreground">
                Aturan Aktif Saat Ini
              </h3>
            </div>

            {/* Visit Plan Reminder Rule Status Card */}
            <div className="p-4 rounded-2xl border border-border/40 bg-card/30 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-foreground">
                  Visit Plan Reminder
                </span>
                
                {/* Status indicator */}
                <div className="flex items-center gap-1.5">
                  {settings.enabled && settings.visitPlanReminderEnabled ? (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none">
                        Enabled
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                        Disabled
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* List of configuration values */}
              <div className="grid grid-cols-2 gap-4 pt-2.5 border-t border-border/20">
                <div className="space-y-0.5">
                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider block">
                    Pengingat #1
                  </span>
                  <span className="text-[11px] font-mono font-bold text-foreground">
                    {settings.firstReminderTime}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider block">
                    Pengingat #2
                  </span>
                  <span className="text-[11px] font-mono font-bold text-foreground">
                    {settings.finalReminderTime}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* SECTION 4: Queue Summary Stats & Simulation Tools */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 md:p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-sm space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <h3 className="text-[11px] md:text-xs font-black uppercase tracking-widest text-foreground">
                  Queue Engine Stats (OpenClaw)
                </h3>
              </div>
              <span className="text-[9px] font-bold font-mono text-muted-foreground uppercase">
                {queueItems.length} Total Jobs
              </span>
            </div>

            {/* Micro Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex flex-col justify-between">
                <span className="text-[8px] font-black uppercase text-amber-500/80 tracking-wider">Pending</span>
                <span className="text-xl font-mono font-black text-amber-500 mt-1">
                  {queueItems.filter(i => i.status === "pending").length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex flex-col justify-between">
                <span className="text-[8px] font-black uppercase text-blue-500/80 tracking-wider">Processing</span>
                <span className="text-xl font-mono font-black text-blue-500 mt-1">
                  {queueItems.filter(i => i.status === "processing").length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col justify-between">
                <span className="text-[8px] font-black uppercase text-emerald-500/80 tracking-wider">Sent</span>
                <span className="text-xl font-mono font-black text-emerald-500 mt-1">
                  {queueItems.filter(i => i.status === "sent").length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex flex-col justify-between">
                <span className="text-[8px] font-black uppercase text-rose-500/80 tracking-wider">Failed</span>
                <span className="text-xl font-mono font-black text-rose-500 mt-1">
                  {queueItems.filter(i => i.status === "failed").length}
                </span>
              </div>
            </div>

            {/* Job Simulation Trigger area */}
            <div className="pt-3 border-t border-border/20 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-wider text-foreground">
                  Simulate Outbound Job
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleCreateTestJob("visit_plan_reminder_1")}
                  className="px-2.5 py-1.5 bg-card hover:bg-card/80 border border-border/50 text-foreground font-bold rounded-lg text-left truncate flex items-center justify-between"
                >
                  <span className="truncate text-amber-500 font-black">Reminder #1 (L1)</span>
                  <Plus className="w-3 h-3 text-muted-foreground ml-1 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateTestJob("visit_plan_reminder_2")}
                  className="px-2.5 py-1.5 bg-card hover:bg-card/80 border border-border/50 text-foreground font-bold rounded-lg text-left truncate flex items-center justify-between"
                >
                  <span className="truncate text-rose-500 font-black">Final Warn #2 (L2)</span>
                  <Plus className="w-3 h-3 text-muted-foreground ml-1 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateTestJob("account_approved")}
                  className="px-2.5 py-1.5 bg-card hover:bg-card/80 border border-border/50 text-foreground font-bold rounded-lg text-left truncate flex items-center justify-between"
                >
                  <span className="truncate">Approve Acc</span>
                  <Plus className="w-3 h-3 text-muted-foreground ml-1 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateTestJob("broadcast")}
                  className="px-2.5 py-1.5 bg-card hover:bg-card/80 border border-border/50 text-foreground font-bold rounded-lg text-left truncate flex items-center justify-between"
                >
                  <span className="truncate">Broadcast Msg</span>
                  <Plus className="w-3 h-3 text-muted-foreground ml-1 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateTestJob("follow_up")}
                  className="col-span-2 px-2.5 py-1.5 bg-card hover:bg-card/80 border border-border/50 text-foreground font-bold rounded-lg text-center flex items-center justify-center gap-1.5"
                >
                  <span>Follow Up Client Msg</span>
                  <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                </button>
              </div>
              <p className="text-[8px] font-medium text-muted-foreground leading-normal">
                Adhering to strict Phase 3 rules: Jobs generated here are stored in Firestore as pending tasks. OpenClaw processes them externally via the queues. WhatsApp is never triggered directly from client-side logic.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* SECTION: Queue Monitor Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="p-5 md:p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-sm mt-6"
      >
        {/* Toggleable Header */}
        <div 
          onClick={() => setIsQueueExpanded(!isQueueExpanded)}
          className="flex items-center justify-between gap-4 mb-4 select-none cursor-pointer pb-2 border-b border-border/10 hover:opacity-85 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4.5 h-4.5 text-primary shrink-0" />
            <div className="flex flex-col">
              <h3 className="text-[11px] md:text-xs font-black uppercase tracking-widest text-foreground">
                Queue Monitor (Pusat Antrean OpenClaw)
              </h3>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                {queueItems.filter(i => i.status === "pending").length} Pending • {queueItems.length} Total Jobs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
              isQueueExpanded ? "bg-zinc-800 text-zinc-400" : "bg-primary/20 text-primary animate-pulse"
            )}>
              {isQueueExpanded ? "Collapse" : "Expand"}
            </span>
            {isQueueExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground transition-transform" />
            ) : (
              <ChevronDown className="w-4 h-4 text-primary transition-transform" />
            )}
          </div>
        </div>

        {isQueueExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/25 p-3 rounded-2xl border border-border/10">
              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                {["all", "pending", "processing", "sent", "failed"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatusFilter(f)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all",
                      statusFilter === f
                        ? "bg-primary text-primary-foreground shadow-sm animate-none"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground border border-border/40"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Run Queue Runner Button */}
              <button
                type="button"
                disabled={isProcessingQueue}
                onClick={handleProcessQueue}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                  queueItems.filter(i => i.status === "pending").length > 0
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-muted-foreground"
                )}
              >
                {isProcessingQueue ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Kirim Antrean ({queueItems.filter(i => i.status === "pending").length} Pending)</span>
                  </>
                )}
              </button>
            </div>

            <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/20">
                <th className="pb-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="pb-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground">User</th>
                <th className="pb-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Phone</th>
                <th className="pb-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="pb-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground text-center">Priority</th>
                <th className="pb-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Created At</th>
                <th className="pb-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {queueLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[10px] text-muted-foreground font-medium">
                    Belum ada pekerjaan antrean {statusFilter !== "all" ? `dengan status '${statusFilter}'` : ""}.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => {
                  const userProfile = users.find(u => u.id === item.uid);
                  const userName = userProfile?.name || "System Broadcast / Guest";
                  const userEmail = userProfile?.email || "N/A";

                  // Status Badges
                  let statusStyle = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                  if (item.status === "processing") {
                    statusStyle = "bg-blue-500/10 text-blue-500 border-blue-500/20";
                  } else if (item.status === "sent") {
                    statusStyle = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                  } else if (item.status === "failed") {
                    statusStyle = "bg-rose-500/10 text-rose-500 border-rose-500/20";
                  }

                  // Priority Text
                  let priorityLabel = "L3";
                  let priorityColor = "text-muted-foreground";
                  if (item.priority === 1) {
                    priorityLabel = "L1";
                    priorityColor = "text-rose-500 font-extrabold";
                  } else if (item.priority === 2) {
                    priorityLabel = "L2";
                    priorityColor = "text-amber-500 font-bold";
                  }

                  // Date formatting
                  let dateStr = "-";
                  if (item.createdAt) {
                    try {
                      let d = typeof item.createdAt.toDate === "function" ? item.createdAt.toDate() : new Date(item.createdAt);
                      dateStr = d.toLocaleTimeString("id", { hour: "2-digit", minute: "2-digit" }) + " • " + d.toLocaleDateString("id", { day: "numeric", month: "short" });
                    } catch (e) {
                      dateStr = String(item.createdAt);
                    }
                  }

                  return (
                    <tr key={item.id} className="hover:bg-card/20 transition-colors">
                      {/* Type column with message info nested */}
                      <td className="py-3">
                        <div className="flex flex-col min-w-[150px]">
                          <span className="text-[10px] font-black font-mono uppercase tracking-wider text-foreground">
                            {item.type?.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-foreground font-black mt-0.5 line-clamp-1">{item.title}</span>
                          <span 
                            onClick={() => toggleMessageExpand(item.id)}
                            className={cn(
                              "text-[9px] text-muted-foreground mt-1 cursor-pointer transition-colors block text-left hover:text-primary",
                              expandedMessages[item.id] 
                                ? "whitespace-pre-wrap font-medium break-all bg-muted/65 p-2 rounded-lg border border-border/20 max-w-sm md:max-w-md" 
                                : "line-clamp-1 max-w-[200px]"
                            )} 
                            title="Klik untuk memperluas / menyembunyikan isi pesan lengkap"
                          >
                            {item.message}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleMessageExpand(item.id)}
                            className="text-[8px] text-left text-neutral-400 dark:text-neutral-500 hover:text-primary transition-colors mt-0.5"
                          >
                            {expandedMessages[item.id] ? "[-] Sembunyikan" : "[+] Selengkapnya"}
                          </button>
                        </div>
                      </td>

                      {/* User details */}
                      <td className="py-3">
                        <div className="flex items-center gap-2.5 min-w-[140px]">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] shrink-0 select-none overflow-hidden border border-border/40">
                            {userProfile?.photoURL ? (
                              <img 
                                src={userProfile.photoURL} 
                                alt={userName} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              userName[0]?.toUpperCase() || "U"
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold text-foreground leading-tight truncate">{userName}</span>
                            <span className="text-[9px] text-muted-foreground font-mono mt-0.5 truncate">{userEmail}</span>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3">
                        <span className="text-[10px] font-mono font-bold text-foreground">
                          {item.phone || "-"}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="py-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider",
                          statusStyle
                        )}>
                          {item.status}
                        </span>
                        {item.retryCount > 0 && (
                          <span className="text-[8px] font-mono font-bold text-muted-foreground ml-1.5" title="Retry attempts">
                            ({item.retryCount}r)
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3 text-center">
                        <span className={cn("text-[9px] font-mono", priorityColor)}>
                          {priorityLabel}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="py-3">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {dateStr}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.status === "failed" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateQueueStatus(item.id, "pending")}
                              className="p-1 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                              title="Reset to Pending"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {item.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateQueueStatus(item.id, "sent")}
                              className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Mark as Sent"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteQueueItem(item.id)}
                            className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete Queue Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
          </motion.div>
        )}
      </motion.div>

      {/* SECTION: Notification Preferences Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 md:p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-sm mt-6"
      >
        {/* Toggleable Header */}
        <div 
          onClick={() => setIsPrefsExpanded(!isPrefsExpanded)}
          className="flex items-center justify-between gap-4 mb-4 select-none cursor-pointer pb-2 border-b border-border/10 hover:opacity-85 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4.5 h-4.5 text-primary shrink-0" />
            <div className="flex flex-col">
              <h3 className="text-[11px] md:text-xs font-black uppercase tracking-widest text-foreground">
                Notification Preferences (User List Status)
              </h3>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                {users.length} User Terdaftar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
              isPrefsExpanded ? "bg-zinc-800 text-zinc-400" : "bg-primary/20 text-primary animate-pulse"
            )}>
              {isPrefsExpanded ? "Collapse" : "Expand"}
            </span>
            {isPrefsExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground transition-transform" />
            ) : (
              <ChevronDown className="w-4 h-4 text-primary transition-transform" />
            )}
          </div>
        </div>

        {isPrefsExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/20">
                <th className="pb-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground">User</th>
                <th className="pb-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="pb-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground text-center">Visit Plan Reminder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {usersLoading ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-[10px] text-muted-foreground">
                    Belum ada data pengguna.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const hasReminder = u.notifications?.visitPlanReminder ?? true;

                  return (
                    <tr key={u.id} className="hover:bg-card/20 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] shrink-0 select-none overflow-hidden border border-border/40">
                            {u.photoURL ? (
                              <img 
                                src={u.photoURL} 
                                alt={u.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              u.name[0]?.toUpperCase() || "U"
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-bold text-foreground leading-tight truncate">{u.name}</span>
                            <span className="text-[9px] text-muted-foreground font-mono mt-0.5 truncate">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-wider">
                          <ShieldIcon className="w-2.5 h-2.5" />
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <div className="inline-flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleUserReminder(u.id, hasReminder)}
                            className={cn(
                              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out hover:scale-105 active:scale-95 focus:outline-none",
                              hasReminder ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-800"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                hasReminder ? "translate-x-4" : "translate-x-0"
                              )}
                            />
                          </button>
                          <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest leading-none">
                            {hasReminder ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
