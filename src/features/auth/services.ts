import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { UserProfile } from './types';

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
};

export const createUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  const docRef = doc(db, 'users', uid);
  const now = serverTimestamp();
  
  await setDoc(docRef, {
    uid,
    email: data.email || null,
    name: data.name || null,
    photoURL: data.photoURL || null,
    role: null,
    requestedRole: null,
    branchId: null,
    phone: null,
    status: 'pending',
    approvedBy: null,
    approvedAt: null,
    createdAt: now,
    updatedAt: now,
    ...data,
  });
};
