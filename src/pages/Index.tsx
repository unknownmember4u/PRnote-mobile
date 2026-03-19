import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNotes, useOnboarded, useSettings, addFolderToTree, flattenFolderTree, removeFolderFromTree } from '@/lib/store';
import type { Note, NoteFont } from '@/lib/store';
import { Capacitor } from '@capacitor/core';
import { verifySecret, authenticateWithDeviceLock } from '@/lib/note-security';
import { useFirebaseBackup } from '@/hooks/use-firebase-backup';
import Onboarding from '@/components/Onboarding';
import NotesList from '@/components/NotesList';
import NoteEditor from '@/components/NoteEditor';
import SearchView from '@/components/SearchView';
import FoldersView from '@/components/FoldersView';
import SettingsView from '@/components/SettingsView';

type View = 'list' | 'editor' | 'search' | 'folders' | 'settings';

const Index = () => {
  const { done: onboarded, complete: completeOnboarding } = useOnboarded();
  const { notes, addNote, updateNote, deleteNote, setNotes } = useNotes();
  const { settings, update: updateSettings } = useSettings();
  const cloudBackup = useFirebaseBackup(notes);
  const [view, setView] = useState<View>('list');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNoteFolderPath, setNewNoteFolderPath] = useState<string | null>(null);
  const [unlockingNote, setUnlockingNote] = useState<Note | null>(null);
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockBusy, setUnlockBusy] = useState(false);
  const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  const handleCreateFolder = useCallback((name: string) => {
    const trimmed = name.trim();

    if (!trimmed) {
      return false;
    }

    const flatFolders = flattenFolderTree(settings.folders);
    const exists = flatFolders.some((folder) => folder.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      const newFolders = addFolderToTree(settings.folders, trimmed);
      updateSettings({ folders: newFolders });
    }

    return true;
  }, [settings.folders, updateSettings]);

  const handleDeleteFolder = useCallback((path: string) => {
    const trimmedPath = path.trim();
    if (!trimmedPath) {
      return;
    }

    const newFolders = removeFolderFromTree(settings.folders, trimmedPath);
    updateSettings({ folders: newFolders });

    setNotes((previous) => previous.map((note) => {
      if (!note.folder) {
        return note;
      }

      if (note.folder === trimmedPath || note.folder.startsWith(`${trimmedPath}/`)) {
        return { ...note, folder: null, updatedAt: Date.now() };
      }

      return note;
    }));
  }, [settings.folders, setNotes, updateSettings]);

  const handleNewNote = useCallback(() => {
    setNewNoteFolderPath(null);
    setEditingNote(null);
    setView('editor');
  }, []);

  const handleNewNoteInFolder = useCallback((folderPath: string) => {
    setNewNoteFolderPath(folderPath);
    setEditingNote(null);
    setView('editor');
  }, []);

  const handleOpenNote = useCallback(async (note: Note) => {
    if (note.locked) {
      if (note.lockType === 'custom') {
        setUnlockingNote(note);
        setUnlockInput('');
        setUnlockError('');
        return;
      }

      const authenticated = await authenticateWithDeviceLock('Unlock note', 'Confirm with your device lock to open this note.');
      if (!authenticated) {
        return;
      }
    }

    setNewNoteFolderPath(null);
    setEditingNote(note);
    setView('editor');
  }, []);

  const handleDuplicateNote = useCallback((note: Note) => {
    const duplicated = addNote(`${note.title} (copy)`, note.content, note.folder);
    updateNote(duplicated.id, {
      pinned: note.pinned,
      favorite: note.favorite,
      tags: [...note.tags],
      fontFamily: note.fontFamily,
      locked: false,
      lockType: 'none',
      customLockHash: null,
    });
  }, [addNote, updateNote]);

  const handleUnlockCustomNote = useCallback(async () => {
    if (!unlockingNote) {
      return;
    }

    setUnlockBusy(true);
    setUnlockError('');
    const valid = await verifySecret(unlockInput, unlockingNote.customLockHash);
    setUnlockBusy(false);

    if (!valid) {
      setUnlockError('Incorrect passcode.');
      return;
    }

    setUnlockingNote(null);
    setUnlockInput('');
    setUnlockError('');
    setNewNoteFolderPath(null);
    setEditingNote(unlockingNote);
    setView('editor');
  }, [unlockingNote, unlockInput]);

  const handleSaveNote = useCallback((payload: { title: string; content: string; pinned: boolean; favorite: boolean; createdAt: number; fontFamily: NoteFont }) => {
    if (editingNote) {
      updateNote(editingNote.id, {
        title: payload.title,
        content: payload.content,
        pinned: payload.pinned,
        favorite: payload.favorite,
        createdAt: editingNote.createdAt,
        fontFamily: payload.fontFamily,
      });
    } else {
      const note = addNote(payload.title, payload.content, newNoteFolderPath);
      updateNote(note.id, {
        pinned: payload.pinned,
        favorite: payload.favorite,
        createdAt: payload.createdAt,
        fontFamily: payload.fontFamily,
      });
      setEditingNote({
        ...note,
        title: payload.title,
        content: payload.content,
        pinned: payload.pinned,
        favorite: payload.favorite,
        createdAt: payload.createdAt,
        fontFamily: payload.fontFamily,
      });
    }
  }, [editingNote, updateNote, addNote, newNoteFolderPath]);

  const handleClearAll = useCallback(() => {
    if (confirm('Are you sure you want to delete all notes?')) {
      notes.forEach(n => deleteNote(n.id));
    }
  }, [notes, deleteNote]);

  const handleExport = useCallback(() => {
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prnote-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [notes]);

  useEffect(() => {
    const handleAndroidBack = (event: Event) => {
      if (view !== 'list') {
        event.preventDefault();
        setView('list');
      }
    };

    window.addEventListener('prnote:android-back', handleAndroidBack);
    return () => window.removeEventListener('prnote:android-back', handleAndroidBack);
  }, [view]);

  if (!onboarded) {
    return <Onboarding onComplete={completeOnboarding} onSetTheme={(theme) => updateSettings({ theme })} />;
  }

  return (
    <div className={`app-shell w-full relative overflow-hidden bg-background ${isNativeAndroid ? 'android-shell' : 'max-w-md mx-auto border-x border-border/60'}`}>
      <NotesList
        notes={notes}
        folders={flattenFolderTree(settings.folders)}
        onNewNote={handleNewNote}
        onOpenNote={handleOpenNote}
        onOpenSearch={() => setView('search')}
        onOpenSettings={() => setView('settings')}
        onOpenFolders={() => setView('folders')}
        onCreateFolder={handleCreateFolder}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
        onDuplicateNote={handleDuplicateNote}
      />

      <AnimatePresence>
        {view === 'editor' && (
          <NoteEditor
            key="editor"
            initialTitle={editingNote?.title}
            initialContent={editingNote?.content}
            initialPinned={editingNote?.pinned}
            initialFavorite={editingNote?.favorite}
            initialCreatedAt={editingNote?.createdAt}
            initialFontFamily={editingNote?.fontFamily}
            onSave={handleSaveNote}
            onBack={() => {
              setNewNoteFolderPath(null);
              setView('list');
            }}
          />
        )}
        {view === 'search' && (
          <SearchView
            key="search"
            notes={notes}
            onBack={() => setView('list')}
            onOpenNote={(note) => { setEditingNote(note); setView('editor'); }}
          />
        )}
        {view === 'folders' && (
          <FoldersView
            key="folders"
            notes={notes}
            folderTree={settings.folders}
            onBack={() => setView('list')}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onCreateNoteInFolder={handleNewNoteInFolder}
            onOpenNote={(note) => { setEditingNote(note); setView('editor'); }}
          />
        )}
        {view === 'settings' && (
          <SettingsView
            key="settings"
            settings={settings}
            onUpdate={updateSettings}
            onBack={() => setView('list')}
            onClearAll={handleClearAll}
            onExport={handleExport}
            cloudConfigured={cloudBackup.configured}
            cloudUserEmail={cloudBackup.user?.email ?? null}
            cloudBusyAction={cloudBackup.busyAction}
            cloudStatus={cloudBackup.statusMessage}
            cloudLastUploadedAt={cloudBackup.lastUploadedAt}
            onCloudSignIn={cloudBackup.signIn}
            onCloudSignOut={cloudBackup.signOut}
            onCloudUpload={cloudBackup.upload}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {unlockingNote && (
          <div className="fixed inset-0 z-[70]">
            <div
              onClick={() => {
                setUnlockingNote(null);
                setUnlockInput('');
                setUnlockError('');
              }}
              className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            />
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 mx-auto max-w-sm rounded-2xl border border-border bg-card p-6">
              <h3 className="text-base font-semibold text-foreground">Unlock note</h3>
              <p className="mt-2 text-sm text-muted-foreground">Enter your custom passcode to open this note.</p>
              <input
                value={unlockInput}
                onChange={(event) => setUnlockInput(event.target.value)}
                type="password"
                placeholder="Passcode"
                className="mt-4 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {unlockError && <p className="mt-2 text-xs text-destructive">{unlockError}</p>}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => {
                    setUnlockingNote(null);
                    setUnlockInput('');
                    setUnlockError('');
                  }}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnlockCustomNote}
                  disabled={unlockBusy || !unlockInput.trim()}
                  className="flex-1 rounded-xl bg-foreground py-2.5 text-sm text-background disabled:opacity-50"
                >
                  Unlock
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
