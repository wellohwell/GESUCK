import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, 
  Users, 
  LogIn, 
  Calendar, 
  Monitor, 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Filter, 
  ExternalLink,
  Smartphone,
  Tablet,
  Laptop,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { handleFirestoreError, OperationType } from "../../lib/services";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

// Helper to check if a timestamp is online (last active < 5 mins)
function isUserOnline(lastActiveAt: any): boolean {
  if (!lastActiveAt) return false;
  let date: Date;
  if (lastActiveAt.toDate) {
    date = lastActiveAt.toDate();
  } else if (lastActiveAt.seconds) {
    date = new Date(lastActiveAt.seconds * 1000);
  } else {
    date = new Date(lastActiveAt);
  }
  const diff = Date.now() - date.getTime();
  return diff < 5 * 60 * 1000; // 5 minutes
}

export default function AdminActivityMonitorPage() {
  const { profile, loading: authLoading, profileLoading, role, isOwner } = useAuth();
  const navigate = useNavigate();

  // Route security guard: OWNER & ADMIN / MANAGER only
  useEffect(() => {
    if (!authLoading && !profileLoading) {
      const uRole = (profile?.role || role || "").toUpperCase();
      if (!isOwner && uRole !== "OWNER" && uRole !== "ADMIN" && uRole !== "MANAGER") {
        navigate("/access-denied", { replace: true });
      }
    }
  }, [profile, role, authLoading, profileLoading, isOwner, navigate]);

  // Tab State: "login_history" or "audit_trail"
  const [activeTab, setActiveTab] = useState<"login_history" | "audit_trail">("login_history");

  // Telemetry state lists from Firestore subscribing
  const [userList, setUserList] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Selected User for Detail Modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUserId, setFilterUserId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  // Pagination states
  const [loginPage, setLoginPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const itemsPerPage = 10;

  // Subscribe to real-time resources onload
  useEffect(() => {
    // 1. Subscribe to users collection for realtime status and profiles
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserList(list);
    }, (err) => {
      console.error("Users subscribe failed in Telemetry center:", err);
      handleFirestoreError(err, OperationType.LIST, "users");
    });

    // 2. Subscribe to loginHistory
    const qLogin = query(collection(db, "loginHistory"), orderBy("loginAt", "desc"), limit(300));
    const unsubLogin = onSnapshot(qLogin, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLoginHistory(list);
    }, (err) => {
      console.error("Login history telemetry subscribe failed:", err);
      handleFirestoreError(err, OperationType.LIST, "loginHistory");
    });

    // 3. Subscribe to Central activityLogs
    const qAudit = query(collection(db, "activityLogs"), orderBy("createdAt", "desc"), limit(500));
    const unsubAudit = onSnapshot(qAudit, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivityLogs(list);
    }, (err) => {
      console.error("Activity logs telemetry subscribe failed:", err);
      handleFirestoreError(err, OperationType.LIST, "activityLogs");
    });

    return () => {
      unsubUsers();
      unsubLogin();
      unsubAudit();
    };
  }, []);

  // Compute Statistics cards
  const stats = useMemo(() => {
    const totalUser = userList.length;
    const onlineCount = userList.filter(u => isUserOnline(u.lastActiveAt)).length;

    // Active users today: performed any activity or logged in today (UTC-7 Jakarta normalized)
    const todayStr = dayjs().format("YYYY-MM-DD");
    const activeTodayUids = new Set<string>();

    // Scan users last active page write dates
    userList.forEach(u => {
      if (u.lastActiveAt) {
        const d = u.lastActiveAt.toDate ? u.lastActiveAt.toDate() : new Date(u.lastActiveAt);
        if (dayjs(d).format("YYYY-MM-DD") === todayStr) {
          activeTodayUids.add(u.id);
        }
      }
      if (u.lastLoginAt) {
        const d = u.lastLoginAt.toDate ? u.lastLoginAt.toDate() : new Date(u.lastLoginAt);
        if (dayjs(d).format("YYYY-MM-DD") === todayStr) {
          activeTodayUids.add(u.id);
        }
      }
    });

    // Count logins logic
    let loginsToday = 0;
    let loginsThisWeek = 0;
    let loginsThisMonth = 0;

    const now = dayjs();
    loginHistory.forEach(log => {
      if (!log.loginAt) return;
      const logDate = log.loginAt.toDate ? dayjs(log.loginAt.toDate()) : dayjs(log.loginAt);
      
      if (logDate.isSame(now, "day")) {
        loginsToday += 1;
      }
      if (logDate.isAfter(now.subtract(7, "day"))) {
        loginsThisWeek += 1;
      }
      if (logDate.isAfter(now.subtract(30, "day"))) {
        loginsThisMonth += 1;
      }
    });

    return {
      totalUser,
      activeToday: activeTodayUids.size,
      onlineCount,
      loginsToday,
      loginsThisWeek,
      loginsThisMonth
    };
  }, [userList, loginHistory]);

  // Formatter for Javanese timestamps
  const formatTime = (ts: any) => {
    if (!ts) return "No telemetry yet";
    let dateObj: Date;
    if (ts.toDate) {
      dateObj = ts.toDate();
    } else if (ts.seconds) {
      dateObj = new Date(ts.seconds * 1000);
    } else {
      dateObj = new Date(ts);
    }
    return dayjs(dateObj).format("DD MMM YYYY, HH:mm:ss");
  };

  const getRelativeTime = (ts: any) => {
    if (!ts) return "Belum pernah aktif";
    let dateObj: Date;
    if (ts.toDate) {
      dateObj = ts.toDate();
    } else if (ts.seconds) {
      dateObj = new Date(ts.seconds * 1000);
    } else {
      dateObj = new Date(ts);
    }

    const diff = Date.now() - dateObj.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} jam lalu`;

    const days = Math.floor(hrs / 24);
    if (days === 1) return "Kemarin";
    if (days < 7) return `${days} hari lalu`;

    return dayjs(dateObj).format("DD MMM YYYY HH:mm");
  };

  // Generate charts trend data (Last 7 days of logins & activities)
  const chartTrendData = useMemo(() => {
    const trendMap: { [key: string]: { date: string; login: number; activity: number } } = {};
    for (let i = 6; i >= 0; i--) {
      const dStr = dayjs().subtract(i, "day").format("DD MMM");
      const completeDate = dayjs().subtract(i, "day").format("YYYY-MM-DD");
      trendMap[completeDate] = { date: dStr, login: 0, activity: 0 };
    }

    // Accumulate logins
    loginHistory.forEach(lh => {
      if (!lh.loginAt) return;
      const d = lh.loginAt.toDate ? lh.loginAt.toDate() : new Date(lh.loginAt);
      const keyDate = dayjs(d).format("YYYY-MM-DD");
      if (trendMap[keyDate]) {
        trendMap[keyDate].login += 1;
      }
    });

    // Accumulate activities
    activityLogs.forEach(al => {
      if (!al.createdAt) return;
      const d = al.createdAt.toDate ? al.createdAt.toDate() : new Date(al.createdAt);
      const keyDate = dayjs(d).format("YYYY-MM-DD");
      if (trendMap[keyDate]) {
        trendMap[keyDate].activity += 1;
      }
    });

    return Object.values(trendMap);
  }, [loginHistory, activityLogs]);

  // LOGIN HISTORY FILTERING & SEARCH
  const filteredLoginHistory = useMemo(() => {
    return loginHistory.filter(item => {
      // 1. Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = 
        (item.userName || "").toLowerCase().includes(searchLower) ||
        (item.email || "").toLowerCase().includes(searchLower) ||
        (item.browser || "").toLowerCase().includes(searchLower) ||
        (item.device || "").toLowerCase().includes(searchLower) ||
        (item.ipAddress || "").toLowerCase().includes(searchLower);

      if (!matchSearch) return false;

      // 2. User select filter
      if (filterUserId !== "all" && item.uid !== filterUserId) return false;

      // 3. Date filters
      if (item.loginAt) {
        const itemDate = item.loginAt.toDate ? dayjs(item.loginAt.toDate()) : dayjs(item.loginAt);
        if (startDate) {
          const s = dayjs(startDate).startOf("day");
          if (itemDate.isBefore(s)) return false;
        }
        if (endDate) {
          const e = dayjs(endDate).endOf("day");
          if (itemDate.isAfter(e)) return false;
        }
      }

      return true;
    });
  }, [loginHistory, searchQuery, filterUserId, startDate, endDate]);

  // SYSTEM AUDIT TELEMETRY FILTERING & SEARCH
  const filteredActivityLogs = useMemo(() => {
    return activityLogs.filter(item => {
      // 1. Search Query
      const searchLower = searchQuery.toLowerCase();
      const matchSearch =
        (item.userName || "").toLowerCase().includes(searchLower) ||
        (item.email || "").toLowerCase().includes(searchLower) ||
        (item.action || "").toLowerCase().includes(searchLower) ||
        (item.module || "").toLowerCase().includes(searchLower) ||
        (item.description || "").toLowerCase().includes(searchLower) ||
        (item.ipAddress || "").toLowerCase().includes(searchLower);

      if (!matchSearch) return false;

      // 2. User dynamic selectivity
      if (filterUserId !== "all" && item.uid !== filterUserId) return false;

      // 3. Module filter
      if (moduleFilter !== "all" && (item.module || "").toUpperCase() !== moduleFilter.toUpperCase()) {
        return false;
      }

      // 4. Date ranges
      if (item.createdAt) {
        const itemDate = item.createdAt.toDate ? dayjs(item.createdAt.toDate()) : dayjs(item.createdAt);
        if (startDate) {
          const s = dayjs(startDate).startOf("day");
          if (itemDate.isBefore(s)) return false;
        }
        if (endDate) {
          const e = dayjs(endDate).endOf("day");
          if (itemDate.isAfter(e)) return false;
        }
      }

      return true;
    });
  }, [activityLogs, searchQuery, filterUserId, moduleFilter, startDate, endDate]);

  // Dynamic modules list for dropdown filter
  const modulesList = useMemo(() => {
    const mods = new Set<string>();
    activityLogs.forEach(entry => {
      if (entry.module) {
        mods.add(entry.module.toUpperCase());
      }
    });
    return Array.from(mods);
  }, [activityLogs]);

  // EXPORT CSV UTILITIES
  const exportLoginsCSV = () => {
    if (filteredLoginHistory.length === 0) return;
    const header = ["Waktu Login", "Nama User", "Email", "Browser", "Device", "IP Address", "Halaman"];
    const rows = filteredLoginHistory.map(item => [
      formatTime(item.loginAt),
      item.userName || "N/A",
      item.email || "N/A",
      item.browser || "N/A",
      item.device || "N/A",
      item.ipAddress || "N/A",
      item.page || "/"
    ]);

    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      [header.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Login_History_${dayjs().format("YYYY-MM-DD_HH_mm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportActivityCSV = () => {
    if (filteredActivityLogs.length === 0) return;
    const header = ["Waktu", "User", "Email", "Role", "Modul", "Aksi", "Halaman", "Device", "IP", "Deskripsi"];
    const rows = filteredActivityLogs.map(item => [
      formatTime(item.createdAt),
      item.userName || "N/A",
      item.email || "N/A",
      item.role || "N/A",
      item.module || "N/A",
      item.action || "N/A",
      item.page || "N/A",
      item.device || "N/A",
      item.ipAddress || "N/A",
      item.description || "N/A"
    ]);

    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      [header.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Activity_Logs_${dayjs().format("YYYY-MM-DD_HH_mm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination bounds
  const loginTotalPages = Math.ceil(filteredLoginHistory.length / itemsPerPage) || 1;
  const auditTotalPages = Math.ceil(filteredActivityLogs.length / itemsPerPage) || 1;

  const paginatedLoginHistory = useMemo(() => {
    const start = (loginPage - 1) * itemsPerPage;
    return filteredLoginHistory.slice(start, start + itemsPerPage);
  }, [filteredLoginHistory, loginPage]);

  const paginatedActivityLogs = useMemo(() => {
    const start = (auditPage - 1) * itemsPerPage;
    return filteredActivityLogs.slice(start, start + itemsPerPage);
  }, [filteredActivityLogs, auditPage]);

  // Detail Modal Statistics calculated dynamically for selectedUser
  const selectedUserStats = useMemo(() => {
    if (!selectedUser) return null;
    const uid = selectedUser.id || selectedUser.uid;
    
    const totalLogins = selectedUser.loginCount || 0;
    
    // Filter activities performed by this uid
    const userActions = activityLogs.filter(a => a.uid === uid);
    
    // Total actions and today's actions
    const totalActivities = userActions.length;
    const todayStr = dayjs().format("YYYY-MM-DD");
    const todayActivities = userActions.filter(a => {
      if (!a.createdAt) return false;
      const d = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      return dayjs(d).format("YYYY-MM-DD") === todayStr;
    }).length;

    return {
      totalLogins,
      totalActivities,
      todayActivities
    };
  }, [selectedUser, activityLogs]);

  // Inline styling for glowing effects
  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] text-zinc-400">
        <Activity className="w-8 h-8 animate-spin text-indigo-505 text-brand-primary" />
        <span className="ml-3 font-semibold text-sm">Validating Enterprise Credentials...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 select-none">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-indigo-500 animate-pulse" />
            Admin Activity Monitor
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-1">
            Pusat monitoring, audit trail, serta analisis real-time aktivitas user tingkat enterprise.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            SYSTEM ONLINE
          </span>
        </div>
      </div>

      {/* DASHBOARD STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-card p-4 rounded-2xl border border-zinc-100 dark:border-white/5 space-y-1.5 shadow-sm transition-all hover:border-zinc-200 dark:hover:border-white/10">
          <p className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">Total User</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white font-mono">{stats.totalUser}</span>
            <Users className="w-4 h-4 text-zinc-400 mt-1" />
          </div>
        </div>

        <div className="bg-white dark:bg-card p-4 rounded-2xl border border-zinc-100 dark:border-white/5 space-y-1.5 shadow-sm transition-all hover:border-zinc-200 dark:hover:border-white/10">
          <p className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">Online Sekarang</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-500 font-mono">{stats.onlineCount}</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-card p-4 rounded-2xl border border-zinc-100 dark:border-white/5 space-y-1.5 shadow-sm transition-all hover:border-zinc-200 dark:hover:border-white/10">
          <p className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">Aktif Hari Ini</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-500 dark:text-indigo-400 font-mono">{stats.activeToday}</span>
            <span className="text-xs text-zinc-400 font-medium">user</span>
          </div>
        </div>

        <div className="bg-white dark:bg-card p-4 rounded-2xl border border-zinc-100 dark:border-white/5 space-y-1.5 shadow-sm transition-all hover:border-zinc-200 dark:hover:border-white/10">
          <p className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">Login Hari Ini</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white font-mono">{stats.loginsToday}</span>
            <span className="text-xs text-zinc-400 font-medium">kali</span>
          </div>
        </div>

        <div className="bg-white dark:bg-card p-4 rounded-2xl border border-zinc-100 dark:border-white/5 space-y-1.5 shadow-sm transition-all hover:border-zinc-200 dark:hover:border-white/10">
          <p className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">Login Minggu Ini</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white font-mono">{stats.loginsThisWeek}</span>
            <span className="text-xs text-zinc-400 font-medium">kali</span>
          </div>
        </div>

        <div className="bg-white dark:bg-card p-4 rounded-2xl border border-zinc-100 dark:border-white/5 space-y-1.5 shadow-sm transition-all hover:border-zinc-200 dark:hover:border-white/10">
          <p className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">Login Bulan Ini</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white font-mono">{stats.loginsThisMonth}</span>
            <span className="text-xs text-zinc-400 font-medium">kali</span>
          </div>
        </div>
      </div>

      {/* MIDSECTION GRID: REALTIME PANEL & ANALYTICS TREND */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PANEL: ACTIVE USERS NOW (4 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-card border border-zinc-100 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col h-[400px]">
          <div className="flex justify-between items-center pb-4 border-b border-zinc-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Active Users Now</h2>
            </div>
            <span className="text-[10px] font-mono font-bold bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 px-2 py-1 rounded">
              {userList.filter(u => isUserOnline(u.lastActiveAt)).length} ONLINE
            </span>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-3 scrollbar-none">
            {userList.map((u) => {
              const online = isUserOnline(u.lastActiveAt);
              return (
                <div 
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-zinc-100 dark:hover:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/[0.01] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 p-0.5 relative shrink-0">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-full h-full rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-bold">
                          {(u.displayName || u.name || "?").charAt(0)}
                        </div>
                      )}
                      
                      {/* Floating Indicator */}
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900 ${online ? "bg-emerald-500" : "bg-zinc-400"}`}></span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate hover:underline flex items-center gap-1">
                        {u.name || u.displayName || "Unknown User"}
                        <ExternalLink className="w-2.5 h-2.5 opacity-40 shrink-0" />
                      </p>
                      <p className="text-[9px] font-mono text-zinc-400 tracking-tight mt-0.5 uppercase">
                        {(u.role || "STAFF")} • {u.email}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <p className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 truncate max-w-[120px]">
                      {u.activePage || "/"}
                    </p>
                    <p className="text-[9px] text-zinc-400 font-mono tracking-tighter mt-0.5">
                      {getRelativeTime(u.lastActiveAt || u.lastLoginAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ANALYTICS GRAPH: TELEMETRY TRENDS (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-card border border-zinc-100 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col h-[400px]">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Activity & Login Trends</h2>
            <p className="text-[11px] text-zinc-400 mt-1">
              Visualisasi volume aktivitas dan total login harian seminggu terakhir
            </p>
          </div>

          <div className="flex-1 mt-4 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientLogin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradientActivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" stroke="#888" fontSize={10} tickLine={false} />
                <YAxis stroke="#888" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: "8px", fontSize: "11px", color: "#fff" }} 
                  labelClassName="font-bold text-[10px]"
                />
                <Area type="monotone" dataKey="login" name="Total Login" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#gradientLogin)" />
                <Area type="monotone" dataKey="activity" name="Aktivitas" stroke="#ec4899" strokeWidth={2.5} fillOpacity={1} fill="url(#gradientActivity)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TELEMETRY TABS COMPONENT */}
      <div className="bg-white dark:bg-card border border-zinc-100 dark:border-white/5 rounded-3xl p-5 shadow-sm space-y-6">
        
        {/* Navigation & Actions Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-zinc-100 dark:border-white/5">
          <div className="flex p-0.5 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200/50 dark:border-white/10 shrink-0">
            <button 
              onClick={() => {
                setActiveTab("login_history");
                setSearchQuery("");
                setFilterUserId("all");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all ${activeTab === "login_history" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"}`}
            >
              Login History
            </button>
            <button 
              onClick={() => {
                setActiveTab("audit_trail");
                setSearchQuery("");
                setFilterUserId("all");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all ${activeTab === "audit_trail" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"}`}
            >
              System Audit Trail
            </button>
          </div>

          <div className="flex w-full md:w-auto items-center gap-2">
            <button 
              onClick={activeTab === "login_history" ? exportLoginsCSV : exportActivityCSV}
              className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-500 text-white shadow-md hover:bg-indigo-600 transition-all cursor-pointer leading-none"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </button>
          </div>
        </div>

        {/* EXPLICIT FILTERS BLOCK */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-zinc-50 dark:bg-white/[0.01] p-3 rounded-2xl border border-zinc-100 dark:border-white/[0.04]">
          
          {/* Filter 1: Input Search text */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search user, email, IP..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setLoginPage(1);
                setAuditPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Filter 2: Select User */}
          <div className="relative">
            <select 
              value={filterUserId}
              onChange={(e) => {
                setFilterUserId(e.target.value);
                setLoginPage(1);
                setAuditPage(1);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium appearance-none cursor-pointer"
            >
              <option value="all">Saring Berdasarkan User (Semua)</option>
              {userList.map(u => (
                <option key={u.id} value={u.id}>
                  {u.displayName || u.name || "Unknown User"} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker bounds */}
          <div className="flex items-center gap-1 md:col-span-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setLoginPage(1);
                setAuditPage(1);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl text-[11px] text-zinc-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500"
              placeholder="Mulai"
            />
            <span className="text-zinc-400 text-xs px-1">s/d</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setLoginPage(1);
                setAuditPage(1);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl text-[11px] text-zinc-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500"
              placeholder="Akhir"
            />
          </div>

          {activeTab === "audit_trail" && (
            <div className="md:col-span-4 mt-1">
              <select 
                value={moduleFilter}
                onChange={(e) => {
                  setModuleFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium appearance-none cursor-pointer"
              >
                <option value="all">Saring Modul (Semua CRM, WhatsApp, Pricelist, dll)</option>
                {modulesList.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* MAIN DATA TABLES AREA */}
        <div>
          {activeTab === "login_history" ? (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-zinc-100 dark:border-white/5">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-card/[0.05] text-zinc-400 dark:text-white/60 font-semibold uppercase tracking-wider">
                      <th className="px-6 py-3">Waktu Login</th>
                      <th className="px-6 py-3">Nama User / Email</th>
                      <th className="px-6 py-3">Browser</th>
                      <th className="px-6 py-3">Device</th>
                      <th className="px-6 py-3">IP Address</th>
                      <th className="px-6 py-3">Halaman Landing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
                    {paginatedLoginHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-zinc-400 font-medium">
                          No matching login history logs found.
                        </td>
                      </tr>
                    ) : (
                      paginatedLoginHistory.map((item) => {
                        const devType = (item.device || "Desktop").toUpperCase();
                        return (
                          <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-white/[0.01] transition-all">
                            <td className="px-6 py-3.5 font-mono text-zinc-500 dark:text-zinc-400">
                              {formatTime(item.loginAt)}
                            </td>
                            <td className="px-6 py-3.5 font-semibold text-zinc-900 dark:text-white">
                              <span 
                                onClick={() => {
                                  // Locate user object to view detail
                                  const foundU = userList.find(x => x.id === item.uid) || item;
                                  setSelectedUser(foundU);
                                }}
                                className="hover:underline hover:text-indigo-500 cursor-pointer flex items-center gap-1"
                              >
                                {item.userName || "Unknown"}
                                <ExternalLink className="w-2.5 h-2.5 opacity-30 shrink-0" />
                              </span>
                              <p className="text-[10px] text-zinc-400 font-normal mt-0.5">{item.email}</p>
                            </td>
                            <td className="px-6 py-3.5 text-zinc-600 dark:text-zinc-300 font-medium">
                              {item.browser || "Chrome"}
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 w-fit font-semibold uppercase text-[9px]">
                                {devType === "MOBILE" ? <Smartphone className="w-3 h-3" /> : devType === "TABLET" ? <Tablet className="w-3 h-3" /> : <Laptop className="w-3 h-3" />}
                                {item.device || "Desktop"}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 font-mono text-zinc-600 dark:text-zinc-400 select-all font-semibold">
                              {item.ipAddress || "127.0.0.1"}
                            </td>
                            <td className="px-6 py-3.5 text-indigo-500 dark:text-indigo-400 font-semibold font-mono">
                              {item.page || "/workspace"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Login Pagination controls */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] text-zinc-400 font-medium">
                  Menampilkan {filteredLoginHistory.length > 0 ? (loginPage - 1) * itemsPerPage + 1 : 0} - {Math.min(loginPage * itemsPerPage, filteredLoginHistory.length)} dari {filteredLoginHistory.length} entri
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    disabled={loginPage <= 1}
                    onClick={() => setLoginPage(p => p - 1)}
                    className="p-1 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 transition-all select-none cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 inline mr-0.5" /> Back
                  </button>
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 font-mono px-2">Page {loginPage} of {loginTotalPages}</span>
                  <button 
                    disabled={loginPage >= loginTotalPages}
                    onClick={() => setLoginPage(p => p + 1)}
                    className="p-1 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 transition-all select-none cursor-pointer"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 inline ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-zinc-100 dark:border-white/5">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-card/[0.05] text-zinc-400 dark:text-white/60 font-semibold uppercase tracking-wider">
                      <th className="px-6 py-3">Waktu</th>
                      <th className="px-6 py-3">Aktor</th>
                      <th className="px-6 py-3">Modul</th>
                      <th className="px-6 py-3">Aksi</th>
                      <th className="px-6 py-3">Keterangan</th>
                      <th className="px-6 py-3">Device / IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
                    {paginatedActivityLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-zinc-400 font-medium">
                          No matching CRM activity logs found for specified queries.
                        </td>
                      </tr>
                    ) : (
                      paginatedActivityLogs.map((item) => {
                        return (
                          <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-white/[0.01] transition-all">
                            <td className="px-6 py-3.5 font-mono text-zinc-500 dark:text-zinc-400">
                              {formatTime(item.createdAt)}
                            </td>
                            <td className="px-6 py-3.5 font-semibold text-zinc-900 dark:text-white">
                              <span 
                                onClick={() => {
                                  const foundU = userList.find(x => x.id === item.uid) || item;
                                  setSelectedUser(foundU);
                                }}
                                className="hover:underline hover:text-indigo-500 cursor-pointer flex items-center gap-1"
                              >
                                {item.userName || "System"}
                                <ExternalLink className="w-2.5 h-2.5 opacity-30 shrink-0" />
                              </span>
                              <p className="text-[10px] text-zinc-400 font-normal mt-0.5">{item.email}</p>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 tracking-wider">
                                {String(item.module || "SYSTEM").toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 font-bold uppercase text-[10px] text-zinc-800 dark:text-zinc-200 tracking-wider">
                              {item.action || "UPDATE"}
                            </td>
                            <td className="px-6 py-3.5 leading-relaxed text-zinc-600 dark:text-zinc-300 max-w-sm truncate" title={item.description}>
                              {item.description}
                            </td>
                            <td className="px-6 py-3.5 leading-tight font-mono text-zinc-600 dark:text-zinc-400 select-all">
                              <div>{item.device || "Desktop"}</div>
                              <div className="text-[9px] text-zinc-300 mt-0.5">{item.ipAddress || "127.0.0.1"}</div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Audit Page Pagination stats */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] text-zinc-400 font-medium">
                  Menampilkan {filteredActivityLogs.length > 0 ? (auditPage - 1) * itemsPerPage + 1 : 0} - {Math.min(auditPage * itemsPerPage, filteredActivityLogs.length)} dari {filteredActivityLogs.length} entri
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage(p => p - 1)}
                    className="p-1 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 transition-all select-none cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 inline mr-0.5" /> Back
                  </button>
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 font-mono px-2">Page {auditPage} of {auditTotalPages}</span>
                  <button 
                    disabled={auditPage >= auditTotalPages}
                    onClick={() => setAuditPage(p => p + 1)}
                    className="p-1 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 transition-all select-none cursor-pointer"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 inline ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: USER DETAIL SNAPSHOT (AnimatePresence layout) */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative w-full max-w-lg bg-white dark:bg-card border border-zinc-100 dark:border-zinc-800/80 rounded-[2rem] shadow-2xl p-6 overflow-hidden max-h-[90vh]"
            >
              {/* Cover glowing back-lights */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>

              {/* Close Button element */}
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-6 overflow-y-auto pr-1">
                
                {/* 1. Header user avatar */}
                <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-500/15 p-0.5 relative">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt="" className="w-full h-full rounded-full ring-2 ring-indigo-500" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-lg font-bold">
                        {(selectedUser.name || selectedUser.displayName || "?").charAt(0)}
                      </div>
                    )}
                    <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-zinc-900 ${isUserOnline(selectedUser.lastActiveAt) ? "bg-emerald-500" : "bg-zinc-400"}`}></span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                      {selectedUser.name || selectedUser.displayName || "Unknown Aktor"}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">
                      {selectedUser.email || "No email synchronized"}
                    </p>
                    <div className="flex gap-1.5 mt-1.5 align-middle">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 uppercase tracking-tight">
                        {selectedUser.role || "STAFF"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 uppercase tracking-tight">
                        {selectedUser.status || "APPROVED"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. STATISTIK telemetry totals */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Statistik Telemetri</h4>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 p-3 rounded-2xl text-center">
                      <p className="text-[9px] font-extrabold text-zinc-400 tracking-tight uppercase">Total Login</p>
                      <p className="text-lg font-black font-mono text-zinc-800 dark:text-zinc-100 mt-1">{selectedUserStats?.totalLogins || 0}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 p-3 rounded-2xl text-center">
                      <p className="text-[9px] font-extrabold text-zinc-400 tracking-tight uppercase">Aktivitas Hari Ini</p>
                      <p className="text-lg font-black font-mono text-indigo-500 dark:text-indigo-400 mt-1">{selectedUserStats?.todayActivities || 0}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 p-3 rounded-2xl text-center">
                      <p className="text-[9px] font-extrabold text-zinc-400 tracking-tight uppercase">Total Aktivitas</p>
                      <p className="text-lg font-black font-mono text-pink-500 mt-1">{selectedUserStats?.totalActivities || 0}</p>
                    </div>
                  </div>
                </div>

                {/* 3. PERANGKAT TERAKHIR & GEO SPATIAL IP */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Device Info & Last Login</h4>
                  
                  <div className="bg-zinc-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-zinc-100 dark:border-white/5 space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold flex items-center gap-1.5 text-zinc-400">
                        <Monitor className="w-3.5 h-3.5" /> Device
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedUser.lastLoginDevice || "Desktop"}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-semibold flex items-center gap-1.5 text-zinc-400">
                        <Globe className="w-3.5 h-3.5" /> Browser Agent
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedUser.lastLoginBrowser || "Chrome"}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-semibold flex items-center gap-1.5 text-zinc-400">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> IP Address
                      </span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 bg-indigo-500/5 px-2 py-0.5 rounded select-all">{selectedUser.lastLoginIp || "182.1.25.10"}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-semibold flex items-center gap-1.5 text-zinc-400">
                        <Clock className="w-3.5 h-3.5" /> Terakhir Terlihat
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-[11px]">{getRelativeTime(selectedUser.lastActiveAt)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-semibold flex items-center gap-1.5 text-zinc-400">
                        <Calendar className="w-3.5 h-3.5" /> Waktu Login Terakhir
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-[11px]">{formatTime(selectedUser.lastLoginAt)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-semibold flex items-center gap-1.5 text-zinc-400">
                        <Activity className="w-3.5 h-3.5 text-indigo-500" /> Halaman Terakhir Dibuka
                      </span>
                      <span className="font-mono font-bold text-indigo-500 dark:text-indigo-400">{selectedUser.lastLoginPage || selectedUser.activePage || "/workspace"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="w-full bg-zinc-100 dark:bg-white/5 py-2.5 rounded-xl font-bold text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Tutup Telemetri Monitor
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
