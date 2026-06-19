import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { DEFAULT_MODULES, ModuleConfig } from '../config/modules';
import { useAuth } from './AuthProvider';
import { useRuntime } from './RuntimeProvider';
import { ROLES } from '../config/roles';
import { hasRole, canAccessModule as checkModuleAuth } from '../lib/permissions';
import { toast } from 'react-toastify';

export type AccessReason = 'disabled' | 'maintenance' | 'role' | 'branch' | 'ok';

interface ModuleContextType {
  modules: Record<string, ModuleConfig>;
  isLoaded: boolean;
  checkAccess: (moduleId: string) => { allowed: boolean; reason: AccessReason };
  updateModule: (moduleId: string, updates: Partial<ModuleConfig>) => Promise<void>;
  resetToDefault: (moduleId: string) => Promise<void>;
}

const ModuleContext = createContext<ModuleContextType>({
  modules: DEFAULT_MODULES,
  isLoaded: false,
  checkAccess: () => ({ allowed: true, reason: 'ok' }),
  updateModule: async () => {},
  resetToDefault: async () => {},
});

export const ModuleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modules, setModules] = useState<Record<string, ModuleConfig>>(DEFAULT_MODULES);
  const [isLoaded, setIsLoaded] = useState(false);
  const { profile, firebaseUser, loading } = useAuth();
  const { activeBranchContext } = useRuntime();

  // Subscribe to real-time updates from Firebase Modules collection
  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      setModules(DEFAULT_MODULES);
      setIsLoaded(true);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'modules'),
      (snapshot) => {
        const dbModules: Record<string, Partial<ModuleConfig>> = {};
        snapshot.docs.forEach((doc) => {
          dbModules[doc.id] = doc.data() as Partial<ModuleConfig>;
        });

        // Merge defaults with DB records
        const merged: Record<string, ModuleConfig> = {};
        Object.keys(DEFAULT_MODULES).forEach((key) => {
          const def = DEFAULT_MODULES[key];
          const override = dbModules[key] || {};
          
          // Legacy check for old role names in DB mapping
          if (override.allowedRoles && Array.isArray(override.allowedRoles)) {
            override.allowedRoles = override.allowedRoles.map(r => r === 'admin_cabang' ? 'staff' : r);
          }
          
          if (key === 'adminUsers') {
            if (!override.allowedRoles) {
               override.allowedRoles = def.allowedRoles ? [...def.allowedRoles] : [];
            }
            if (!override.allowedRoles.includes('staff')) {
               override.allowedRoles.push('staff');
            }
          }
          
          merged[key] = {
            ...def,
            ...override,
            id: key, // Ensure ID is preserved
          };
        });

        setModules(merged);
        setIsLoaded(true);
      },
      (error) => {
        console.error('Failed to subscribe modules governance:', error);
        // Fallback to defaults if permission errors occur
        setModules(DEFAULT_MODULES);
        setIsLoaded(true);
      }
    );

    return () => unsub();
  }, [firebaseUser, loading]);

  // Update specific module settings in Firestore
  const updateModule = async (moduleId: string, updates: Partial<ModuleConfig>) => {
    try {
      const current = modules[moduleId] || DEFAULT_MODULES[moduleId];
      const next = {
        ...current,
        ...updates,
        id: moduleId,
        updatedAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, 'modules', moduleId), next, { merge: true });
      toast.success(`Modul "${next.name}" berhasil diperbarui.`);
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Gagal memperbarui konfigurasi modul.');
      throw error;
    }
  };

  // Reset module to default parameters
  const resetToDefault = async (moduleId: string) => {
    try {
      const def = DEFAULT_MODULES[moduleId];
      if (!def) return;
      await setDoc(doc(db, 'modules', moduleId), {
        ...def,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Pengaturan "${def.name}" dikembalikan ke bawaan pabrik.`);
    } catch (error) {
      console.error('Error resetting module:', error);
      toast.error('Gagal mereset modul.');
      throw error;
    }
  };

  // Safe checks logic for role-based and branch-based access boundaries
  const checkAccess = useCallback((moduleId: string) => {
    const mod = modules[moduleId];
    // If undefined or bypass route
    if (!mod) {
      return { allowed: true, reason: 'ok' as AccessReason };
    }

    const isOwner = hasRole(profile, ROLES.OWNER) || profile?.userType === 'global';
    
    // 1. Is module generally enabled or active within the cockpit registry?
    if (!mod.enabled) {
      return { allowed: false, reason: 'disabled' as AccessReason };
    }

    // 2. Is index under scheduled maintenance?
    if (mod.maintenanceMode) {
      // Owner and generic admin can bypass maintenance for testing purposes
      if (isOwner || hasRole(profile, ROLES.MANAGER)) {
        return { allowed: true, reason: 'ok' as AccessReason };
      }
      return { allowed: false, reason: 'maintenance' as AccessReason };
    }

    // 3. User Role/Permission Authorization check
    if (mod.allowedRoles && mod.allowedRoles.length > 0 || (mod.requiredPermissions && mod.requiredPermissions.length > 0)) {
        if (!checkModuleAuth(profile, mod)) {
           return { allowed: false, reason: 'role' as AccessReason };
        }
    }

    // 4. Branch Specific Isolation check (beta features trial, rollout, etc)
    if (mod.allowedBranches && mod.allowedBranches.length > 0) {
      const userBranch = (activeBranchContext || profile?.branchId || '').toUpperCase();
      const allowed = mod.allowedBranches.map(b => b.toUpperCase());
      if (!userBranch || !allowed.includes(userBranch)) {
        return { allowed: false, reason: 'branch' as AccessReason };
      }
    }

    return { allowed: true, reason: 'ok' as AccessReason };
  }, [modules, profile, activeBranchContext]);

  const value = useMemo(
    () => ({
      modules,
      isLoaded,
      checkAccess,
      updateModule,
      resetToDefault,
    }),
    [modules, isLoaded, profile, checkAccess]
  );

  return <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>;
};

export const useModules = () => useContext(ModuleContext);
