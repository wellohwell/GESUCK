import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { listUsers, approveUser, rejectUser } from '../services';
import { UserProfile } from '../../auth/types';

export const AdminUserApprovalPage = () => {
    const { profile, allBranchesList } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);

    useEffect(() => {
        if (profile) {
            listUsers(profile).then(setUsers);
        }
    }, [profile]);

    const handleApprove = async (user: UserProfile) => {
        if (!profile) return;
        await approveUser(profile, user.uid, user.requestedRole || 'sales', user.branchId || '');
        setUsers(prev => prev.map(u => u.uid === user.uid ? {...u, status: 'approved'} : u));
    };

    const getBranchName = (bId: string) => {
        return allBranchesList.find(b => b.branchId === bId)?.branchName || bId || 'Unknown';
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">User Approval</h1>
            {users.filter(u => u.status === 'pending').map(user => (
                <div key={user.uid} className="p-4 border rounded mb-2 flex justify-between items-center">
                    <div>
                        <p className="font-bold">{user.name}</p>
                        <p className="text-sm">{user.requestedRole} - {getBranchName(user.branchId || '')}</p>
                    </div>
                    <div className="space-x-2">
                        <button onClick={() => handleApprove(user)} className="bg-green-600 text-white px-3 py-1 rounded">Approve</button>
                        <button onClick={() => rejectUser(profile!, user.uid)} className="bg-red-600 text-white px-3 py-1 rounded">Reject</button>
                    </div>
                </div>
            ))}
        </div>
    );
};

