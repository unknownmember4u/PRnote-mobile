import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import type { Note } from '@/lib/store';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let appInstance: ReturnType<typeof initializeApp> | null = null;

export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every(Boolean);
}

function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Add your Vite Firebase environment variables first.');
  }

  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
  }

  return appInstance;
}

function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}

export function subscribeToFirebaseUser(callback: (user: User | null) => void) {
  if (!isFirebaseConfigured()) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function resolveFirebaseRedirect() {
  if (!isFirebaseConfigured()) {
    return null;
  }

  return getRedirectResult(getFirebaseAuth());
}

export async function signInWithGoogle() {
  const auth = getFirebaseAuth();

  if (Capacitor.isNativePlatform()) {
    const nativeSignIn = async (useCredentialManager: boolean) =>
      FirebaseAuthentication.signInWithGoogle({
        skipNativeAuth: true,
        scopes: ['profile', 'email'],
        useCredentialManager,
      });

    let result;

    try {
      result = await nativeSignIn(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes('no credentials available')) {
        throw error;
      }

      result = await nativeSignIn(false);
    }

    const idToken = result.credential?.idToken;
    const accessToken = result.credential?.accessToken;

    if (!idToken) {
      throw new Error('Google sign-in did not return an ID token. Check your Firebase Android app configuration.');
    }

    const credential = GoogleAuthProvider.credential(idToken, accessToken ?? undefined);
    return signInWithCredential(auth, credential);
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}

export async function signOutFromFirebase() {
  await signOut(getFirebaseAuth());
}

export async function uploadNotesToFirebase(notes: Note[]) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Sign in with Google before uploading notes.');
  }

  const db = getFirebaseDb();
  const userRef = doc(db, 'users', user.uid);
  const notesCollectionRef = collection(db, 'users', user.uid, 'notes');
  const existingSnapshot = await getDocs(notesCollectionRef);
  const existingIds = new Set(existingSnapshot.docs.map((snapshot) => snapshot.id));
  const incomingIds = new Set(notes.map((note) => note.id));

  const writeOps: Array<{ type: 'set' | 'delete'; ref: ReturnType<typeof doc>; data?: Record<string, unknown>; merge?: boolean }> = [
    {
      type: 'set',
      ref: userRef,
      data: {
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        lastUploadAt: serverTimestamp(),
        noteCount: notes.length,
      },
      merge: true,
    },
  ];

  notes.forEach((note) => {
    writeOps.push({
      type: 'set',
      ref: doc(db, 'users', user.uid, 'notes', note.id),
      data: {
        ...note,
        ownerId: user.uid,
        syncedAt: serverTimestamp(),
      },
      merge: true,
    });
  });

  existingIds.forEach((existingId) => {
    if (!incomingIds.has(existingId)) {
      writeOps.push({
        type: 'delete',
        ref: doc(db, 'users', user.uid, 'notes', existingId),
      });
    }
  });

  for (let index = 0; index < writeOps.length; index += 400) {
    const batch = writeBatch(db);
    const chunk = writeOps.slice(index, index + 400);

    chunk.forEach((operation) => {
      if (operation.type === 'set' && operation.data) {
        batch.set(operation.ref, operation.data, { merge: operation.merge });
        return;
      }

      batch.delete(operation.ref);
    });

    await batch.commit();
  }
}
