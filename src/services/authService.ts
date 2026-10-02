import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  signOut,
  rtdb,
  ref,
  get,
  set,
  update,
  db,
  doc,
  setDoc,
  getDoc,
  User
} from "../lib/firebase";
import { Storage } from "../utils/storage";

export interface UserDatabaseProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  provider: "google";
  createdAt: number;
  lastLoginAt: number;
}

/**
 * Format user-friendly error messages from Firebase Authentication error codes.
 */
export function getFriendlyAuthErrorMessage(errorCode: string, defaultMessage?: string): { message: string; actionableHint?: string } {
  const currentHost = typeof window !== "undefined" ? window.location.hostname : "your current domain";

  switch (errorCode) {
    case "auth/popup-closed-by-user":
      return { 
        message: "Sign-in cancelled. The Google sign-in window was closed.",
        actionableHint: "Click Continue with Google to try again."
      };
    case "auth/popup-blocked":
      return { 
        message: "The Google sign-in pop-up was blocked by your browser.",
        actionableHint: "Please allow pop-ups for this website in your browser's address bar settings and click sign-in again."
      };
    case "auth/cancelled-popup-request":
      return { 
        message: "A sign-in request is already in progress.",
        actionableHint: "Please complete the open sign-in window or wait a few seconds."
      };
    case "auth/network-request-failed":
      return { 
        message: "Network connection error. Could not reach Google Authentication servers.",
        actionableHint: "Please check your internet connection and try again."
      };
    case "auth/unauthorized-domain":
      return { 
        message: `The domain "${currentHost}" is not yet listed in your Firebase Authorized Domains.`,
        actionableHint: `To authorize: Open Firebase Console > Authentication > Settings tab > Authorized domains > Add domain: ${currentHost}`
      };
    case "auth/account-exists-with-different-credential":
      return { 
        message: "An account already exists with this email address using another sign-in method.",
        actionableHint: "Sign in using the original method you used to register."
      };
    case "auth/operation-not-allowed":
      return { 
        message: "Google Sign-In is not enabled in Firebase Authentication.",
        actionableHint: "Enable Google as a Sign-in provider in Firebase Console > Build > Authentication > Sign-in method."
      };
    case "auth/user-disabled":
      return { 
        message: "This user account has been disabled.",
        actionableHint: "Contact support or use a different Google account."
      };
    case "auth/invalid-api-key":
      return { 
        message: "Invalid Firebase API key in configuration.",
        actionableHint: "Verify your Firebase Web App credentials in firebase-applet-config.json."
      };
    default:
      return { 
        message: defaultMessage || "Failed to sign in with Google. Please try again.",
        actionableHint: "Make sure pop-ups are allowed and try again."
      };
  }
}

/**
 * Stores or updates user profile in Firebase Realtime Database at `users/{uid}`.
 * Preserves `createdAt` for existing users and updates `lastLoginAt`.
 * Also mirrors to Firestore `users/{uid}` and local storage for comprehensive fallback resilience.
 */
export async function syncUserProfileToDatabase(user: User): Promise<UserDatabaseProfile> {
  const now = Date.now();
  const fallbackProfile: UserDatabaseProfile = {
    uid: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "Learner",
    email: user.email || "",
    photoURL: user.photoURL || "",
    provider: "google",
    createdAt: now,
    lastLoginAt: now
  };

  // 1. Synchronize to Firebase Realtime Database: users/{uid}
  if (rtdb) {
    try {
      const userRef = ref(rtdb, `users/${user.uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const existingData = snapshot.val() as Partial<UserDatabaseProfile>;
        const updatedProfile: UserDatabaseProfile = {
          uid: user.uid,
          name: user.displayName || existingData.name || fallbackProfile.name,
          email: user.email || existingData.email || fallbackProfile.email,
          photoURL: user.photoURL || existingData.photoURL || fallbackProfile.photoURL,
          provider: "google",
          createdAt: existingData.createdAt || now,
          lastLoginAt: now
        };
        await update(userRef, {
          name: updatedProfile.name,
          email: updatedProfile.email,
          photoURL: updatedProfile.photoURL,
          provider: "google",
          lastLoginAt: now
        });
        fallbackProfile.createdAt = updatedProfile.createdAt;
        fallbackProfile.name = updatedProfile.name;
        fallbackProfile.photoURL = updatedProfile.photoURL;
      } else {
        await set(userRef, fallbackProfile);
      }
    } catch (rtdbErr) {
      console.warn("Realtime Database sync notice:", rtdbErr);
    }
  }

  // 2. Synchronize to Firestore users/{uid} as secondary persistent store
  try {
    const userDocRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const docData = docSnap.data();
      await setDoc(userDocRef, {
        name: user.displayName || docData.name || fallbackProfile.name,
        email: user.email || docData.email || fallbackProfile.email,
        photoURL: user.photoURL || docData.photoURL || fallbackProfile.photoURL,
        provider: "google",
        lastLoginAt: new Date(now).toISOString()
      }, { merge: true });
    } else {
      await setDoc(userDocRef, {
        uid: user.uid,
        name: fallbackProfile.name,
        email: fallbackProfile.email,
        photoURL: fallbackProfile.photoURL,
        provider: "google",
        createdAt: new Date(now).toISOString(),
        lastLoginAt: new Date(now).toISOString()
      });
    }
  } catch (fsErr) {
    console.warn("Firestore user sync notice:", fsErr);
  }

  // 3. Keep LearnStudy local user profile settings updated
  if (user.displayName) {
    const currentSettings = Storage.getSettings();
    Storage.saveSettings({
      ...currentSettings,
      userName: user.displayName
    });
  }

  return fallbackProfile;
}

/**
 * Perform Google Sign-In with popup, falling back gracefully to redirect if required.
 */
export async function loginWithGoogle(): Promise<{ user: User; profile: UserDatabaseProfile }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const profile = await syncUserProfileToDatabase(user);
    return { user, profile };
  } catch (error: any) {
    console.warn("signInWithPopup error code:", error?.code, error?.message);
    // If popup was blocked or mobile device environment requires redirect
    if (
      (error?.code === "auth/popup-blocked" || error?.code === "auth/cancelled-popup-request") &&
      typeof window !== "undefined"
    ) {
      console.info("Attempting signInWithRedirect fallback...");
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectErr) {
        console.error("signInWithRedirect failed:", redirectErr);
      }
    }
    throw error;
  }
}

/**
 * Sign out current authenticated user.
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
