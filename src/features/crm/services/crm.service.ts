import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { Customer, OrderEntity } from '../types/crm.types';
import { getUserProfile } from '../../auth/services';
import { handleFirestoreError, OperationType } from '../../../lib/services';

export const crmService = {
  // Safe duplicate detection string normalize
  normalizeSearchString: (str: string) => {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  },

  async searchCustomersByPhone(phone: string, branchId?: string): Promise<Customer[]> {
    try {
      const q = query(
        collection(db, "clients"), 
        where("nomor", "==", phone)
      );
      const snap = await getDocs(q);
      
      // Future: filter by branchId if branch scoped CRM is strict
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "clients/search");
    }
  },

  async createCustomer(data: Partial<Customer>): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Unauthorized");

    try {
      const phone = data.phone || data.nomor || "";
      if (phone) {
        // Duplicate detection
        const existing = await this.searchCustomersByPhone(phone, data.branchId);
        if (existing.length > 0) {
          // Return existing customer ID instead of duplicating
          return existing[0].id!;
        }
      }

      const now = serverTimestamp();
      
      // Data Governance: Auto-resolve branchId from creator profile if omitted
      let resolvedBranchId = data.branchId || null;
      if (!resolvedBranchId) {
        const creatorProfile = await getUserProfile(uid);
        resolvedBranchId = creatorProfile?.branchId || null;
      }
      
      const customerData = {
        ownerId: uid, // legacy support
        createdBy: uid,
        nama: data.name || data.nama || "",
        nomor: phone,
        usaha: data.businessName || data.usaha || "",
        alamat: data.address || data.alamat || "",
        orderCount: 0,
        totalOrders: 0,
        customerType: 'lead',
        status: 'lead',
        createdAt: now,
        updatedAt: now,
        branchId: resolvedBranchId
      };

      const docRef = await addDoc(collection(db, "clients"), customerData);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "clients");
    }
  },

  async updateCustomer(customerId: string, data: Partial<Customer>) {
    try {
      const updatePayload = {
        ...data,
        updatedAt: serverTimestamp()
      };
      await updateDoc(doc(db, "clients", customerId), updatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${customerId}`);
    }
  },

  async createOrder(customerId: string, orderData: Partial<OrderEntity>) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Unauthorized");

    try {
      const now = serverTimestamp();

      // Fetch customer details for denormalization
      const clientSnap = await getDoc(doc(db, "clients", customerId));
      if (!clientSnap.exists()) throw new Error("Customer not found");
      const clientData = clientSnap.data() as Customer;

      const newOrderCount = (clientData.orderCount || clientData.totalOrders || 0) + 1;
      let customerType = 'lead';
      if (newOrderCount >= 3) customerType = 'repeat_order';
      else if (newOrderCount > 0) customerType = 'active';

      // 1. Update customer
      await updateDoc(doc(db, "clients", customerId), {
        orderCount: newOrderCount,
        totalOrders: newOrderCount,
        lastOrderAt: now,
        latestOrderAt: now,
        customerType,
        status: customerType,
        updatedAt: now
      });

      // Data Governance: Auto-resolve branchId from creator/client
      let resolvedBranchId = orderData.branchId || clientData.branchId || null;
      if (!resolvedBranchId) {
        const creatorProfile = await getUserProfile(uid);
        resolvedBranchId = creatorProfile?.branchId || null;
      }

      // 2. Create Order
      const orderPayload = {
        clientId: customerId, // legacy support
        customerId: customerId,
        ownerId: uid, // legacy support
        createdBy: uid,
        nama: clientData.nama || clientData.name,
        nomor: clientData.nomor || clientData.phone,
        usaha: clientData.usaha || clientData.businessName,
        alamat: clientData.alamat || clientData.address,
        barang: orderData.itemName || orderData.barang,
        angsuran: orderData.installment || orderData.angsuran,
        tenor: orderData.tenor,
        tenorType: orderData.tenorType || 'bulan',
        stage: 'survey',
        status: 'survey',
        createdAt: now,
        updatedAt: now,
        branchId: resolvedBranchId
      };

      const orderRef = await addDoc(collection(db, "orders"), orderPayload);
      return orderRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "orders");
    }
  },

  async createRepeatOrder(customerId: string, data: Partial<OrderEntity>) {
    return this.createOrder(customerId, data);
  }
};
