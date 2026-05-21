import { Timestamp } from "firebase/firestore";

export interface BranchScopedDocument {
    branchId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
}

export interface CustomerDocument extends BranchScopedDocument {
    customerId: string;
    name: string;
    phone: string;
    address: string;
}

export interface OrderDocument extends BranchScopedDocument {
    orderId: string;
    customerId: string;
    item: string;
    tenor: number;
    angsuran: number;
    omset: number;
    status: string;
}

export interface ActivityDocument extends BranchScopedDocument {
    activityId: string;
    type: string;
    message: string;
}
