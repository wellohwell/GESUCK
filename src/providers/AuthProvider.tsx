import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { UserProfile } from '../features/auth/types';
import { getUserProfile, createUserProfile } from '../features/auth/services';
import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { normalizeUserProfile } from '../features/users/utils/normalizeUserProfile';
import { subscribeBranches } from '../lib/services';
import { isOwner as checkIsOwner } from '../lib/permissions';

interface AuthContextType {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  role: string | null;
  permissions: string[];
  isOwner: boolean;
  isManager: boolean;
  isStaff: boolean;
  branchId: string | null;
  branch: any | null;
  branchesList: any[];
  allBranchesList: any[];
  spreadsheetId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  profile: null,
  loading: true,
  profileLoading: true,
  isAuthenticated: false,
  isApproved: false,
  role: null,
  permissions: [],
  isOwner: false,
  isManager: false,
  isStaff: false,
  branchId: null,
  branch: null,
  branchesList: [],
  allBranchesList: [],
  spreadsheetId: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pwa_offline_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved) as User;
      } catch (e) {
        return null;
      }
    }
    return auth.currentUser;
  });

  const [isAuthChecking, setIsAuthChecking] = useState(() => {
    const saved = localStorage.getItem('pwa_offline_auth_user');
    if (saved) return false;
    return !auth.currentUser;
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('pwa_offline_auth_profile');
    if (saved) {
      try {
        return JSON.parse(saved) as UserProfile;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [profileLoading, setProfileLoading] = useState(() => {
    const saved = localStorage.getItem('pwa_offline_auth_profile');
    if (saved) return false;
    return true;
  });

  const [branchesList, setBranchesList] = useState<any[]>(() => {
    const saved = localStorage.getItem('pwa_offline_branches');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [branchesLoading, setBranchesLoading] = useState(true);

  useEffect(() => {
    let profileUnsub: () => void = () => {};

    // 1.5 seconds safety timeout fallback for slow auth resolution
    const timeoutId = setTimeout(() => {
      setIsAuthChecking(false);
      setProfileLoading(false);
    }, 1500);

    const authUnsub = onAuthStateChanged(auth, async (u) => {
      clearTimeout(timeoutId);
      setFirebaseUser(u);
      setIsAuthChecking(false);
      
      if (u) {
        // Cache user info locally
        try {
          const minimalUser = {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            emailVerified: u.emailVerified
          };
          localStorage.setItem('pwa_offline_auth_user', JSON.stringify(minimalUser));
        } catch (e) {
          console.debug("Failed to cache raw user offline:", e);
        }

        setProfileLoading(true);
        
        try {
          // Track login once per session storage lifecycle
          const sessionKey = `tracked_login_${u.uid}`;
          if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, "true");
            import("../lib/services").then((m) => {
              m.trackUserLogin(u).catch(console.error);
            });
          }
        } catch (e) {
          console.debug("Failed tracking login session:", e);
        }

        try {
          // Verify profile exists in background (non-blocking)
          const rawProfile = await getUserProfile(u.uid);
          if (!rawProfile) {
            await createUserProfile(u.uid, { 
              email: u.email || "", 
              name: u.displayName || "", 
              photoURL: u.photoURL || "" 
            });
          }
        } catch (e) {
          console.debug("Optional profile existence check failed/bypassed:", e);
        }

        // Setup real-time listener for profile (deep reactive, non-blocking)
        const profileDocRef = doc(db, 'users', u.uid);
        profileUnsub = onSnapshot(profileDocRef, (snapshot) => {
          if (snapshot.exists()) {
            const p = normalizeUserProfile(u.uid, snapshot.data());
            setProfile(p);
            // Cache profile locally
            try {
              localStorage.setItem('pwa_offline_auth_profile', JSON.stringify(p));
              localStorage.setItem('pwa_offline_last_sync_time', new Date().toISOString());
              window.dispatchEvent(new Event('pwa_last_sync_update'));
            } catch (e) {
              console.debug("Failed to cache profile offline:", e);
            }
          }
          setProfileLoading(false);
        }, (error) => {
          console.error("Profile real-time subscription error:", error);
          setProfileLoading(false);
        });
      } else {
        setProfile(null);
        setProfileLoading(false);
        profileUnsub();
        // Clear cached auth info on sign out
        try {
          localStorage.removeItem('pwa_offline_auth_user');
          localStorage.removeItem('pwa_offline_auth_profile');
          localStorage.removeItem('pwa_offline_last_route');
          localStorage.removeItem('pwa_offline_last_sync_time');
        } catch (e) {
          console.debug("Failed to clear cached auth info:", e);
        }
      }
    });

    return () => {
      clearTimeout(timeoutId);
      authUnsub();
      profileUnsub();
    };
  }, []);

  useEffect(() => {
    // Save last active route locally!
    const currentPath = window.location.pathname;
    if (currentPath && !['/login', '/signin', '/auth', '/', '/onboarding', '/pending', '/blocked'].includes(currentPath)) {
      try {
        localStorage.setItem('pwa_offline_last_route', currentPath);
      } catch (e) {
        console.debug("Failed to cache offline route:", e);
      }
    }

    if (!firebaseUser) return;

    const updateHeartbeat = async () => {
      try {
        await setDoc(doc(db, "users", firebaseUser.uid), {
          lastActiveAt: serverTimestamp(),
          activePage: window.location.pathname
        }, { merge: true });
      } catch (err) {
        console.debug("Failed updating heartbeat in background:", err);
      }
    };

    updateHeartbeat();
    const interval = setInterval(updateHeartbeat, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [firebaseUser, window.location.pathname]);

  useEffect(() => {
    const unsub = subscribeBranches(async (list) => {
      if (list.length === 0) {
        // Fallback to local legacy branches if Firestore has none yet
        const legacyList = [
          { id: 'YK01', branchId: 'YK01', branchName: 'Jogja', name: 'Jogja', code: 'YK01', active: true, archived: false, admins: [], spreadsheets: { explore: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', pricing: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', catalog: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc' }, runtime: { modules: { explore: { enabled: true, datasource: { type: 'spreadsheet', spreadsheetId: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', sheetName: 'List Harga' }, geaDatasource: { type: 'spreadsheet', spreadsheetId: '16ifxXxqttStNA4sYIJfDoV6Rw5fX0z8A5tcDd9U1BXQ', sheetName: 'CACHE' } } } } },
          { id: 'SL02', branchId: 'SL02', branchName: 'Solo', name: 'Solo', code: 'SL02', active: true, archived: false, admins: [], spreadsheets: { explore: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', pricing: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', catalog: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc' }, runtime: { modules: { explore: { enabled: true, datasource: { type: 'spreadsheet', spreadsheetId: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', sheetName: 'List Harga' }, geaDatasource: { type: 'spreadsheet', spreadsheetId: '16ifxXxqttStNA4sYIJfDoV6Rw5fX0z8A5tcDd9U1BXQ', sheetName: 'CACHE' } } } } },
          { id: 'KLT03', branchId: 'KLT03', branchName: 'Klaten', name: 'Klaten', code: 'KLT03', active: true, archived: false, admins: [], spreadsheets: { explore: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', pricing: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', catalog: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc' }, runtime: { modules: { explore: { enabled: true, datasource: { type: 'spreadsheet', spreadsheetId: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', sheetName: 'List Harga' }, geaDatasource: { type: 'spreadsheet', spreadsheetId: '16ifxXxqttStNA4sYIJfDoV6Rw5fX0z8A5tcDd9U1BXQ', sheetName: 'CACHE' } } } } }
        ];
        setBranchesList(legacyList);
        setBranchesLoading(false);

        // Try to seed database ONLY if the current logged-in user role is OWNER or MANAGER
        const userRole = profile?.role?.toUpperCase() || "";
        const normalizedRole = userRole === "ADMIN" ? "MANAGER" : userRole;
        if (normalizedRole === "OWNER" || normalizedRole === "MANAGER" || normalizedRole === "STAFF") {
          for (const item of legacyList) {
            try {
              await setDoc(doc(db, "branches", item.branchId), {
                id: item.id,
                branchId: item.branchId,
                name: item.name,
                branchName: item.branchName,
                code: item.code,
                active: item.active,
                archived: item.archived,
                admins: item.admins,
                spreadsheets: item.spreadsheets,
                runtime: item.runtime,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            } catch (e) {
              console.debug("Optional seeding background notice:", e);
            }
          }
        }
      } else {
        setBranchesList(list);
        setBranchesLoading(false);
        try {
          localStorage.setItem('pwa_offline_branches', JSON.stringify(list));
        } catch (e) {
          console.debug("Failed to cache branches offline:", e);
        }
      }
    });
    return () => unsub();
  }, [profile?.role]);

  const value = useMemo(() => {
    const branchId = profile?.branchId || null;
    const foundBranch = branchesList.find(b => b.branchId === branchId) || null;
    
    const resolvedBranch = foundBranch ? {
      id: foundBranch.branchId,
      name: foundBranch.branchName,
      active: foundBranch.active ?? true,
      archived: foundBranch.archived ?? false,
      admins: foundBranch.admins || [],
      spreadsheets: foundBranch.spreadsheets || { explore: "", pricing: "", catalog: "" },
      spreadsheetId: foundBranch.spreadsheets?.pricing || foundBranch.spreadsheetId || null
    } : null;

    const rawRole = profile?.role?.toUpperCase() || null;
    const normalizedRole = rawRole === "ADMIN" ? "MANAGER" : rawRole;
    
    return {
      firebaseUser,
      profile,
      loading: isAuthChecking,
      profileLoading,
      isAuthenticated: !!firebaseUser,
      isApproved: profile?.status === 'approved',
      role: normalizedRole,
      permissions: profile?.permissions || [],
      isOwner: checkIsOwner(profile),
      isManager: normalizedRole === 'MANAGER',
      isStaff: normalizedRole === 'STAFF',
      branchId,
      branch: resolvedBranch,
      branchesList: branchesList.filter(b => !b.archived),
      allBranchesList: branchesList,
      spreadsheetId: resolvedBranch?.spreadsheets?.pricing || null,
    };
  }, [firebaseUser, profile, isAuthChecking, profileLoading, branchesLoading, branchesList]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

