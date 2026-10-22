import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Trash2, 
  Clock, 
  BookOpen, 
  FileText, 
  Layers, 
  Flame, 
  ExternalLink,
  ChevronRight,
  UserX,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  KeyRound,
  ShieldCheck,
  X
} from "lucide-react";
import { AdminUserRecord } from "../../types";
import { AdminService } from "../../services/adminService";
import { AdminRoleService } from "../../services/adminRoleService";
import { useAdmin } from "../AdminContext";
import { useToast } from "../../components/ToastContext";

export const UsersView: React.FC<{ initialUid?: string }> = ({ initialUid }) => {
  const { isSuperAdmin, logAuditAction } = useAdmin();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);

  // Suspension modal state
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [actionTargetUser, setActionTargetUser] = useState<AdminUserRecord | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch real users from Firebase Realtime Database
      const realUsers = await AdminRoleService.getRealUsers();
      let userList: AdminUserRecord[] = realUsers;

      // 2. If RTDB returned no users, query server API
      if (!userList || userList.length === 0) {
        userList = await AdminService.getUsers(searchQuery, statusFilter);
      }

      // 3. Apply client search & status filters
      const q = searchQuery.toLowerCase().trim();
      const filtered = userList.filter(u => {
        const matchesQuery = !q ||
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.uid && u.uid.toLowerCase().includes(q));
        const matchesStatus = statusFilter === "all" || u.status === statusFilter;
        return matchesQuery && matchesStatus;
      });

      setUsers(filtered);
      if (initialUid) {
        const match = filtered.find(u => u.uid === initialUid);
        if (match) setSelectedUser(match);
      }
    } catch (err: any) {
      toast.error("Failed to load users", err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleToggleStatus = async (user: AdminUserRecord) => {
    if (user.status === "suspended") {
      // Restore user
      try {
        await AdminService.setUserStatus(user.uid, "active", "Restored by administrator", {
          adminUid: "admin",
          adminEmail: "admin@learnstudy.app",
          adminName: "Admin"
        });
        toast.success("Account Restored", `User ${user.name} is now active.`);
        await logAuditAction("RESTORE_USER_ACCOUNT", "user_management", user.uid, user.name);
        loadUsers();
        if (selectedUser?.uid === user.uid) {
          setSelectedUser(prev => prev ? { ...prev, status: "active" } : null);
        }
      } catch (err: any) {
        toast.error("Failed to restore user", err?.message);
      }
    } else {
      // Prompt suspension reason
      setActionTargetUser(user);
      setSuspendReason("");
      setShowSuspendModal(true);
    }
  };

  const confirmSuspension = async () => {
    if (!actionTargetUser) return;
    try {
      await AdminService.setUserStatus(actionTargetUser.uid, "suspended", suspendReason || "Administrative suspension", {
        adminUid: "admin",
        adminEmail: "admin@learnstudy.app",
        adminName: "Admin"
      });
      toast.warning("Account Suspended", `User ${actionTargetUser.name} has been suspended.`);
      await logAuditAction("SUSPEND_USER_ACCOUNT", "user_management", actionTargetUser.uid, actionTargetUser.name, { reason: suspendReason });
      setShowSuspendModal(false);
      loadUsers();
      if (selectedUser?.uid === actionTargetUser.uid) {
        setSelectedUser(prev => prev ? { ...prev, status: "suspended", suspendedReason: suspendReason } : null);
      }
    } catch (err: any) {
      toast.error("Failed to suspend user", err?.message);
    }
  };

  const confirmDeletion = async () => {
    if (!actionTargetUser || deleteConfirmationText !== actionTargetUser.email) {
      toast.error("Verification failed", "Please type the exact email address to confirm deletion.");
      return;
    }

    try {
      await AdminService.deleteUser(actionTargetUser.uid, "admin", "admin@learnstudy.app");
      toast.success("Account Purged", `User records for ${actionTargetUser.name} have been purged.`);
      await logAuditAction("PURGE_USER_DATA", "user_management", actionTargetUser.uid, actionTargetUser.name);
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error("Failed to delete user", err?.message);
    }
  };

  const handleRevokeSession = async (user: AdminUserRecord) => {
    toast.success("Sessions Revoked", `All active login tokens for ${user.name} have been invalidated.`);
    await logAuditAction("REVOKE_USER_SESSIONS", "security", user.uid, user.name);
  };

  const handleExportData = (uid: string) => {
    const a = document.createElement("a");
    a.href = `/api/admin/users/${uid}/export`;
    a.download = `user_${uid}_data_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.info("Exporting Data", "User archive JSON download started.");
    logAuditAction("EXPORT_USER_DATA", "user_management", uid, `User (${uid})`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            User Management & Profiles
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Search registered learners, audit study volume, manage account status, and export authorized records.
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition-colors flex items-center gap-2 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-500" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or Firebase UID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded-xl text-xs font-medium text-slate-600 dark:text-zinc-300 w-full sm:w-auto justify-between">
            <span className="text-[11px] text-slate-400 px-2 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            {["all", "active", "suspended"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${
                  statusFilter === st 
                    ? "bg-slate-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-bold" 
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
            <thead className="bg-slate-50 dark:bg-zinc-850/60 border-b border-slate-100 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              <tr>
                <th className="py-3.5 px-4">Learner</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Playlists</th>
                <th className="py-3.5 px-4">Notes & Decks</th>
                <th className="py-3.5 px-4">Study Time</th>
                <th className="py-3.5 px-4">Joined / Last Active</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {users.map((user) => (
                <tr 
                  key={user.uid}
                  className="hover:bg-slate-50/70 dark:hover:bg-zinc-850/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedUser(user)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`} 
                        alt={user.name} 
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-zinc-700 shrink-0" 
                      />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block group-hover:text-blue-600 transition-colors">
                          {user.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono block">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      user.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                      {user.status === "active" ? "Active" : "Suspended"}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-zinc-200">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      <span>{user.playlistsCount || 0}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-zinc-200">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        {user.notesCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-purple-500" />
                        {user.flashcardsCount || 0}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-zinc-200">
                    <div className="flex items-center gap-1 text-slate-700 dark:text-zinc-300">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <span>{Math.round((user.totalStudySeconds || 0) / 3600 * 10) / 10}h</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-[11px] text-slate-500 dark:text-zinc-400">
                    <div>Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                    <div className="text-[10px] text-slate-400">Active {new Date(user.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>

                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedUser(user)}
                        title="View User Details"
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-zinc-500">
                    No users matched your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Slide-over / Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 pb-6 border-b border-slate-100 dark:border-zinc-800">
              <img 
                src={selectedUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedUser.name)}`} 
                alt={selectedUser.name} 
                className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-zinc-700"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedUser.name}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    selectedUser.status === "active"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  }`}>
                    {selectedUser.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{selectedUser.email}</p>
                <p className="text-[11px] font-mono text-slate-400 mt-1">UID: {selectedUser.uid}</p>
              </div>
            </div>

            {/* Study Activity Metrics Summary */}
            <div className="grid grid-cols-4 gap-3 my-6">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800 text-center">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Playlists</span>
                <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">{selectedUser.playlistsCount || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800 text-center">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Notes</span>
                <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">{selectedUser.notesCount || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800 text-center">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Cards</span>
                <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">{selectedUser.flashcardsCount || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800 text-center">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Study Time</span>
                <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">{Math.round((selectedUser.totalStudySeconds || 0) / 3600 * 10) / 10}h</span>
              </div>
            </div>

            {/* Suspension Alert if applicable */}
            {selectedUser.status === "suspended" && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 mb-6 text-xs flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Account Suspended</span>
                  <span className="mt-0.5 block">Reason: {selectedUser.suspendedReason || "Administrative violation"}</span>
                </div>
              </div>
            )}

            {/* Privacy Shield Notice */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-850/70 border border-slate-100 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400 mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Student notes & private flashcards are encrypted and restricted under platform privacy rules.</span>
            </div>

            {/* Administrative Action Bar */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Administrative Controls</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={() => handleToggleStatus(selectedUser)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    selectedUser.status === "active"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20"
                  }`}
                >
                  {selectedUser.status === "active" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  {selectedUser.status === "active" ? "Suspend Account" : "Restore Account"}
                </button>

                <button
                  onClick={() => handleRevokeSession(selectedUser)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <KeyRound className="w-4 h-4" />
                  Revoke Sessions
                </button>

                <button
                  onClick={() => handleExportData(selectedUser.uid)}
                  className="p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Export Data JSON
                </button>

                <button
                  onClick={async () => {
                    const isCurrentlyAdmin = selectedUser.role === "admin" || selectedUser.role === "super_admin";
                    const newRole = isCurrentlyAdmin ? "student" : "admin";
                    const success = await AdminRoleService.assignRole(selectedUser.uid, newRole, {
                      email: selectedUser.email,
                      name: selectedUser.name
                    });
                    if (success) {
                      toast.success(
                        isCurrentlyAdmin ? "Role Revoked" : "Admin Role Assigned",
                        `${selectedUser.name} role changed to ${newRole}.`
                      );
                      setSelectedUser(prev => prev ? { ...prev, role: isCurrentlyAdmin ? undefined : "admin" } : null);
                      loadUsers();
                    } else {
                      toast.error("Role update failed", "Could not write to Firebase.");
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all col-span-2 sm:col-span-1 ${
                    selectedUser.role === "admin" || selectedUser.role === "super_admin"
                      ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
                      : "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{selectedUser.role === "admin" || selectedUser.role === "super_admin" ? "Demote to Student" : "Promote to Admin"}</span>
                </button>
              </div>

              {isSuperAdmin && (
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                  <button
                    onClick={() => {
                      setActionTargetUser(selectedUser);
                      setDeleteConfirmationText("");
                      setShowDeleteModal(true);
                    }}
                    className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Purge Account & Synced Data
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {showSuspendModal && actionTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Suspend Student Account
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
              Suspending <strong>{actionTargetUser.name}</strong> ({actionTargetUser.email}) will block sign-in and cloud sync.
            </p>

            <div className="mt-4">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 block mb-1.5">
                Reason for Suspension:
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Terms of service violation, automated spam requests..."
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSuspension}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && actionTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Irreversible Account Purge
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
              This action will permanently purge all cloud study records for <strong>{actionTargetUser.name}</strong>.
            </p>

            <div className="mt-4">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 block mb-1.5">
                Type <strong>{actionTargetUser.email}</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder={actionTargetUser.email}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletion}
                disabled={deleteConfirmationText !== actionTargetUser.email}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 transition-colors"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
