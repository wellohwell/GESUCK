import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthProvider';

export interface ExploreDatasource {
  type: string;
  spreadsheetId: string;
  sheetName: string;
}

export interface ExploreModuleRuntime {
  enabled: boolean;
  datasource: ExploreDatasource;
  geaDatasource?: ExploreDatasource;
}

export interface BranchRuntimeConfig {
  modules: {
    explore: ExploreModuleRuntime;
  };
}

export interface BranchRuntime {
  id: string;
  name: string;
  code: string;
  active: boolean;
  runtime: BranchRuntimeConfig;
}

interface RuntimeContextType {
  runtime: BranchRuntimeConfig | null;
  branch: BranchRuntime | null;
  loading: boolean;
  error: string | null;
  activeBranchContext: string | null;
  actingAs: string | null;
  setBranchContext: (branchId: string | null) => void;
  isGlobalWorkspace: boolean;
}

const DEFAULT_EXPLORE_DATASOURCE: ExploreDatasource = {
  type: "spreadsheet",
  spreadsheetId: "",
  sheetName: "List Harga"
};

const DEFAULT_GEA_DATASOURCE: ExploreDatasource = {
  type: "spreadsheet",
  spreadsheetId: "",
  sheetName: "CACHE"
};

const DEFAULT_RUNTIME_CONFIG: BranchRuntimeConfig = {
  modules: {
    explore: {
      enabled: false,
      datasource: DEFAULT_EXPLORE_DATASOURCE,
      geaDatasource: DEFAULT_GEA_DATASOURCE
    }
  }
};

const RuntimeContext = createContext<RuntimeContextType>({
  runtime: null,
  branch: null,
  loading: true,
  error: null,
  activeBranchContext: null,
  actingAs: null,
  setBranchContext: () => {},
  isGlobalWorkspace: true
});

export const RuntimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading: authLoading, isAuthenticated } = useAuth();
  const [branch, setBranch] = useState<BranchRuntime | null>(() => {
    try {
      const cached = localStorage.getItem('vorkteam_cached_branch_runtime');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn("Failed to load cached branch runtime from localStorage:", e);
    }
    return null;
  });
  const [loading, setLoading] = useState(() => !branch);
  const [error, setError] = useState<string | null>(null);

  const isGlobalUser = profile?.userType === 'global';
  const resolvedActingAs = isGlobalUser ? (profile?.globalRole || 'owner') : null;

  const [activeBranchContext, setActiveBranchContext] = useState<string | null>(() => {
    try {
      return localStorage.getItem('tenant_branch_context') || null;
    } catch {
      return null;
    }
  });

  // Strict coercion: non-global users can ONLY act under their profile's assigned branchId.
  const currentActiveContext = isGlobalUser ? activeBranchContext : (profile?.branchId || null);

  const setBranchContext = (branchId: string | null) => {
    if (!isGlobalUser) {
      console.warn("Context switching blocked: Only global users (owners, developers, superadmins) can switch workspaces.");
      return;
    }
    setActiveBranchContext(branchId);
    try {
      if (branchId) {
        localStorage.setItem('tenant_branch_context', branchId);
      } else {
        localStorage.removeItem('tenant_branch_context');
      }
    } catch (e) {
      console.warn("Failed to persist selected branch context in localStorage", e);
    }
  };

  const isGlobalWorkspace = !!(isGlobalUser && !currentActiveContext);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!isAuthenticated) {
      setBranch(null);
      setLoading(false);
      return;
    }

    // In global workspace (no active branch selected), we do not load a branch runtime.
    if (isGlobalWorkspace || !currentActiveContext) {
      setBranch(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const docRef = doc(db, 'branches', currentActiveContext);
    
    const unsubscribe = onSnapshot(docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          const docData = docSnap.data();
          
          // Extrapolate name, code, active and runtime properties
          const id = docSnap.id;
          const name = docData.branchName || docData.name || id;
          const code = docData.branchId || docData.code || id;
          const active = docData.active ?? true;
          
          // Construct merge-safe runtime config
          const dbRuntime = docData.runtime || {};
          const dbModules = dbRuntime.modules || {};
          const dbExplore = dbModules.explore || {};
          
          // Only enabled if explicitly enabled in DB AND has a valid spreadsheetId
          const dbSpreadsheetId = dbExplore.datasource?.spreadsheetId || dbExplore.spreadsheetId || docData.spreadsheets?.pricing || "";
          const resolvedExplore: ExploreModuleRuntime = {
            enabled: (dbExplore.enabled !== false) && !!dbSpreadsheetId,
            datasource: {
              type: dbExplore.datasource?.type || dbExplore.type || "spreadsheet",
              spreadsheetId: dbSpreadsheetId,
              sheetName: dbExplore.datasource?.sheetName || dbExplore.sheetName || "List Harga"
            },
            geaDatasource: {
              type: dbExplore.geaDatasource?.type || "spreadsheet",
              spreadsheetId: dbExplore.geaDatasource?.spreadsheetId || "",
              sheetName: dbExplore.geaDatasource?.sheetName || "CACHE"
            }
          };

          const runtimeConfig: BranchRuntimeConfig = {
            modules: {
              explore: resolvedExplore
            }
          };

          const resolvedBranch: BranchRuntime = {
            id,
            name,
            code,
            active,
            runtime: runtimeConfig
          };
          setBranch(resolvedBranch);
          try {
            localStorage.setItem('vorkteam_cached_branch_runtime', JSON.stringify(resolvedBranch));
          } catch (e) {}
        } else {
          // If branch configuration is completely missing key fallback (unconfigured)
          const fallbackBranch: BranchRuntime = {
            id: currentActiveContext,
            name: `${currentActiveContext} Branch`,
            code: currentActiveContext,
            active: true,
            runtime: DEFAULT_RUNTIME_CONFIG
          };
          setBranch(fallbackBranch);
          try {
            localStorage.setItem('vorkteam_cached_branch_runtime', JSON.stringify(fallbackBranch));
          } catch (e) {}
        }
        setLoading(false);
      },
      (err) => {
        console.error("Runtime configuration fetch failed:", err);
        setError("Gagal memuat konfigurasi cabang.");
        const fallbackBranch: BranchRuntime = {
          id: currentActiveContext,
          name: `${currentActiveContext} Branch`,
          code: currentActiveContext,
          active: true,
          runtime: DEFAULT_RUNTIME_CONFIG
        };
        setBranch(fallbackBranch);
        try {
          localStorage.setItem('vorkteam_cached_branch_runtime', JSON.stringify(fallbackBranch));
        } catch (e) {}
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentActiveContext, authLoading, isAuthenticated, isGlobalWorkspace]);

  const value = useMemo(() => {
    // If we already have a cached branch, consider loading finished to provide an instant experience
    const resolvedLoading = branch ? false : (authLoading || loading);
    return {
      runtime: branch?.runtime || null,
      branch,
      loading: resolvedLoading,
      error,
      activeBranchContext: currentActiveContext,
      actingAs: resolvedActingAs,
      setBranchContext,
      isGlobalWorkspace
    };
  }, [branch, loading, authLoading, error, currentActiveContext, resolvedActingAs, isGlobalWorkspace]);

  return (
    <RuntimeContext.Provider value={value}>
      {children}
    </RuntimeContext.Provider>
  );
};

export const useRuntime = () => useContext(RuntimeContext);
