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
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  useEffect(() => {
    let profileUnsub: () => void = () => {};

    const authUnsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      setLoading(true);
      
      if (u) {
        // First get the initial profile to ensure it exists
        const rawProfile = await getUserProfile(u.uid);
        if (!rawProfile) {
          await createUserProfile(u.uid, { email: u.email || "", name: u.displayName || "", photoURL: u.photoURL || "" });
        }

        // Setup real-time listener for profile
        const profileDocRef = doc(db, 'users', u.uid);
        profileUnsub = onSnapshot(profileDocRef, (snapshot) => {
          if (snapshot.exists()) {
            const p = normalizeUserProfile(u.uid, snapshot.data());
            setProfile(p);
          }
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
        profileUnsub();
      }
    });

    return () => {
      authUnsub();
      profileUnsub();
    };
  }, []);

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
      loading: loading || branchesLoading,
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
  }, [firebaseUser, profile, loading, branchesLoading, branchesList]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

