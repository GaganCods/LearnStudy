import React, { useState, useEffect } from "react";
import { Info, AlertTriangle, Wrench, Sparkles, CheckCircle2, X } from "lucide-react";
import { SystemAnnouncementItem } from "../types";
import { AdminService } from "../services/adminService";
import { navigateTo } from "../utils/pageRegistry";

export const GlobalAnnouncementBanner: React.FC = () => {
  const [announcements, setAnnouncements] = useState<SystemAnnouncementItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("learnstudy_dismissed_announcements");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let isMounted = true;
    AdminService.getAnnouncements()
      .then((items) => {
        if (isMounted) {
          const active = items.filter(a => a.active && a.bannerPosition === "top_bar");
          setAnnouncements(active);
        }
      })
      .catch((e) => console.warn("Notice announcement load:", e));

    return () => { isMounted = false; };
  }, []);

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem("learnstudy_dismissed_announcements", JSON.stringify(updated));
    } catch {}
  };

  const visible = announcements.filter(a => !dismissedIds.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-1">
      {visible.map((ann) => {
        const isWarning = ann.type === "warning";
        const isMaint = ann.type === "maintenance";
        const isFeature = ann.type === "feature";
        const isSuccess = ann.type === "success";

        const bgClass = isMaint 
          ? "bg-rose-600 text-white" 
          : isWarning 
          ? "bg-amber-500 text-white" 
          : isFeature 
          ? "bg-purple-600 text-white" 
          : isSuccess 
          ? "bg-emerald-600 text-white" 
          : "bg-blue-600 text-white";

        const IconComponent = isMaint 
          ? Wrench 
          : isWarning 
          ? AlertTriangle 
          : isFeature 
          ? Sparkles 
          : isSuccess 
          ? CheckCircle2 
          : Info;

        return (
          <div
            key={ann.id}
            className={`${bgClass} text-xs py-2 px-4 shadow-xs flex items-center justify-between text-left`}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
              <IconComponent className="w-4 h-4 shrink-0" />
              <div className="truncate">
                <span className="font-bold mr-1.5">{ann.title}:</span>
                <span className="opacity-95">{ann.message}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {ann.actionLabel && ann.actionUrl && (
                <button
                  onClick={() => {
                    if (ann.actionUrl?.startsWith("http")) {
                      window.open(ann.actionUrl, "_blank");
                    } else {
                      window.location.href = ann.actionUrl!;
                    }
                  }}
                  className="px-2.5 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] transition-colors"
                >
                  {ann.actionLabel}
                </button>
              )}

              {ann.dismissible && (
                <button
                  onClick={() => handleDismiss(ann.id)}
                  title="Dismiss notification"
                  className="p-1 rounded-md hover:bg-black/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
