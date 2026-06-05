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
      description: "Analisis statistik cakupan pasar dan tren kunjungan.", 
      icon: BarChart3, 
      path: "/admin/insight",
      requiresOwner: false
    },
    { 
      title: "Automation Center", 
      description: "Pusat tata kelola automasi, webhook, dan pengingat harian.", 
      icon: Sliders, 
      path: "/admin/automation", 
      requiresOwner: false
    },
    { 
      title: "Approval Akun", 
      description: "Moderasi pendaftaran dan otorisasi role pengguna.", 
      icon: ShieldCheck, 
      path: "/admin/users", 
      requiresOwner: false
    },
    { 
      title: "Master Pasar", 
      description: "Pengelolaan database wilayah, kategori, dan jadwal.", 
      icon: Database, 
      path: "/admin/master", 
      requiresOwner: false
    },
    { 
      title: "Approval Aktivitas", 
      description: "Pusat persetujuan aktivitas operasional.", 
      icon: ShieldCheck, 
      path: "/admin/approvals", 
      requiresOwner: false
    },
    { 
      title: "Detail & Penugasan", 
      description: "Visualisasi aktivitas dan penugasan target user.", 
      icon: Users, 
      path: "/owner/user", 
      requiresOwner: true
    },
    { 
      title: "Manajemen Cabang", 
      description: "Konfigurasi organisasi dan data otoritas area.", 
      icon: Building, 
      path: "/owner/branches", 
      requiresOwner: true
    },
    { 
      title: "Tata Kelola Modul", 
      description: "Izin akses fitur, beta, dan mode maintenance.", 
      icon: Sliders, 
      path: "/owner/modules", 
      requiresOwner: true
    },
    { 
      title: "Tata Kelola Navigasi", 
      description: "Kustomisasi menu dan struktur navigasi.", 
      icon: Compass, 
      path: "/owner/navigation", 
      requiresOwner: true
    },
    { 
      title: "Arsitektur Sistim", 
      description: "Spesifikasi teknik, direktori, dan dokumentasi.", 
      icon: BookOpen, 
      path: "/owner/docs", 
      requiresOwner: true
    },
    { 
      title: "Migrasi Database", 
      description: "Mutasi master data pasar legacy.", 
      icon: Database, 
      path: "/owner/migration", 
      requiresOwner: true
    }
  ];

  const filteredMenu = menu.filter(item => {
    if (isOwner) return true;
    if (item.requiresOwner) return false;
    if (hasRole(profile, ROLES.MANAGER)) return true;
    
    if (item.path === "/admin/insight" && hasPermission(profile, PERMISSIONS.VIEW_INSIGHT)) return true;
    if (item.path === "/admin/users" && hasPermission(profile, PERMISSIONS.USER_MANAGEMENT)) return true;
    if (item.path === "/admin/master" && hasPermission(profile, PERMISSIONS.MARKET_EDIT)) return true;
    if (item.path === "/admin/approvals" && hasPermission(profile, PERMISSIONS.USER_APPROVAL)) return true;
    
    return false;
  });

  return (
    <div className="max-w-6xl mx-auto py-2 sm:py-8 px-0 sm:px-4">
      {/* Welcome Title */}
      <div className="mb-6 md:mb-10 px-4 sm:px-0">
        <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground uppercase">
          Portal {isOwner ? "Owner" : "Admin"}
        </h2>
        <p className="text-[10px] md:text-[11px] font-black text-muted-foreground mt-2 tracking-widest uppercase">
          KENDALI OPERASIONAL & PENGAWASAN SISTEM TERPUSAT
        </p>
      </div>

      {/* Grid Menu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 px-4 sm:px-0 pb-20">
        {filteredMenu.map((item, idx) => (
          <button
            key={idx}
            onClick={() => navigate(item.path)}
            className="flex flex-col gap-4 p-5 md:p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-sm hover:border-border/60 hover:bg-card/60 transition-all active:scale-[0.97] shadow-sm group"
          >
            <div className="p-2.5 rounded-2xl bg-primary/10 w-fit group-hover:scale-110 transition-transform duration-300">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            
            <div className="space-y-1 text-left">
              <h3 className="text-[11px] md:text-xs font-black uppercase tracking-widest text-foreground">
                {item.title}
              </h3>
              <p className="text-[10px] md:text-[11px] leading-relaxed text-muted-foreground font-medium">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
