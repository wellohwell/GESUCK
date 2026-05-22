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
  runTransaction,
  getDocs,
  updateDoc,
  orderBy,
  Timestamp,
  limit,
  startAfter,
  QueryConstraint
} from "firebase/firestore";
import { useState, useEffect } from "react";
import { auth, db } from "../firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const message = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: message,
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null
    }
  };
  
  console.error('Firestore Error:', errInfo, error);
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

// Hook for specific email owner override
export async function logActivity(activity: {
  type: string;
  category: string;
  title: string;
  description: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  targetId?: string;
  targetType?: string;
  metadata?: any;
}) {
  try {
    const uid = auth.currentUser?.uid;
    const email = auth.currentUser?.email;
    const name = auth.currentUser?.displayName || "System";
    
    // Get role from profile if not provided
    let role = activity.actorRole;
    if (!role && uid) {
      // Small optimization: if owner email, set directly
      if (email === "wahyulaksanajayakusuma@gmail.com") role = "OWNER";
    }

    await addDoc(collection(db, "activities"), {
      ...activity,
      actorId: activity.actorId || uid || "system",
      actorName: activity.actorName || name,
      actorRole: role || "system",
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "activities");
  }
}

export function subscribeActivities(role: string, uid: string, callback: (activities: any[]) => void, limitCount = 50, branchId?: string | null) {
  const r = role?.toUpperCase();
  const constraints: any[] = [];

  if (r === "SURVEY") {
    constraints.push(where("category", "in", ["task", "workflow", "system"]));
  } else if (r === "GUDANG") {
    constraints.push(where("category", "in", ["task", "workflow", "order"]));
  } else if (r !== 'OWNER' && r !== 'ADMIN' && r !== 'SPV') {
    constraints.push(where("actorId", "==", uid));
  }

  if (branchId && r !== 'OWNER' && r !== 'ADMIN') {
    constraints.push(where("branchId", "==", branchId));
  }

  const q = query(
    collection(db, "activities"), 
    ...constraints, 
    orderBy("createdAt", "desc"), 
    limit(limitCount)
  );
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "activities");
  });
}

