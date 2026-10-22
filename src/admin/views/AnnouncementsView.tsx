import React, { useState, useEffect } from "react";
import { 
  Radio, 
  Plus, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Wrench, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Eye, 
  RefreshCw, 
  Clock, 
  ExternalLink,
  X
} from "lucide-react";
import { SystemAnnouncementItem } from "../../types";
import { AdminService } from "../../services/adminService";
import { useAdmin } from "../AdminContext";
import { useToast } from "../../components/ToastContext";

export const AnnouncementsView: React.FC = () => {
  const { logAuditAction } = useAdmin();
  const { toast } = useToast();

  const [announcements, setAnnouncements] = useState<SystemAnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<SystemAnnouncementItem> | null>(null);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getAnnouncements();
      setAnnouncements(data);
    } catch (e: any) {
      toast.error("Failed to load announcements", e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title || !editingItem?.message) {
      toast.error("Validation error", "Title and message are required.");
      return;
    }

    try {
      await AdminService.saveAnnouncement(editingItem, {
        adminUid: "admin",
        adminEmail: "admin@learnstudy.app",
        adminName: "Admin"
      });
      toast.success(
        editingItem.id ? "Announcement Updated" : "Announcement Broadcasted",
        `"${editingItem.title}" has been saved.`
      );
      await logAuditAction(
        editingItem.id ? "UPDATE_ANNOUNCEMENT" : "CREATE_ANNOUNCEMENT",
        "content",
        editingItem.id || "new",
        editingItem.title
      );
      setShowModal(false);
      loadAnnouncements();
    } catch (err: any) {
      toast.error("Save failed", err?.message);
    }
  };

  const [annToDelete, setAnnToDelete] = useState<SystemAnnouncementItem | null>(null);

  const confirmDelete = async () => {
    if (!annToDelete) return;
    try {
      await AdminService.deleteAnnouncement(annToDelete.id, "admin", "admin@learnstudy.app");
      toast.success("Deleted", `Announcement "${annToDelete.title}" removed.`);
      await logAuditAction("DELETE_ANNOUNCEMENT", "content", annToDelete.id, annToDelete.title);
      setAnnToDelete(null);
      loadAnnouncements();
    } catch (err: any) {
      toast.error("Delete failed", err?.message);
    }
  };

  const handleToggleActive = async (ann: SystemAnnouncementItem) => {
    try {
      await AdminService.saveAnnouncement({ id: ann.id, active: !ann.active }, {
        adminUid: "admin",
        adminEmail: "admin@learnstudy.app",
        adminName: "Admin"
      });
      toast.success("Status Updated", `"${ann.title}" is now ${!ann.active ? "Active" : "Archived"}.`);
      loadAnnouncements();
    } catch (err: any) {
      toast.error("Update failed", err?.message);
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "warning":
        return { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-600 dark:text-amber-400", icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> };
      case "maintenance":
        return { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-600 dark:text-rose-400", icon: <Wrench className="w-4 h-4 text-rose-500" /> };
      case "feature":
        return { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-600 dark:text-purple-400", icon: <Sparkles className="w-4 h-4 text-purple-500" /> };
      case "success":
        return { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> };
      default:
        return { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-600 dark:text-blue-400", icon: <Info className="w-4 h-4 text-blue-500" /> };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-500" />
            Student Announcements & Global Banners
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Publish broadcast banners, new feature alerts, and exam season study notifications directly into student views.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingItem({
              type: "info",
              active: true,
              targetAudience: "all",
              bannerPosition: "top_bar",
              dismissible: true
            });
            setShowModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Announcement
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((ann) => {
          const style = getTypeStyle(ann.type);
          return (
            <div
              key={ann.id}
              className={`p-5 rounded-2xl border transition-all ${
                ann.active 
                  ? "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-xs" 
                  : "bg-slate-50/50 dark:bg-zinc-900/40 border-slate-200/60 opacity-70"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${style.bg} border ${style.border}`}>
                    {style.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{ann.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.border} ${style.text}`}>
                        {ann.type}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Target: {ann.targetAudience} • Position: {ann.bannerPosition.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(ann)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      ann.active
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-500 border-slate-200"
                    }`}
                  >
                    {ann.active ? "Active" : "Archived"}
                  </button>

                  <button
                    onClick={() => {
                      setEditingItem(ann);
                      setShowModal(true);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setAnnToDelete(ann)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message body */}
              <p className="text-xs text-slate-600 dark:text-zinc-300 mt-3 leading-relaxed">
                {ann.message}
              </p>

              {ann.actionLabel && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                    {ann.actionLabel} {ann.actionUrl && `→ ${ann.actionUrl}`}
                  </span>
                </div>
              )}

              {/* Student View Banner Preview Box */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Live Student View Preview:
                </span>
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${style.bg} ${style.border} ${style.text}`}>
                  <div className="flex items-center gap-2">
                    {style.icon}
                    <span>{ann.message}</span>
                  </div>
                  {ann.actionLabel && (
                    <span className="underline font-bold text-xs">{ann.actionLabel}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {announcements.length === 0 && !loading && (
          <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
            No announcements created. Broadcast a welcome banner or maintenance notice above.
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {editingItem.id ? "Edit Announcement" : "Create Broadcast Announcement"}
            </h2>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                  Title:
                </label>
                <input
                  type="text"
                  value={editingItem.title || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  placeholder="e.g. Scheduled Maintenance Tonight"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                  Message:
                </label>
                <textarea
                  value={editingItem.message || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, message: e.target.value })}
                  placeholder="Student-facing message shown on top of the app..."
                  rows={3}
                  required
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                    Announcement Type:
                  </label>
                  <select
                    value={editingItem.type || "info"}
                    onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="info">Info (Blue)</option>
                    <option value="warning">Warning (Amber)</option>
                    <option value="maintenance">Maintenance (Rose)</option>
                    <option value="feature">New Feature (Purple)</option>
                    <option value="success">Success (Emerald)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                    Target Audience:
                  </label>
                  <select
                    value={editingItem.targetAudience || "all"}
                    onChange={(e) => setEditingItem({ ...editingItem, targetAudience: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="all">All Visitors</option>
                    <option value="authenticated">Logged-in Students Only</option>
                    <option value="guests">Guest Users Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                    Call-to-Action Label (Optional):
                  </label>
                  <input
                    type="text"
                    value={editingItem.actionLabel || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, actionLabel: e.target.value })}
                    placeholder="e.g. Read Notes"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                    Action URL:
                  </label>
                  <input
                    type="text"
                    value={editingItem.actionUrl || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, actionUrl: e.target.value })}
                    placeholder="e.g. /app/lectures"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.active ?? true}
                    onChange={(e) => setEditingItem({ ...editingItem, active: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  Active Immediately
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.dismissible ?? true}
                    onChange={(e) => setEditingItem({ ...editingItem, dismissible: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  Dismissible by User
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Save & Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {annToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Announcement?</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Remove <span className="font-semibold text-slate-800 dark:text-zinc-200">"{annToDelete.title}"</span>? This banner will immediately disappear from all students' screens.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAnnToDelete(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors"
              >
                Delete Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
