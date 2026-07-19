import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "./firebase";

export type UserProfile = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: unknown; // Firestore ServerTimestamp
  lastLoginAt: unknown;
};

/**
 * Ensures a user profile document exists in Firestore.
 * Creates one for first-time users, updates lastLoginAt for returning users.
 */
export async function ensureUserProfile(user: User): Promise<void> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // First-time user — create full profile
    await setDoc(ref, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    } satisfies Omit<UserProfile, "createdAt" | "lastLoginAt"> & {
      createdAt: unknown;
      lastLoginAt: unknown;
    });
  } else {
    // Returning user — just update last login timestamp
    await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true });
  }
}
