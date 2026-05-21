import React from 'react';

export const UnauthorizedState = () => <div className="p-4 text-center text-red-600">Access Denied: You do not have permission to view this page.</div>;
export const PendingApprovalState = () => <div className="p-4 text-center text-amber-600">Your account is currently pending approval. Please contact an administrator.</div>;
export const SuspendedState = () => <div className="p-4 text-center text-red-800">Account Suspended. Please contact support.</div>;
export const RejectedState = () => <div className="p-4 text-center text-red-600">Account Rejected. Please contact support.</div>;
