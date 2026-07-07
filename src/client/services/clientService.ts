import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, serverTimestamp, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Client, Order } from "../types/CRMTypes";
import { toTitleCase } from "../../utils/format";

export function subscribeClients(role: string, uid: string, callback: (clients: Client[]) => void) {
  const r = role?.toUpperCase();
  let q;
  
  if (r === 'OWNER' || r === 'ADMIN' || r === 'SPV') {
    q = query(collection(db, "clients"), orderBy("lastOrderAt", "desc"));
  } else {
    q = query(collection(db, "clients"), where("ownerId", "==", uid), orderBy("lastOrderAt", "desc"));
  }
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
  }, (error) => {
    console.error("Error subscribing to clients:", error);
  });
}

export async function createClientAndOrder(uid: string, data: {
  nama: string;
  nomor: string;
  usaha: string;
  alamat: string;
  barang: string;
  angsuran: number;
  tenor: number;
  tenorType: string;
}) {
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
      barang: data.barang,
      angsuran: data.angsuran,
      tenor: data.tenor,
      tenorType: data.tenorType,
      stage: 'survey',
      deliveryStatus: 'pending_gudang',
      createdAt: now,
      updatedAt: now
    });

    return { clientId: clientRef.id, orderId: orderRef.id };
}

export async function createRepeatOrder(uid: string, clientId: string, data: {
  barang: string;
  angsuran: number;
  tenor: number;
  tenorType: string;
}) {
    const { getDoc } = await import("firebase/firestore");
    const clientSnap = await getDoc(doc(db, "clients", clientId));
    if (!clientSnap.exists()) throw new Error("Client not found");
    const clientData = clientSnap.data();

    const now = serverTimestamp();
    const orderCount = (clientData.orderCount || 0) + 1;
    
    let customerType = 'baru';
    if (orderCount >= 5) customerType = 'loyal';
    else if (orderCount >= 2) customerType = 'repeat';

    const angsuranNum = Number(data.angsuran || 0);
    const tenorNum = Number(data.tenor || 0);

    // 1. Update Client (History & Meta & Reset Workflow)
    await updateDoc(doc(db, "clients", clientId), {
      orderCount,
      lastOrderAt: now,
      customerType,
      status: 'survey', // reset to active pipeline status
      stage: 'pipeline', // reset to active pipeline stage
      currentStep: 'survey', // reset to survey stage
      orderStatus: 'submitted', // reset order status to submitted
      barang: data.barang || "",
      produk: data.barang || "",
      angsuran: angsuranNum,
      tenor: tenorNum,
      tenorType: data.tenorType || 'bulan',
      omset: angsuranNum * tenorNum,
      survey: {
        status: 'submitted',
        note: '',
        updatedAt: now,
        updatedBy: uid
      },
      warehouse: {
        status: 'pending',
        updatedAt: now,
        updatedBy: ''
      },
      archiveReason: '',
      createdAt: now, // update createdAt so it is sorted at the top of active queues
      updatedAt: now
    });

    // 2. Create Order
    const orderRef = await addDoc(collection(db, "orders"), {
      clientId,
      ownerId: uid,
      nama: clientData.nama,
      nomor: clientData.nomor,
      usaha: clientData.usaha,
      barang: data.barang,
      angsuran: data.angsuran,
      tenor: data.tenor,
      tenorType: data.tenorType,
      stage: 'survey',
      deliveryStatus: 'pending_gudang',
      createdAt: now,
      updatedAt: now
    });

    return orderRef.id;
}

