import React, { useState, useEffect, useRef, useMemo } from "react";
import { subscribeMarketPlans, subscribeUsers } from "../lib/services";
import { getActiveSystemDate } from "../utils/javaneseDate";
import { domToJpeg, domToBlob } from "modern-screenshot";
import toast from "react-hot-toast";
import { ArrowLeft, Download, Share2, CheckCircle, Copy } from "lucide-react";
import { toTitleCase } from "../utils/format";
import dayjs from "dayjs";

interface ReportProps {
  onBack: () => void;
}

export default function Report({ onBack }: ReportProps) {
  const [activeDate] = useState(getActiveSystemDate());
  const [plans, setPlans] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const captureRef = useRef<HTMLDivElement>(null);
  
  const userMap = useMemo(() => {
    const map: Record<string, { name: string; photoURL?: string }> = {};
    users.forEach((u) => {
      if (u.id) {
        map[u.id] = {
          name: u.displayName || u.name || "User",
          photoURL: u.photoURL || u.photoUrl,
        };
      }
    });
    return map;
  }, [users]);
  
  useEffect(() => {
    let active = true;
    
    const unsubPlans = subscribeMarketPlans(activeDate.isoDate, (data) => {
      if(active) {
        setPlans(data.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
        setLoading(false);
      }
    });

    const unsubUsers = subscribeUsers((data) => {
      if(active) {
        setUsers(data);
      }
    });

    return () => {
      active = false;
      unsubPlans();
      unsubUsers();
    };
  }, [activeDate.isoDate]);

  const activeSalesCount = Array.from(new Set(plans.map(p => p.userId))).length;
  const targetMarketsCount = plans.length;
  const uniqueCitiesCount = Array.from(new Set(plans.map(p => p.city))).length;
  
  const salesUsers = users.filter((u: any) => u.role !== 'admin');
  const userIdsInPlans = new Set(plans.map(p => p.userId));
  const missingUsersCount = salesUsers.filter(u => !userIdsInPlans.has(u.id)).length;

  const handleDownload = async () => {
    if (!captureRef.current) return;
    try {
      const dataUrl = await domToJpeg(captureRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Report_${activeDate.isoDate}.jpg`;
      link.click();
      toast.success("Berhasil mengunduh gambar!");
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuat gambar.");
    }
  };

  const handleShare = async () => {
    if (!captureRef.current) return;
    const toastId = toast.loading("Menyiapkan gambar...");
    try {
      const blob = await domToBlob(captureRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      
      if (!blob) {
        toast.error("Gagal memproses gambar.", { id: toastId });
        return;
      }
      const file = new File([blob], `Report_${activeDate.isoDate}.jpg`, { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Laporan Rencana Pasar ${activeDate.fullDate}`,
            text: `Laporan kunjungan sales tanggal ${activeDate.fullDate}.`,
            files: [file],
          });
          toast.success("Berhasil membagikan!", { id: toastId });
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            toast.error("Batal membagikan.", { id: toastId });
          } else {
            toast.dismiss(toastId);
          }
        }
      } else {
        toast.error("Perangkat ini belum mendukung fitur share File.", { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan.", { id: toastId });
    }
  };

  const handleCopyText = async () => {
    if (plans.length === 0) {
      toast.error("Tidak ada data untuk disalin.");
      return;
    }

    const divider = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
    const header = `*Rencana Kunjungan Pasar*\n*${activeDate.dayName} ${activeDate.pasaran}, ${activeDate.fullDate}*`;
    
    const body = plans.map((plan: any) => {
      const userName = toTitleCase((userMap[plan.userId]?.name || plan.userName || "User").split(' ')[0]);
      const marketName = toTitleCase(plan.marketName);
      
      const categoryRaw = plan.marketType === 'PASARAN_JAWA' 
        ? (plan.marketPasaran?.includes(activeDate.pasaran.toUpperCase()) 
            ? activeDate.pasaran.toUpperCase() 
            : plan.marketPasaran?.join(", ") || activeDate.pasaran.toUpperCase())
        : plan.marketType?.replace("PASARAN_", "").replace("PASAR_", "").replace("_", " ");
      
      const category = toTitleCase(categoryRaw);
      const categoryText = category === "Umum" ? "" : ` ${category}`;
        
      return `• ${userName} - ${marketName}${categoryText}`;
    }).join("\n");

    const footer = `_Auto generate by_ *Vork*`;
    
    const fullText = `${divider}\n${header}\n${divider}\n\n${body}\n\n${divider}\n${footer}\n${divider}`;

    try {
      await navigator.clipboard.writeText(fullText);
      toast.success("Report copied", {
        icon: "📋",
        style: {
          borderRadius: "12px",
          background: "#18181b",
          color: "#fff",
          fontSize: "12px",
          fontWeight: "bold"
        }
      });
    } catch (err) {
      toast.error("Gagal menyalin teks.");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-[#18181b] flex flex-col font-sans mb-12">
      {/* HEADER COMPACT */}
      <div className="sticky top-0 z-50 bg-[#ffffff] dark:bg-[#09090b] border-b border-[#f4f4f5] dark:border-white/10 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-[#f4f4f5] dark:hover:bg-white/5 active:scale-95 transition-colors dark:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-sm tracking-tight dark:text-white">Export Report</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyText}
            className="h-7 px-3 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-white/5 text-[#18181b] dark:text-white font-bold text-[10px] tracking-tight active:scale-95 transition-transform"
          >
            <Copy className="w-3 h-3 mr-1.5 opacity-60" />
            <span>Copy</span>
          </button>
          <button
            onClick={handleDownload}
            className="h-7 px-3 rounded-full flex items-center justify-center bg-[#C6FF00] text-black font-bold text-[10px] tracking-tight shadow-sm active:scale-95 transition-transform"
          >
            <Download className="w-3 h-3 mr-1.5" />
            <span>JPG</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-12 flex justify-center bg-[#fdfdfe] relative overflow-hidden">
        {/* Ambient Premium SaaS Background Effects */}
        <div className="absolute top-[-15%] left-[-10%] w-[70%] h-[70%] bg-[#C6FF00]/10 blur-[160px] rounded-full pointer-events-none opacity-40 mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-[#18181b]/5 blur-[140px] rounded-full pointer-events-none opacity-30 mix-blend-multiply" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] contrast-150 brightness-100" />

        {/* THE CANVAS: Targeted directly for exact 9:16 portrait export */}
        <div 
          ref={captureRef}
          className="w-[380px] h-[675px] flex items-center justify-center relative overflow-hidden flex-shrink-0"
        >
          {/* Ambient Premium SaaS Background Effects - INSIDE CANVAS */}
          <div className="absolute inset-0 bg-[#fdfdfe]" />
          <div className="absolute top-[-15%] left-[-10%] w-[70%] h-[70%] bg-[#C6FF00]/10 blur-[100px] rounded-full pointer-events-none opacity-50 mix-blend-multiply" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-[#18181b]/5 blur-[100px] rounded-full pointer-events-none opacity-40 mix-blend-multiply" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] contrast-150 brightness-100" />
          
          {/* THE CARD: Premium Floating Card */}
          <div className="w-[340px] h-[610px] bg-white flex flex-col items-stretch relative rounded-[40px] border border-white shadow-[0_30px_60px_-12px_rgba(0,0,0,0.12),0_10px_20px_-5px_rgba(0,0,0,0.04)] overflow-hidden z-20">
            {/* Subtle Surface Texture & Light */}
            <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-zinc-50/20 pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-[80px] bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-10" />
            
            {/* HEADER */}
            <div className="px-6 pt-6 pb-0 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-zinc-50 rounded-[10px] flex items-center justify-center border border-zinc-100 shadow-sm">
                    <img 
                      src="/login-illustration.png" 
                      alt="Logo" 
                      className="w-4 h-4 object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className="w-0.5 h-0.5 rounded-full bg-[#C6FF00]" />
                      <span className="text-[6px] font-bold tracking-[0.3em] text-zinc-400 uppercase leading-none">OFFICIAL REPORT</span>
                    </div>
                    <span className="text-[7.5px] font-bold text-zinc-900/30 uppercase tracking-[0.05em] leading-none">VORK.SNAPSHOT</span>
                  </div>
                </div>
                <div className="px-1.5 py-0.5 bg-zinc-900 rounded-full flex items-center gap-1 shadow-sm">
                  <div className="w-0.5 h-0.5 rounded-full bg-[#C6FF00]" />
                  <span className="text-[5px] font-extrabold text-white uppercase tracking-widest leading-none">Secure</span>
                </div>
              </div>
  
              <div className="space-y-0.5">
                <h1 className="text-[16px] font-black tracking-[-0.03em] text-zinc-900 leading-[1.1]">
                  Rencana Kunjungan
                </h1>
                <div className="flex items-center gap-1.5 py-0.5">
                  <span className="text-[8.5px] font-bold tracking-tight text-zinc-400">
                    {activeDate.fullDate}
                  </span>
                  <div className="px-1.5 py-0.5 rounded-full bg-[#C6FF00] text-[7px] font-black tracking-tight text-black uppercase leading-none">
                    {activeDate.dayName} {activeDate.pasaran}
                  </div>
                </div>
              </div>
            </div>
  
            {/* MAIN CONTENT AREA */}
            <div className="flex-1 px-6 flex flex-col justify-start overflow-hidden py-2 relative z-10">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[7px] font-black text-zinc-900 uppercase tracking-widest">TIM OPERASIONAL</span>
                  <div className="h-0.5 w-3 bg-[#C6FF00] rounded-full" />
                </div>
              </div>
  
              <div className="space-y-0 relative">
                {plans.length === 0 && !loading && (
                  <div className="py-20 flex flex-col items-center gap-3 opacity-10">
                    <div className="w-8 h-8 rounded-full border-2 border-zinc-900 flex items-center justify-center">
                      <span className="text-xs font-black">?</span>
                    </div>
                    <span className="text-[8px] font-black tracking-[0.3em] uppercase text-center">EMPTY</span>
                  </div>
                )}
                
                {loading && (
                  <div className="py-16 space-y-2">
                    <div className="h-1 w-full bg-zinc-50 animate-pulse rounded-full" />
                    <div className="h-1 w-[80%] bg-zinc-50 animate-pulse rounded-full" />
                  </div>
                )}
  
                {plans.map((plan: any) => {
                  const categoryRaw = plan.marketType === 'PASARAN_JAWA' 
                    ? (plan.marketPasaran?.includes(activeDate.pasaran.toUpperCase()) 
                        ? activeDate.pasaran.toUpperCase() 
                        : plan.marketPasaran?.join(", ") || activeDate.pasaran.toUpperCase())
                    : plan.marketType?.replace("PASARAN_", "").replace("PASAR_", "").replace("_", " ");
                  
                  const category = toTitleCase(categoryRaw);
                  const userName = toTitleCase((userMap[plan.userId]?.name || plan.userName || "User").split(' ')[0]);
  
                  return (
                    <div key={plan.id} className="py-1.5 px-1 flex items-center gap-2.5 group relative transition-all duration-300">
                      <div className="absolute inset-0 bg-zinc-50/0 rounded-[10px] group-hover:bg-zinc-50/40 transition-all duration-300 -mx-1" />
                      
                      <div className="w-8 h-8 flex-shrink-0 rounded-full bg-white relative overflow-hidden p-0.5 border border-zinc-100 shadow-sm z-10 transition-transform">
                        {userMap[plan.userId]?.photoURL ? (
                          <img 
                            src={userMap[plan.userId].photoURL} 
                            alt="" 
                            className="w-full h-full rounded-full object-cover grayscale-[10%] group-hover:grayscale-0"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-zinc-100 flex items-center justify-center text-[8px] font-black text-zinc-400 uppercase">
                            {userName.charAt(0)}
                          </div>
                        )}
                      </div>
  
                      <div className="flex-1 min-w-0 relative z-10">
                        <div className="flex items-center justify-between mb-0">
                          <p className="text-[10px] font-extrabold text-zinc-900 tracking-tight truncate leading-tight">
                            {toTitleCase(plan.marketName)}
                          </p>
                          <span className="text-[7px] font-bold text-zinc-300 tabular-nums">
                            {plan.createdAt?.toDate ? dayjs(plan.createdAt.toDate()).format("HH:mm") : "00:00"}
                          </span>
                        </div>
  
                        <div className="flex items-center gap-1 leading-none">
                          <span className="text-[7.5px] font-black text-[#C6FF00] bg-zinc-900 px-1 py-0.5 rounded-[3px] tracking-tight truncate uppercase">
                            {userName}
                          </span>
                          <span className="text-[8px] font-bold text-zinc-400 tracking-tight truncate opacity-50">
                            {toTitleCase(plan.city)}
                          </span>
                          <div className="w-0.5 h-0.5 rounded-full bg-zinc-200 shrink-0" />
                          <span className="text-[7.5px] font-bold text-zinc-400/60 uppercase tracking-tighter">
                            {category === "Umum" ? "REGULER" : category}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
  
            {/* FOOTER */}
            <div className="px-6 pt-2 pb-6 mt-auto relative z-10">
              <div className="border-t border-zinc-100/50 pt-3">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 bg-zinc-900 rounded-md flex items-center justify-center">
                        <span className="text-[#C6FF00] text-[5px] font-black">V</span>
                      </div>
                      <span className="text-[8px] font-black text-zinc-900 uppercase tracking-[0.2em] leading-none">
                        VORK OS
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[6.5px] font-bold text-zinc-400 uppercase tracking-widest opacity-60">
                        OPR.SNAPSHOT . {activeDate.isoDate.replace(/-/g, '.')}
                      </span>
                    </div>
                  </div>
  
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex gap-0.5">
                      {[1,2,3].map(i => (
                        <div key={i} className={`h-1 w-1 rounded-full ${i === 1 ? 'bg-[#C6FF00]' : 'bg-zinc-200'}`} />
                      ))}
                    </div>
                    <div className="px-1.5 py-0.5 bg-zinc-50 border border-zinc-100 rounded-md flex flex-col items-end gap-0.5">
                      <span className="text-[5px] font-bold text-zinc-300 uppercase leading-none tracking-widest">SYSTEM</span>
                      <span className="text-[7px] font-black text-zinc-900 leading-none">OPTIMIZED</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