// User Service
export async function syncUser() {
  if (!auth.currentUser) return;
  const userRef = doc(db, "users", auth.currentUser.uid);
  try {
    const { getDoc } = await import("firebase/firestore");
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      const isOwner = auth.currentUser.email === "wahyulaksanajayakusuma@gmail.com";
      const userData = {
        uid: auth.currentUser.uid,
        displayName: auth.currentUser.displayName,
        email: auth.currentUser.email,
        photoURL: auth.currentUser.photoURL,
        role: isOwner ? "OWNER" : "SPV",
        status: isOwner ? "approved" : "pending",
        lastLogin: serverTimestamp(),
        createdAt: serverTimestamp()
      };
      await setDoc(userRef, userData);
      
      await logActivity({
        type: 'user_login',
        category: 'user',
        title: 'User Registered',
        description: `User ${userData.displayName} mendaftar ke sistem`,
        actorId: userData.uid,
        actorName: userData.displayName || undefined,
        actorRole: userData.role
      });

    } else {
      await setDoc(userRef, {
        lastLogin: serverTimestamp(),
        photoURL: auth.currentUser.photoURL,
        email: auth.currentUser.email
      }, { merge: true });

      // Only log login for approved users to avoid noise from pending/rejected
      if (userDoc.data().status === 'approved') {
        await logActivity({
          type: 'user_login',
          category: 'user',
          title: 'User Login',
          description: `User ${userDoc.data().displayName} masuk ke sistem`,
          actorId: auth.currentUser.uid,
          actorName: userDoc.data().displayName,
          actorRole: userDoc.data().role
        });
      }
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

export async function updateUserStatusAndRole(
  userId: string, 
  data: { status?: string, role?: string, blockedReason?: string }
) {
  try {
    const adminUid = auth.currentUser?.uid;
    if (!adminUid) throw new Error("Unauthorized");
    
    const updateData: any = { ...data };
    
    if (data.status === 'approved') {
       updateData.approvedAt = serverTimestamp();
       updateData.approvedBy = adminUid;
    }

    await setDoc(doc(db, "users", userId), updateData, { merge: true });
    
    // Log activity
    let logType = '';
    let logDesc = '';
    if (data.status === 'approved') {
      logType = 'user_approved';
      logDesc = `Admin approve user ${userId} sebagai ${data.role || 'SALES'}`;
    } else if (data.status === 'rejected') {
      logType = 'user_rejected';
      logDesc = `Admin reject user ${userId}`;
    } else if (data.status === 'suspended') {
      logType = 'user_suspended';
      logDesc = `Admin suspend user ${userId}`;
    } else if (data.role) {
      logType = 'role_changed';
      logDesc = `Role user ${userId} diubah menjadi ${data.role}`;
    }

    if (logType) {
      await logActivity({
        type: logType,
        category: 'user',
        title: toTitleCase(logType.replace('_', ' ')),
        description: logDesc,
        targetId: userId,
        targetType: 'user'
      });
    }
    
    // Add notification based on status (Existing logic sigue...)
    let actionTitle = '';
    let actionMsg = '';
    
    if (data.status === 'approved') {
      actionTitle = 'Account Approved';
      actionMsg = 'Your account has been approved and activated.';
    } else if (data.status === 'rejected') {
      actionTitle = 'Account Rejected';
      actionMsg = 'Your account has been rejected.';
    } else if (data.status === 'suspended') {
      actionTitle = 'Account Suspended';
      actionMsg = 'Your account has been temporarily suspended.';
    }

    if (actionTitle) {
      await sendSysNotification({
        userIds: [userId],
        type: "system",
        title: actionTitle,
        message: actionMsg
      });
    }

  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function removeUser(userId: string) {
  try {
    await deleteDoc(doc(db, "users", userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
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

// Hooks
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);
  return user;
}

export function useUserProfile() {
  const user = useCurrentUser();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeCurrentUser(user.uid, (p) => {
      // Force OWNER role for specific email override
      if (user.email === "wahyulaksanajayakusuma@gmail.com") {
        setProfile({ ...p, role: "OWNER" });
      } else {
        setProfile(p);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { profile, loading };
}

export const ROLE_PERMISSIONS = {
  OWNER: { all: true },
  ADMIN: { all: true },
  SPV: { team: true },
  SALES: { personal: true },
  SURVEY: { tasks: true },
  GUDANG: { tasks: true },
};

export function canAccessAll(role?: string) {
  const r = role?.toUpperCase();
  return r === 'OWNER' || r === 'ADMIN';
}

export function canAccessTeam(role?: string) {
  const r = role?.toUpperCase();
  return r === 'OWNER' || r === 'ADMIN' || r === 'SPV';
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

export function subscribeMarketPlansByMonth(month: string, callback: (plans: any[]) => void) {
  const start = `${month}-01`;
  const end = `${month}-31`;
  const q = query(
    collection(db, "market_plans"), 
    where("dayStart", ">=", start),
    where("dayStart", "<=", end)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "market_plans");
  });
}

// Client Service
export function subscribeClients(role: string, uid: string, callback: (clients: any[]) => void, branchId?: string | null) {
  const r = role?.toUpperCase();
  const baseConstraints: any[] = [];
  
  if (r !== 'OWNER' && r !== 'ADMIN' && r !== 'SPV') {
    baseConstraints.push(where("ownerId", "==", uid));
  }

  if (branchId && r !== 'OWNER' && r !== 'ADMIN') {
    baseConstraints.push(where("branchId", "==", branchId));
  }
  
  const q = query(
    collection(db, "clients"), 
    ...baseConstraints,
    orderBy("lastOrderAt", "desc"), 
    limit(100)
  );
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.error("Error subscribing to clients:", error);
  });
}

// Order Service
export function subscribeOrders(role: string, uid: string, callback: (orders: any[]) => void, stageFilter?: string, branchId?: string | null) {
  const r = role?.toUpperCase();
  const baseConstraints: any[] = [];
  
  if (r !== 'OWNER' && r !== 'ADMIN' && r !== 'SPV') {
    baseConstraints.push(where("ownerId", "==", uid));
  }

  if (branchId && r !== 'OWNER' && r !== 'ADMIN') {
    baseConstraints.push(where("branchId", "==", branchId));
  }
  
  if (stageFilter && stageFilter !== 'all') {
    if (stageFilter === 'archive') {
      baseConstraints.push(where("stage", "in", ["batal", "pending"]));
    } else {
      baseConstraints.push(where("stage", "==", stageFilter));
    }
  }
  
  const q = query(collection(db, "orders"), ...baseConstraints, orderBy("createdAt", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.error("Error subscribing to orders:", error);
  });
}

export async function submitHybridOrder(data: {
  nama: string;
  nomor: string;
  usaha?: string;
  alamat?: string;
  barang: string;
  angsuran: number;
  tenorDays: number;
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Unauthorized");

  try {
    // 1. CLIENT CHECK
    const clientRef = collection(db, "clients");
    const q = query(clientRef, where("nomor", "==", data.nomor), where("ownerId", "==", uid));
    const querySnapshot = await getDocs(q);
    
    let clientId: string;
    let clientData: any;

    const now = serverTimestamp();

    if (!querySnapshot.empty) {
      // Client exists
      const docSnap = querySnapshot.docs[0];
      clientId = docSnap.id;
      const currentData = docSnap.data();
      
      // Update kategori logic
      // We need to count orders to be precise, or just use a counter in client doc
      const orderCount = (currentData.orderCount || 0) + 1;
      let kategori = "baru";
      if (orderCount >= 3) kategori = "langgan";
      else if (orderCount > 1) kategori = "eks";

      await updateDoc(doc(db, "clients", clientId), {
        lastOrderAt: now,
        kategori,
        orderCount,
        nama: data.nama, // sync always
        usaha: data.usaha || currentData.usaha || "",
        alamat: data.alamat || currentData.alamat || ""
      });
    } else {
      // Create new client
      const newClientDoc = await addDoc(clientRef, {
        ownerId: uid,
        nama: data.nama,
        nomor: data.nomor,
        usaha: data.usaha || "",
        alamat: data.alamat || "",
        kategori: "baru",
        orderCount: 1,
        lastOrderAt: now,
        createdAt: now
      });
      clientId = newClientDoc.id;
    }

    // 2. CREATE ORDER
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + data.tenorDays);

    const orderDoc = await addDoc(collection(db, "orders"), {
      clientId,
      ownerId: uid,
      nama: data.nama,
      nomor: data.nomor,
      usaha: data.usaha || "",
      alamat: data.alamat || "",
      barang: data.barang,
      angsuran: data.angsuran,
      tenorDays: data.tenorDays,
      status: "waiting",
      createdAt: now,
      dueAt: Timestamp.fromDate(dueAt)
    });

    await logActivity({
      type: 'order_created',
      category: 'order',
      title: 'Order Created',
      description: `Order baru dibuat untuk konsumen ${data.nama}`,
      targetId: orderDoc.id,
      targetType: 'order',
      metadata: { clientId, customerName: data.nama }
    });

    await sendSysNotification({
      userIds: [uid],
      roleTargets: ['SPV'],
      type: "order_created",
      title: "Order baru dibuat",
      message: "Order baru menunggu proses survey",
      relatedOrderId: orderDoc.id
    });

    await createAutoTask({
      orderId: orderDoc.id,
      clientId,
      ownerId: uid,
      type: "survey",
      assignedRole: "survey",
      title: "Survey order baru",
      description: "Survey diperlukan untuk order baru",
      priority: "medium",
      status: "pending"
    });

  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "hybrid_order");
    throw error;
  }
}

export async function updateOrderStatus(orderId: string, newStatus: string, orderData?: any) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Unauthorized");

  try {
    const now = serverTimestamp();
    const ownerToNotify = orderData?.ownerId || uid;
    
    // Create history entry
    const historyEntry = {
      status: newStatus,
      updatedBy: auth.currentUser?.email || uid,
      updatedAt: now
    };
    
    const { arrayUnion } = await import("firebase/firestore");

    // Update the order status
    await updateDoc(doc(db, "orders", orderId), {
      status: newStatus,
      updatedAt: now,
      updatedBy: auth.currentUser?.email || uid,
      statusHistory: arrayUnion(historyEntry)
    });

    await logActivity({
      type: `order_${newStatus === 'waiting' ? 'created' : newStatus}`, // approximation
      category: 'order',
      title: `Order ${toTitleCase(newStatus)}`,
      description: `Status order ${orderId} diubah menjadi ${newStatus}`,
      targetId: orderId,
      targetType: 'order'
    });

    // Add notification based on status
    if (newStatus === 'approved') {
      await sendSysNotification({
        userIds: [ownerToNotify],
        roleTargets: ['GUDANG', 'ADMIN'],
        type: "order_approved",
        title: "Order diapprove",
        message: "Order siap diproses pengiriman",
        relatedOrderId: orderId
      });
    } else if (newStatus === 'rejected') {
      await sendSysNotification({
        userIds: [ownerToNotify],
        roleTargets: ['SPV'],
        type: "order_rejected",
        title: "Order ditolak",
        message: "Order membutuhkan follow-up",
        relatedOrderId: orderId
      });
    } else if (newStatus === 'shipped') {
      await sendSysNotification({
        userIds: [ownerToNotify],
        type: "order_shipped",
        title: "Order telah dikirim",
        message: "Barang sedang dalam perjalanan",
        relatedOrderId: orderId
      });
    } else if (newStatus === 'completed') {
      await sendSysNotification({
        userIds: [ownerToNotify],
        roleTargets: ['SPV'],
        type: "order_completed",
        title: "Order selesai",
        message: "Konsumen masuk tahap follow-up",
        relatedOrderId: orderId
      });
    }

    // Workflow logic:
    if (newStatus === 'approved') {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 2); // default 2 days

      await createAutoTask({
        orderId,
        clientId: orderData?.clientId || "",
        ownerId: ownerToNotify,
        assignedRole: "gudang",
        type: "delivery",
        title: "Siapkan pengiriman barang",
        description: "Order telah diapprove dan siap dikirim",
        status: "pending",
        priority: "high",
        dueAt: Timestamp.fromDate(dueAt)
      });
      
    } else if (newStatus === 'active') {
      const orderDueAt = orderData?.dueAt?.toDate ? orderData.dueAt.toDate() : new Date();
      const taskDueAt = new Date(orderDueAt);
      taskDueAt.setDate(taskDueAt.getDate() - 7); // 7 days before dueAt

      await createAutoTask({
        orderId,
        clientId: orderData?.clientId || "",
        ownerId: ownerToNotify,
        assignedTo: ownerToNotify,
        type: "reminder",
        title: "Reminder follow-up konsumen",
        description: "Konsumen mendekati jatuh tempo",
        status: "pending",
        priority: "medium",
        dueAt: Timestamp.fromDate(taskDueAt)
      });
    } else if (newStatus === 'completed') {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 7); // follow up in 7 days

      await createAutoTask({
        orderId,
        clientId: orderData?.clientId || "",
        ownerId: ownerToNotify,
        assignedTo: ownerToNotify,
        type: "followup",
        title: "Follow-up repeat order",
        description: "Hubungi kembali konsumen",
        status: "pending",
        priority: "medium",
        dueAt: Timestamp.fromDate(dueAt)
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    throw error;
  }
}

async function createAutoTask(taskData: any) {
  const { getDocs, query, collection, where } = await import("firebase/firestore");
  const q = query(
    collection(db, "tasks"), 
    where("orderId", "==", taskData.orderId)
  );
  const snap = await getDocs(q);
  const exists = snap.docs.some(doc => {
    const data = doc.data();
    return data.type === taskData.type && (data.status === "pending" || data.status === "in_progress");
  });
  
  if (exists) return null;
  
  const docRef = await addDoc(collection(db, "tasks"), {
    ...taskData,
    createdAt: serverTimestamp()
  });

  await logActivity({
    type: 'task_created',
    category: 'task',
    title: 'Task Created',
    description: `Task ${taskData.title} (${taskData.type}) telah dibuat`,
    targetId: docRef.id,
    targetType: 'task',
    metadata: { orderId: taskData.orderId, type: taskData.type }
  });

  const targets: any = { type: 'task_created', title: 'Task baru', message: 'Terdapat task baru yang perlu diproses', relatedTaskId: docRef.id, relatedOrderId: taskData.orderId };
  if (taskData.assignedTo) targets.userIds = [taskData.assignedTo];
  if (taskData.assignedRole) targets.roleTargets = [taskData.assignedRole.toUpperCase()];
  
  if (targets.userIds || targets.roleTargets) {
    await sendSysNotification(targets);
  }

  return docRef;
}

export function subscribeTasks(role: string, uid: string, callback: (tasks: any[]) => void, branchId?: string | null) {
  const r = role?.toUpperCase();
  const baseConstraints: any[] = [];
  
  if (r === 'SURVEY') {
    baseConstraints.push(where("type", "==", "survey"));
  } else if (r === 'GUDANG') {
    baseConstraints.push(where("type", "==", "delivery"));
  } else if (r !== 'OWNER' && r !== 'ADMIN' && r !== 'SPV') {
    baseConstraints.push(where("ownerId", "==", uid));
  }

  if (branchId && r !== 'OWNER' && r !== 'ADMIN') {
    baseConstraints.push(where("branchId", "==", branchId));
  }
  
  const q = query(collection(db, "tasks"), ...baseConstraints, orderBy("createdAt", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(fetchedTasks);

    // Non-blocking asynchronous checks for overdue state
    setTimeout(() => {
      checkOverdueTasks(fetchedTasks).catch(console.error);
    }, 1000);
  }, (error) => {
    console.error("Error subscribing to tasks:", error);
  });
}

async function checkOverdueTasks(tasks: any[]) {
  const now = new Date();
  for (const task of tasks) {
    if (task.status !== 'completed' && task.status !== 'cancelled' && !task.overdueNotified && task.dueAt) {
      if (task.dueAt.toDate() < now) {
        try {
          // Set notified flag immediately to prevent duplicates
          await updateDoc(doc(db, "tasks", task.id), { overdueNotified: true });

          await logActivity({
            type: 'task_overdue',
            category: 'task',
            title: 'Task Overdue',
            description: `Task ${task.title} telah melewati batas waktu`,
            targetId: task.id,
            targetType: 'task'
          });

          const targets: any = { 
            type: 'task_overdue', 
            title: 'Task Overdue', 
            message: `Task ${task.title || task.type} telah melewati batas waktu (due date)`, 
            relatedTaskId: task.id, 
            relatedOrderId: task.orderId 
          };
          if (task.assignedTo) targets.userIds = [task.assignedTo];
          else if (task.ownerId) targets.userIds = [task.ownerId];
          if (task.assignedRole) targets.roleTargets = [task.assignedRole.toUpperCase(), 'SPV', 'ADMIN'];

          await sendSysNotification(targets);
        } catch (error) {
          console.error("Failed to process overdue task: ", error);
        }
      }
    }
  }
}

export async function updateTaskStatus(taskId: string, newStatus: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Unauthorized");

  try {
    const { getDoc } = await import("firebase/firestore");
    const taskSnap = await getDoc(doc(db, "tasks", taskId));
    const taskData = taskSnap.exists() ? taskSnap.data() : null;

    const updateData: any = {
      status: newStatus,
      updatedAt: serverTimestamp()
    };
    
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      updateData.completedAt = serverTimestamp();
    }
    
    await updateDoc(doc(db, "tasks", taskId), updateData);

    await logActivity({
      type: `task_${newStatus === 'pending' ? 'created' : newStatus === 'in_progress' ? 'started' : newStatus}`,
      category: 'task',
      title: `Task ${toTitleCase(newStatus)}`,
      description: `Status task ${taskId} diubah menjadi ${newStatus}`,
      targetId: taskId,
      targetType: 'task'
    });

    if (newStatus === 'completed' && taskData?.ownerId) {
      await sendSysNotification({
        userIds: [taskData.ownerId],
        type: 'task_completed',
        title: 'Task Selesai',
        message: `Task ${taskData.type} telah berhasil diselesaikan`,
        relatedTaskId: taskId,
        relatedOrderId: taskData.orderId
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    throw error;
  }
}

// Simple CRM Service
export async function createClientAndOrder(data: {
  nama: string;
  nomor: string;
  usaha: string;
  alamat: string;
  barang: string;
  angsuran: number;
  tenor: number;
  tenorType: string;
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Unauthorized");

  try {
    const now = serverTimestamp();
    
    // 1. Create Client
    const clientRef = await addDoc(collection(db, "clients"), {
      ownerId: uid,
      nama: data.nama,
      nomor: data.nomor,
      usaha: data.usaha || "",
      alamat: data.alamat || "",
      orderCount: 1,
      lastOrderAt: now,
      customerType: 'baru',
      createdAt: now,
      updatedAt: now
    });

    // 2. Create Order
    const orderRef = await addDoc(collection(db, "orders"), {
      clientId: clientRef.id,
      ownerId: uid,
      nama: data.nama, // denormalized for easy listing
      nomor: data.nomor,
      usaha: data.usaha,
      alamat: data.alamat || "",
      barang: data.barang,
      angsuran: data.angsuran,
      tenor: data.tenor,
      tenorType: data.tenorType,
      stage: 'survey',
      deliveryStatus: 'pending_gudang',
      createdAt: now,
      updatedAt: now
    });

    await logActivity({
      type: 'order_created',
      category: 'order',
      title: 'Konsumen Baru',
      description: `Konsumen ${data.nama} telah didaftarkan ke pipeline`,
      targetId: orderRef.id,
      targetType: 'order',
      metadata: { customerName: data.nama, clientId: clientRef.id }
    });

    return { clientId: clientRef.id, orderId: orderRef.id };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "clients/orders");
    throw error;
  }
}

export async function createRepeatOrder(clientId: string, data: {
  barang: string;
  angsuran: number;
  tenor: number;
  tenorType: string;
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Unauthorized");

  try {
    const { getDoc } = await import("firebase/firestore");
    const clientSnap = await getDoc(doc(db, "clients", clientId));
    if (!clientSnap.exists()) throw new Error("Client not found");
    const clientData = clientSnap.data();

    const now = serverTimestamp();
    const orderCount = (clientData.orderCount || 0) + 1;
    
    let customerType = 'baru';
    if (orderCount >= 5) customerType = 'loyal';
    else if (orderCount >= 2) customerType = 'repeat';

    // 1. Update Client (History & Meta)
    await updateDoc(doc(db, "clients", clientId), {
      orderCount,
      lastOrderAt: now,
      customerType,
      updatedAt: now
    });

    // 2. Create Order
    const orderRef = await addDoc(collection(db, "orders"), {
      clientId,
      ownerId: uid,
      nama: clientData.nama,
      nomor: clientData.nomor,
      usaha: clientData.usaha,
      alamat: clientData.alamat || "",
      barang: data.barang,
      angsuran: data.angsuran,
      tenor: data.tenor,
      tenorType: data.tenorType,
      stage: 'survey',
      deliveryStatus: 'pending_gudang',
      createdAt: now,
      updatedAt: now
    });

    await logActivity({
      type: 'repeat_order',
      category: 'order',
      title: 'Repeat Order',
      description: `Repeat Order ke-${orderCount} untuk ${clientData.nama}`,
      targetId: orderRef.id,
      targetType: 'order'
    });

    return orderRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "repeat_order");
    throw error;
  }
}

export function subscribeClientOrders(clientId: string, callback: (orders: any[]) => void, role?: string, uid?: string) {
  const r = role?.toUpperCase();
  let q;
  
  if (r === 'OWNER' || r === 'ADMIN' || r === 'SPV') {
    q = query(
      collection(db, "orders"), 
      where("clientId", "==", clientId), 
      orderBy("createdAt", "desc")
    );
  } else {
    q = query(
      collection(db, "orders"), 
      where("clientId", "==", clientId), 
      where("ownerId", "==", uid),
      orderBy("createdAt", "desc")
    );
  }

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `client_orders/${clientId}`);
  });
}

export async function createSimpleOrder(data: {
  nama: string;
  nomor: string;
  usaha: string;
  alamat: string;
  barang: string;
  angsuran: number;
  tenor: number;
  tenorType: string;
}) {
  // Redirect to createClientAndOrder to maintain the new structured flow
  return createClientAndOrder(data);
}

export async function updateOrderStage(orderId: string, updates: { 
  stage: string, 
  deliveryStatus?: string, 
  pendingNote?: string,
  deliveredAt?: any,
  nama?: string,
  nomor?: string,
  usaha?: string,
  alamat?: string,
  barang?: string,
  angsuran?: number,
  tenor?: number,
  tenorType?: string
}) {
  try {
    const data = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    await updateDoc(doc(db, "orders", orderId), data);

    await logActivity({
      type: `order_${updates.stage}`,
      category: 'order',
      title: `Update Stage: ${updates.stage.toUpperCase()}`,
      description: `Order ${orderId} dipindahkan ke stage ${updates.stage}`,
      targetId: orderId,
      targetType: 'order'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    throw error;
  }
}

// Notification Service
export async function sendSysNotification(options: {
  userIds?: string[];
  roleTargets?: string[];
  type: string;
  title: string;
  message: string;
  relatedOrderId?: string;
  relatedTaskId?: string;
}) {
  try {
    const promises = [];
    const baseData = {
      type: options.type,
      title: options.title,
      message: options.message,
      relatedOrderId: options.relatedOrderId || null,
      relatedTaskId: options.relatedTaskId || null,
      read: false,
      createdAt: serverTimestamp()
    };

    if (options.userIds) {
      for (const uid of options.userIds) {
        if (!uid) continue;
        promises.push(addDoc(collection(db, "notifications"), { ...baseData, userId: uid }));
      }
    }
    if (options.roleTargets) {
      for (const role of options.roleTargets) {
        if (!role) continue;
        promises.push(addDoc(collection(db, "notifications"), { ...baseData, roleTarget: role }));
      }
    }
    
    await Promise.all(promises);
  } catch (error) {
    console.error("Failed to send system notification", error);
  }
}

export async function addNotification(userId: string, title: string, message: string) {
  // Legacy support for backward compatibility during transition
  await sendSysNotification({
    userIds: [userId],
    type: "system",
    title,
    message
  });
}

export function subscribeNotifications(role: string, uid: string, callback: (notifs: any[]) => void) {
  if (!uid || !role) return () => {};
  const r = role.toUpperCase();
  
  // Track listeners and state
  const listeners: any[] = [];
  let userNotifs: any[] = [];
  let roleNotifs: any[] = [];
  let allNotifs: any[] = [];

  const updateCallback = () => {
    // Merge, deduplicate by ID, and sort
    const merged = [...userNotifs, ...roleNotifs, ...allNotifs];
    const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
    unique.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA; // Descending
    });
    callback(unique);
  };

  // 1. User specific notifications
  const qUser = query(collection(db, "notifications"), where("userId", "==", uid));
  listeners.push(onSnapshot(qUser, (snap) => {
    userNotifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateCallback();
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `notifications/user/${uid}`);
  }));

  // 2. Role specific notifications
  if (r && r !== 'OWNER' && r !== 'ADMIN') {
    const qRole = query(collection(db, "notifications"), where("roleTarget", "==", r));
    listeners.push(onSnapshot(qRole, (snap) => {
      roleNotifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateCallback();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `notifications/role/${r}`);
    }));
  }

  // 3. Global / Owner notifications (Owner/Admin sees all or Global)
  if (r === 'OWNER' || r === 'ADMIN') {
    const qAll = query(collection(db, "notifications"));
    listeners.push(onSnapshot(qAll, (snap) => {
      allNotifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateCallback();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "notifications/all");
    }));
  } else {
    const qGlobal = query(collection(db, "notifications"), where("roleTarget", "==", "ALL"));
    listeners.push(onSnapshot(qGlobal, (snap) => {
      allNotifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateCallback();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "notifications/global");
    }));
  }

  return () => {
    listeners.forEach(unsub => unsub());
  };
}

