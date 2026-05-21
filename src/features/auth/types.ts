import { Timestamp } from "firebase/firestore";

export type UserStatus = "pending" | "approved" | "rejected" | "suspended";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  photoURL: string;
  phone: string | null;
  branchId: string | null;
  role: string | null;
  requestedRole: string | null;
  status: UserStatus;
  approvedBy: string | null;
  approvedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
