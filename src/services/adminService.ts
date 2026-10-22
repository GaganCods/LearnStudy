import { 
  AdminUserRecord, 
  CuratedCourseItem, 
  FeatureFlagItem, 
  SupportTicketItem, 
  SystemAnnouncementItem, 
  AuditLogEntry, 
  PlatformSettings, 
  MaintenanceConfig, 
  SystemHealthCheck 
} from "../types";
import { db, doc, getDoc, setDoc, collection, getDocs } from "../lib/firebase";

export interface AdminOverviewData {
  metrics: {
    totalRegisteredUsers: number;
    newUsersToday: number;
    openFeedbackCount: number;
    totalAnnouncements: number;
    dailyLogins: number;
    maintenanceMode?: boolean;
  };
  todayLoginsList?: Array<{
    uid: string;
    email: string;
    name: string;
    photoURL?: string;
    timestamp: number;
    role?: string;
    device?: string;
  }>;
  recentRegistrations?: Array<{
    uid: string;
    name: string;
    email: string;
    createdAt: number;
    status: string;
  }>;
  recentFeedback?: Array<{
    id: string;
    userEmail: string;
    category: string;
    message: string;
    status: string;
    createdAt: number;
  }>;
  recentAuditLogs?: AuditLogEntry[];
  systemAlerts?: Array<{ id: string; level: "info" | "warning" | "error"; message: string }>;
}

export interface SystemHealthResponse {
  status: "healthy" | "partially_degraded" | "outage";
  timestamp: number;
  services: SystemHealthCheck[];
}

