import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { UserProfile } from '../features/auth/types';
import { getUserProfile, createUserProfile } from '../features/auth/services';
import { BranchConfig } from '../config/branches';
import { getBranchById } from '../lib/branch';
import { normalizeUserProfile } from '../features/users/utils/normalizeUserProfile';

interface AuthContextType {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  role: string | null;
  branchId: string | null;
  branch: BranchConfig | null;
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
  spreadsheetId: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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

  const value = useMemo(() => {
    const branchId = profile?.branchId || null;
    const branch = branchId ? getBranchById(branchId) || null : null;
    return {
      firebaseUser,
      profile,
      loading,
      isAuthenticated: !!firebaseUser,
      isApproved: profile?.status === 'approved',
      role: profile?.role || null,
      branchId,
      branch,
      spreadsheetId: branch?.spreadsheetId || null,
    };
  }, [firebaseUser, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
