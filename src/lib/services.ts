import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  setDoc, 
  doc, 
  deleteDoc, 
  addDoc,
  serverTimestamp,
  runTransaction
} from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { toTitleCase } from "../utils/format";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Market Service
export function subscribeMarkets(callback: (markets: any[]) => void) {
  const q = query(collection(db, "markets"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "markets");
  });
}

export async function addMarket(marketData: any) {
  try {
    const cleanedData = {
      ...marketData,
      nama_pasar: toTitleCase(marketData.nama_pasar),
      wilayah: toTitleCase(marketData.wilayah),
    };
    await addDoc(collection(db, "markets"), {
      ...cleanedData,
      created_at: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "markets");
  }
}

export async function updateMarket(marketId: string, marketData: any) {
  try {
    const { id, ...data } = marketData; // Remove ID if present
    const cleanedData = {
      ...data,
      nama_pasar: marketData.nama_pasar ? toTitleCase(marketData.nama_pasar) : undefined,
      wilayah: marketData.wilayah ? toTitleCase(marketData.wilayah) : undefined,
    };
    // Remove undefined
    Object.keys(cleanedData).forEach(key => (cleanedData as any)[key] === undefined && delete (cleanedData as any)[key]);

    await setDoc(doc(db, "markets", marketId), cleanedData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `markets/${marketId}`);
  }
}

export async function removeMarket(marketId: string) {
  try {
    await deleteDoc(doc(db, "markets", marketId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `markets/${marketId}`);
  }
}

// User Service
export async function syncUser() {
  if (!auth.currentUser) return;
  const userRef = doc(db, "users", auth.currentUser.uid);
  try {
    // Check if user exists first to avoid overwriting custom labels/names from admin
    const { getDoc } = await import("firebase/firestore");
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid: auth.currentUser.uid,
        displayName: auth.currentUser.displayName,
        email: auth.currentUser.email,
        photoURL: auth.currentUser.photoURL,
        role: "Penyelam",
        status: "pending",
        lastLogin: serverTimestamp()
      });
    } else {
      // For existing users, only update lastLogin and maybe photo/email if changed
      await setDoc(userRef, {
        lastLogin: serverTimestamp(),
        photoURL: auth.currentUser.photoURL, // Keep photo sync'd
        email: auth.currentUser.email      // Keep email sync'd
      }, { merge: true });
    }
  } catch (error) {
    console.error("Error syncing user:", error);
  }
}

export async function updateUser(userId: string, data: any) {
  try {
    const cleanedData = { ...data };
    if (data.displayName) cleanedData.displayName = toTitleCase(data.displayName);
    
    await setDoc(doc(db, "users", userId), cleanedData, { merge: true });
    
    // If updating self, also update current auth profile for immediate UI response
    if (auth.currentUser && auth.currentUser.uid === userId && cleanedData.displayName) {
      const { updateProfile } = await import("firebase/auth");
      await updateProfile(auth.currentUser, { 
        displayName: cleanedData.displayName 
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

export function subscribeUsers(callback: (users: any[]) => void) {
  const q = query(collection(db, "users"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "users");
  });
}

export function subscribeCurrentUser(uid: string, callback: (user: any) => void) {
  return onSnapshot(doc(db, "users", uid), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  });
}

// Assignment Service
export function subscribeAssignments(date: string, callback: (assignments: any[]) => void) {
  const q = query(collection(db, "assignments"), where("tanggal", "==", date));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "assignments");
  });
}

// Market Plan Service
export function subscribeMarketPlans(date: string, callback: (plans: any[]) => void) {
  const q = query(
    collection(db, "market_plans"), 
    where("dayStart", "==", date)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "market_plans");
  });
}

export function subscribeAllMarketPlans(callback: (plans: any[]) => void) {
  const q = query(collection(db, "market_plans"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "market_plans");
  });
}

export async function addMarketPlan(planData: any) {
  if (!auth.currentUser) throw new Error("Unauthorized");
  try {
    await addDoc(collection(db, "market_plans"), {
      ...planData,
      userId: auth.currentUser.uid,
      userName: toTitleCase(auth.currentUser.displayName || "User"),
      userPhoto: auth.currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${auth.currentUser.displayName}`,
      createdAt: serverTimestamp(),
      status: "active"
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "market_plans");
  }
}

export async function deleteMarketPlan(planId: string) {
  try {
    await deleteDoc(doc(db, "market_plans", planId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `market_plans/${planId}`);
  }
}

export async function selectMarket(marketId: string, marketName: string, date: string, oldMarketId?: string) {
  if (!auth.currentUser) throw new Error("Unauthorized");

  const userId = auth.currentUser.uid;
  const assignmentId = `${date}_${userId}`;
  const assignmentRef = doc(db, "assignments", assignmentId);

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Check if new market is already taken
      const lockRef = doc(db, "marketLocks", `${date}_${marketId}`);
      const lockSnap = await transaction.get(lockRef);
      
      if (lockSnap.exists() && lockSnap.data().uid !== userId) {
        throw new Error("Pasar sudah dipilih orang lain.");
      }

      // 2. Clear old lock if switching
      if (oldMarketId && oldMarketId !== marketId) {
        const oldLockRef = doc(db, "marketLocks", `${date}_${oldMarketId}`);
        transaction.delete(oldLockRef);
      }

      // 3. Create/Update Assignment
      transaction.set(assignmentRef, {
        uid: userId,
        nama: auth.currentUser?.displayName || "User",
        email: auth.currentUser?.email,
        foto: auth.currentUser?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + userId,
        pendamping: "",
        pasarId: marketId,
        pasarNama: marketName,
        tanggal: date,
        createdAt: serverTimestamp()
      });
      
      // 4. Set new lock
      transaction.set(lockRef, {
        uid: userId,
        timestamp: serverTimestamp()
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Pasar sudah dipilih orang lain.") {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, "assignments");
  }
}

export async function deleteAssignment(date: string, marketId: string) {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const assignmentId = `${date}_${userId}`;
  const lockId = `${date}_${marketId}`;
  
  try {
    await runTransaction(db, async (transaction) => {
      transaction.delete(doc(db, "assignments", assignmentId));
      transaction.delete(doc(db, "marketLocks", lockId));
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `assignments/${assignmentId}`);
  }
}

export async function adminRemoveAssignment(date: string, uid: string, marketId: string) {
  const assignmentId = `${date}_${uid}`;
  const lockId = `${date}_${marketId}`;
  
  try {
    await runTransaction(db, async (transaction) => {
      transaction.delete(doc(db, "assignments", assignmentId));
      transaction.delete(doc(db, "marketLocks", lockId));
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `assignments/${assignmentId}`);
  }
}