export async function markNotificationRead(notifId: string) {
  try {
    await updateDoc(doc(db, "notifications", notifId), { read: true });
  } catch(error) {
    console.error("Error marking notif as read:", error);
  }
}

export async function markAllNotificationsRead(notifIds: string[]) {
  try {
    const { writeBatch } = await import("firebase/firestore");
    const batch = writeBatch(db);
    for (const id of notifIds) {
      batch.update(doc(db, "notifications", id), { read: true });
    }
    await batch.commit();
  } catch (error) {
    console.error("Error marking all notifs as read:", error);
  }
}

// Hardening: Paginated queries to avoid loading entire collections
export async function getClientsPaginated(options: {
  role: string;
  uid: string;
  branchId?: string | null;
  limitCount?: number;
  startAfterDoc?: any;
}) {
  try {
    const { role, uid, branchId, limitCount = 20, startAfterDoc } = options;
    const r = role?.toUpperCase();
    const constraints: any[] = [];

    if (r !== 'OWNER' && r !== 'ADMIN' && r !== 'SPV') {
      constraints.push(where("ownerId", "==", uid));
    }

    if (branchId && r !== 'OWNER' && r !== 'ADMIN') {
      constraints.push(where("branchId", "==", branchId));
    }

    constraints.push(orderBy("lastOrderAt", "desc"));
    constraints.push(limit(limitCount));

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    const q = query(collection(db, "clients"), ...constraints);
    const snap = await getDocs(q);
    
    return {
      docs: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      lastDoc: snap.docs[snap.docs.length - 1] || null
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "clients/paginated");
  }
}

