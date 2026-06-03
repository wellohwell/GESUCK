import { ROLES, Role } from "./roles";

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  visibleInNav: boolean;
  visibleInBottomNav?: boolean;
  visibleInSidebar?: boolean;
  visibleInWorkspace?: boolean;
  defaultWorkspaceEligible?: boolean;
  allowedRoles: string[];
  requiredPermissions?: string[];
  allowedBranches: string[];
  betaMode: boolean;
  maintenanceMode: boolean;
}

export const DEFAULT_MODULES: Record<string, ModuleConfig> = {
  home: {
    id: "home",
    name: "Home",
    description: "Dashboard utama dan ringkasan operasional harian.",
    enabled: true,
    visibleInNav: true,
    visibleInBottomNav: true,
    visibleInSidebar: true,
    visibleInWorkspace: true,
    defaultWorkspaceEligible: true,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.SALES, ROLES.SURVEY, ROLES.GUDANG, ROLES.SPV],
    allowedBranches: [],
    betaMode: false,
    maintenanceMode: false,
  },
  client: {
    id: "client",
    name: "Client",
    description: "Kelola data konsumen rujukan, survei, dan riwayat transaksi.",
    enabled: true,
    visibleInNav: true,
    visibleInBottomNav: true,
    visibleInSidebar: true,
    visibleInWorkspace: true,
    defaultWorkspaceEligible: true,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.SALES, ROLES.SURVEY, ROLES.SPV],
    allowedBranches: [],
    betaMode: false,
    maintenanceMode: false,
  },
  explore: {
    id: "explore",
    name: "Explore",
    description: "Cari cabang, sirkulasi wilayah, dan lokasi sirkuit kantor.",
    enabled: true,
    visibleInNav: true,
    visibleInBottomNav: true,
    visibleInSidebar: true,
    visibleInWorkspace: true,
    defaultWorkspaceEligible: true,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.SALES, ROLES.SURVEY, ROLES.GUDANG, ROLES.SPV],
    allowedBranches: [],
    betaMode: false,
    maintenanceMode: false,
  },
  marketPlans: {
    id: "marketPlans",
    name: "Market Plans",
    description: "Rencana sirkulasi pasar harian dan penugasan tim penjualan.",
    enabled: true,
    visibleInNav: true,
    visibleInBottomNav: false,
    visibleInSidebar: true,
    visibleInWorkspace: true,
    defaultWorkspaceEligible: true,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.SALES, ROLES.SPV],
    allowedBranches: [],
    betaMode: false,
    maintenanceMode: false,
  },
  report: {
    id: "report",
    name: "Reports",
    description: "Rekapitulasi progres aktivitas kerja dan data konversi sales.",
    enabled: true,
    visibleInNav: true,
    visibleInBottomNav: false,
    visibleInSidebar: true,
    visibleInWorkspace: true,
    defaultWorkspaceEligible: false,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.SPV],
    allowedBranches: [],
    betaMode: false,
    maintenanceMode: false,
  },
  tools: {
    id: "tools",
    name: "Tools",
    description: "Simulasi kredit angsuran dan instrumen diagnostik lapangan.",
    enabled: true,
    visibleInNav: true,
    visibleInBottomNav: true,
    visibleInSidebar: true,
    visibleInWorkspace: true,
    defaultWorkspaceEligible: true,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.SALES, ROLES.SURVEY, ROLES.GUDANG, ROLES.SPV],
    allowedBranches: [],
    betaMode: false,
    maintenanceMode: false,
  },
  timeline: {
    id: "timeline",
    name: "Timeline",
    description: "Umpan audit arus aktivitas seluruh aktivitas operasional.",
    enabled: true,
    visibleInNav: false, // Accessible through specific links, not cluttering main bottom navbar
    visibleInBottomNav: false,
    visibleInSidebar: true,
    visibleInWorkspace: true,
    defaultWorkspaceEligible: false,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.SPV, ROLES.SALES],
    allowedBranches: [],
    betaMode: false,
    maintenanceMode: false,
  },
  adminUsers: {
    id: "adminUsers",
    name: "Admin Users",
    description: "Pusat persetujuan user baru dan konfigurasi peran otorisasi.",
    enabled: true,
    visibleInNav: true,
    visibleInBottomNav: false,
    visibleInSidebar: true,
    visibleInWorkspace: true,
    defaultWorkspaceEligible: false,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER],
    requiredPermissions: ["USER_MANAGEMENT", "USER_APPROVAL"],
    allowedBranches: [],
    betaMode: false,
    maintenanceMode: false,
  },
  operations: {
    id: "operations",
    name: "Operations",
    description: "Antrean antarmuka kerja harian terintegrasi untuk Surveyor dan Gudang.",
    enabled: true,
    visibleInNav: true,
    visibleInBottomNav: true,
    visibleInSidebar: true,
    visibleInWorkspace: true,
    defaultWorkspaceEligible: true,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.SURVEY, ROLES.GUDANG, ROLES.SPV],
    allowedBranches: [],
    betaMode: false,
    maintenanceMode: false,
  }
};
