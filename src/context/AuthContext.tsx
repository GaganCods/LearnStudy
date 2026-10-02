import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  auth, 
  onAuthStateChanged, 
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
import { useToast } from "../components/ToastContext";

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserDatabaseProfile | null;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserDatabaseProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

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

        // Sync to Realtime Database & Firestore
        try {
          const syncedProfile = await syncUserProfileToDatabase(user);
          setUserProfile(syncedProfile);
        } catch (syncErr) {
          console.warn("Background user sync info:", syncErr);
        }

        // Listen for live Realtime Database changes at users/{uid}
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

    try {
      const { user } = await loginWithGoogle();
      toast.success(
        "Signed in successfully",
        `Welcome back, ${user.displayName || user.email?.split("@")[0] || "Learner"}!`
      );
      return true;
    } catch (err: any) {
      console.error("Google Authentication error:", err);
      const friendlyMsg = getFriendlyAuthErrorMessage(err?.code || "", err?.message);
      setError(friendlyMsg);
      toast.error("Google Sign-In Failed", friendlyMsg);
      return false;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOutUser = async (): Promise<void> => {
    try {
      await logoutUser();
      toast.info("Signed Out", "You have successfully signed out of LearnStudy.");
    } catch (err: any) {
      console.error("Sign out error:", err);
      toast.error("Sign Out Failed", "Could not sign out. Please try again.");
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isLoading,
        isSigningIn,
        error,
        signInWithGoogle,
        signOutUser,
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
