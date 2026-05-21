import React, { useState } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { completeOnboarding } from '../services';
import { branches } from '../../../config/branches';
import { useNavigate } from 'react-router-dom';

export const OnboardingPage = () => {
    const { profile, firebaseUser } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: profile?.name || '',
        phone: '',
        branchId: '',
        requestedRole: 'sales' as 'admin_cabang' | 'sales',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firebaseUser) return;
        await completeOnboarding(firebaseUser.uid, formData);
        navigate('/');
    };

    return (
        <div className="p-6 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Complete Onboarding</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full Name" className="w-full p-2 border rounded" required />
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Phone Number" className="w-full p-2 border rounded" required />
                <select value={formData.branchId} onChange={e => setFormData({...formData, branchId: e.target.value})} className="w-full p-2 border rounded" required>
                    <option value="">Select Branch</option>
                    {Object.values(branches).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select value={formData.requestedRole} onChange={e => setFormData({...formData, requestedRole: e.target.value as any})} className="w-full p-2 border rounded">
                    <option value="sales">Sales</option>
                    <option value="admin_cabang">Admin Cabang</option>
                </select>
                <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">Submit Request</button>
            </form>
        </div>
    );
};