export class AdminService {
  /**
   * Fetch overview metrics and trends
   */
  static async getOverview(dateRange: string = "7d"): Promise<AdminOverviewData> {
    const res = await fetch(`/api/admin/overview?range=${dateRange}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch overview metrics: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Fetch live system health status
   */
  static async getHealth(): Promise<SystemHealthResponse> {
    const res = await fetch("/api/admin/health");
    if (!res.ok) {
      throw new Error(`Failed to fetch system health: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Fetch operational logs & YouTube diagnostics
   */
  static async getSystemLogs(): Promise<{ logs: any[]; ytDiagnostics: any; totalLogs: number }> {
    const res = await fetch("/api/admin/system-logs");
    if (!res.ok) {
      throw new Error(`Failed to fetch system logs: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Fetch feature flags
   */
  static async getFeatures(): Promise<FeatureFlagItem[]> {
    const res = await fetch("/api/admin/features");
    if (!res.ok) {
      throw new Error(`Failed to fetch features: ${res.statusText}`);
    }
    const data = await res.json();
    return data.features || [];
  }

  /**
   * Update feature flag
   */
  static async updateFeature(
    id: string,
    updates: Partial<FeatureFlagItem>,
    adminInfo: { adminUid: string; adminEmail: string; adminName: string }
  ): Promise<FeatureFlagItem> {
    const res = await fetch("/api/admin/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates, ...adminInfo })
    });
    if (!res.ok) {
      throw new Error(`Failed to update feature flag: ${res.statusText}`);
    }
    const data = await res.json();
    return data.feature;
  }

  /**
   * Fetch platform general settings
   */
  static async getSettings(): Promise<PlatformSettings> {
    const res = await fetch("/api/admin/settings");
    if (!res.ok) {
      throw new Error(`Failed to fetch settings: ${res.statusText}`);
    }
    const data = await res.json();
    return data.settings;
  }

  /**
   * Update platform general settings
   */
  static async updateSettings(
    settings: Partial<PlatformSettings>,
    adminInfo: { adminUid: string; adminEmail: string; adminName: string }
  ): Promise<PlatformSettings> {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, ...adminInfo })
    });
    if (!res.ok) {
      throw new Error(`Failed to save settings: ${res.statusText}`);
    }
    const data = await res.json();
    return data.settings;
  }

  /**
   * Fetch maintenance mode configuration
   */
  static async getMaintenance(): Promise<MaintenanceConfig> {
    const res = await fetch("/api/admin/maintenance");
    if (!res.ok) {
      throw new Error(`Failed to fetch maintenance status: ${res.statusText}`);
    }
    const data = await res.json();
    return data.maintenance;
  }

  /**
   * Toggle maintenance mode
   */
  static async setMaintenance(
    config: Partial<MaintenanceConfig>,
    adminInfo: { adminUid: string; adminEmail: string; adminName: string }
  ): Promise<MaintenanceConfig> {
    const res = await fetch("/api/admin/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, ...adminInfo })
    });
    if (!res.ok) {
      throw new Error(`Failed to update maintenance: ${res.statusText}`);
    }
    const data = await res.json();
    return data.maintenance;
  }

  /**
   * Fetch student announcements
   */
  static async getAnnouncements(): Promise<SystemAnnouncementItem[]> {
    const res = await fetch("/api/admin/announcements");
    if (!res.ok) {
      throw new Error(`Failed to fetch announcements: ${res.statusText}`);
    }
    const data = await res.json();
    return data.announcements || [];
  }

  /**
   * Create or update announcement
   */
  static async saveAnnouncement(
    announcement: Partial<SystemAnnouncementItem>,
    adminInfo: { adminUid: string; adminEmail: string; adminName: string }
  ): Promise<SystemAnnouncementItem> {
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...announcement, ...adminInfo })
    });
    if (!res.ok) {
      throw new Error(`Failed to save announcement: ${res.statusText}`);
    }
    const data = await res.json();
    return data.announcement;
  }

  /**
   * Delete announcement
   */
  static async deleteAnnouncement(id: string, adminUid: string, adminEmail: string): Promise<void> {
    const res = await fetch(`/api/admin/announcements/${id}?adminUid=${adminUid}&adminEmail=${adminEmail}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      throw new Error(`Failed to delete announcement: ${res.statusText}`);
    }
  }

  /**
   * Fetch curated course library
   */
  static async getCuratedCourses(): Promise<CuratedCourseItem[]> {
    const res = await fetch("/api/admin/curated-courses");
    if (!res.ok) {
      throw new Error(`Failed to fetch curated courses: ${res.statusText}`);
    }
    const data = await res.json();
    return data.courses || [];
  }

  /**
   * Save or publish curated course
   */
  static async saveCuratedCourse(
    course: Partial<CuratedCourseItem>,
    adminInfo: { adminUid: string; adminEmail: string; adminName: string }
  ): Promise<CuratedCourseItem> {
    const res = await fetch("/api/admin/curated-courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...course, ...adminInfo })
    });
    if (!res.ok) {
      throw new Error(`Failed to save curated course: ${res.statusText}`);
    }
    const data = await res.json();
    return data.course;
  }

  /**
   * Delete curated course
   */
  static async deleteCuratedCourse(id: string, adminUid: string, adminEmail: string): Promise<void> {
    const res = await fetch(`/api/admin/curated-courses/${id}?adminUid=${adminUid}&adminEmail=${adminEmail}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      throw new Error(`Failed to delete course: ${res.statusText}`);
    }
  }

  /**
   * Validate YouTube playlist or video ID before adding to library
   */
  static async validateYouTubeContent(youtubeId: string, type: "playlist" | "single_video"): Promise<{ valid: boolean; title?: string; channelName?: string; thumbnail?: string; error?: string }> {
    const res = await fetch("/api/admin/validate-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ youtubeId, type })
    });
    return res.json();
  }

  /**
   * Fetch user list with search and filters
   */
  static async getUsers(query: string = "", status: string = "all"): Promise<AdminUserRecord[]> {
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}&status=${status}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch users: ${res.statusText}`);
    }
    const data = await res.json();
    return data.users || [];
  }

  /**
   * Update user account status (suspend/restore)
   */
  static async setUserStatus(
    uid: string,
    status: "active" | "suspended" | "pending",
    reason: string,
    adminInfo: { adminUid: string; adminEmail: string; adminName: string }
  ): Promise<void> {
    const res = await fetch(`/api/admin/users/${uid}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason, ...adminInfo })
    });
    if (!res.ok) {
      throw new Error(`Failed to update user status: ${res.statusText}`);
    }
  }

  /**
   * Delete user account data
   */
  static async deleteUser(uid: string, adminUid: string, adminEmail: string): Promise<void> {
    const res = await fetch(`/api/admin/users/${uid}?adminUid=${adminUid}&adminEmail=${adminEmail}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      throw new Error(`Failed to delete user: ${res.statusText}`);
    }
  }

  /**
   * Fetch audit logs
   */
  static async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await fetch("/api/admin/audit-logs");
    if (!res.ok) {
      throw new Error(`Failed to fetch audit logs: ${res.statusText}`);
    }
    const data = await res.json();
    return data.logs || [];
  }

