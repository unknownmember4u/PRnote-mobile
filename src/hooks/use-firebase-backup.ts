import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import type { Note } from '@/lib/store';
import {
  ensureCloudDocIds,
  isFirebaseConfigured,
  resolveFirebaseRedirect,
  signInWithGoogle,
  signOutFromFirebase,
  subscribeToCloudNotes,
  subscribeToFirebaseUser,
  uploadNotesToFirebase,
  deleteNotesFromFirebase,
} from '@/lib/firebase';

export type CloudBackupOptions = {
  /** Called when notes are deleted from cloud, to clear cloudDocId from local notes. */
  onCloudNotesDeleted?: (cloudDocIds: string[]) => void;
  /** If set, used to update local notes with cloudDocIds after upload. */
  setNotes?: Dispatch<SetStateAction<Note[]>>;
};

export function useFirebaseBackup(notes: Note[], options?: CloudBackupOptions) {
  const { onCloudNotesDeleted, setNotes } = options ?? {};
  const [user, setUser] = useState<User | null>(null);
  const [cloudNotes, setCloudNotes] = useState<Note[]>([]);
  const [busyAction, setBusyAction] = useState<'sign-in' | 'sign-out' | 'upload' | 'download' | 'delete' | null>(null);
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
    let unsubscribeCloud: (() => void) | undefined;

    const unsubscribe = subscribeToFirebaseUser((nextUser) => {
      setUser(nextUser);

      if (unsubscribeCloud) {
        unsubscribeCloud();
        unsubscribeCloud = undefined;
      }

      if (nextUser?.email) {
        setStatusMessage(`Signed in as ${nextUser.email}. Syncing cloud notes in real time...`);

        unsubscribeCloud = subscribeToCloudNotes(
          nextUser.uid,
          (notesFromCloud) => {
            if (!isMounted) return;
            setCloudNotes(notesFromCloud);
            setStatusMessage(`Signed in as ${nextUser.email}. ${notesFromCloud.length} notes in cloud.`);
          },
          (error) => {
            if (!isMounted) return;
            setStatusMessage(error.message || 'Could not sync cloud notes.');
            setCloudNotes([]);
          }
        );
      } else if (configured) {
        setCloudNotes([]);
        setStatusMessage('Connect Google to back up your notes to Firebase.');
      }
    });

    return () => {
      isMounted = false;
      unsubscribeCloud?.();
      unsubscribe();
    };
  }, [configured]);

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
      setCloudNotes([]);
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

  const download = async (selectedCloudDocIds?: string[]) => {
    if (!setNotes) {
      setStatusMessage('Cannot download: notes store not available.');
      return;
    }
    const toDownload =
      selectedCloudDocIds && selectedCloudDocIds.length > 0
        ? cloudNotes.filter((n) => selectedCloudDocIds.includes(n.cloudDocId ?? ''))
        : cloudNotes;

    if (toDownload.length === 0) {
      setStatusMessage(cloudNotes.length === 0 ? 'No notes in cloud to download.' : 'Select at least one note to download.');
      return;
    }

    try {
      setBusyAction('download');
      setStatusMessage(
        toDownload.length === cloudNotes.length
          ? `Downloading all ${toDownload.length} notes from cloud...`
          : `Downloading ${toDownload.length} selected notes from cloud...`
      );

      setNotes((prev) => {
        const toAdd: Note[] = [];
        const merged = prev.map((local) => {
          const cloudNote = toDownload.find((c) => c.cloudDocId && c.cloudDocId === local.cloudDocId);
          if (cloudNote) {
            return { ...cloudNote, id: local.id };
          }
          return local;
        });
        for (const cloudNote of toDownload) {
          const exists = prev.some((l) => l.cloudDocId === cloudNote.cloudDocId);
          if (!exists) toAdd.push(cloudNote);
        }
        return [...toAdd.sort((a, b) => b.updatedAt - a.updatedAt), ...merged];
      });

      setStatusMessage(
        toDownload.length === 1
          ? 'Downloaded 1 note from cloud.'
          : `Downloaded ${toDownload.length} notes from cloud.`
      );
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Download failed.';
      setStatusMessage(rawMessage);
    } finally {
      setBusyAction(null);
    }
  };

  const deleteCloudNotes = async (cloudDocIds: string[]) => {
    if (cloudDocIds.length === 0) {
      setStatusMessage('Select at least one note to delete.');
      return;
    }
    try {
      setBusyAction('delete');
      setStatusMessage(
        cloudDocIds.length === 1
          ? 'Deleting note from cloud...'
          : `Deleting ${cloudDocIds.length} notes from cloud...`
      );
      await deleteNotesFromFirebase(cloudDocIds);
      setStatusMessage(`Deleted ${cloudDocIds.length} notes from cloud.`);
      onCloudNotesDeleted?.(cloudDocIds);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Delete failed.';
      setStatusMessage(rawMessage);
    } finally {
      setBusyAction(null);
    }
  };

  return {
    cloudNotes,
    configured,
    user,
    busyAction,
    statusMessage,
    lastUploadedAt,
    signIn,
    signOut,
    upload,
    download,
    deleteCloudNotes,
  };
}
