import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCurrentUser, useUserProfile, subscribeClients } from '../../../lib/services';
import { db } from '../../../firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Users, FileText, CheckCircle2, Search, X, Download, Clock, ArrowLeft } from 'lucide-react';
import { formatCurrency, cn } from '../../../lib/utils';
import { AuthGuard } from '../../../components/AuthGuard';
import { toast } from '../../../hooks/use-toast';
import { useTheme } from '../../../hooks/useTheme';

import { toJpeg } from 'html-to-image';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getWeeklyRange(inputDate = new Date()) {
  const date = new Date(inputDate);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);
  
  const maxEnd = new Date();
  const actualEnd = saturday > maxEnd ? maxEnd : saturday;
  
  return { monday, saturday, actualEnd };
}

function formatDateRange(start: Date, end: Date) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const startDay = start.getDate();
  const startMonth = monthNames[start.getMonth()];
  const endDay = end.getDate();
  const endMonth = monthNames[end.getMonth()];
  const year = end.getFullYear();
  return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
}

function getFirstName(fullName: string) {
  if (!fullName) return '-';
  const parts = fullName.trim().split(/\s+/);
  return parts[0].toUpperCase();
}

function getNormalizedClient(client: any) {
  if (!client) return client;
  const orderStatus = client.orderStatus || (
    client.status === 'survey' ? 'submitted' :
    client.status === 'acc' ? 'approved' :
    client.status === 'pending' ? 'pending' :
    client.status === 'reject' ? 'rejected' :
    client.status === 'pending_gudang' ? 'approved' :
    client.status === 'terkirim' ? 'completed' :
    'submitted'
  );
  const currentStep = client.currentStep || (
    ['survey', 'submitted'].includes(client.status) ? 'survey' :
    ['pending_gudang', 'acc', 'approved'].includes(client.status) ? 'warehouse' :
    'done'
  );
  const warehouse = client.warehouse || {
    status: client.status === 'terkirim' ? 'delivered' : 'pending'
  };
  return {
    ...client,
    barang: client.produk || client.barang || '',
    orderStatus,
    currentStep,
    warehouse,
    _date: client.tanggal?.toDate ? client.tanggal.toDate() : (client.createdAt?.toDate ? client.createdAt.toDate() : new Date(0))
  };
}

function getAvatarStyle(name: string) {
  const char = (name ? name.trim().charAt(0).toUpperCase() : 'A');
  const index = char.charCodeAt(0) % 5;
  const palettes = [
    // Teal/Emerald
    { 
      dark: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", 
      light: "bg-emerald-50 text-emerald-600 border-emerald-200/60" 
    },
    // Purple/Indigo
    { 
      dark: "bg-purple-500/10 text-purple-400 border-purple-500/20", 
      light: "bg-purple-50 text-purple-600 border-purple-200/60" 
    },
    // Blue/Sky
    { 
      dark: "bg-blue-500/10 text-blue-400 border-blue-500/20", 
      light: "bg-blue-50 text-blue-600 border-blue-200/60" 
    },
    // Pink/Rose
    { 
      dark: "bg-rose-500/10 text-rose-400 border-rose-500/20", 
      light: "bg-rose-50 text-rose-600 border-rose-200/60" 
    },
    // Amber/Orange
    { 
      dark: "bg-amber-500/10 text-amber-500 border-amber-500/20", 
      light: "bg-amber-50 text-amber-700 border-amber-200/60" 
    }
  ];
  return palettes[index];
}