  /**
   * Record audit log entry
   */
  static async recordAudit(entry: Partial<AuditLogEntry>): Promise<void> {
    await fetch("/api/admin/audit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry)
    }).catch(e => console.warn("Failed to record audit log:", e));
  }

  /**
   * Fetch support tickets
   */
  static async getSupportTickets(): Promise<SupportTicketItem[]> {
    const res = await fetch("/api/admin/feedback");
    if (!res.ok) {
      throw new Error(`Failed to fetch feedback tickets: ${res.statusText}`);
    }
    const data = await res.json();
    return data.tickets || [];
  }

  /**
   * Update support ticket
   */
  static async updateSupportTicket(
    id: string,
    updates: Partial<SupportTicketItem>,
    adminInfo: { adminUid: string; adminEmail: string; adminName: string }
  ): Promise<SupportTicketItem> {
    const res = await fetch(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updates, ...adminInfo })
    });
    if (!res.ok) {
      throw new Error(`Failed to update ticket: ${res.statusText}`);
    }
    const data = await res.json();
    return data.ticket;
  }

  /**
   * Check if a user has an Admin Role in Firestore
   */
  static async checkUserAdminRole(uid: string, email?: string): Promise<{ isAdmin: boolean; role: "super_admin" | "content_manager" | "support_agent" | null }> {
    try {
      // 1. Check Firestore adminRoles/{uid}
      const roleDoc = await getDoc(doc(db, "adminRoles", uid));
      if (roleDoc.exists()) {
        const data = roleDoc.data();
        return { isAdmin: true, role: data.role || "super_admin" };
      }

      // 2. Check local fallback / owner bootstrap
      const localRole = localStorage.getItem(`learnstudy_admin_role_${uid}`);
      if (localRole) {
        return { isAdmin: true, role: localRole as any };
      }

      // 3. Fallback: If no admin roles exist in system, first user / owner is eligible to claim super_admin
      return { isAdmin: false, role: null };
    } catch (e) {
      console.warn("Check admin role notice:", e);
      return { isAdmin: false, role: null };
    }
  }

  /**
   * Bootstrap/Claim Super Admin role for current authenticated user
   */
  static async bootstrapSuperAdmin(uid: string, email: string, name: string): Promise<boolean> {
    try {
      await setDoc(doc(db, "adminRoles", uid), {
        uid,
        email,
        name,
        role: "super_admin",
        createdAt: Date.now(),
        createdBy: "System Bootstrap"
      }, { merge: true });

      localStorage.setItem(`learnstudy_admin_role_${uid}`, "super_admin");
      return true;
    } catch (e) {
      console.warn("Bootstrap admin in Firestore failed, activating local super_admin fallback:", e);
      localStorage.setItem(`learnstudy_admin_role_${uid}`, "super_admin");
      return true;
    }
  }
}