export async function getOrdersPaginated(options: {
  role: string;
  uid: string;
  branchId?: string | null;
  stageFilter?: string;
  limitCount?: number;
  startAfterDoc?: any;
}) {
  try {
    const { role, uid, branchId, stageFilter, limitCount = 20, startAfterDoc } = options;
    const r = role?.toUpperCase();
    const constraints: any[] = [];

    if (r !== 'OWNER' && r !== 'ADMIN' && r !== 'SPV') {
      constraints.push(where("ownerId", "==", uid));
    }

    if (branchId && r !== 'OWNER' && r !== 'ADMIN') {
      constraints.push(where("branchId", "==", branchId));
    }

    if (stageFilter && stageFilter !== 'all') {
      if (stageFilter === 'archive') {
        constraints.push(where("stage", "in", ["batal", "pending"]));
      } else {
        constraints.push(where("stage", "==", stageFilter));
      }
    }

    constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(limitCount));

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    const q = query(collection(db, "orders"), ...constraints);
    const snap = await getDocs(q);
    
    return {
      docs: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      lastDoc: snap.docs[snap.docs.length - 1] || null
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "orders/paginated");
  }
}

export async function getActivitiesPaginated(options: {
  role: string;
  uid: string;
  branchId?: string | null;
  categoryFilter?: string;
  limitCount?: number;
  startAfterDoc?: any;
}) {
  try {
    const { role, uid, branchId, categoryFilter, limitCount = 20, startAfterDoc } = options;
    const r = role?.toUpperCase();
    const constraints: any[] = [];

    if (r === "SURVEY") {
      constraints.push(where("category", "in", ["task", "workflow", "system"]));
    } else if (r === "GUDANG") {
      constraints.push(where("category", "in", ["task", "workflow", "order"]));
    } else if (r !== 'OWNER' && r !== 'ADMIN' && r !== 'SPV') {
      constraints.push(where("actorId", "==", uid));
    }

    if (branchId && r !== 'OWNER' && r !== 'ADMIN') {
      constraints.push(where("branchId", "==", branchId));
    }

    if (categoryFilter && categoryFilter !== 'all') {
      constraints.push(where("category", "==", categoryFilter));
    }

    constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(limitCount));

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    const q = query(collection(db, "activities"), ...constraints);
    const snap = await getDocs(q);
    
    return {
      docs: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      lastDoc: snap.docs[snap.docs.length - 1] || null
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "activities/paginated");
  }
}

// Branches Service
export function subscribeBranches(callback: (branches: any[]) => void) {
  const q = query(collection(db, "branches"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "branches");
  });
}

export async function addBranch(branchData: {
  branchId: string;
  branchName: string;
  active: boolean;
  spreadsheets?: { explore?: string; pricing?: string; catalog?: string };
  admins?: string[];
}) {
  try {
    const id = branchData.branchId.toUpperCase().trim();
    await setDoc(doc(db, "branches", id), {
      ...branchData,
      branchId: id,
      archived: false,
      admins: branchData.admins || [],
      spreadsheets: {
        explore: branchData.spreadsheets?.explore || "",
        pricing: branchData.spreadsheets?.pricing || "",
        catalog: branchData.spreadsheets?.catalog || "",
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `branches/${branchData.branchId}`);
  }
}

export async function updateBranch(branchId: string, updates: any) {
  try {
    const docRef = doc(db, "branches", branchId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `branches/${branchId}`);
  }
}


