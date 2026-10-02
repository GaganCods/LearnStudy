import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  auth, 
  onAuthStateChanged, 
  getRedirectResult,
  User, 
  rtdb, 
  ref, 
  onValue 
} from "../lib/firebase";
import { 
  loginWithGoogle, 
  logoutUser, 
  syncUserProfileToDatabase, 
  UserDatabaseProfile, 
  getFriendlyAuthErrorMessage 
} from "../services/authService";
import { cloudSync, SyncStatus } from "../services/cloudSyncService";
import { userAccountSync } from "../services/userAccountSync";
import { useToast } from "../components/ToastContext";

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserDatabaseProfile | null;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
  errorHint: string | null;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  signInWithGoogle: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  syncNow: () => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserDatabaseProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const toast = useToast();

  // Subscribe to Cloud Sync status changes
  useEffect(() => {
    const unsubscribeSync = cloudSync.subscribe((status, timestamp) => {
      setSyncStatus(status);
      setLastSyncedAt(timestamp);
    });
    return () => unsubscribeSync();
  }, []);

  // Handle redirect result on page load (for devices that fell back to signInWithRedirect)
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          await syncUserProfileToDatabase(result.user);
          await userAccountSync.handleUserLogin(result.user).catch(e => console.warn(e));
          await cloudSync.initializeForUser(result.user);
          toast.success(
            "Signed In",
            `Welcome back, ${result.user.displayName || "Learner"}!`
          );
        }
      })
      .catch((err) => {
        console.warn("Redirect sign-in check notice:", err);
      });
  }, []);

  // Listen for Authentication state changes
  useEffect(() => {
    let unsubscribeRtdb: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Construct immediate basic profile
        const immediateProfile: UserDatabaseProfile = {
          uid: user.uid,
          name: user.displayName || user.email?.split("@")[0] || "Learner",
          email: user.email || "",
          photoURL: user.photoURL || "",
          provider: "google",
          createdAt: Date.now(),
          lastLoginAt: Date.now()
        };
        setUserProfile(immediateProfile);

        // 1. Sync User Profile in background
        syncUserProfileToDatabase(user)
          .then((synced) => setUserProfile(synced))
          .catch((err) => console.warn("User profile sync notice:", err));

        // 2. Initialize Realtime Cross-Device Study Data Sync
        await userAccountSync.handleUserLogin(user).catch(e => console.warn("userAccountSync login notice:", e));
        cloudSync.initializeForUser(user)
          .catch((syncErr) => console.warn("Cloud data sync initialization notice:", syncErr));

        // 3. Listen for live Realtime Database profile updates at users/{uid}
        if (rtdb) {
          try {
            const userRef = ref(rtdb, `users/${user.uid}`);
            unsubscribeRtdb = onValue(userRef, (snapshot) => {
              if (snapshot.exists()) {
                const liveData = snapshot.val() as UserDatabaseProfile;
                setUserProfile(prev => ({ ...prev, ...liveData }));
              }
            }, (rtdbErr) => {
              console.warn("RTDB live subscription notice:", rtdbErr);
            });
          } catch (listenErr) {
            console.warn("RTDB listen setup notice:", listenErr);
          }
        }
      } else {
        setUserProfile(null);
        userAccountSync.handleUserLogout();
        cloudSync.handleUserSignOut();
        if (unsubscribeRtdb) {
          unsubscribeRtdb();
          unsubscribeRtdb = null;
        }
      }

      setIsLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRtdb) {
        unsubscribeRtdb();
      }
    };
  }, []);

  const signInWithGoogle = async (): Promise<boolean> => {
    if (isSigningIn) return false;
    setIsSigningIn(true);
    setError(null);
    setErrorHint(null);

    try {
      const { user } = await loginWithGoogle();
      await cloudSync.initializeForUser(user);
      toast.success(
        "Signed in successfully",
        `Welcome, ${user.displayName || user.email?.split("@")[0] || "Learner"}! Your study data is now synced across devices.`
      );
      return true;
    } catch (err: any) {
      console.error("Google Authentication error:", err);
      const { message, actionableHint } = getFriendlyAuthErrorMessage(err?.code || "", err?.message);
      setError(message);
      setErrorHint(actionableHint || null);
      toast.error("Google Sign-In Failed", message);
      return false;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOutUser = async (): Promise<void> => {
    try {
      await logoutUser();
      cloudSync.handleUserSignOut();
      toast.info("Signed Out", "You have successfully signed out.");
    } catch (err: any) {
      console.error("Sign out error:", err);
      toast.error("Sign Out Failed", "Could not sign out. Please try again.");
    }
  };

  const syncNow = async (): Promise<boolean> => {
    const success = await cloudSync.syncNow();
    if (success) {
      toast.success("Study Data Synced", "All playlists, notes, bookmarks, and progress are up to date in the cloud.");
    } else {
      toast.error("Sync Notice", "Could not complete cloud sync. Check your connection or sign in.");
    }
    return success;
  };

  const clearError = () => {
    setError(null);
    setErrorHint(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isLoading,
        isSigningIn,
        error,
        errorHint,
        syncStatus,
        lastSyncedAt,
        signInWithGoogle,
        signOutUser,
        syncNow,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
