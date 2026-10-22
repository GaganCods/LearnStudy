import React, { useState } from "react";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Sliders, 
  BarChart3, 
  MessageSquare, 
  Radio, 
  Activity, 
  Settings, 
  ShieldCheck, 
  ShieldAlert,
  FileText, 
  Wrench, 
  ArrowLeft, 
  LogOut, 
  Menu, 
  X, 
  Crown,
  Bell,
  ChevronRight,
  ExternalLink,
  Flame,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { AdminRouteTab } from "../types";
import { useAdmin } from "./AdminContext";
import { useAuth } from "../context/AuthContext";
import { navigateTo } from "../utils/pageRegistry";

// Views
import { OverviewView } from "./views/OverviewView";
import { UsersView } from "./views/UsersView";
import { FeedbackView } from "./views/FeedbackView";
import { AnnouncementsView } from "./views/AnnouncementsView";
import { SettingsView } from "./views/SettingsView";
import { NotificationsView } from "./views/NotificationsView";

export const AdminLayout: React.FC = () => {
  const { 
    activeRoute, 
    activeParam, 
    navigateAdmin, 
    adminRole, 
    isAdmin,
    isVerifyingRole,
    overviewData 
  } = useAdmin();
  
  const { currentUser, userProfile, signOutUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: AdminRouteTab; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "users", label: "User Management", icon: <Users className="w-4 h-4" /> },
    { id: "announcements", label: "Announcements", icon: <Radio className="w-4 h-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { 
      id: "feedback", 
      label: "Feedback & Support", 
      icon: <MessageSquare className="w-4 h-4" />,
      badge: overviewData?.metrics.openFeedbackCount ? String(overviewData.metrics.openFeedbackCount) : undefined
    },
    { id: "settings", label: "General Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  const handleReturnToStudy = () => {
    navigateTo("home");
  };

  const renderActiveView = () => {
    switch (activeRoute) {
      case "overview": return <OverviewView />;
      case "users": return <UsersView initialUid={activeParam} />;
      case "feedback": return <FeedbackView />;
      case "announcements": return <AnnouncementsView />;
      case "settings": return <SettingsView />;
      case "notifications": return <NotificationsView />;
      default: return <OverviewView />;
    }
  };

  // 1. Loading role verification screen
  if (isVerifyingRole) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 animate-pulse">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Verifying Admin Role...</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm">Checking administrator privileges in Firebase Realtime Database.</p>
      </div>
    );
  }

  // 2. Strict Access Denied screen for non-admins (blocks direct URL manipulation)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-5 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Admin Access Restricted</h1>
        <p className="text-sm text-slate-600 dark:text-zinc-400 mt-2 max-w-md">
          Access to the LearnStudy Admin Control Center requires verified administrator role in Firebase Realtime Database. Your account does not have permission to view this console.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={handleReturnToStudy}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Learning Hub</span>
          </button>
          {currentUser && (
            <button
              onClick={() => signOutUser()}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 flex flex-col font-sans transition-colors">
      {/* Top Banner if Maintenance Mode is active */}
      {overviewData?.metrics.maintenanceMode && (
        <div className="bg-rose-600 text-white text-xs font-bold py-2 px-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Platform Maintenance Mode is currently ACTIVE. Public student access is paused.</span>
          </div>
          <button 
            onClick={() => navigateAdmin("settings")}
            className="underline hover:opacity-80 text-xs"
          >
            Review Settings →
          </button>
        </div>
      )}

      {/* Main Admin Navigation Topbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white md:hidden"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo / Control Center Header */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">LearnStudy</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  Admin Center
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Return to Study Button */}
          <button
            onClick={handleReturnToStudy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Study App</span>
          </button>

          {/* User Profile Info */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-zinc-800">
            <img
              src={currentUser?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser?.displayName || "Admin")}`}
              alt="Admin"
              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-zinc-700"
            />
            <div className="hidden sm:block text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                {currentUser?.displayName || userProfile?.name || "Platform Admin"}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block uppercase">
                {adminRole ? adminRole.replace("_", " ") : "Super Admin"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Body Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Sidebar Navigation */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 p-4 flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 md:rounded-3xl md:border md:shadow-xs md:h-[calc(100vh-6rem)] md:sticky md:top-20 shadow-2xl md:shadow-xs ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}>
          <div className="space-y-1 overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Platform Modules
            </div>

            {navItems.map((item) => {
              const isActive = activeRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigateAdmin(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs font-bold"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isActive 
                        ? "bg-white/20 text-white" 
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 mt-4 space-y-2">
            <div className="px-3 py-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Security RBAC</span>
              <span className="text-emerald-500 font-bold">Enforced</span>
            </div>
            <button
              onClick={() => signOutUser()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Content Body Area */}
        <main className="flex-1 min-w-0">
          {/* Breadcrumb Bar */}
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 mb-4 font-medium">
            <button onClick={() => navigateAdmin("overview")} className="hover:text-blue-500">
              Admin
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600" />
            <span className="capitalize text-slate-800 dark:text-zinc-200 font-semibold">
              {navItems.find(n => n.id === activeRoute)?.label || activeRoute}
            </span>
            {activeParam && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600" />
                <span className="font-mono text-slate-500 text-[11px] truncate max-w-xs">{activeParam}</span>
              </>
            )}
          </div>

          {/* Active View Render */}
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};
