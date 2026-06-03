import { ROLES } from './roles';
import { 
  Home, 
  Users, 
  Compass, 
  LayoutGrid, 
  UserCircle, 
  ShieldAlert, 
  Calendar, 
  FileText, 
  Clock,
  Package,
  Activity,
  Sliders
} from 'lucide-react';
import React from 'react';

// Centralised default workspaces registry for each user role
export const DEFAULT_WORKSPACES: Record<string, string> = {
  owner: "/owner",
  manager: "/admin",
  staff: "/workspace/operations",
  sales: "/workspace/explore",
  survey: "/workspace/operations",
  gudang: "/workspace/operations",
  spv: "/workspace/explore"
};

// Ultimate fallback route if a user has no eligible workspaces or experiences any dead-end
export const FALLBACK_WORKSPACE = "/workspace/profile";

// Fully serializable configuration for dynamic navigation management
export interface DynamicNavItem {
  id: string;
  label: string;
  icon: string; // represented as string so it can be stored in Firestore, e.g. "home"
  route: string;
  visible: boolean;
  enabled: boolean;
  order: number;
  allowedRoles: string[]; // empty array means all roles can view
  requiredPermissions?: string[];
  allowedBranches: string[]; // empty array means all branches can view
  mobileOnly: boolean;
  desktopOnly: boolean;
  badge: 'none' | 'beta' | 'new' | 'maintenance';
  moduleId?: string; // dynamically linked to a specific core modules for automatic enablement checking
  hiddenFromOwner?: boolean;
}

// Icon dictionary translating serializable name tags to real components
export const ICON_DICTIONARY: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  users: Users,
  compass: Compass,
  calendar: Calendar,
  filetext: FileText,
  shieldalert: ShieldAlert,
  layoutgrid: LayoutGrid,
  usercircle: UserCircle,
  clock: Clock,
  package: Package,
  activity: Activity,
  sliders: Sliders
};

// Safe helper to obtain Lucide components
export function getIconComponent(name: string): React.ComponentType<{ className?: string }> {
  return ICON_DICTIONARY[name.toLowerCase()] || Package;
}

// Global baseline default navigation records to populate db and serve as local fallback
export const DEFAULT_DYNAMIC_NAV_ITEMS: DynamicNavItem[] = [
  {
    id: 'ownerSystem',
    label: 'System',
    icon: 'sliders',
    route: '/owner',
    visible: true,
    enabled: true,
    order: 0,
    allowedRoles: [ROLES.OWNER],
    allowedBranches: [],
    mobileOnly: false,
    desktopOnly: false,
    badge: 'none',
    moduleId: 'ownerSystem'
  },
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    route: '/workspace/home',
    visible: true,
    enabled: true,
    order: 1,
    allowedRoles: [],
    allowedBranches: [],
    mobileOnly: false,
    desktopOnly: false,
    badge: 'none',
    moduleId: 'home'
  },
  {
    id: 'client',
    label: 'Client',
    icon: 'users',
    route: '/workspace/client',
    visible: true,
    enabled: true,
    order: 2,
    allowedRoles: [],
    allowedBranches: [],
    mobileOnly: false,
    desktopOnly: false,
    badge: 'none',
    moduleId: 'client'
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: 'activity',
    route: '/workspace/operations',
    visible: true,
    enabled: true,
    order: 2.5,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.SURVEY, ROLES.GUDANG, ROLES.SPV],
    allowedBranches: [],
    mobileOnly: false,
    desktopOnly: false,
    badge: 'none',
    moduleId: 'operations'
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: 'compass',
    route: '/workspace/explore',
    visible: true,
    enabled: true,
    order: 3,
    allowedRoles: [],
    allowedBranches: [],
    mobileOnly: false,
    desktopOnly: false,
    badge: 'none',
    moduleId: 'explore'
  },
  {
    id: 'marketPlans',
    label: 'Plans',
    icon: 'calendar',
    route: '/workspace/market-plans',
    visible: true,
    enabled: true,
    order: 4,
    allowedRoles: [],
    allowedBranches: [],
    mobileOnly: false,
    desktopOnly: false,
    badge: 'none',
    moduleId: 'marketPlans'
  },
  {
    id: 'report',
    label: 'Report',
    icon: 'filetext',
    route: '/workspace/report',
    visible: true,
    enabled: true,
    order: 5,
    allowedRoles: [],
    allowedBranches: [],
    mobileOnly: false,
    desktopOnly: false,
    badge: 'none',
    moduleId: 'report'
  },

  {
    id: 'adminUsers',
    label: 'Manager',
    icon: 'shieldalert',
    route: '/admin',
    visible: true,
    enabled: true,
    order: 7,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER],
    requiredPermissions: ["USER_MANAGEMENT", "USER_APPROVAL", "MARKET_EDIT"],
    allowedBranches: [],
    mobileOnly: false,
    desktopOnly: false,
    badge: 'none',
    moduleId: 'adminUsers'
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: 'layoutgrid',
    route: '/workspace/tools',
    visible: true,
    enabled: true,
    order: 8,
    allowedRoles: [],
    allowedBranches: [],
    mobileOnly: false,
    desktopOnly: false,
    badge: 'none',
    moduleId: 'tools'
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: 'usercircle',
    route: '/workspace/profile',
    visible: true,
    enabled: true,
    order: 9,
    allowedRoles: [],
    allowedBranches: [],
    mobileOnly: false,
    desktopOnly: false,
    badge: 'none'
  }
];
