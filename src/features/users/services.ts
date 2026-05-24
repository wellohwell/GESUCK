import { doc, getDoc, updateDoc, serverTimestamp, collection, query, getDocs, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { UserProfile, UserStatus } from '../auth/types';
import { ROLES } from '../../config/roles';
import { createBranchQuery } from '../../lib/firestoreScope';
import { UserRegistrationData } from './types';

const COLLECTION_NAME = 'users';

export const updateUserProfile = async (uid: string, data: Partial<UserProfile> & { status?: UserStatus }) => {
    const docRef = doc(db, COLLECTION_NAME, uid);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
};

export const completeOnboarding = async (uid: string, data: UserRegistrationData) => {
    await updateUserProfile(uid, {
        ...data,
        status: 'pending'
    });
};

export const listUsers = async (profile: UserProfile | null): Promise<UserProfile[]> => {
    const collRef = collection(db, COLLECTION_NAME);
    // Use Firestore-scope: AdminCabang only own branch, Owner all.
    const q = query(collRef, ...createBranchQuery(profile));
    
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
};

export const approveUser = async (adminProfile: UserProfile, targetUid: string, role: string, branchId: string) => {
    // Permission validation (done via hook/guard at component level, but enforce here for security)
    if (adminProfile.role === ROLES.STAFF && adminProfile.branchId !== branchId) {
        throw new Error("Cannot approve users for other branches.");
    }
    
    await updateUserProfile(targetUid, {
        status: 'approved',
        role,
        roleIds: [role],
        branchId,
        approvedBy: adminProfile.uid,
        approvedAt: serverTimestamp() as any
    });
};

export const rejectUser = async (adminProfile: UserProfile, targetUid: string) => {
    await updateUserProfile(targetUid, { status: 'rejected' });
};
