import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserCheck, 
  MessageSquare, 
  Radio, 
  Clock, 
  Smartphone, 
  Monitor, 
  Shield, 
  ArrowUpRight, 
  RefreshCw,
  Sparkles,
  Calendar,
  Inbox
} from "lucide-react";
import { useAdmin } from "../AdminContext";
import { AdminRoleService, DailyLoginEntry } from "../../services/adminRoleService";

export const OverviewView: React.FC = () => {
  const { overviewData, isLoadingOverview, refreshOverview, navigateAdmin } = useAdmin();
  const [liveLogins, setLiveLogins] = useState<DailyLoginEntry[]>([]);
  const [loadingLogins, setLoadingLogins] = useState(false);

  // Load today's live logins from RTDB / server
  const loadDailyLogins = async () => {
    setLoadingLogins(true);
    try {
      const logins = await AdminRoleService.getTodayLogins();
      if (logins && logins.length > 0) {
        setLiveLogins(logins);
      } else if (overviewData?.todayLoginsList) {
        setLiveLogins(overviewData.todayLoginsList as DailyLoginEntry[]);
      }
    } catch (e) {
      console.warn("Failed to load daily logins:", e);
    } finally {
      setLoadingLogins(false);
    }
  };

  useEffect(() => {
    loadDailyLogins();
  }, [overviewData]);

  const metrics = overviewData?.metrics || {
    totalRegisteredUsers: 0,
    newUsersToday: 0,
    openFeedbackCount: 0,
    totalAnnouncements: 0,
    dailyLogins: liveLogins.length,
  };

  const todayCount = Math.max(metrics.dailyLogins, liveLogins.length);
  const recentRegistrations = overviewData?.recentRegistrations || [];
  const recentFeedback = overviewData?.recentFeedback || [];

  return (
    <div className="space-y-6">
      {/* Platform Overview Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Live Production Telemetry
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            LearnStudy Admin Control Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Realtime platform administration, user activity, announcements, and student support.
          </p>
        </div>

        <button
          onClick={async () => {
            await Promise.all([refreshOverview(), loadDailyLogins()]);
          }}
          disabled={isLoadingOverview || loadingLogins}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOverview || loadingLogins ? "animate-spin" : ""}`} />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* Key Metric Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Users */}
        <div 
          onClick={() => navigateAdmin("users")}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 rounded-2xl shadow-xs hover:border-blue-500/60 dark:hover:border-blue-500/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">Total Registered Users</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {metrics.totalRegisteredUsers}
            </span>
            <span className="text-[11px] font-medium text-slate-400">accounts</span>
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-2 flex items-center gap-1">
            <span>Manage accounts</span>
            <ArrowUpRight className="w-3 h-3" />
          </p>
        </div>

        {/* Daily Logins */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">Daily Logins (Today)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {todayCount}
            </span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 font-semibold">active today</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {metrics.newUsersToday > 0 ? `${metrics.newUsersToday} newly registered today` : "Verified via Firebase RTDB"}
          </p>
        </div>

        {/* Open Feedback */}
        <div 
          onClick={() => navigateAdmin("feedback")}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 rounded-2xl shadow-xs hover:border-purple-500/60 dark:hover:border-purple-500/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">Open Feedback</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {metrics.openFeedbackCount}
            </span>
            <span className="text-[11px] font-medium text-slate-400">tickets</span>
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-2 flex items-center gap-1">
            <span>View student tickets</span>
            <ArrowUpRight className="w-3 h-3" />
          </p>
        </div>

        {/* Announcements */}
        <div 
          onClick={() => navigateAdmin("announcements")}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 rounded-2xl shadow-xs hover:border-amber-500/60 dark:hover:border-amber-500/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">Active Announcements</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {metrics.totalAnnouncements}
            </span>
            <span className="text-[11px] font-medium text-slate-400">broadcasts</span>
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-2 flex items-center gap-1">
            <span>Broadcasts & banners</span>
            <ArrowUpRight className="w-3 h-3" />
          </p>
        </div>
      </div>

      {/* Daily Login & Real User Activity Stats Section */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              <span>Today's User Logins & Activity</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Real-time daily logins recorded across web and mobile clients for {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
              {liveLogins.length} Logins Recorded Today
            </span>
          </div>
        </div>

        {liveLogins.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Device</th>
                  <th className="py-2.5 px-3">Login Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {liveLogins.map((entry, idx) => {
                  const isMobile = entry.device?.toLowerCase().includes("mobile");
                  const isAdmin = entry.role === "admin" || entry.role === "super_admin";
                  return (
                    <tr key={`${entry.uid}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={entry.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(entry.name || entry.email || "Learner")}`}
                            alt={entry.name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-zinc-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white truncate block">
                              {entry.name || "Learner"}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate block font-mono">
                              {entry.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                            Student
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-zinc-400 text-xs">
                          {isMobile ? <Smartphone className="w-3.5 h-3.5 text-blue-500" /> : <Monitor className="w-3.5 h-3.5 text-indigo-500" />}
                          {entry.device || "Desktop"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 dark:text-zinc-400 text-[11px]">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 dark:text-zinc-500 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-2">
              <Inbox className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">No logins recorded yet today</p>
            <p className="text-[11px] text-slate-400 mt-0.5">As students sign in and open LearnStudy, their sessions will sync automatically.</p>
          </div>
        )}
      </div>

      {/* Two Column Grid: Recent Registrations & Recent Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Registrations */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span>Recent Registrations</span>
            </h3>
            <button
              onClick={() => navigateAdmin("users")}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              View all
            </button>
          </div>

          {recentRegistrations.length > 0 ? (
            <div className="space-y-2">
              {recentRegistrations.map((u) => (
                <div key={u.uid} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white truncate block">
                      {u.name || "Student"}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate block font-mono">
                      {u.email}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(u.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">
              No recent registrations recorded yet.
            </div>
          )}
        </div>

        {/* Recent Feedback Submissions */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-500" />
              <span>Recent Feedback & Support</span>
            </h3>
            <button
              onClick={() => navigateAdmin("feedback")}
              className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline"
            >
              Manage feedback
            </button>
          </div>

          {recentFeedback.length > 0 ? (
            <div className="space-y-2.5">
              {recentFeedback.map((fb) => (
                <div key={fb.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      {fb.category}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      fb.status === "resolved" 
                        ? "bg-emerald-500/10 text-emerald-600" 
                        : fb.status === "in_progress" 
                        ? "bg-blue-500/10 text-blue-600" 
                        : "bg-amber-500/10 text-amber-600"
                    }`}>
                      {fb.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 line-clamp-2">
                    {fb.message}
                  </p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    From: {fb.userEmail}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">
              No feedback submissions received yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
