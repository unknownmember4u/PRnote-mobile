export async function deleteNotesFromFirebase(noteCloudDocIds: string[]): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sign in with Google before deleting notes.');
  }
  const db = getFirebaseDb();
  for (let index = 0; index < noteCloudDocIds.length; index += 400) {
    const batch = writeBatch(db);
    const chunk = noteCloudDocIds.slice(index, index + 400);
    chunk.forEach((cloudDocId) => {
      batch.delete(doc(db, 'users', user.uid, 'notes', cloudDocId));
    });
    try {
      await batch.commit();
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (message.includes('missing or insufficient permissions') || message.includes('permission-denied')) {
        throw new Error(
          'Firestore permission denied. Update Firestore Rules to allow authenticated users to delete /users/{uid}/notes/{noteId} where request.auth.uid == uid.'
        );
      }
      throw error;
    }
  }
}
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
  getFirestore,
  getDocs,
  onSnapshot,
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

function slugifyTitle(value: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || 'untitled';
}

function buildCloudDocId(note: Pick<Note, 'title' | 'createdAt'>) {
  const created = new Date(note.createdAt);
  const yyyy = created.getFullYear();
  const mm = String(created.getMonth() + 1).padStart(2, '0');
  const dd = String(created.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${slugifyTitle(note.title)}_${note.createdAt}`;
}

export function ensureCloudDocIds(notes: Note[]): Note[] {
  return notes.map((note) => ({
    ...note,
    cloudDocId: note.cloudDocId ?? buildCloudDocId(note),
  }));
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
      const lowered = message.toLowerCase();

      // Credential Manager often fails first on some Android devices.
      if (
        lowered.includes('no credentials available') ||
        lowered.includes('credential manager') ||
        lowered.includes('12501')
      ) {
        result = await nativeSignIn(false);
      } else if (lowered.includes('10') || lowered.includes('developer_error')) {
        throw new Error(
          'Google sign-in is misconfigured for Android (error 10). Add your app SHA-1/SHA-256 in Firebase for package com.prnote.app, download a fresh google-services.json, then run cap sync android.'
        );
      } else {
        throw error;
      }
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

  const writeOps: Array<{ type: 'set' | 'delete'; ref: ReturnType<typeof doc>; data?: Record<string, unknown>; merge?: boolean }> = [
    {
      type: 'set',
      ref: userRef,
      data: {
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        lastUploadAt: serverTimestamp(),
        noteCount: notes.length,
        ownerUid: user.uid,
      },
      merge: true,
    },
  ];

  notes.forEach((note) => {
    const cloudDocId = note.cloudDocId ?? buildCloudDocId(note);
    writeOps.push({
      type: 'set',
      ref: doc(db, 'users', user.uid, 'notes', cloudDocId),
      data: {
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        archived: note.archived,
        pinned: note.pinned,
        favorite: note.favorite,
        priority: note.priority,
        folder: note.folder,
        fontFamily: note.fontFamily,
        fontSize: note.fontSize,
        lockType: note.lockType,
        locked: note.locked,
        customLockHash: note.customLockHash,
        color: note.color,
        cloudDocId,
        ownerUid: user.uid,
        syncedAt: serverTimestamp(),
      },
      merge: true,
    });
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

    try {
      await batch.commit();
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (message.includes('missing or insufficient permissions') || message.includes('permission-denied')) {
        throw new Error(
          'Firestore permission denied. Update Firestore Rules to allow authenticated users to write /users/{uid} and /users/{uid}/notes/{noteId} where request.auth.uid == uid.'
        );
      }
      throw error;
    }
  }
}

function mapDocToNote<T extends { id: string; data: () => Record<string, unknown> }>(noteDoc: T): Note {
  const raw = noteDoc.data() as Partial<Note>;
  const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : Date.now();
  const updatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : createdAt;
  const cloudDocId = typeof raw.cloudDocId === 'string' && raw.cloudDocId
    ? raw.cloudDocId
    : noteDoc.id;

  return {
    id: cloudDocId,
    title: typeof raw.title === 'string' ? raw.title : 'Untitled',
    content: typeof raw.content === 'string' ? raw.content : '',
    createdAt,
    updatedAt,
    pinned: Boolean(raw.pinned),
    favorite: Boolean(raw.favorite),
    archived: Boolean(raw.archived),
    locked: Boolean(raw.locked),
    lockType: raw.lockType === 'custom' || raw.lockType === 'device' ? raw.lockType : 'none',
    customLockHash: typeof raw.customLockHash === 'string' ? raw.customLockHash : null,
    color: typeof raw.color === 'string' ? raw.color : null,
    priority: raw.priority === 'high' || raw.priority === 'medium' || raw.priority === 'low' ? raw.priority : 'none',
    folder: typeof raw.folder === 'string' ? raw.folder : null,
    fontFamily: raw.fontFamily === 'rustico' || raw.fontFamily === 'priestacy' || raw.fontFamily === 'great-vibes' || raw.fontFamily === 'whispering' || raw.fontFamily === 'allura'
      ? raw.fontFamily
      : 'playfair',
    fontSize: raw.fontSize === 'sm' || raw.fontSize === 'lg' ? raw.fontSize : 'md',
    cloudDocId,
  };
}

export async function downloadNotesFromFirebase(): Promise<Note[]> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Sign in with Google before fetching notes.');
  }

  const db = getFirebaseDb();
  const notesSnapshot = await getDocs(collection(db, 'users', user.uid, 'notes'));

  const cloudNotes: Note[] = notesSnapshot.docs.map((noteDoc) =>
    mapDocToNote(noteDoc)
  );

  return cloudNotes.sort((left, right) => right.updatedAt - left.updatedAt);
}

/** Real-time subscription to cloud notes. Call with user.uid when signed in. Returns unsubscribe. */
export function subscribeToCloudNotes(
  uid: string,
  onNotes: (notes: Note[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isFirebaseConfigured()) {
    onNotes([]);
    return () => undefined;
  }

  const db = getFirebaseDb();
  const notesRef = collection(db, 'users', uid, 'notes');

  return onSnapshot(
    notesRef,
    (snapshot) => {
      const cloudNotes: Note[] = snapshot.docs.map((noteDoc) =>
        mapDocToNote(noteDoc)
      );
      onNotes(cloudNotes.sort((left, right) => right.updatedAt - left.updatedAt));
    },
    (error) => {
      onError?.(error instanceof Error ? error : new Error(String(error)));
      onNotes([]);
    }
  );
}
