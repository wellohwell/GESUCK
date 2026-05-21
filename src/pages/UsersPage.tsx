import React, { useState, useEffect } from 'react';
import { Users, Shield, Clock, CheckCircle2, XCircle, Search, MoreVertical, Edit, AlertTriangle } from 'lucide-react';
import { subscribeUsers, updateUserStatusAndRole, useUserProfile } from '../lib/services';
import { normalizeUserProfile, isLegacyUser } from '../features/users/utils/normalizeUserProfile';
import { ROLES } from '../config/roles';
import { cn } from '../lib/utils';
import { toast } from 'react-toastify';

function CustomModal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { profile } = useUserProfile();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [activeTab, setActiveTab] = useState('pending'); // pending, approved, suspended, rejected

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actionType, setActionType] = useState<string | null>(null); // 'approve', 'reject', 'suspend', 'role'
  const [roleInput, setRoleInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = subscribeUsers(data => {
      // Sort newest first
      const sorted = [...data].sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      }).map(doc => {
          const normalized = normalizeUserProfile(doc.id, doc);
          return {
             ...normalized,
             id: doc.id,
             displayName: doc.displayName || normalized.name || 'Unknown',
             _raw: doc
          };
      });
      setUsers(sorted);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !actionType) return;

    // Prevent non-owners from editing owner
    if (selectedUser.role === 'OWNER' && profile?.role !== 'OWNER') {
      toast.error('Only the owner can modify owner accounts');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {};
      let successMsg = '';

      if (actionType === 'approve') {
        payload.status = 'approved';
        payload.role = roleInput;
        successMsg = `User approved as ${roleInput}`;
      } else if (actionType === 'reject') {
        payload.status = 'rejected';
        payload.blockedReason = reasonInput;
        successMsg = 'User rejected';
      } else if (actionType === 'suspend') {
        payload.status = 'suspended';
        payload.blockedReason = reasonInput;
        successMsg = 'User suspended';
      } else if (actionType === 'role') {
        payload.role = roleInput;
        successMsg = `User role changed to ${roleInput}`;
      } else if (actionType === 'normalize') {
        payload.role = selectedUser.role;
        payload.status = selectedUser.status;
        successMsg = 'User strictly normalized to canonical schema';
      }

      await updateUserStatusAndRole(selectedUser.id, payload);
      toast.success(successMsg);
      closeModal();
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
    setActionType(null);
    setRoleInput('');
    setReasonInput('');
  };

  const filteredUsers = users.filter(u => {
    if (u.status !== activeTab) return false;
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!u.displayName?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const stats = {
    pending: users.filter(u => u.status === 'pending').length,
    approved: users.filter(u => u.status === 'approved').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    rejected: users.filter(u => u.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 md:pb-6">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-brand-primary" />
              User Management
            </h1>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mt-1">
              Approval & Role Control
            </p>
          </div>
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
            {['pending', 'approved', 'suspended', 'rejected'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center justify-center gap-2",
                  activeTab === tab 
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                {tab}
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px]",
                  activeTab === tab ? "bg-brand-primary/10 text-brand-primary" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                )}>
                  {stats[tab as keyof typeof stats]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* FILTERS */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium"
            />
          </div>
          {activeTab === 'approved' && (
             <div className="flex flex-none items-center gap-2 overflow-x-auto no-scrollbar">
               {['all', ROLES.SALES, ROLES.SURVEY, ROLES.GUDANG, ROLES.SPV, ROLES.ADMIN_CABANG, ROLES.ADMIN, ROLES.OWNER].map(role => (
                 <button
                   key={role}
                   onClick={() => setFilterRole(role)}
                   className={cn(
                     "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-colors",
                     filterRole === role
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                   )}
                 >
                   {role.replace('_', ' ')}
                 </button>
               ))}
             </div>
          )}
        </div>

        {/* LIST */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />)}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 uppercase tracking-widest text-sm font-bold flex flex-col items-center gap-2">
              <Users className="w-12 h-12 text-zinc-300 dark:text-zinc-800 mb-2" />
              Empty List
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 top-0">
                    <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">User</th>
                    <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest hidden md:table-cell">Details</th>
                    <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status / Role</th>
                    <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <img 
                            src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} 
                            alt={user.displayName}
                            className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800"
                          />
                          <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-white">{user.displayName}</p>
                            <p className="text-xs text-zinc-500">{user.email}</p>
                            <div className="md:hidden mt-2 flex flex-col gap-1">
                               <p className="text-[10px] font-medium text-zinc-400">Wait: {user.createdAt?.toDate()?.toLocaleDateString() || '-'}</p>
                               {user.approvedAt && <p className="text-[10px] font-medium text-emerald-600">Appr: {user.approvedAt?.toDate()?.toLocaleDateString()}</p>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell min-w-[150px]">
                        <div className="space-y-1">
                           <p className="text-xs text-zinc-500 font-medium">Joined: {user.createdAt?.toDate()?.toLocaleDateString() || '-'}</p>
                           {user.approvedAt && <p className="text-xs text-emerald-600 font-medium whitespace-nowrap">Approved: {user.approvedAt?.toDate()?.toLocaleDateString()}</p>}
                           <p className="text-[10px] text-zinc-400 font-medium">Last Login: {user.lastLogin?.toDate()?.toLocaleDateString() || '-'}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-start gap-2">
                          <div className="flex items-center gap-1.5">
                            {user.status === 'approved' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            {user.status === 'pending' && <Clock className="w-4 h-4 text-amber-500" />}
                            {user.status === 'suspended' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                            {user.status === 'rejected' && <XCircle className="w-4 h-4 text-red-500" />}
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                              {user.status}
                            </span>
                          </div>
                          {user.role && (
                             <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-[9px] font-black uppercase tracking-wider border border-zinc-200 dark:border-zinc-700">
                               {user.role}
                             </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col md:flex-row items-end md:justify-end gap-2">
                          {activeTab === 'pending' && (
                            <>
                              <button onClick={() => { setSelectedUser(user); setActionType('approve'); setRoleInput(ROLES.SALES); }} className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors w-full md:w-auto">Approve</button>
                              <button onClick={() => { setSelectedUser(user); setActionType('reject'); }} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-600 dark:text-zinc-400 hover:text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors w-full md:w-auto">Reject</button>
                            </>
                          )}
                          {activeTab === 'approved' && (
                            <>
                              <button onClick={() => { setSelectedUser(user); setActionType('role'); setRoleInput(user.role || ROLES.SALES); }} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1 w-full md:w-auto">
                                <Edit className="w-3 h-3" /> Role
                              </button>
                              <button onClick={() => { setSelectedUser(user); setActionType('suspend'); }} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-orange-50 dark:hover:bg-orange-500/10 text-zinc-600 dark:text-zinc-400 hover:text-orange-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors w-full md:w-auto flex items-center justify-center gap-1">
                                <Shield className="w-3 h-3" /> Suspend
                              </button>
                              {isLegacyUser(user._raw) && (
                                <button onClick={() => { setSelectedUser(user); setActionType('normalize'); }} className="px-3 py-1 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors w-full md:w-auto">
                                  Normalize
                                </button>
                              )}
                            </>
                          )}
                          {(activeTab === 'suspended' || activeTab === 'rejected') && (
                            <button onClick={() => { setSelectedUser(user); setActionType('approve'); setRoleInput(user.role || ROLES.SALES); }} className="px-3 py-1 bg-zinc-900 dark:bg-white hover:opacity-90 text-white dark:text-zinc-900 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors w-full md:w-auto">
                              Restore / Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ACTION MODAL */}
      <CustomModal isOpen={!!selectedUser} onClose={closeModal} title="Confirm Action">
        {selectedUser && (
          <form onSubmit={handleAction} className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl mb-4">
              <img src={selectedUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUser.displayName}`} alt="" className="w-10 h-10 rounded-full" />
              <div>
                <p className="text-sm font-bold">{selectedUser.displayName}</p>
                <p className="text-xs text-zinc-500">{selectedUser.email}</p>
              </div>
            </div>

            {(actionType === 'approve' || actionType === 'role') && (
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Select Role</label>
                <select 
                  value={roleInput}
                  onChange={e => setRoleInput(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-brand-primary/20 appearance-none"
                >
                  <option value={ROLES.SALES}>Sales</option>
                  <option value={ROLES.SURVEY}>Survey</option>
                  <option value={ROLES.GUDANG}>Gudang</option>
                  <option value={ROLES.SPV}>Supervisor (SPV)</option>
                  <option value={ROLES.ADMIN_CABANG}>Admin Cabang</option>
                  <option value={ROLES.ADMIN}>Admin</option>
                  {profile?.role === ROLES.OWNER && <option value={ROLES.OWNER}>Owner</option>}
                </select>
              </div>
            )}

            {(actionType === 'reject' || actionType === 'suspend') && (
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Reason (Optional)</label>
                <input 
                  type="text"
                  value={reasonInput}
                  onChange={e => setReasonInput(e.target.value)}
                  placeholder="e.g. Incomplete data"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            )}

            <div className="pt-2 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={closeModal}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white flex items-center justify-center min-w-[120px] transition-all relative overflow-hidden",
                  actionType === 'approve' ? "bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)]" :
                  actionType === 'reject' ? "bg-red-500 hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.3)]" :
                  actionType === 'suspend' ? "bg-orange-500 hover:bg-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.3)]" :
                  "bg-brand-primary hover:bg-brand-primary/90 shadow-[0_0_15px_rgba(var(--brand-primary),0.3)]"
                )}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin absolute" />
                ) : (
                  <span className="relative z-10">Confirm {actionType}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </CustomModal>
    </div>
  );
}
