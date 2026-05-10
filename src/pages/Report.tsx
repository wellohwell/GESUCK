import React, { useState, useEffect, useRef } from "react";
import { subscribeMarketPlans, subscribeUsers } from "../lib/services";
import { getActiveSystemDate } from "../utils/javaneseDate";
import html2canvas from "html2canvas";
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
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const image = canvas.toDataURL("image/jpeg", 0.9);
      const link = document.createElement("a");
      link.href = image;
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
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      canvas.toBlob(async (blob) => {
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
      }, "image/jpeg", 0.9);
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
        {/* CAPTURE CONTAINER */}
        <div 
          ref={captureRef}
          className="w-full max-w-[420px] bg-[#ffffff] rounded-none md:rounded-3xl p-4 md:p-5 mx-auto"
        >
          {/* TOP INFO BAR */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col mb-2">
              <h1 className="text-[15px] font-black tracking-tight leading-tight text-[#18181b] uppercase mb-1">
                Rencana Kunjungan Pasar
              </h1>
              <p className="text-[11px] font-bold text-[#a1a1aa] uppercase tracking-widest flex items-center gap-1">
                <span className="text-[#18181b]">{activeDate.dayName},</span>
                <span className="text-[#9FCC00]">{activeDate.pasaran}</span>
                <span className="ml-0.5">{activeDate.fullDate}</span>
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-1.5">
               <div className="px-2 py-1 bg-[#f4f4f5] rounded-md flex items-center gap-1.5 border border-[#f4f4f5]">
                 <span className="text-[8px] font-bold text-[#71717a] uppercase tracking-widest">Sales</span>
                 <span className="text-[10px] font-black text-[#18181b] leading-none">{activeSalesCount}</span>
               </div>
               <div className="px-2 py-1 bg-[#f4f4f5] rounded-md flex items-center gap-1.5 border border-[#f4f4f5]">
                 <span className="text-[8px] font-bold text-[#71717a] uppercase tracking-widest">Titik</span>
                 <span className="text-[10px] font-black text-[#18181b] leading-none">{targetMarketsCount}</span>
               </div>
               <div className="px-2 py-1 bg-[#f4f4f5] rounded-md flex items-center gap-1.5 border border-[#f4f4f5]">
                 <span className="text-[8px] font-bold text-[#71717a] uppercase tracking-widest">Kota</span>
                 <span className="text-[10px] font-black text-[#18181b] leading-none">{uniqueCitiesCount}</span>
               </div>
               <div className="px-2 py-1 bg-[#C6FF001A] border border-[#C6FF0033] rounded-md flex items-center gap-1.5">
                 <span className="text-[8px] font-bold text-[#8CAB00] uppercase tracking-widest">Pending</span>
                 <span className="text-[10px] font-black text-[#18181b] leading-none">{missingUsersCount}</span>
               </div>
            </div>
          </div>

          <div className="h-px w-full bg-[#f4f4f5] mb-4" />

          {/* LIST REPORT */}
          <div className="space-y-2.5">
            {plans.length === 0 && !loading && (
              <div className="text-center py-6 text-[#a1a1aa] text-[11px] font-bold uppercase tracking-widest">
                Belum ada data
              </div>
            )}
            
            {loading && (
              <div className="text-center py-6 text-[#a1a1aa] text-[11px] font-bold uppercase tracking-widest">
                Memuat...
              </div>
            )}

            {plans.map((plan: any) => (
              <div 
                key={plan.id}
                className="bg-[#ffffff] border border-[#e4e4e7] rounded-[14px] p-3 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] relative"
              >
                <div className="flex justify-between items-start mb-2">
                   <h4 className="font-black text-[12px] text-[#18181b] tracking-tight leading-none max-w-[70%] truncate">
                     {toTitleCase(plan.marketName)} - {plan.marketType === 'PASARAN_JAWA' 
                       ? (plan.marketPasaran?.includes(activeDate.pasaran.toUpperCase()) 
                           ? activeDate.pasaran.toUpperCase() 
                           : plan.marketPasaran?.join(", ") || activeDate.pasaran.toUpperCase())
                       : plan.marketType?.replace("PASARAN_", "").replace("PASAR_", "").replace("_", " ")}
                   </h4>
                   <span className="text-[8px] font-bold text-[#a1a1aa] tracking-widest truncate max-w-[25%] text-right bg-[#f4f4f5] px-1.5 py-0.5 rounded-sm">
                     {toTitleCase(plan.city)}
                   </span>
                </div>
                
                <div className="flex items-center gap-1.5 mb-2.5">
                  {plan.marketJam && (
                    <span className="text-[9px] font-mono font-medium text-[#71717a] tracking-tight">
                      {plan.marketJam}
                    </span>
                  )}
                </div>

                <div className="h-px w-full bg-[#f4f4f5] mb-2.5" />

                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] tracking-widest text-[#18181b]">
                    {toTitleCase(plan.userName?.split(' ')[0] || "User")}
                  </span>
                  <div className="flex items-center gap-1 text-[#a1a1aa]">
                    <span className="text-[9px] font-bold tracking-widest uppercase">
                      {plan.createdAt?.toDate ? dayjs(plan.createdAt.toDate()).format("HH:mm") : "-"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* FOOTER */}
          <div className="mt-5 pt-4 border-t border-[#f4f4f5] flex items-center justify-between">
            <p className="text-[8px] font-bold text-[#a1a1aa] tracking-widest uppercase">
              VIA GESUCK APP
            </p>
            <div className="flex items-center gap-1 text-[#059669]">
              <CheckCircle className="w-2.5 h-2.5 text-[#059669]" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-[#059669]">
                VERIFIED
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

