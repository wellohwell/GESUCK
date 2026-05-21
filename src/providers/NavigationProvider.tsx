import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, writeBatch, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthProvider';
import { useModules } from './ModuleProvider';
import { DEFAULT_DYNAMIC_NAV_ITEMS, DynamicNavItem } from '../config/appShell';
import { toast } from 'react-toastify';

interface NavigationContextType {
  navItems: DynamicNavItem[];
  isLoaded: boolean;
  updateNavItem: (navId: string, updates: Partial<DynamicNavItem>) => Promise<void>;
  resetToDefault: () => Promise<void>;
  isEligible: (item: DynamicNavItem) => boolean;
}

const NavigationContext = createContext<NavigationContextType>({
  navItems: DEFAULT_DYNAMIC_NAV_ITEMS,
  isLoaded: false,
  updateNavItem: async () => {},
  resetToDefault: async () => {},
  isEligible: () => true
});

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [navItems, setNavItems] = useState<DynamicNavItem[]>(DEFAULT_DYNAMIC_NAV_ITEMS);
  const [isLoaded, setIsLoaded] = useState(false);
  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const { checkAccess, modules } = useModules();

  // 1. Subscribe to Firebase Navigation configs
  useEffect(() => {
    if (authLoading) return;

    if (!firebaseUser) {
      // Local sorting
      const sorted = [...DEFAULT_DYNAMIC_NAV_ITEMS].sort((a, b) => a.order - b.order);
      setNavItems(sorted);
      setIsLoaded(true);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'navigation'),
      async (snapshot) => {
        // If entirely empty (initial startup or cleared), auto-seed from DEFAULT_DYNAMIC_NAV_ITEMS
        if (snapshot.empty) {
          console.log('[NavigationProvider] Navigation collection in Firestore is empty. Initializing auto-seed...');
          try {
            const batch = writeBatch(db);
            DEFAULT_DYNAMIC_NAV_ITEMS.forEach((item) => {
              const docRef = doc(db, 'navigation', item.id);
              batch.set(docRef, {
                ...item,
                createdAt: new Date().toISOString()
              });
            });
            await batch.commit();
            console.log('[NavigationProvider] Auto-seed complete!');
          } catch (seedError) {
            console.error('[NavigationProvider] Failed to seed default nav items:', seedError);
          }
          // The real-time listener will fire again with the seeded documents, so return for now
          return;
        }

        const dbItems: Record<string, Partial<DynamicNavItem>> = {};
        snapshot.docs.forEach((doc) => {
          dbItems[doc.id] = doc.data() as Partial<DynamicNavItem>;
        });

        // Map and merge defaults with DB overrides so that newly introduced items don't break
        const merged = DEFAULT_DYNAMIC_NAV_ITEMS.map((defItem) => {
          const override = dbItems[defItem.id] || {};
          return {
            ...defItem,
            ...override,
          };
        });

        // Also permit administrative items added arbitrarily which are not in the hardcoded default items list
        snapshot.docs.forEach((doc) => {
          const id = doc.id;
          const found = DEFAULT_DYNAMIC_NAV_ITEMS.some((df) => df.id === id);
          if (!found) {
            merged.push(doc.data() as DynamicNavItem);
          }
        });

        // Sort dynamically by `.order` field
        const sorted = merged.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        setNavItems(sorted);
        setIsLoaded(true);
      },
      (error) => {
        console.error('[NavigationProvider] Failed to subscribe to Firestore navigation:', error);
        // Fallback gracefully to default items sorted
        const sorted = [...DEFAULT_DYNAMIC_NAV_ITEMS].sort((a, b) => a.order - b.order);
        setNavItems(sorted);
        setIsLoaded(true);
      }
    );

    return () => unsub();
  }, [firebaseUser, authLoading]);

  // 2. Access control matching dynamically
  const isEligible = (item: DynamicNavItem): boolean => {
    // A. Check base enablement
    if (!item.enabled || !item.visible) return false;

    // B. Check if it's linked to an underlying feature module, and honor feature governance
    if (item.moduleId) {
      const { allowed } = checkAccess(item.moduleId);
      if (!allowed) return false;

      const mod = modules[item.moduleId];
      if (!mod || !mod.enabled) return false;
    }

    // C. Check Custom Allowed Roles for this navigation link specifically
    if (item.allowedRoles && item.allowedRoles.length > 0) {
      const userRole = profile?.role || 'sales';
      if (!item.allowedRoles.includes(userRole)) return false;
    }

    // D. Check Custom Allowed Branches for this navigation link specifically
    if (item.allowedBranches && item.allowedBranches.length > 0) {
      const userBranch = profile?.branchId || '';
      if (!item.allowedBranches.includes(userBranch)) return false;
    }

    return true;
  };

  // 3. Update dynamic navigation item configs
  const updateNavItem = async (navId: string, updates: Partial<DynamicNavItem>) => {
    try {
      const matched = navItems.find((n) => n.id === navId) || DEFAULT_DYNAMIC_NAV_ITEMS.find((n) => n.id === navId);
      if (!matched) throw new Error(`Navigation item with ID "${navId}" was not found.`);

      const next = {
        ...matched,
        ...updates,
        id: navId,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'navigation', navId), next, { merge: true });
      toast.success(`Navigasi "${next.label}" sukses diperbarui.`);
    } catch (err) {
      console.error('[NavigationProvider] Error updating item:', err);
      toast.error('Gagal memperbarui item navigasi.');
      throw err;
    }
  };

  // 4. Force Reset complete registry
  const resetToDefault = async () => {
    try {
      const batch = writeBatch(db);
      DEFAULT_DYNAMIC_NAV_ITEMS.forEach((item) => {
        const docRef = doc(db, 'navigation', item.id);
        batch.set(docRef, {
          ...item,
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      toast.success('Regis Navigasi telah disetel ulang ke setelan awal pabrik.');
    } catch (err) {
      console.error('[NavigationProvider] Error resetting registry:', err);
      toast.error('Gagal mereset navigasi.');
    }
  };

  const value = useMemo(() => ({
    navItems,
    isLoaded,
    updateNavItem,
    resetToDefault,
    isEligible
  }), [navItems, isLoaded, profile, modules]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};

export const useNavigation = () => useContext(NavigationContext);
