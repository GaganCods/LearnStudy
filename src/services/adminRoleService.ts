import { 
  rtdb, 
  ref, 
  get, 
  set, 
  update, 
  child,
  db, 
  doc, 
  getDoc, 
  setDoc 
} from "../lib/firebase";
import { AdminUserRecord } from "../types";

export const PRIMARY_ADMIN_EMAILS = [
  "gagan52526@gmail.com"
];

export interface AdminRoleResult {
  isAdmin: boolean;
  role: "admin" | "super_admin" | null;
  email?: string;
  source: "rtdb" | "firestore" | "verified_owner" | "none";
}

export interface DailyLoginEntry {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  timestamp: number;
  role?: string;
  device?: string;
}

export class AdminRoleService {
  /**
   * Check if a given email is a recognized primary platform admin
   */
  static isPrimaryAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return PRIMARY_ADMIN_EMAILS.some(e => e.toLowerCase() === clean);
  }

  /**
   * Strictly verify if a user has an Admin role in Firebase Realtime Database
   * (and bootstrap admin role in RTDB for the primary admin email automatically)
   */
  static async verifyAdminRole(uid: string, email?: string | null, name?: string | null): Promise<AdminRoleResult> {
    if (!uid) {
      return { isAdmin: false, role: null, source: "none" };
    }

    const cleanEmail = (email || "").trim().toLowerCase();
    const isOwnerEmail = this.isPrimaryAdminEmail(cleanEmail);

    // If RTDB is available, check RTDB roles/{uid} and admins/{uid}
    if (rtdb) {
      try {
        const roleRef = ref(rtdb, `roles/${uid}`);
        const snapshot = await get(roleRef);

        if (snapshot.exists()) {
          const val = snapshot.val();
          const roleValue = typeof val === "string" ? val : val?.role;
          if (roleValue === "admin" || roleValue === "super_admin") {
            return {
              isAdmin: true,
              role: roleValue === "super_admin" ? "super_admin" : "admin",
              email: cleanEmail,
              source: "rtdb"
            };
          }
        }

        // Check admins/{uid} quick boolean
        const adminFlagRef = ref(rtdb, `admins/${uid}`);
        const flagSnap = await get(adminFlagRef);
        if (flagSnap.exists() && flagSnap.val() === true) {
          return {
            isAdmin: true,
            role: "admin",
            email: cleanEmail,
            source: "rtdb"
          };
        }

        // If user is verified primary admin email, auto-seed role in RTDB
        if (isOwnerEmail) {
          const newRole = {
            role: "admin",
            email: cleanEmail,
            name: name || "Admin",
            assignedAt: Date.now(),
            assignedBy: "system_verified_owner"
          };

          await set(ref(rtdb, `roles/${uid}`), newRole).catch(e => console.warn("Seed RTDB role notice:", e));
          await set(ref(rtdb, `admins/${uid}`), true).catch(e => console.warn("Seed RTDB admin flag notice:", e));

          // Also record in Firestore for multi-store reliability
          try {
            await setDoc(doc(db, "adminRoles", uid), {
              role: "admin",
              email: cleanEmail,
              name: name || "Admin",
              updatedAt: Date.now()
            }, { merge: true });
          } catch {}

          return {
            isAdmin: true,
            role: "admin",
            email: cleanEmail,
            source: "verified_owner"
          };
        }
      } catch (err) {
        console.warn("RTDB role check error:", err);
      }
    }

    // Secondary check: Firestore adminRoles/{uid}
    try {
      const fsSnap = await getDoc(doc(db, "adminRoles", uid));
      if (fsSnap.exists()) {
        const data = fsSnap.data();
        if (data.role === "admin" || data.role === "super_admin") {
          return {
            isAdmin: true,
            role: data.role,
            email: cleanEmail,
            source: "firestore"
          };
        }
      }
    } catch (e) {
      console.warn("Firestore role check error:", e);
    }

    // Owner email direct fallback if cloud DB had network lag
    if (isOwnerEmail) {
      return {
        isAdmin: true,
        role: "admin",
        email: cleanEmail,
        source: "verified_owner"
      };
    }

    // Non-admin user: strictly denied
    return { isAdmin: false, role: null, source: "none" };
  }

  /**
   * Record daily login of a user into Firebase Realtime Database
   */
  static async recordDailyLogin(user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }): Promise<void> {
    if (!user || !user.uid) return;

    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const now = Date.now();
    const cleanEmail = user.email || "";
    const cleanName = user.displayName || user.email?.split("@")[0] || "Scholar";
    const isAdmin = this.isPrimaryAdminEmail(cleanEmail);

    const loginRecord: DailyLoginEntry = {
      uid: user.uid,
      email: cleanEmail,
      name: cleanName,
      photoURL: user.photoURL || undefined,
      timestamp: now,
      role: isAdmin ? "admin" : "student",
      device: typeof navigator !== "undefined" ? (navigator.userAgent.includes("Mobile") ? "Mobile" : "Desktop") : "Web"
    };

    // 1. Write to RTDB dailyLogins/{date}/{uid}
    if (rtdb) {
      try {
        const loginRef = ref(rtdb, `dailyLogins/${todayKey}/${user.uid}`);
        await set(loginRef, loginRecord);

        // Also update users/{uid}/lastLoginAt
        const userProfileRef = ref(rtdb, `users/${user.uid}/profile`);
        await update(userProfileRef, {
          lastLoginAt: now,
          lastActiveDate: todayKey
        }).catch(() => {});
      } catch (err) {
        console.warn("Failed to record daily login in RTDB:", err);
      }
    }

    // 2. Also notify backend server to update in-memory daily stats
    try {
      await fetch("/api/admin/record-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginRecord)
      });
    } catch {}
  }

  /**
   * Fetch today's real logins from Realtime Database
   */
  static async getTodayLogins(): Promise<DailyLoginEntry[]> {
    const todayKey = new Date().toISOString().slice(0, 10);
    
    // Try RTDB first
    if (rtdb) {
      try {
        const todayRef = ref(rtdb, `dailyLogins/${todayKey}`);
        const snapshot = await get(todayRef);
        if (snapshot.exists()) {
          const val = snapshot.val();
          return Object.values(val) as DailyLoginEntry[];
        }
      } catch (err) {
        console.warn("Error fetching today logins from RTDB:", err);
      }
    }

    // Fallback to server endpoint
    try {
      const res = await fetch("/api/admin/daily-logins");
      if (res.ok) {
        const data = await res.json();
        return data.todayLogins || [];
      }
    } catch {}

    return [];
  }

  /**
   * Fetch real registered users from Firebase Realtime Database
   * without ANY fake or dummy sample data
   */
  static async getRealUsers(): Promise<AdminUserRecord[]> {
    const realUsers: AdminUserRecord[] = [];

    if (rtdb) {
      try {
        const usersRef = ref(rtdb, "users");
        const snapshot = await get(usersRef);

        if (snapshot.exists()) {
          const allUsersData = snapshot.val();
          for (const uid of Object.keys(allUsersData)) {
            const uData = allUsersData[uid];
            const profile = uData?.profile || {};
            
            // Calculate real metrics from their account subtree
            const playlistsCount = uData?.playlists ? Object.keys(uData.playlists).length : 0;
            const notesCount = uData?.notes ? Object.keys(uData.notes).length : 0;
            const flashcardsCount = uData?.flashcards ? Object.keys(uData.flashcards).length : 0;
            
            // Calculate study seconds from pomodoro or progress
            let totalStudySeconds = 0;
            if (uData?.pomodoro?.sessions) {
              const sessions = Object.values(uData.pomodoro.sessions) as any[];
              totalStudySeconds = sessions.reduce((acc, s) => acc + (Number(s.durationSeconds || s.duration || 0)), 0);
            }

            const email = profile.email || uData.email || "";
            const isOwner = this.isPrimaryAdminEmail(email);

            realUsers.push({
              uid,
              name: profile.name || uData.name || email.split("@")[0] || "Learner",
              email,
              photoURL: profile.photoURL || uData.photoURL || undefined,
              status: uData?.status || "active",
              createdAt: profile.createdAt || uData.createdAt || Date.now() - 86400000,
              lastLoginAt: profile.lastLoginAt || uData.lastLoginAt || Date.now(),
              role: isOwner ? "super_admin" : (uData?.role || undefined),
              playlistsCount,
              notesCount,
              flashcardsCount,
              totalStudySeconds
            });
          }
        }
      } catch (err) {
        console.warn("Realtime Database users fetch notice:", err);
      }
    }

    // If RTDB returned real users, sort by recent login and return
    if (realUsers.length > 0) {
      return realUsers.sort((a, b) => b.lastLoginAt - a.lastLoginAt);
    }

    // Fallback: fetch from server endpoint
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        return (data.users || []).filter((u: any) => !u.uid.startsWith("usr-")); // Exclude legacy dummy IDs
      }
    } catch {}

    return [];
  }

  /**
   * Assign or revoke Admin Role for any user in Firebase Realtime Database
   */
  static async assignRole(targetUid: string, role: "admin" | "student", details?: { email?: string; name?: string; assignedBy?: string }): Promise<boolean> {
    if (!targetUid) return false;

    if (rtdb) {
      try {
        if (role === "admin") {
          await set(ref(rtdb, `roles/${targetUid}`), {
            role: "admin",
            email: details?.email || "",
            name: details?.name || "Admin",
            assignedAt: Date.now(),
            assignedBy: details?.assignedBy || "super_admin"
          });
          await set(ref(rtdb, `admins/${targetUid}`), true);
        } else {
          await set(ref(rtdb, `roles/${targetUid}`), {
            role: "student",
            updatedAt: Date.now()
          });
          await set(ref(rtdb, `admins/${targetUid}`), null);
        }

        // Also update Firestore for redundancy
        try {
          await setDoc(doc(db, "adminRoles", targetUid), {
            role: role === "admin" ? "admin" : "student",
            updatedAt: Date.now()
          }, { merge: true });
        } catch {}

        return true;
      } catch (err) {
        console.error("Failed to assign role in Firebase:", err);
        return false;
      }
    }
    return false;
  }
}

