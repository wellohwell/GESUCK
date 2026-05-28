import React from "react";
import { motion } from "motion/react";
import { Trash2, ChevronDown, Clock, MapPin, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { toast } from "../../hooks/use-toast";
import { updateUser } from "../../lib/services";
import { toTitleCase } from "../../utils/format";
import dayjs from "dayjs";
import "dayjs/locale/id";
import relativeTime from "dayjs/plugin/relativeTime";
import { useOutletContext } from "react-router-dom";

dayjs.extend(relativeTime);
dayjs.locale("id");

export default function AdminUserPage() {
  const { users, assignments, handleSelectUser } = useOutletContext<any>();
  
  return (
      <UserManagementView 
        users={users} 
        assignments={assignments} 
        onSelectUser={handleSelectUser} 
      />
  );
}

export function UserManagementView({ users, assignments, onSelectUser }: any) {
  const updateUserRoleAndStatus = async (
    uid: string,
    role: string,
    status: string,
    displayName?: string,
  ) => {
    try {
      const data: any = { role, status };
      if (displayName !== undefined) data.displayName = displayName;
      await updateUser(uid, data);
      toast.success("User updated!");
    } catch (e) {
      toast.error("Failed to update user");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
    >
      <div className="bg-transparent md:bg-card md:dark:bg-card/[0.02] md:rounded-[1.5rem] md:overflow-hidden md:border md:border-zinc-100 md:dark:border-white/10 md:shadow-xl transition-colors">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-card/[0.05] text-sm  tracking-tight text-zinc-400 dark:text-white/60">
                <th className="px-6 py-4 font-medium text-sm">User Detail</th>
                <th className="px-6 py-4 font-medium text-sm">Aktivitas</th>
                <th className="px-6 py-4 font-medium text-sm">Akses & Status</th>
                <th className="px-6 py-4 font-medium text-sm w-12 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {users.map((u: any) => {
                const userPlans = assignments.filter((a: any) => a.userId === u.id);
                const isSelected = userPlans.length > 0;
                const lastLoginFormatted = u.lastLogin?.toDate 
                  ? dayjs(u.lastLogin.toDate()).format("dddd, D MMMM YYYY - HH:mm") 
                  : "-";
                
                return (
                  <tr
                    key={u.id}
                    onClick={() => onSelectUser(u)}
                    className="hover:bg-zinc-50 dark:hover:bg-card/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 flex-shrink-0 rounded-full bg-zinc-100 dark:bg-card/10 p-0.5">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="w-full h-full rounded-full ring-1 ring-white/10" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-zinc-200 dark:bg-card/5 flex items-center justify-center text-sm font-medium text-zinc-400">
                              {u.displayName?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            defaultValue={u.displayName}
                            onBlur={(e) => {
                              const titleVal = toTitleCase(e.target.value);
                              e.target.value = titleVal;
                              updateUserRoleAndStatus(u.id, u.role, u.status, titleVal);
                            }}
                            className="font-medium text-[13px] text-zinc-900 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-brand-primary/40 transition-colors w-full h-5 leading-none"
                          />
                          <p className="text-[10px] font-bold text-zinc-400 dark:text-white/10 tracking-widest uppercase mt-0.5">{u.role || "SPV"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-zinc-600 dark:text-white/60">{lastLoginFormatted}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-black text-zinc-400 mt-0.5 tracking-[0.2em] uppercase">Pasar:</span>
                          <div className="flex flex-col gap-1">
                            {isSelected ? (
                              userPlans.map((plan: any) => (
                                <span key={plan.id} className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">
                                  {plan.marketName}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 w-fit">
                                BELUM
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <div className="relative w-28">
                          <select
                            value={u.role || "SPV"}
                            onChange={(e) => updateUserRoleAndStatus(u.id, e.target.value, u.status || "active")}
                            className="w-full bg-zinc-100 dark:bg-card/5 border border-border/50 dark:border-white/10 px-2 py-1.5 rounded-lg text-sm font-medium outline-none focus:border-brand-primary/40 text-zinc-900 dark:text-white appearance-none cursor-pointer"
                          >
                            <option value="MANAGER" className="bg-zinc-900 text-white">Manager</option>
                            <option value="SPV" className="bg-zinc-900 text-white">SPV</option>
                            <option value="Sales" className="bg-zinc-900 text-white">Sales</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
                        </div>
                        <div className="relative w-28">
                          <select
                            value={u.status || "pending"}
                            onChange={(e) => updateUserRoleAndStatus(u.id, u.role || "SPV", e.target.value)}
                            className={cn(
                              "w-full px-2 py-1.5 rounded-lg text-sm font-medium border outline-none appearance-none cursor-pointer transition-all",
                              u.status === "approved"
                                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                : u.status === "rejected"
                                  ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400"
                                  : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-500",
                            )}
                          >
                            <option value="approved" className="bg-zinc-900 text-emerald-400">Approved</option>
                            <option value="pending" className="bg-zinc-900 text-amber-500">Pending</option>
                            <option value="rejected" className="bg-zinc-900 text-red-500">Rejected</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40 pointer-events-none" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={async () => {
                          const { removeUser } = await import("../../lib/services");
                          try {
                            await removeUser(u.id);
                            toast.success("User deleted successfully.");
                          } catch (error) {
                            toast.error("Failed to delete user.");
                          }
                        }}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Hapus User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-zinc-100 dark:divide-white/[0.05] px-1">
          {users.map((u: any) => {
            const userPlans = assignments.filter((a: any) => a.userId === u.id);
            const isSelected = userPlans.length > 0;
            const lastLoginFormatted = u.lastLogin?.toDate 
              ? dayjs(u.lastLogin.toDate()).format("ddd, D MMM - HH:mm") 
              : "-";

            return (
              <div 
                key={u.id} 
                onClick={() => onSelectUser(u)}
                className="py-2 flex gap-3 items-center hover:bg-zinc-50 dark:hover:bg-card/[0.01] active:bg-zinc-100 dark:active:bg-card/[0.02] transition-colors px-2 cursor-pointer"
              >
                <div className="w-9 h-9 flex-shrink-0 rounded-full bg-zinc-100 dark:bg-card/10 p-0.5 border border-border/50 dark:border-white/20">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="" className="w-full h-full rounded-full ring-1 ring-white/10" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-zinc-200 dark:bg-card/5 flex items-center justify-center text-sm font-medium text-zinc-400">
                      {u.displayName?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          defaultValue={u.displayName}
                          onBlur={(e) => {
                            const titleVal = toTitleCase(e.target.value);
                            e.target.value = titleVal;
                            updateUserRoleAndStatus(u.id, u.role, u.status, titleVal);
                          }}
                          className="font-medium text-[12px] text-zinc-900 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-brand-primary/40 transition-colors w-full h-4 leading-none"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-muted-foreground/30 truncate text-left uppercase tracking-tight">
                        <span>{u.role || "SPV"}</span>
                        <span className="opacity-30">•</span>
                        <span className="text-primary/60 font-mono tracking-tighter">{lastLoginFormatted}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2 mt-0.5">
                      {isSelected ? (
                        userPlans.map((plan: any) => (
                          <div key={plan.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">
                            {plan.marketName}
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500">
                          BELUM
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
                    <div className="relative flex-1">
                        <select
                          value={u.role || "SPV"}
                          onChange={(e) => updateUserRoleAndStatus(u.id, e.target.value, u.status || "approved")}
                          className="w-full bg-zinc-50 dark:bg-card/5 border border-zinc-100 dark:border-white/10 px-1 py-1 rounded-md text-xs font-medium outline-none text-zinc-900 dark:text-white appearance-none cursor-pointer"
                        >
                          <option value="MANAGER" className="bg-zinc-900 text-white">Manager</option>
                          <option value="SPV" className="bg-zinc-900 text-white">SPV</option>
                          <option value="Sales" className="bg-zinc-900 text-white">Sales</option>
                        </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
                    </div>
                    <div className="relative flex-1">
                        <select
                          value={u.status || "pending"}
                          onChange={(e) => updateUserRoleAndStatus(u.id, u.role || "SPV", e.target.value)}
                          className={cn(
                            "w-full px-1 py-1 rounded-md text-xs font-medium border outline-none appearance-none cursor-pointer transition-all",
                            u.status === "approved"
                              ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : u.status === "rejected"
                                ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400"
                                : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-500",
                          )}
                        >
                          <option value="approved" className="bg-zinc-900 text-emerald-400">Approved</option>
                          <option value="pending" className="bg-zinc-900 text-amber-500">Pending</option>
                          <option value="rejected" className="bg-zinc-900 text-red-500">Rejected</option>
                        </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40 pointer-events-none" />
                    </div>
                    
                    <button
                      onClick={async () => {
                        const { removeUser } = await import("../../lib/services");
                        try {
                          await removeUser(u.id);
                          toast.success("User deleted successfully.");
                        } catch (error) {
                          toast.error("Failed to delete user.");
                        }
                      }}
                      className="p-1 px-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors flex-shrink-0"
                      title="Hapus User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export function UserDetailContent({ user, assignments }: any) {
  const lastLoginFormatted = user.lastLogin?.toDate 
    ? dayjs(user.lastLogin.toDate()).format("dddd, D MMMM YYYY - HH:mm") 
    : "-";

  return (
    <>
      <div className="flex flex-col">
        <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-100 dark:bg-card/10 p-1 border border-border/50 dark:border-white/10">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full rounded-[1.25rem] object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full rounded-[1.25rem] bg-zinc-200 dark:bg-card/5 flex items-center justify-center text-2xl font-bold text-zinc-400">
                {user.displayName?.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">{user.displayName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-brand-primary text-white uppercase tracking-widest leading-none">
                {user.role || "SPV"}
              </span>
              <span className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-tight",
                user.status === "approved" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
              )}>
                {user.status || "PENDING"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-[1.5rem] bg-zinc-50 dark:bg-card/[0.02] border border-zinc-100 dark:border-white/5">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Terakhir Login</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{lastLoginFormatted}</p>
                </div>
              </div>

              <div className="p-4 rounded-[1.5rem] bg-zinc-50 dark:bg-card/[0.02] border border-zinc-100 dark:border-white/5">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Penugasan Hari Ini</p>
                {assignments.length > 0 ? (
                  <div className="space-y-2">
                    {assignments.map((plan: any) => (
                      <div key={plan.id} className="flex items-center justify-between p-2 rounded-[1.25rem] bg-background border border-border">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-white">{plan.marketName}</p>
                            <p className="text-[10px] font-medium text-zinc-500">{plan.city}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {plan.createdAt?.toDate ? dayjs(plan.createdAt.toDate()).format("HH:mm") : "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-zinc-400 italic text-xs">
                    <AlertCircle className="w-4 h-4" />
                    <span>Belum ada rencana kunjungan</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    </>
  );
}

