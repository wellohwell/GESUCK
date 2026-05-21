import { collection, getDocs, QuerySnapshot, DocumentData, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { CustomerDocument } from '../data/types';
import { createBranchQuery } from '../../lib/firestoreScope';
import { UserProfile } from '../../features/auth/types';

const COLLECTION_NAME = 'customers';

export const getCustomers = async (profile: UserProfile | null): Promise<CustomerDocument[]> => {
    const collRef = collection(db, COLLECTION_NAME);
    const q = query(collRef, ...createBranchQuery(profile));
    
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as CustomerDocument));
};
