import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  BarChart3, 
  Users, 
  Database, 
  ShieldCheck, 
  Building, 
  Sliders, 
  Compass, 
  BookOpen 
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../providers/AuthProvider";
import { hasRole, hasPermission } from "../../lib/permissions";
import { ROLES } from "../../config/roles";
import { PERMISSIONS } from "../../config/permissions";

export default function AdminHubPage() {
  const navigate = useNavigate();
  const { isOwner, profile } = useAuth();

  const menu = [
    { 
      title: "Market Insight", 
      description: "Analisis statistik cakupan pasar, tren kota, dan frekuensi kunjungan.", 
      icon: BarChart3, 
      path: "/admin/insight", 
      color: "bg-emerald-500 shadow-emerald-500/30",
      cardStyle: "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-500/60 dark:hover:border-emerald-500/50 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/50 shadow-[inset_0_1px_3px_rgba(16,185,129,0.05),0_10px_20px_rgba(16,185,129,0.02)] hover:shadow-[0_12px_24px_rgba(16,185,129,0.08)]",
      titleColor: "text-emerald-900 dark:text-emerald-200",
      descColor: "text-emerald-700/90 dark:text-emerald-400/80",
      requiresOwner: false
    },
    { 
      title: "Approval Akun", 
      description: "Sistem moderasi pendaftaran user baru, kontrol otorisasi tingkat role, dan status.", 
      icon: ShieldCheck, 
      path: "/admin/users", 
      color: "bg-teal-500 shadow-teal-500/30",
      cardStyle: "bg-teal-50/70 dark:bg-teal-950/30 border-teal-200 dark:border-teal-500/20 hover:border-teal-500/60 dark:hover:border-teal-500/50 hover:bg-teal-100/50 dark:hover:bg-teal-950/50 shadow-[inset_0_1px_3px_rgba(20,184,166,0.05),0_10px_20px_rgba(20,184,166,0.02)] hover:shadow-[0_12px_24px_rgba(20,184,166,0.08)]",
      titleColor: "text-teal-900 dark:text-teal-200",
      descColor: "text-teal-700/90 dark:text-teal-400/80",
      requiresOwner: false
    },
    { 
      title: "Master Pasar", 
      description: "Pengelolaan database target pasar, konfigurasi wilayah, kategori, dan jadwal.", 
      icon: Database, 
      path: "/admin/master", 
      color: "bg-purple-500 shadow-purple-500/30",
      cardStyle: "bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-500/20 hover:border-purple-500/60 dark:hover:border-purple-500/50 hover:bg-purple-100/50 dark:hover:bg-purple-950/50 shadow-[inset_0_1px_3px_rgba(168,85,247,0.05),0_10px_20px_rgba(168,85,247,0.02)] hover:shadow-[0_12px_24px_rgba(168,85,247,0.08)]",
      titleColor: "text-purple-900 dark:text-purple-200",
      descColor: "text-purple-700/90 dark:text-purple-400/80",
      requiresOwner: false
    },
    { 
      title: "Approval Aktivitas", 
      description: "Pusat persetujuan aktivitas operasional.", 
      icon: ShieldCheck, 
      path: "/admin/approvals", 
      color: "bg-teal-600 shadow-teal-500/30",
      cardStyle: "bg-teal-50/70 dark:bg-teal-950/30 border-teal-200 dark:border-teal-500/20 hover:border-teal-500/60 dark:hover:border-teal-500/50 hover:bg-teal-100/50 dark:hover:bg-teal-950/50 shadow-[inset_0_1px_3px_rgba(20,184,166,0.05),0_10px_20px_rgba(20,184,166,0.02)] hover:shadow-[0_12px_24px_rgba(20,184,166,0.08)]",
      titleColor: "text-teal-900 dark:text-teal-200",
      descColor: "text-teal-700/90 dark:text-teal-400/80",
      requiresOwner: false
    },
    { 
      title: "Detail & Penugasan (Owner)", 
      description: "Visualisasi detail rincian aktivitas dan set penugasan target user.", 
      icon: Users, 
      path: "/owner/user", 
      color: "bg-blue-500 shadow-blue-500/30",
      cardStyle: "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-500/20 hover:border-blue-500/60 dark:hover:border-blue-500/50 hover:bg-blue-100/50 dark:hover:bg-blue-950/50 shadow-[inset_0_1px_3px_rgba(59,130,246,0.05),0_10px_20px_rgba(59,130,246,0.02)] hover:shadow-[0_12px_24px_rgba(59,130,246,0.08)]",
      titleColor: "text-blue-900 dark:text-blue-200",
      descColor: "text-blue-700/90 dark:text-blue-400/80",
      requiresOwner: true
    },
    { 
      title: "Manajemen Cabang (Owner)", 
      description: "Konfigurasi organisasi, data otoritas area operasional, dan manajemen cabang.", 
      icon: Building, 
      path: "/owner/branches", 
      color: "bg-amber-500 shadow-amber-500/30",
      cardStyle: "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-500/20 hover:border-amber-500/60 dark:hover:border-amber-500/50 hover:bg-amber-100/50 dark:hover:bg-amber-950/50 shadow-[inset_0_1px_3px_rgba(245,158,11,0.05),0_10px_20px_rgba(245,158,11,0.02)] hover:shadow-[0_12px_24px_rgba(245,158,11,0.08)]",
      titleColor: "text-amber-900 dark:text-amber-200",
      descColor: "text-amber-700/90 dark:text-amber-400/80",
      requiresOwner: true
    },
    { 
      title: "Tata Kelola Modul (Owner)", 
      description: "Pengaturan komprehensif izin akses modul fungsional, fitur beta, dan mode maintenance.", 
      icon: Sliders, 
      path: "/owner/modules", 
      color: "bg-rose-500 shadow-rose-500/30",
      cardStyle: "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/20 hover:border-rose-500/60 dark:hover:border-rose-500/50 hover:bg-rose-100/50 dark:hover:bg-rose-950/50 shadow-[inset_0_1px_3px_rgba(244,63,94,0.05),0_10px_20px_rgba(244,63,94,0.02)] hover:shadow-[0_12px_24px_rgba(244,63,94,0.08)]",
      titleColor: "text-rose-900 dark:text-rose-200",
      descColor: "text-rose-700/90 dark:text-rose-400/80",
      requiresOwner: true
    },
    { 
      title: "Tata Kelola Navigasi (Owner)", 
      description: "Kustomisasi menu bilah navigasi utama, pengaturan layout, dan sorting links.", 
      icon: Compass, 
      path: "/owner/navigation", 
      color: "bg-cyan-500 shadow-cyan-500/30",
      cardStyle: "bg-cyan-50/70 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-500/20 hover:border-cyan-500/60 dark:hover:border-cyan-500/50 hover:bg-cyan-100/50 dark:hover:bg-cyan-950/50 shadow-[inset_0_1px_3px_rgba(6,182,212,0.05),0_10px_20px_rgba(6,182,212,0.02)] hover:shadow-[0_12px_24px_rgba(6,182,212,0.08)]",
      titleColor: "text-cyan-900 dark:text-cyan-200",
      descColor: "text-cyan-700/90 dark:text-cyan-400/80",
      requiresOwner: true
    },
    { 
      title: "Arsitektur & Standar (Owner)", 
      description: "Spesifikasi teknik arsitektur rekayasa sistem, direktori standar dokumen, dan referensi.", 
      icon: BookOpen, 
      path: "/owner/docs", 
      color: "bg-indigo-500 shadow-indigo-500/30",
      cardStyle: "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-500/20 hover:border-indigo-500/60 dark:hover:border-indigo-500/50 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/50 shadow-[inset_0_1px_3px_rgba(99,102,241,0.05),0_10px_20px_rgba(99,102,241,0.02)] hover:shadow-[0_12px_24px_rgba(99,102,241,0.08)]",
      titleColor: "text-indigo-900 dark:text-indigo-200",
      descColor: "text-indigo-700/90 dark:text-indigo-400/80",
      requiresOwner: true
    },
    { 
      title: "Migrasi Database (Owner)", 
      description: "Mutasi master data pasar legacy menuju namespace per cabang. Update Roles.", 
      icon: Database, 
      path: "/owner/migration", 
      color: "bg-purple-600 shadow-purple-600/30",
      cardStyle: "bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-500/20 hover:border-purple-500/60 dark:hover:border-purple-500/50 hover:bg-purple-100/50 dark:hover:bg-purple-950/50 shadow-[inset_0_1px_3px_rgba(168,85,247,0.05),0_10px_20px_rgba(168,85,247,0.02)] hover:shadow-[0_12px_24px_rgba(168,85,247,0.08)]",
      titleColor: "text-purple-900 dark:text-purple-200",
      descColor: "text-purple-700/90 dark:text-purple-400/80",
      requiresOwner: true
    }
  ];

  const filteredMenu = menu.filter(item => {
    if (isOwner) return true;
    if (item.requiresOwner) return false;
    if (hasRole(profile, ROLES.MANAGER)) return true;
    
    // Check specific permissions for specific paths if user is STAFF
    if (item.path === "/admin/insight" && hasPermission(profile, PERMISSIONS.VIEW_INSIGHT)) return true;
    if (item.path === "/admin/users" && hasPermission(profile, PERMISSIONS.USER_MANAGEMENT)) return true;
    if (item.path === "/admin/master" && hasPermission(profile, PERMISSIONS.MARKET_EDIT)) return true;
    if (item.path === "/admin/approvals" && hasPermission(profile, PERMISSIONS.USER_APPROVAL)) return true;
    
    return false;
  });

  return (
    <div className="max-w-5xl mx-auto py-4">
      {/* Welcome Title */}
      <div className="mb-10 text-center md:text-left">
        <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white uppercase leading-none">
          Portal Administrasi {isOwner ? "Owner" : "Manager"}
        </h2>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-2 tracking-wide uppercase">
          Kelola fitur platform, operasi cabang, persetujuan, dan insight pasar.
        </p>
      </div>

      {/* Grid Menu Bento style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {filteredMenu.map((item, idx) => (
          <button
            key={idx}
            onClick={() => navigate(item.path)}
            className={cn(
              "p-5 text-left border rounded-2xl transition-all duration-300 group flex gap-4 active:scale-[0.99] shadow-sm hover:shadow-md",
              item.cardStyle
            )}
            id={`admin-hub-item-${item.path}`}
          >
            {/* Left Icon Panel */}
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center font-black flex-shrink-0 text-white transition-all group-hover:scale-105 group-hover:rotate-1 duration-200 shadow-md",
              item.color
            )}>
              <item.icon className="w-5 h-5" />
            </div>

            {/* Right Information Text */}
            <div className="space-y-1 overflow-hidden">
              <h3 className={cn(
                "text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 leading-none",
                item.titleColor
              )}>
                {item.title}
              </h3>
              <p className={cn(
                "text-[11px] leading-relaxed font-semibold transition-colors",
                item.descColor
              )}>
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
