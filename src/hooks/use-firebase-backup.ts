import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Note } from '@/lib/store';
import {
  isFirebaseConfigured,
  resolveFirebaseRedirect,
  signInWithGoogle,
  signOutFromFirebase,
  subscribeToFirebaseUser,
  uploadNotesToFirebase,
} from '@/lib/firebase';

export function useFirebaseBackup(notes: Note[]) {
  const [user, setUser] = useState<User | null>(null);
  const [busyAction, setBusyAction] = useState<'sign-in' | 'sign-out' | 'upload' | null>(null);
  const [statusMessage, setStatusMessage] = useState('Connect Google to back up your notes to Firebase.');
  const [lastUploadedAt, setLastUploadedAt] = useState<string | null>(null);
  const configured = useMemo(() => isFirebaseConfigured(), []);

  useEffect(() => {
    if (!configured) {
      setStatusMessage('Firebase is not configured yet. Add the Vite Firebase env keys to enable cloud backup.');
      return;
    }

    resolveFirebaseRedirect()
      .then((result) => {
        if (result?.user) {
          setStatusMessage(`Signed in as ${result.user.email ?? 'your Google account'}.`);
        }
      })
      .catch((error: Error) => {
        setStatusMessage(error.message || 'Google sign-in could not be completed.');
      });

    return subscribeToFirebaseUser((nextUser) => {
      setUser(nextUser);

      if (nextUser?.email) {
        setStatusMessage(`Signed in as ${nextUser.email}.`);
      } else if (configured) {
        setStatusMessage('Connect Google to back up your notes to Firebase.');
      }
    });
  }, [configured]);

  const signIn = async () => {
    if (!configured) {
      setStatusMessage('Firebase is not configured yet. Add the Vite Firebase env keys first.');
      return;
    }

    try {
      setBusyAction('sign-in');
      await signInWithGoogle();
      setStatusMessage('Finish the Google sign-in flow, then return to PRnote.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed.';
      setStatusMessage(message);
    } finally {
      setBusyAction(null);
    }
  };

  const signOut = async () => {
    try {
      setBusyAction('sign-out');
      await signOutFromFirebase();
      setStatusMessage('Signed out from Google backup.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign out failed.';
      setStatusMessage(message);
    } finally {
      setBusyAction(null);
    }
  };

  const upload = async () => {
    try {
      setBusyAction('upload');
      await uploadNotesToFirebase(notes);
      const uploadedAt = new Date().toLocaleString();
      setLastUploadedAt(uploadedAt);
      setStatusMessage(`Uploaded ${notes.length} notes to Firebase.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      setStatusMessage(message);
    } finally {
      setBusyAction(null);
    }
  };

  return {
    configured,
    user,
    busyAction,
    statusMessage,
    lastUploadedAt,
    signIn,
    signOut,
    upload,
  };
}
