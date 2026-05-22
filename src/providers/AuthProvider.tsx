import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { UserProfile } from '../features/auth/types';
import { getUserProfile, createUserProfile } from '../features/auth/services';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { normalizeUserProfile } from '../features/users/utils/normalizeUserProfile';
import { subscribeBranches } from '../lib/services';

interface AuthContextType {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  role: string | null;
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
    return onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      setLoading(true);
      if (u) {
        const rawProfile = await getUserProfile(u.uid);
        let p;
        if (!rawProfile) {
          await createUserProfile(u.uid, { email: u.email || "", name: u.displayName || "", photoURL: u.photoURL || "" });
          const newRawProfile = await getUserProfile(u.uid);
          p = normalizeUserProfile(u.uid, newRawProfile || {});
        } else {
          p = normalizeUserProfile(u.uid, rawProfile);
        }
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const unsub = subscribeBranches(async (list) => {
      if (list.length === 0) {
        // Fallback to local legacy branches if Firestore has none yet
        const legacyList = [
          { branchId: 'YK01', branchName: 'Jogja', active: true, archived: false, admins: [], spreadsheets: { explore: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', pricing: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', catalog: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc' } },
          { branchId: 'SL02', branchName: 'Solo', active: true, archived: false, admins: [], spreadsheets: { explore: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', pricing: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', catalog: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc' } },
          { branchId: 'KLT03', branchName: 'Klaten', active: true, archived: false, admins: [], spreadsheets: { explore: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', pricing: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc', catalog: '16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc' } }
        ];
        setBranchesList(legacyList);
        setBranchesLoading(false);

        // Try to seed database ONLY if the current logged-in user role is OWNER or ADMIN
        const userRole = profile?.role?.toUpperCase() || "";
        if (userRole === "OWNER" || userRole === "ADMIN") {
          for (const item of legacyList) {
            try {
              await setDoc(doc(db, "branches", item.branchId), {
                branchId: item.branchId,
                branchName: item.branchName,
                active: item.active,
                archived: item.archived,
                admins: item.admins,
                spreadsheets: item.spreadsheets,
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

    return {
      firebaseUser,
      profile,
      loading: loading || branchesLoading,
      isAuthenticated: !!firebaseUser,
      isApproved: profile?.status === 'approved',
      role: profile?.role || null,
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