export default function OperationalReportPage() {
  const user = useCurrentUser();
  const { profile } = useUserProfile();
  
  const [currentDate] = useState(new Date());
  const { monday, saturday, actualEnd } = useMemo(() => getWeeklyRange(currentDate), [currentDate]);
  const weekString = useMemo(() => `${monday.toISOString().split('T')[0]}_${saturday.toISOString().split('T')[0]}`, [monday, saturday]);
  const supervisorName = useMemo(() => profile?.name || 'WAHYU', [profile]);
  const userFirstName = useMemo(() => {
    const parts = supervisorName.trim().split(/\s+/);
    return parts[0].toUpperCase();
  }, [supervisorName]);

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);

  // States for custom role/sales label text editing
  const [roleText, setRoleText] = useState('');

  // Load custom roleText from localStorage
  useEffect(() => {
    if (!user?.uid) return;
    const key = `rep_role_${user.uid}`;
    try {
      const saved = localStorage.getItem(key);
      setRoleText(saved || '');
    } catch (e) {
      console.error(e);
    }
  }, [user?.uid]);

  const handleRoleChange = (val: string) => {
    setRoleText(val);
    if (user?.uid) {
      const key = `rep_role_${user.uid}`;
      localStorage.setItem(key, val);
    }
  };

  // Scaling states for mobile and precise rendering
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Setup Weekly Report Config (Sales List)
  useEffect(() => {
    if (!profile?.role || !user?.uid) return;
    setLoading(true);
    const unsub = subscribeClients(profile.role, user.uid, (data) => {
      const normalizedData = data.map(getNormalizedClient);
      const filteredForWeek = normalizedData.filter(client => {
        const d = client._date;
        const status = client.status?.toLowerCase() || '';
        const isValidStatus = ["survey", "pending_gudang", "gudang", "terkirim"].includes(status);
        return d >= monday && d <= actualEnd && isValidStatus;
      });
      setClients(filteredForWeek.sort((a, b) => a._date.getTime() - b._date.getTime()));
      setLoading(false);
    }, profile.branchId);
    return () => unsub();
  }, [profile?.role, user?.uid, profile?.branchId, monday, actualEnd]);

  // Load custom weekly reports notes (keterangan) from localStorage weekly configs
  useEffect(() => {
    if (!user?.uid || !weekString) return;
    const key = `rep_notes_${user.uid}_${weekString}`;
    try {
      const saved = localStorage.getItem(key);
      setNotes(saved ? JSON.parse(saved) : {});
    } catch (e) {
      console.error(e);
    }
  }, [user?.uid, weekString]);

  const handleNoteChange = (clientId: string, val: string) => {
    setNotes(prev => {
      const updated = { ...prev, [clientId]: val };
      if (user?.uid && weekString) {
        const key = `rep_notes_${user.uid}_${weekString}`;
        localStorage.setItem(key, JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Dynamic summary metrics
  const stats = useMemo(() => {
    let terkirimValue = 0;
    let pendingValue = 0;
    let surveyValue = 0;
    let totalValue = 0;
    clients.forEach(client => {
      const omset = Number(client.omset) || 0;
      totalValue += omset;
      const status = client.status?.toLowerCase() || '';
      if (status === 'terkirim') {
        terkirimValue += omset;
      } else if (status === 'gudang' || status === 'pending_gudang') {
        pendingValue += omset;
      } else if (status === 'survey') {
        surveyValue += omset;
      }
    });
    return {
      terkirim: terkirimValue,
      pending: pendingValue,
      survey: surveyValue,
      total: totalValue
    };
  }, [clients]);

  // Resize listener for scaling fitting
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      setHeight(containerRef.current.offsetHeight);
      const canvasWidth = 480;
      const availableWidth = window.innerWidth - 32;
      if (availableWidth < canvasWidth) {
        setScale(Math.max(0.15, availableWidth / canvasWidth));
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    const observer = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [clients, notes]);

  // Export as high-res visual JPG
  const handleExportJpg = async () => {
    try {
      toast.loading("Mempersiapkan gambar laporan...", { id: "export-toast" });
      setIsExporting(true);
      await new Promise(resolve => setTimeout(resolve, 350));
      const el = document.getElementById("print-container");
      if (!el) {
        toast.dismiss("export-toast");
        setIsExporting(false);
        return;
      }
      const dataUrl = await toJpeg(el, {
        quality: 0.98,
        pixelRatio: 3,
        backgroundColor: "transparent", // maintains gradient backdrop beautifully!
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
          width: "480px"
        }
      });
      setIsExporting(false);
      const link = document.createElement("a");
      link.download = `Laporan_Mingguan_${supervisorName}_${weekString}.jpg`;
      link.href = dataUrl;
      link.click();
      toast.success("Gambar laporan berhasil diunduh!", { id: "export-toast" });
    } catch (err) {
      setIsExporting(false);
      toast.error("Gagal mengekspor gambar laporan", { id: "export-toast" });
      console.error(err);
    }
  };

  const { theme } = useTheme();
  const isLight = theme === "light" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches === false);

  return (
    <AuthGuard>
      <style>{`
          @media print {
            #print-container {
              transform: scale(1) !important;
              width: 480px !important;
              border: none !important;
              box-shadow: none !important;
              padding: 32px !important;
              margin: 0 auto !important;
              border-radius: 0px !important;
            }
            body, html, main, #root {
              min-height: auto !important;
            }
            .custom-scrollbar::-webkit-scrollbar {
              display: none !important;
            }
          }
      `}</style>

      <div className="min-h-screen bg-background text-foreground pb-20 print:bg-white print:text-black print:pb-0 font-sans">
        
        {/* On screen workspace navigation / controls */}
        <div className="max-w-[480px] w-full mx-auto px-4 pt-6 flex items-center justify-between gap-4 print:hidden">
          <button 
            onClick={() => window.history.back()} 
            className="flex items-center justify-center gap-1.5 text-[10px] font-black tracking-wider uppercase text-muted-foreground hover:text-foreground transition-all cursor-pointer bg-secondary/30 px-3 py-2 rounded-lg hover:bg-secondary/50 shrink-0 select-none border border-border/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali
          </button>
          
          <button 
            onClick={handleExportJpg} 
            className="px-3.5 py-2 bg-primary text-primary-foreground text-[10px] font-black tracking-wider uppercase rounded-lg hover:scale-105 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 shrink-0 pointer-events-auto cursor-pointer select-none"
          >
            <Download className="w-3.5 h-3.5" /> Export JPG
          </button>
        </div>

        {/* Scalable Layout Canvas Wrapper */}
        <div 
          className="w-full flex items-start justify-center overflow-x-hidden pt-6 pb-20 print:py-0"
          style={{
            height: height ? `${height * scale + 32}px` : 'auto'
          }}
        >
          <div
            style={{
              width: '480px',
              height: height ? `${height}px` : 'auto',
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              position: 'relative',
              flexShrink: 0
            }}
          >
            {/* The actual printable page report canvas */}
            <div
              ref={containerRef}
              id="print-container"
              className={cn(
                "w-[480px] rounded-[24px] p-8 flex flex-col gap-6 transition-colors duration-300 relative",
                isLight 
                  ? "text-zinc-900 border border-zinc-200/80 shadow-2xl shadow-zinc-100/50" 
                  : "text-foreground border border-border/10 shadow-[0_0_60px_rgba(0,0,0,0.8)]"
              )}
              style={{ overflow: 'visible' }}
            >
              
              {/* Premium Gradient Backgrounds Cloned directly from Market Plans (/workspace/market-plans) */}
              {isLight ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-b from-emerald-100 via-zinc-50 to-zinc-50 pointer-events-none -z-10" />
                  <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-br from-emerald-400/20 via-primary/5 to-transparent pointer-events-none -z-10" />
                  <div className="absolute inset-x-0 top-0 h-[100px] bg-gradient-to-b from-white/40 to-transparent pointer-events-none -z-10" />
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-b from-[#141517] via-[#0d0e0f] to-[#09090a] pointer-events-none -z-10" />
                  <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-br from-zinc-850/15 via-zinc-900/5 to-transparent pointer-events-none -z-10" />
                </>
              )}
              
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-repeat bg-[url('https://grainy-gradients.vercel.app/noise.svg')] contrast-150 brightness-100 -z-10" />
              <div className={cn(
                "absolute inset-0 pointer-events-none -z-10",
                isLight ? "bg-gradient-to-br from-white/30 via-transparent to-zinc-50/10" : "bg-gradient-to-br from-white/5 via-transparent to-black/20"
              )} />
              
              {/* TOP BRAND DECORATION BAR */}
              <div className="flex items-center justify-between border-b border-border/10 pb-4">
                
                <div className="flex flex-col gap-1.5">
                  {/* Laporan Mingguan Header */}
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[16px] font-black tracking-[0.25em] uppercase font-sans leading-none",
                      isLight ? "text-zinc-900" : "text-white"
                    )}>
                      LAPORAN MINGGUAN
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#cbfb45] animate-pulse pointer-events-none select-none flex-shrink-0" />
                  </div>

                  {/* Metadata Row containing Name-Role */}
                  <div className="pl-0">
                    <div className={cn(
                      "font-black text-[10.5px] uppercase tracking-[0.2em] flex items-center gap-1.5 leading-none",
                      isLight ? "text-zinc-500" : "text-zinc-450"
                    )}>
                      <span className={isLight ? "text-zinc-900" : "text-zinc-100"}>{userFirstName}</span>
                      <span className={cn(isLight ? "text-zinc-300" : "text-zinc-700")}>•</span>
                      {isExporting ? (
                        <span>{roleText.trim().toUpperCase() || 'SALES'}</span>
                      ) : (
                        <div className="relative inline-block min-w-[50px]">
                          {/* Mirror span to calculate exact width dynamically without clipping */}
                          <span className="invisible block whitespace-pre uppercase tracking-[0.2em] text-[10.5px] font-black pointer-events-none select-none min-h-[11px] pr-1">
                            {roleText || 'SALES'}
                          </span>
                          <input
                            type="text"
                            className={cn(
                              "absolute inset-0 bg-transparent border-none focus:ring-0 p-0 m-0 text-left uppercase tracking-[0.2em] text-[10.5px] font-black focus:outline-none caret-primary w-full h-full",
                              isLight 
                                ? "text-zinc-500 placeholder:text-zinc-350" 
                                : "text-zinc-450 placeholder:text-zinc-650"
                            )}
                            placeholder="SALES"
                            value={roleText}
                            onChange={e => handleRoleChange(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side container: Secure and Calendar Pill stacked vertically */}
                <div className="flex flex-col items-end gap-1.5 select-none text-right">
                  {/* Secure Tag Badge */}
                  <div className={cn(
                    "px-2.5 py-1 rounded-full border text-[8px] font-black tracking-widest flex items-center gap-1.5 select-none leading-none",
                    isLight 
                      ? "bg-zinc-50 border-zinc-200 text-zinc-500" 
                      : "bg-secondary/10 border-border/30 text-zinc-400"
                  )}>
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    SECURE
                  </div>

                  {/* Small Calendar Capsule */}
                  <div className="bg-primary text-primary-foreground font-black text-[8px] px-2.5 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider select-none leading-none">
                    <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>{formatDateRange(monday, saturday)}</span>
                  </div>
                </div>
              </div>              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-3 gap-2 px-0.5 select-none font-sans">

                {/* TERKIRIM */}
                <div className={cn(
                  "px-3 py-2 h-[72px] flex flex-col justify-between overflow-hidden",
                  isLight
                    ? "bg-emerald-50 border border-emerald-200/60"
                    : "bg-emerald-950/40 border border-emerald-800/30"
                )} style={{ borderRadius: '18px' }}>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className={cn("w-3.5 h-3.5", isLight ? "text-emerald-600" : "text-emerald-400")} />
                    <span className={cn(
                      "font-black uppercase tracking-[0.15em] text-[8px]",
                      isLight ? "text-emerald-700" : "text-emerald-400"
                    )}>Terkirim</span>
                  </div>
                  <span className={cn(
                    "font-black leading-none block",
                    isLight ? "text-zinc-900" : "text-white",
                    stats.terkirim >= 10_000_000 ? "text-[12px]" : "text-[13px]"
                  )}>
                    {formatCurrency(stats.terkirim)}
                  </span>
                </div>

                {/* PENDING */}
                <div className={cn(
                  "px-3 py-2 h-[72px] flex flex-col justify-between overflow-hidden",
                  isLight
                    ? "bg-amber-50 border border-amber-200/60"
                    : "bg-amber-950/40 border border-amber-800/30"
                )} style={{ borderRadius: '18px' }}>
                  <div className="flex items-center gap-1.5">
                    <Clock className={cn("w-3.5 h-3.5", isLight ? "text-amber-600" : "text-amber-400")} />
                    <span className={cn(
                      "font-black uppercase tracking-[0.15em] text-[8px]",
                      isLight ? "text-amber-700" : "text-amber-400"
                    )}>Pending</span>
                  </div>
                  <span className={cn(
                    "font-black leading-none block",
                    isLight ? "text-zinc-900" : "text-white",
                    stats.pending >= 10_000_000 ? "text-[12px]" : "text-[13px]"
                  )}>
                    {formatCurrency(stats.pending)}
                  </span>
                </div>

                {/* SURVEY */}
                <div className={cn(
                  "px-3 py-2 h-[72px] flex flex-col justify-between overflow-hidden",
                  isLight
                    ? "bg-blue-50 border border-blue-200/60"
                    : "bg-blue-950/40 border border-blue-800/30"
                )} style={{ borderRadius: '18px' }}>
                  <div className="flex items-center gap-1.5">
                    <FileText className={cn("w-3.5 h-3.5", isLight ? "text-blue-600" : "text-blue-400")} />
                    <span className={cn(
                      "font-black uppercase tracking-[0.15em] text-[8px]",
                      isLight ? "text-blue-700" : "text-blue-400"
                    )}>Survey</span>
                  </div>
                  <span className={cn(
                    "font-black leading-none block",
                    isLight ? "text-zinc-900" : "text-white",
                    stats.survey >= 10_000_000 ? "text-[12px]" : "text-[13px]"
                  )}>
                    {formatCurrency(stats.survey)}
                  </span>
                </div>

              </div>

              {/* TABLE CONTAINER */}
              <div className={cn(
                "rounded-[20px] transition-all duration-300 border",
                isLight 
                  ? "bg-white border-zinc-200/80 shadow-md shadow-zinc-100/50" 
                  : "bg-zinc-900/25 border-zinc-850/50 backdrop-blur-md"
              )}>
                  <table className="w-full text-left border-collapse table-fixed">
                     <thead>
                        <tr className={cn(
                           "text-[8px] font-black uppercase tracking-widest opacity-40 border-b select-none",
                           isLight ? "border-zinc-100" : "border-border/10"
                        )}>
                           <th className="px-2.5 py-2 w-[25%] pl-4">NAMA</th>
                           <th className="px-2 py-2 w-[20%]">BARANG</th>
                           <th className="px-2 py-2 w-[25%]">OMSET</th>
                           <th className="px-2 py-2 w-[16%] text-center">STATUS</th>
                           <th className="px-2 py-2 w-[14%] text-center">KET</th>
                        </tr>
                     </thead>
                     <tbody className="text-sm">
                        {loading ? (
                          <tr>
                            <td colSpan={5} className={cn(
                              "px-3.5 py-6 text-center font-black tracking-widest uppercase text-[10px] animate-pulse",
                              isLight ? "text-zinc-400" : "text-muted-foreground"
                            )}>
                              Memuat Data Mingguan...
                            </td>
                          </tr>
                        ) : clients.length === 0 ? (
                          <tr>
                            <td colSpan={5} className={cn(
                              "px-3.5 py-8 text-center select-none",
                              isLight ? "text-zinc-400" : "text-muted-foreground"
                            )}>
                              <div className="flex flex-col items-center gap-2">
                                <FileText className="w-8 h-8 opacity-30" />
                                <span className="font-black tracking-widest uppercase text-[10px]">Belum ada order minggu ini</span>
                              </div>
                            </td>
                          </tr>
                        ) : clients.map(client => {
                          const status = client.status?.toLowerCase() || '';
                          
                          let statusText = 'LAINNYA';
                          let colorClass = isLight ? "text-zinc-600" : "text-zinc-400";
                          
                          if (status === 'terkirim') {
                            statusText = 'TERKIRIM';
                            colorClass = "text-emerald-400";
                          } else if (status === 'gudang' || status === 'pending_gudang') {
                            statusText = 'GUDANG';
                            colorClass = "text-amber-400";
                          } else if (status === 'survey') {
                            statusText = 'SURVEY';
                            colorClass = "text-blue-400";
                          }

                          return (
                            <tr key={client.id} className={cn(
                              "border-b border-border/10 last:border-b-0 transition-colors",
                              isLight 
                                ? "hover:bg-zinc-50/50 text-zinc-800" 
                                : "hover:bg-[#0c0d0e]/40 text-foreground"
                            )}>
                              
                              {/* Customer Name */}
                              <td className="px-2.5 py-2 align-middle w-[25%] pl-4">
                                <span className={cn(
                                  "font-black text-[10px] tracking-wide block truncate max-w-[110px]",
                                  isLight ? "text-zinc-900" : "text-white"
                                )}>
                                  {getFirstName(client.nama)}
                                </span>
                              </td>

                              {/* Product Column */}
                              <td className="px-2 py-2 align-middle w-[20%]">
                                <span className="text-[9px] text-muted-foreground uppercase tracking-wide block truncate max-w-[80px]">
                                  {client.produk ? client.produk.trim().split(/\s+/)[0].toUpperCase() : '-'}
                                </span>
                              </td>

                              {/* Omset column with Bold Typography */}
                              <td className="px-2 py-2 align-middle w-[25%]">
                                <span className={cn(
                                  "font-semibold text-[10px] font-mono tracking-tight whitespace-nowrap",
                                  isLight ? "text-zinc-950" : "text-white"
                                )}>
                                  {formatCurrency(client.omset || 0)}
                                </span>
                              </td>

                              {/* Process Status Badge matches screenshots exactly */}
                              <td className="px-2 py-2 align-middle text-center w-[16%]">
                                 <span className={cn(
                                   "font-black uppercase tracking-wider text-[9px]",
                                   colorClass
                                  )}>
                                   {statusText}
                                 </span>
                              </td>

                              {/* Editable/Presentable Remarquable Notes input row */}
                              <td className="px-2 py-2 align-middle text-center w-[14%]">
                                 {isExporting ? (
                                   <span className="text-[9px] text-muted-foreground block min-h-[14px] text-center truncate max-w-[65px] mx-auto">
                                     {notes[client.id] || '-'}
                                   </span>
                                 ) : (
                                   <input 
                                     type="text"
                                     className={cn(
                                       "w-full bg-transparent border-b border-transparent focus:border-primary/20 p-0 text-[9px] text-muted-foreground outline-none focus:ring-0 rounded-md transition-all text-center font-normal",
                                       isLight 
                                         ? "placeholder:text-zinc-300 hover:bg-zinc-50 focus:bg-zinc-100" 
                                         : "placeholder:text-zinc-700 hover:bg-secondary/20 focus:bg-[#0c0d0e]/90"
                                     )}
                                     placeholder="-"
                                     value={notes[client.id] || ''}
                                     onChange={e => handleNoteChange(client.id, e.target.value)}
                                   />
                                 )}
                              </td>

                            </tr>
                          );
                        })}
                     </tbody>
                  </table>
              </div>

              {/* FOOTER METADATA PART */}
              <div className="flex items-center justify-between border-t border-border/10 pt-6">
                
                {/* Vorkteam Watermark Left Align */}
                <div className="flex items-center gap-2 select-none">
                  <div className="w-6 h-6 flex items-center justify-center rounded-full overflow-hidden">
                    <img 
                      src="/login-illustration.png" 
                      referrerPolicy="no-referrer" 
                      className="w-6 h-6 object-cover" 
                      alt="App Logo" 
                    />
                  </div>
                  <span className={cn(
                    "text-[10px] font-black tracking-[0.25em] uppercase font-sans",
                    isLight ? "text-zinc-900" : "text-white"
                  )}>
                    VORKTEAM
                  </span>
                </div>

                {/* Live synced members details right align */}
                <div className="text-right select-none font-sans">
                  <span className={cn(
                    "text-[9px] font-black tracking-widest uppercase block",
                    isLight ? "text-zinc-400" : "text-zinc-500"
                  )}>
                    SYNCED {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })} WIB
                  </span>
                </div>

              </div>

            </div>
          </div>
        </div>

      </div>
    </AuthGuard>
  );
}
