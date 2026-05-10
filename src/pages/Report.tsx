import React, { useState, useEffect, useRef } from "react";
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
  
  useEffect(() => {
    let active = true;
    
    const unsubPlans = subscribeMarketPlans(activeDate.isoDate, (data) => {
      if(active) {
        setPlans(data);
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
      const userName = toTitleCase((plan.userName || "User").split(' ')[0]);
      const marketName = toTitleCase(plan.marketName);
      
      const categoryRaw = plan.marketType === 'PASARAN_JAWA' 
        ? (plan.marketPasaran?.includes(activeDate.pasaran.toUpperCase()) 
            ? activeDate.pasaran.toUpperCase() 
            : plan.marketPasaran?.join(", ") || activeDate.pasaran.toUpperCase())
        : plan.marketType?.replace("PASARAN_", "").replace("PASAR_", "").replace("_", " ");
      
      const category = toTitleCase(categoryRaw);
        
      return `• ${userName} - ${marketName} ${category}`;
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

      <div className="flex-1 overflow-auto p-4 flex justify-center">
        {/* CAPTURE CONTAINER: Movement Report Card Style */}
        <div 
          ref={captureRef}
          className="w-full max-w-[420px] bg-white rounded-none flex flex-col mx-auto relative overflow-hidden"
          style={{ minHeight: '600px' }}
        >
          {/* TOP ACCENT LINE */}
          <div className="h-1 w-full bg-[#C6FF00]" />

          {/* HEADER COMPACT */}
          <div className="px-6 pt-8 pb-6">
            <div className="mb-6">
              <img 
                src="/login-illustration.png" 
                alt="Logo" 
                className="h-10 object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex flex-col">
              <h1 className="text-[20px] font-black tracking-tighter leading-none text-black mb-1.5">
                {toTitleCase("Rencana Kunjungan Pasar")}
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold text-black/40 leading-none">
                  {toTitleCase(`${activeDate.dayName} ${activeDate.pasaran}`)}
                </span>
                <div className="w-1 h-1 rounded-full bg-black/10" />
                <span className="text-[12px] font-bold text-black/40 uppercase tracking-widest leading-none">
                  {activeDate.fullDate}
                </span>
              </div>
            </div>
          </div>

          {/* LIST LOG STYLE */}
          <div className="flex-1 px-6 pb-12">
            <div className="h-px w-full bg-black/5 mb-6" />
            
            <div className="space-y-4">
              {plans.length === 0 && !loading && (
                <div className="py-8 text-black/20 text-[11px] font-bold uppercase tracking-widest text-center">
                  -- No active movement records --
                </div>
              )}
              
              {loading && (
                <div className="py-8 text-black/20 text-[11px] font-bold uppercase tracking-widest text-center animate-pulse">
                  Syncing logs...
                </div>
              )}

              {plans.map((plan: any) => {
                const categoryRaw = plan.marketType === 'PASARAN_JAWA' 
                  ? (plan.marketPasaran?.includes(activeDate.pasaran.toUpperCase()) 
                      ? activeDate.pasaran.toUpperCase() 
                      : plan.marketPasaran?.join(", ") || activeDate.pasaran.toUpperCase())
                  : plan.marketType?.replace("PASARAN_", "").replace("PASAR_", "").replace("_", " ");
                
                return (
                  <div key={plan.id} className="flex items-baseline justify-between group">
                    <div className="flex flex-col min-w-0 pr-4">
                      <span className="text-[13px] font-black text-black leading-tight tracking-tight uppercase truncate">
                        {toTitleCase(plan.userName?.split(' ')[0] || "User")}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-bold text-black/40 tracking-tight truncate">
                          {toTitleCase(plan.marketName)}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#C6FF00]/10 text-[#8CAB00] rounded-[4px] uppercase tracking-tighter">
                          {toTitleCase(categoryRaw)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FOOTER BRANDING */}
          <div className="px-6 py-8 flex flex-col items-center gap-2">
            <div className="h-px w-12 bg-black/5" />
            <p className="text-[10px] font-bold text-black/10 tracking-[0.2em] uppercase">
              Rencana Kunjungan Pasar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

