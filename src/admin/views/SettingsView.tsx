import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Save, 
  ShieldCheck, 
  Mail, 
  Globe, 
  Clock, 
  Layers, 
  Key, 
  Cpu, 
  RefreshCw,
  Sliders,
  CheckCircle2
} from "lucide-react";
import { PlatformSettings } from "../../types";
import { AdminService } from "../../services/adminService";
import { useAdmin } from "../AdminContext";
import { useToast } from "../../components/ToastContext";

export const SettingsView: React.FC = () => {
  const { isSuperAdmin, logAuditAction } = useAdmin();
  const { toast } = useToast();

  const [settings, setSettings] = useState<PlatformSettings>({
    siteName: "LearnStudy",
    siteDescription: "Distraction-Free YouTube Lecture Study Platform & Productivity Workspace",
    supportEmail: "support@learnstudy.app",
    defaultDailyGoalMinutes: 45,
    maxPlaylistsPerUser: 50,
    enablePublicRegistration: true,
    requireEmailVerification: false,
    allowedEmailDomains: [],
    geminiDailyQuotaPerUser: 50,
    youtubeApiQuotaMonitoring: true,
    corsAllowedOrigins: ["*"],
    updatedAt: Date.now(),
    updatedBy: "System Admin"
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [domainInput, setDomainInput] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getSettings();
      setSettings(data);
    } catch (e: any) {
      toast.error("Failed to load settings", e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      toast.error("Unauthorized", "Super Admin role required to modify platform settings.");
      return;
    }

    setSaving(true);
    try {
      const updated = await AdminService.updateSettings(settings, {
        adminUid: "admin",
        adminEmail: "admin@learnstudy.app",
        adminName: "Admin"
      });
      setSettings(updated);
      toast.success("Settings Saved", "Platform configuration updated and broadcasted.");
      await logAuditAction("UPDATE_PLATFORM_SETTINGS", "settings", "platform-settings", "General Platform Settings");
    } catch (err: any) {
      toast.error("Save failed", err?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = () => {
    if (!domainInput.trim()) return;
    const clean = domainInput.trim().toLowerCase().replace(/^@/, "");
    if (!settings.allowedEmailDomains.includes(clean)) {
      setSettings({
        ...settings,
        allowedEmailDomains: [...settings.allowedEmailDomains, clean]
      });
      setDomainInput("");
    }
  };

  const handleRemoveDomain = (dom: string) => {
    setSettings({
      ...settings,
      allowedEmailDomains: settings.allowedEmailDomains.filter(d => d !== dom)
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
            General Platform Settings & Operational Parameters
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Global defaults for student goals, AI generation quotas, domain restrictions, and support channels.
          </p>
        </div>

        <button
          onClick={loadSettings}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition-colors flex items-center gap-2 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-500" : ""}`} />
          Reload
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Platform Branding & Support */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            Branding & Support Contact
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                Platform Brand Name:
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                Official Support Contact Email:
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
              Site Meta Description:
            </label>
            <input
              type="text"
              value={settings.siteDescription}
              onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Section 2: Study Limits & Defaults */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-500" />
            Study Quotas & Storage Limits
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                Default Daily Study Goal (Minutes):
              </label>
              <input
                type="number"
                min="10"
                max="480"
                value={settings.defaultDailyGoalMinutes}
                onChange={(e) => setSettings({ ...settings, defaultDailyGoalMinutes: parseInt(e.target.value, 10) || 45 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default target set for new student accounts</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                Max Playlists Per Learner:
              </label>
              <input
                type="number"
                min="5"
                max="500"
                value={settings.maxPlaylistsPerUser}
                onChange={(e) => setSettings({ ...settings, maxPlaylistsPerUser: parseInt(e.target.value, 10) || 50 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Prevents excessive cloud database storage</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                Gemini AI Daily Quota / Student:
              </label>
              <input
                type="number"
                min="5"
                max="200"
                value={settings.geminiDailyQuotaPerUser}
                onChange={(e) => setSettings({ ...settings, geminiDailyQuotaPerUser: parseInt(e.target.value, 10) || 50 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Daily free study note & doubt prompts</span>
            </div>
          </div>
        </div>

        {/* Section 3: Student Registration Policy */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-500" />
            Registration Access & Domain Allowlist
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enablePublicRegistration}
                onChange={(e) => setSettings({ ...settings, enablePublicRegistration: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Allow Public Student Registration
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  When enabled, any visitor can authenticate with Google Sign-In. When disabled, only existing users may log in.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
              Restricted Institutional Email Domains (Optional):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. stanford.edu, mit.edu, college.ac.in"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddDomain}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold"
              >
                Add Domain
              </button>
            </div>

            {settings.allowedEmailDomains.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {settings.allowedEmailDomains.map(dom => (
                  <span key={dom} className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono flex items-center gap-1.5">
                    @{dom}
                    <button
                      type="button"
                      onClick={() => handleRemoveDomain(dom)}
                      className="hover:text-rose-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 mt-1 block">
                No domain restriction active. Students from any email domain (Gmail, university, etc.) can register.
              </span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">
            Last modified {new Date(settings.updatedAt).toLocaleString()} by {settings.updatedBy}
          </span>

          <button
            type="submit"
            disabled={saving || !isSuperAdmin}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
            Save Platform Settings
          </button>
        </div>
      </form>
    </div>
  );
};
