import { UserStatus } from '../auth/types';

export interface UserRegistrationData {
    name: string;
    phone: string;
    branchId: string;
    requestedRole: 'staff' | 'sales';
}

export type UserAction = 'approve' | 'reject' | 'suspend' | 'activate';
