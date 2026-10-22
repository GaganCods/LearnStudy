import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AdminRole, AdminRouteTab } from "../types";
import { useAuth } from "../context/AuthContext";
import { AdminService, AdminOverviewData } from "../services/adminService";
import { AdminRoleService } from "../services/adminRoleService";
import { useToast } from "../components/ToastContext";

interface AdminContextType {
  isAdmin: boolean;
  isVerifyingRole: boolean;
  adminRole: AdminRole | null;
  isSuperAdmin: boolean;
  isContentManager: boolean;
  isSupportAgent: boolean;
  activeRoute: AdminRouteTab;
  activeParam?: string;
  navigateAdmin: (tab: AdminRouteTab, param?: string) => void;
  overviewData: AdminOverviewData | null;
  isLoadingOverview: boolean;
  refreshOverview: () => Promise<void>;
  claimSuperAdmin: () => Promise<boolean>;
  logAuditAction: (action: string, category: "user_management" | "content" | "feature_flags" | "settings" | "security" | "maintenance" | "support", targetId?: string, targetName?: string, details?: any) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode; initialRoute?: AdminRouteTab; initialParam?: string }> = ({
  children,
  initialRoute = "overview",
  initialParam
}) => {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  const [activeRoute, setActiveRoute] = useState<AdminRouteTab>(initialRoute);
  const [activeParam, setActiveParam] = useState<string | undefined>(initialParam);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isVerifyingRole, setIsVerifyingRole] = useState<boolean>(true);
  const [overviewData, setOverviewData] = useState<AdminOverviewData | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState<boolean>(false);

  // Sync initial props if they change
  useEffect(() => {
    if (initialRoute) setActiveRoute(initialRoute);
    if (initialParam !== undefined) setActiveParam(initialParam);
  }, [initialRoute, initialParam]);

  // Check admin role whenever auth state changes
  useEffect(() => {
    let isCancelled = false;

    async function checkRole() {
      setIsVerifyingRole(true);
      if (!currentUser) {
        setIsAdmin(false);
        setAdminRole(null);
        setIsVerifyingRole(false);
        return;
      }

      try {
        // Strictly verify admin role in Firebase Realtime Database
        const result = await AdminRoleService.verifyAdminRole(
          currentUser.uid,
          currentUser.email || undefined,
          currentUser.displayName || userProfile?.name || undefined
        );

        if (isCancelled) return;

        if (result.isAdmin) {
          setIsAdmin(true);
          setAdminRole(result.role === "super_admin" ? "super_admin" : "admin");

          // Automatically record daily login for verified admin
          AdminRoleService.recordDailyLogin(currentUser).catch(() => {});
        } else {
          // Strictly deny access if role is not verified
          setIsAdmin(false);
          setAdminRole(null);
        }
      } catch (err) {
        console.warn("Admin role verification failed:", err);
        if (!isCancelled) {
          setIsAdmin(false);
          setAdminRole(null);
        }
      } finally {
        if (!isCancelled) {
          setIsVerifyingRole(false);
        }
      }
    }

    checkRole();

    return () => {
      isCancelled = true;
    };
  }, [currentUser, userProfile?.name]);

  // Fetch overview metrics
  const refreshOverview = async () => {
    setIsLoadingOverview(true);
    try {
      const data = await AdminService.getOverview("7d");
      setOverviewData(data);
    } catch (e: any) {
      console.warn("Could not load overview metrics:", e);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      refreshOverview();
    }
  }, [isAdmin]);

  const navigateAdmin = (tab: AdminRouteTab, param?: string) => {
    setActiveRoute(tab);
    setActiveParam(param);

    // Sync to browser history URL
    const targetUrl = param ? `/admin/${tab}/${param}` : `/admin/${tab}`;
    if (typeof window !== "undefined") {
      window.history.pushState({ tab: "admin", adminSubRoute: tab, adminParam: param }, "", targetUrl);
    }
  };

  const claimSuperAdmin = async (): Promise<boolean> => {
    if (!currentUser) {
      toast.error("Sign-In Required", "Please sign in to authenticate as Super Admin.");
      return false;
    }

    try {
      const success = await AdminService.bootstrapSuperAdmin(
        currentUser.uid,
        currentUser.email || "owner@learnstudy.app",
        currentUser.displayName || "Platform Owner"
      );
      if (success) {
        setIsAdmin(true);
        setAdminRole("super_admin");
        toast.success("Super Admin Verified", "You now have full platform administrative authority.");
        await logAuditAction(
          "CLAIM_SUPER_ADMIN",
          "security",
          currentUser.uid,
          currentUser.displayName || "Owner",
          { email: currentUser.email }
        );
        return true;
      }
      return false;
    } catch (e) {
      toast.error("Role Verification Error", "Could not complete admin role registration.");
      return false;
    }
  };

  const logAuditAction = async (
    action: string,
    category: "user_management" | "content" | "feature_flags" | "settings" | "security" | "maintenance" | "support",
    targetId?: string,
    targetName?: string,
    details?: any
  ) => {
    try {
      await AdminService.recordAudit({
        adminUid: currentUser?.uid || "sys-admin",
        adminEmail: currentUser?.email || "admin@learnstudy.app",
        adminName: currentUser?.displayName || userProfile?.name || "Platform Admin",
        action,
        category,
        targetId,
        targetName,
        details
      });
    } catch (e) {
      console.warn("Audit log notice:", e);
    }
  };

  const isSuperAdmin = adminRole === "super_admin";
  const isContentManager = isSuperAdmin || adminRole === "content_manager";
  const isSupportAgent = isSuperAdmin || adminRole === "support_agent";

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        isVerifyingRole,
        adminRole,
        isSuperAdmin,
        isContentManager,
        isSupportAgent,
        activeRoute,
        activeParam,
        navigateAdmin,
        overviewData,
        isLoadingOverview,
        refreshOverview,
        claimSuperAdmin,
        logAuditAction
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
