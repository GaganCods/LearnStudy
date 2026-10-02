import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect, 
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
export function getFriendlyAuthErrorMessage(errorCode: string, defaultMessage?: string): string {
  switch (errorCode) {
    case "auth/popup-closed-by-user":
      return "Sign-in cancelled. The Google sign-in window was closed.";
    case "auth/popup-blocked":
      return "The Google sign-in pop-up was blocked by your browser. Please enable pop-ups for this site and try again.";
    case "auth/cancelled-popup-request":
      return "The previous sign-in attempt was replaced by a new one.";
    case "auth/network-request-failed":
      return "Network connection error. Please check your internet connection and try again.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in your Firebase Authentication Console. Please add this domain to Authorized Domains in Firebase.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with the same email address using a different sign-in method.";
    case "auth/operation-not-allowed":
      return "Google Sign-In is not enabled in Firebase Authentication. Please enable Google provider in the Firebase Console under Sign-in method.";
    case "auth/user-disabled":
      return "This user account has been disabled by an administrator.";
    case "auth/invalid-api-key":
      return "Firebase configuration error: Invalid API key.";
    default:
      return defaultMessage || "Failed to sign in with Google. Please try again.";
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
      console.warn("Realtime Database sync notice (check database rules or URL):", rtdbErr);
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
    // If popup was blocked or mobile iframe requires redirect
    if (error?.code === "auth/popup-blocked" && typeof window !== "undefined" && window.innerWidth < 768) {
      console.info("Popup blocked on mobile device, attempting redirect flow...");
      await signInWithRedirect(auth, googleProvider);
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
