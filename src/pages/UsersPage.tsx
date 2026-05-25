import React, { useState, useEffect } from 'react';
import { Users, Shield, Clock, CheckCircle2, XCircle, Search, MoreVertical, Edit, AlertTriangle, ChevronDown, MapPin } from 'lucide-react';
import { subscribeUsers, updateUserStatusAndRole, updateUser, useUserProfile } from '../lib/services';
import { normalizeUserProfile } from '../features/users/utils/normalizeUserProfile';
import { ROLES } from '../config/roles';
import { PERMISSIONS } from '../config/permissions';
import { cn } from '../lib/utils';
import { toast } from 'react-toastify';
import { useRuntime } from '../providers/RuntimeProvider';

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
  const { activeBranchContext, branch } = useRuntime();
  
  const isStaff = profile?.role?.toLowerCase() === ROLES.STAFF;
  const targetBranchContext = isStaff ? profile?.branchId : activeBranchContext;
  const contextLabel = targetBranchContext ? (branch?.name || targetBranchContext) : 'GLOBAL / SEMUA CABANG';

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); 

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actionType, setActionType] = useState<string | null>(null); 
  const [roleInput, setRoleInput] = useState('');
  const [permissionsInput, setPermissionsInput] = useState<string[]>([]);
  const [reasonInput, setReasonInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeUsers(data => {
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
    }, targetBranchContext);

    return () => unsub();
  }, [targetBranchContext]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !actionType) return;

    if (selectedUser.role === 'OWNER' && profile?.role !== 'OWNER') {
      toast.error('Only the owner can modify owner accounts');
      return;
    }

    if (profile?.role === ROLES.STAFF && selectedUser.branchId !== profile.branchId) {
       toast.error('Anda tidak memiliki izin memodifikasi user dari cabang lain.');
       return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {};
      let successMsg = '';

      if (actionType === 'approve') {
        payload.status = 'approved';
        payload.role = roleInput;
        payload.permissions = permissionsInput;
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
        payload.permissions = permissionsInput;
        successMsg = `User role changed to ${roleInput}`;
      } else if (actionType === 'rename') {
        payload.displayName = roleInput;
        successMsg = `User name changed to ${roleInput}`;
        await updateUser(selectedUser.id, payload);
        toast.success(successMsg);
        closeModal();
        return;
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
    if (filterStatus !== 'all' && u.status !== filterStatus) return false;
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!u.displayName?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'approved': return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
      case 'pending': return <Clock className="w-3 h-3 text-amber-500" />;
      case 'suspended': return <AlertTriangle className="w-3 h-3 text-orange-500" />;
      case 'rejected': return <XCircle className="w-3 h-3 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="w-full bg-transparent pb-24 md:pb-6 font-sans">
      
      {/* HEADER WITH CONTEXT */}
      <div className="bg-white dark:bg-zinc-900 sticky top-0 z-40">
        <div className="bg-zinc-900 dark:bg-black text-[10px] font-black tracking-widest text-white uppercase py-1.5 px-4 md:px-6 flex items-center gap-2">
          <MapPin className="w-3 h-3 text-brand-primary" />
          <span>KONTEKS: {contextLabel}</span>
          {isStaff && (
            <span className="ml-2 opacity-50 font-mono invisible md:visible">(ROLE: STAFF - FILTERING BY BRANCH)</span>
          )}
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-brand-primary" />
              Users
            </h1>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mt-1">
              Operational Management
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* DROPDOWN FILTERS & SEARCH */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium"
            />
          </div>
          
          <div className="flex flex-row gap-3 overflow-x-auto w-full md:w-auto shrink-0 pb-1 md:pb-0">
             <div className="relative min-w-[140px] flex-1 md:flex-none">
                <select 
                   value={filterStatus}
                   onChange={(e) => setFilterStatus(e.target.value)}
                   className="w-full appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                   <option value="all">All Status</option>
                   <option value="pending">Pending</option>
                   <option value="approved">Approved</option>
                   <option value="suspended">Suspended</option>
                   <option value="rejected">Rejected</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
             </div>
             <div className="relative min-w-[150px] flex-1 md:flex-none">
                <select 
                   value={filterRole}
                   onChange={(e) => setFilterRole(e.target.value)}
                   className="w-full appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                   <option value="all">All Roles</option>
                   <option value={ROLES.SALES}>Sales</option>
                   <option value={ROLES.SURVEY}>Survey</option>
                   <option value={ROLES.GUDANG}>Gudang</option>
                   <option value={ROLES.SPV}>Supervisor (SPV)</option>
                   <option value={ROLES.STAFF}>Staff</option>
                   <option value={ROLES.MANAGER}>Manager</option>
                   <option value={ROLES.OWNER}>Owner</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
             </div>
          </div>
        </div>

        {/* LIST - HYBRID RESPONSIVE LAYOUT */}
        <div className="bg-transparent md:bg-white md:dark:bg-zinc-900 md:rounded-3xl md:overflow-hidden md:shadow-sm">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />)}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-16 text-center text-zinc-400 uppercase tracking-widest text-xs font-bold flex flex-col items-center gap-3">
              <Users className="w-8 h-8 opacity-20" />
              Tidak ada pengguna ditemukan
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                      <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pengguna</th>
                      <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Detail & Cabang</th>
                      <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status / Role</th>
                      <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} 
                              alt={user.displayName}
                              className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white"
                            />
                            <div>
                              <p className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">{user.displayName}</p>
                              <p className="text-xs text-zinc-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                             <div className="flex items-center gap-1.5 text-xs">
                               <MapPin className="w-3 h-3 text-zinc-400" />
                               <span className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">{user.branchId || 'GLOBAL'}</span>
                             </div>
                             <p className="text-[10px] text-zinc-400 font-medium">Joined: {user.createdAt?.toDate()?.toLocaleDateString() || '-'}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-start gap-1.5">
                            <div className="flex items-center gap-1.5">
                              {getStatusIcon(user.status)}
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                                {user.status}
                              </span>
                            </div>
                            {user.role && (
                               <div className="flex items-center gap-1">
                                 <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-[9px] font-black uppercase tracking-wider border border-zinc-200 dark:border-zinc-700">
                                   {user.role}
                                 </span>
                                 <button 
                                   onClick={() => { setSelectedUser(user); setActionType('rename'); setRoleInput(user.displayName); }} 
                                   className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-brand-primary rounded transition-colors"
                                   title="Rename User"
                                 >
                                   <Edit className="w-3 h-3" />
                                 </button>
                               </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                              {user.status === 'pending' || user.status === 'rejected' || user.status === 'suspended' ? (
                                <div className="flex items-center gap-2">
                                   {(user.status === 'pending' || user.status === 'suspended') && (
                                     <button onClick={() => { setSelectedUser(user); setActionType('reject'); }} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-600 dark:text-zinc-400 hover:text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">Tolak</button>
                                   )}
                                   <button onClick={() => { setSelectedUser(user); setActionType('approve'); setRoleInput(user.role || ROLES.SALES); setPermissionsInput(user.permissions || []); }} className="px-3 py-1 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">
                                     Approve
                                   </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button onClick={() => { setSelectedUser(user); setActionType('role'); setRoleInput(user.role || ROLES.SALES); setPermissionsInput(user.permissions || []); }} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                                    <Edit className="w-3 h-3" /> Role
                                  </button>
                                  <button onClick={() => { setSelectedUser(user); setActionType('suspend'); }} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-orange-50 dark:hover:bg-orange-500/10 text-zinc-600 dark:text-zinc-400 hover:text-orange-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> Suspend
                                  </button>
                                </div>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="md:hidden flex flex-col gap-3">
                 {filteredUsers.map(user => (
                   <div key={user.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                         <div className="flex items-center gap-3 w-full min-w-0">
                           <img 
                              src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} 
                              alt={user.displayName}
                              className="w-12 h-12 shrink-0 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white"
                           />
                           <div className="flex flex-col min-w-0">
                             <div className="flex gap-2 items-center flex-wrap">
                               <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{user.displayName}</p>
                               {user.role && (
                                  <div className="flex items-center gap-1">
                                    <span className="px-1.5 py-[2px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-[8px] font-black uppercase tracking-wider border border-zinc-200 dark:border-zinc-700">
                                      {user.role}
                                    </span>
                                    <button 
                                      onClick={() => { setSelectedUser(user); setActionType('rename'); setRoleInput(user.displayName); }} 
                                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-brand-primary rounded transition-colors"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                  </div>
                               )}
                             </div>
                             <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                             <div className="flex items-center gap-1.5 mt-1">
                               <MapPin className="w-3 h-3 text-brand-primary/70" />
                               <span className="text-[10px] font-bold text-zinc-400 mt-0.5 tracking-widest uppercase">Cabang: {user.branchId || 'GLOBAL'}</span>
                             </div>
                           </div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between pt-3">
                         <div className="flex items-center gap-1.5">
                            {getStatusIcon(user.status)}
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mt-0.5">
                              {user.status}
                            </span>
                         </div>
                         
                         <div className="flex gap-2 items-center">
                            {user.status === 'pending' || user.status === 'rejected' || user.status === 'suspended' ? (
                              <>
                                {(user.status === 'pending' || user.status === 'suspended') && (
                                  <button onClick={() => { setSelectedUser(user); setActionType('reject'); }} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-[9px] font-black uppercase tracking-widest">Tolak</button>
                                )}
                                <button onClick={() => { setSelectedUser(user); setActionType('approve'); setRoleInput(user.role || ROLES.SALES); setPermissionsInput(user.permissions || []); }} className="px-4 py-1.5 bg-brand-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Approve</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setSelectedUser(user); setActionType('role'); setRoleInput(user.role || ROLES.SALES); setPermissionsInput(user.permissions || []); }} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-[9px] font-black uppercase tracking-widest">Role</button>
                                <button onClick={() => { setSelectedUser(user); setActionType('suspend'); }} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-[9px] font-black uppercase tracking-widest">Suspend</button>
                              </>
                            )}
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ACTION MODAL */}
      <CustomModal isOpen={!!selectedUser} onClose={closeModal} title="Konfirmasi Aksi">
        {selectedUser && (
          <form onSubmit={handleAction} className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl mb-4 border border-zinc-100 dark:border-zinc-700/50">
              <img src={selectedUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUser.displayName}`} alt="" className="w-10 h-10 rounded-full" />
              <div>
                <p className="text-sm font-bold">{selectedUser.displayName}</p>
                <p className="text-[10px] font-black text-zinc-400 tracking-widest mt-0.5 uppercase">Cabang: {selectedUser.branchId || 'GLOBAL'}</p>
              </div>
            </div>

            {(actionType === 'approve' || actionType === 'role' || actionType === 'rename') && (
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">
                  {actionType === 'rename' ? 'Nama Baru' : 'Pilih Role'}
                </label>
                <div className="relative">
                  {actionType === 'rename' ? (
                     <input 
                       type="text" 
                       value={roleInput} 
                       onChange={e => setRoleInput(e.target.value)}
                       className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-brand-primary/20"
                     />
                  ) : (
                    <select 
                      value={roleInput}
                      onChange={e => setRoleInput(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-brand-primary/20 appearance-none"
                    >
                      <option value={ROLES.SALES}>Sales</option>
                      <option value={ROLES.SURVEY}>Survey</option>
                      <option value={ROLES.GUDANG}>Gudang</option>
                      <option value={ROLES.SPV}>Supervisor (SPV)</option>
                      <option value={ROLES.STAFF}>Staff</option>
                      <option value={ROLES.MANAGER}>Manager</option>
                      {profile?.role === ROLES.OWNER && <option value={ROLES.OWNER}>Owner</option>}
                    </select>
                  )}
                  {actionType !== 'rename' && <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />}
                </div>

                {actionType !== 'rename' && (
                  <div className="mt-4">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1 mb-2 block">
                      Permissions (Opsional)
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1 select-none">
                      {Object.values(PERMISSIONS).map(perm => {
                        const isChecked = permissionsInput.includes(perm);
                        return (
                          <label key={perm} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-700/50 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary/20 accent-brand-primary"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) setPermissionsInput([...permissionsInput, perm]);
                                else setPermissionsInput(permissionsInput.filter(p => p !== perm));
                              }}
                            />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                              {perm}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(actionType === 'reject' || actionType === 'suspend') && (
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Alasan (Opsional)</label>
                <input 
                  type="text"
                  value={reasonInput}
                  onChange={e => setReasonInput(e.target.value)}
                  placeholder="e.g. Data tidak valid"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 font-medium"
                />
              </div>
            )}

            <div className="pt-4 flex justify-end gap-3 mt-6 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                type="button" 
                onClick={closeModal}
                className="px-4 py-2 mt-4 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "px-6 py-2 mt-4 rounded-xl text-[11px] font-black uppercase tracking-widest text-white flex items-center justify-center min-w-[120px] transition-all relative overflow-hidden",
                  actionType === 'approve' ? "bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)]" :
                  actionType === 'reject' ? "bg-red-500 hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.3)]" :
                  actionType === 'suspend' ? "bg-orange-500 hover:bg-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.3)]" :
                  actionType === 'rename' ? "bg-blue-500 hover:bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.3)]" :
                  "bg-brand-primary hover:bg-brand-primary/90 shadow-[0_0_15px_rgba(var(--brand-primary),0.3)]"
                )}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin absolute" />
                ) : (
                  <span className="relative z-10">Konfirmasi {actionType}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </CustomModal>
    </div>
  );
}
