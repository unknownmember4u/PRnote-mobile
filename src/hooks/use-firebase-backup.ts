import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import type { Note } from '@/lib/store';
import {
  downloadNotesFromFirebase,
  ensureCloudDocIds,
  isFirebaseConfigured,
  resolveFirebaseRedirect,
  signInWithGoogle,
  signOutFromFirebase,
  subscribeToFirebaseUser,
  uploadNotesToFirebase,
} from '@/lib/firebase';

export function useFirebaseBackup(notes: Note[], setNotes?: Dispatch<SetStateAction<Note[]>>) {
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

    let isMounted = true;

    const unsubscribe = subscribeToFirebaseUser((nextUser) => {
      setUser(nextUser);

      if (nextUser?.email) {
        setStatusMessage(`Signed in as ${nextUser.email}. Fetching your cloud notes...`);

        if (setNotes) {
          downloadNotesFromFirebase()
            .then((cloudNotes) => {
              if (!isMounted) {
                return;
              }

              setNotes(cloudNotes);
              setStatusMessage(`Signed in as ${nextUser.email}. Loaded ${cloudNotes.length} cloud notes.`);
            })
            .catch((error: Error) => {
              if (!isMounted) {
                return;
              }

              setStatusMessage(error.message || 'Signed in, but could not fetch cloud notes.');
            });
        } else {
          setStatusMessage(`Signed in as ${nextUser.email}.`);
        }
      } else if (configured) {
        if (setNotes) {
          setNotes([]);
        }
        setStatusMessage('Connect Google to back up your notes to Firebase.');
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [configured, setNotes]);

  const signIn = async () => {
    if (!configured) {
      setStatusMessage('Firebase is not configured yet. Add the Vite Firebase env keys first.');
      return;
    }

    try {
      setBusyAction('sign-in');
      setStatusMessage('Starting Google sign-in...');
      await signInWithGoogle();
      setStatusMessage('Google sign-in successful. Sync is ready. Fetching your cloud notes...');
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error ?? 'Google sign-in failed.');
      const lowered = rawMessage.toLowerCase();

      if (lowered.includes('12501')) {
        setStatusMessage('Google sign-in was cancelled. Please try again and complete account selection.');
      } else if (lowered.includes('error 10') || lowered.includes('developer_error') || lowered.includes('misconfigured')) {
        setStatusMessage(
          'Google sign-in is not configured correctly for Android. Add SHA-1/SHA-256 for com.prnote.app in Firebase, replace google-services.json, then sync Android.'
        );
      } else {
        setStatusMessage(rawMessage || 'Google sign-in failed.');
      }
    } finally {
      setBusyAction(null);
    }
  };

  const signOut = async () => {
    try {
      setBusyAction('sign-out');
      await signOutFromFirebase();
      if (setNotes) {
        setNotes([]);
      }
      setStatusMessage('Signed out from Google backup.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign out failed.';
      setStatusMessage(message);
    } finally {
      setBusyAction(null);
    }
  };

  const upload = async (selectedNoteIds?: string[]) => {
    try {
      setBusyAction('upload');
      const selectedNotes = selectedNoteIds && selectedNoteIds.length > 0
        ? notes.filter((note) => selectedNoteIds.includes(note.id))
        : notes;

      if (selectedNotes.length === 0) {
        setStatusMessage('Select at least one note to upload.');
        return;
      }

      setStatusMessage(
        selectedNotes.length === notes.length
          ? 'Uploading all notes to cloud...'
          : `Uploading ${selectedNotes.length} selected notes to cloud...`
      );

      const notesWithCloudIds = ensureCloudDocIds(selectedNotes);
      if (setNotes) {
        const cloudIdMap = new Map(notesWithCloudIds.map((note) => [note.id, note.cloudDocId]));
        const changed = notes.some((note) => {
          const nextCloudId = cloudIdMap.get(note.id);
          return !!nextCloudId && nextCloudId !== note.cloudDocId;
        });
        if (changed) {
          setNotes((previous) => previous.map((note) => {
            const nextCloudId = cloudIdMap.get(note.id);
            return nextCloudId ? { ...note, cloudDocId: nextCloudId } : note;
          }));
        }
      }

      await uploadNotesToFirebase(notesWithCloudIds);
      const uploadedAt = new Date().toLocaleString();
      setLastUploadedAt(uploadedAt);
      if (selectedNotes.length === notes.length) {
        setStatusMessage(`Uploaded all ${notesWithCloudIds.length} notes to cloud.`);
      } else {
        setStatusMessage(`Uploaded ${notesWithCloudIds.length} selected notes to cloud.`);
      }
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Upload failed.';
      const lowered = rawMessage.toLowerCase();

      if (lowered.includes('permission denied') || lowered.includes('insufficient permissions')) {
        setStatusMessage(
          'Firestore rules are blocking upload. Allow authenticated users to write their own /users/{uid}/notes documents.'
        );
      } else {
        setStatusMessage(rawMessage);
      }
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
