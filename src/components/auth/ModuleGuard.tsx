import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useModules, AccessReason } from '../../providers/ModuleProvider';
import { useAuth } from '../../providers/AuthProvider';
import { AuthProfileSkeleton } from './guards';
import { 
  Lock, 
  Wrench, 
  AlertOctagon, 
  Sparkles,
  GitPullRequest,
  Home,
  CheckCircle,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';

interface ModuleGuardProps {
  moduleId: string;
  children?: React.ReactNode;
}

export const ModuleGuard: React.FC<ModuleGuardProps> = ({ moduleId, children }) => {
  const { checkAccess, modules, isLoaded } = useModules();
  const { profile } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return <AuthProfileSkeleton />;
  }

  const { allowed, reason } = checkAccess(moduleId);
  const moduleConfig = modules[moduleId];

  if (allowed) {
    return <>{children}</>;
  }

  // Render a polished fallback screen representing status blockage
  const getBannerContent = (res: AccessReason) => {
    switch (res) {
      case 'disabled':
        return {
          icon: AlertOctagon,
          iconColor: 'text-zinc-400 dark:text-zinc-600 bg-zinc-100 bg-card',
          title: 'Modul Dinonaktifkan',
          badge: 'Deactivated',
          badgeColor: 'bg-zinc-100 bg-card text-zinc-500',
          description: `Modul "${moduleConfig?.name || moduleId}" saat ini sedang ditutup atau dikunci secara global oleh Administrator Pusat demi kestabilan dan penyelarasan alur kerja harian.`
        };
      case 'maintenance':
        return {
          icon: Wrench,
          iconColor: 'text-amber-500 bg-amber-500/10',
          title: 'Optimalisasi & Perbaikan',
          badge: 'Maintenance',
          badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
          description: `Halaman "${moduleConfig?.name || moduleId}" sedang berada di bawah masa pemeliharaan rutin. Kami memoles sirkulasi data demi memangkas hambatan operasional aplikasi.`
        };
      case 'role':
        return {
          icon: Lock,
          iconColor: 'text-red-500 bg-red-500/10',
          title: 'Peran Tidak Memiliki Izin',
          badge: 'Restricted access',
          badgeColor: 'bg-red-500/14 text-red-500 border border-red-500/20',
          description: `Anda login sebagai peran "${profile?.role?.toUpperCase() || 'Anonymous'}". Hak akses terbatas hanya diperuntukkan untuk klasifikasi fungsional peran yang diizinkan saja.`
        };
      case 'branch':
        return {
          icon: Sparkles,
          iconColor: 'text-brand-primary bg-brand-primary/10',
          title: 'Beta Rollout Cabang',
          badge: 'Limited Beta',
          badgeColor: 'bg-brand-primary/14 text-brand-primary border border-brand-primary/20',
          description: `Modul "${moduleConfig?.name || moduleId}" sedang berada pada pengujian performa fungsional berpemilik (Branch Trial Stage). Cabang Anda tidak terdaftar sebagai partisipan.`
        };
      default:
        return {
          icon: HelpCircle,
          iconColor: 'text-zinc-400 bg-zinc-100 bg-card',
          title: 'Akses Terhambat',
          badge: 'Restricted',
          badgeColor: 'bg-zinc-100 text-zinc-500',
          description: 'Halaman yang Anda tuju membutuhkan peningkatan otoritas fungsional khusus.'
        };
    }
  };

  const info = getBannerContent(reason);
  const IconComponent = info.icon;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="max-w-md w-full bg-card border border-border/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center ${info.iconColor}`}>
            <IconComponent className="w-7 h-7" />
          </div>
          
          <div className="space-y-2">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${info.badgeColor}`}>
              {info.badge}
            </span>
            <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white pt-1">
              {info.title}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm">
              {info.description}
            </p>
          </div>
        </div>

        {/* Diagnostic Metadata Footer */}
        <div className="bg-zinc-50 dark:bg-zinc-950 rounded-[1.5rem] p-4 text-[10px] space-y-1.5 border border-border/50/50 dark:border-zinc-850">
          <div className="flex justify-between text-zinc-400 dark:text-zinc-500 font-bold uppercase">
            <span>PARAMETER OPERASIONAL</span>
            <span>DIAGNOSTIK</span>
          </div>
          <div className="h-[1px] bg-zinc-200 dark:bg-zinc-850 my-1" />
          <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
            <span>Peran Akun:</span>
            <span className="font-extrabold text-zinc-700 dark:text-zinc-200 font-mono text-[9px]">{profile?.role || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
            <span>ID Cabang:</span>
            <span className="font-extrabold text-zinc-700 dark:text-zinc-200 font-mono text-[9px]">{profile?.branchId || 'KONSENTER GLOBAL'}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
            <span>Modul Target:</span>
            <span className="font-mono text-[9px] text-zinc-600 dark:text-zinc-350">{moduleId}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-[1.25rem] text-xs font-black uppercase tracking-widest transition-all shadow-md hover:shadow-lg active:scale-97"
          >
            <Home className="w-3.5 h-3.5" />
            Kembali Ke Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
