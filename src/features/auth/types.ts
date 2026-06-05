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
  roleIds?: string[];
  permissions?: string[];
  requestedRole: string | null;
  status: UserStatus;
  approvedBy: string | null;
  approvedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userType?: "branch" | "global" | null;
  globalRole?: "owner" | "developer" | "superadmin" | null;
  notifications?: {
    visitPlanReminder?: boolean;
    [key: string]: any;
  };
}
