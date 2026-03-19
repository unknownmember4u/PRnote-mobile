import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNotes, useOnboarded, useSettings, addFolderToTree, flattenFolderTree, removeFolderFromTree } from '@/lib/store';
import type { Note, NoteFont, NoteFontSize } from '@/lib/store';
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
  const cloudBackup = useFirebaseBackup(notes, setNotes);
  const [view, setView] = useState<View>('list');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNoteFolderPath, setNewNoteFolderPath] = useState<string | null>(null);
  const [unlockingNote, setUnlockingNote] = useState<Note | null>(null);
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockBusy, setUnlockBusy] = useState(false);
  const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  const activeCloudEmail = cloudBackup.user?.email?.toLowerCase() ?? null;
  const accountDefaults = activeCloudEmail ? settings.accountDefaults?.[activeCloudEmail] : null;
  const activeDefaultFont: NoteFont = accountDefaults?.fontFamily ?? settings.defaultNoteFont ?? 'whispering';
  const activeDefaultFontSize: NoteFontSize = accountDefaults?.fontSize ?? settings.defaultNoteFontSize ?? 'lg';

  useEffect(() => {
    if (!activeCloudEmail) {
      return;
    }

    if (settings.accountDefaults?.[activeCloudEmail]) {
      return;
    }

    updateSettings({
      accountDefaults: {
        ...(settings.accountDefaults ?? {}),
        [activeCloudEmail]: {
          fontFamily: settings.defaultNoteFont ?? 'whispering',
          fontSize: settings.defaultNoteFontSize ?? 'lg',
        },
      },
    });
  }, [
    activeCloudEmail,
    settings.accountDefaults,
    settings.defaultNoteFont,
    settings.defaultNoteFontSize,
    updateSettings,
  ]);

  const handleDefaultFontChange = useCallback((fontFamily: NoteFont) => {
    if (!activeCloudEmail) {
      updateSettings({ defaultNoteFont: fontFamily });
      return;
    }

    updateSettings({
      accountDefaults: {
        ...(settings.accountDefaults ?? {}),
        [activeCloudEmail]: {
          fontFamily,
          fontSize: (settings.accountDefaults?.[activeCloudEmail]?.fontSize ?? settings.defaultNoteFontSize ?? 'lg') as NoteFontSize,
        },
      },
    });
  }, [activeCloudEmail, settings.accountDefaults, settings.defaultNoteFontSize, updateSettings]);

  const handleDefaultFontSizeChange = useCallback((fontSize: NoteFontSize) => {
    if (!activeCloudEmail) {
      updateSettings({ defaultNoteFontSize: fontSize });
      return;
    }

    updateSettings({
      accountDefaults: {
        ...(settings.accountDefaults ?? {}),
        [activeCloudEmail]: {
          fontFamily: (settings.accountDefaults?.[activeCloudEmail]?.fontFamily ?? settings.defaultNoteFont ?? 'whispering') as NoteFont,
          fontSize,
        },
      },
    });
  }, [activeCloudEmail, settings.accountDefaults, settings.defaultNoteFont, updateSettings]);

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
      priority: note.priority,
      fontFamily: note.fontFamily,
      fontSize: note.fontSize,
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

  const handleSaveNote = useCallback((payload: { title: string; content: string; pinned: boolean; favorite: boolean; createdAt: number; fontFamily: NoteFont; fontSize: NoteFontSize }) => {
    if (editingNote) {
      updateNote(editingNote.id, {
        title: payload.title,
        content: payload.content,
        pinned: payload.pinned,
        favorite: payload.favorite,
        createdAt: editingNote.createdAt,
        fontFamily: payload.fontFamily,
        fontSize: payload.fontSize,
      });
    } else {
      const note = addNote(payload.title, payload.content, newNoteFolderPath);
      updateNote(note.id, {
        pinned: payload.pinned,
        favorite: payload.favorite,
        createdAt: payload.createdAt,
        fontFamily: payload.fontFamily,
        fontSize: payload.fontSize,
      });
      setEditingNote({
        ...note,
        title: payload.title,
        content: payload.content,
        pinned: payload.pinned,
        favorite: payload.favorite,
        createdAt: payload.createdAt,
        fontFamily: payload.fontFamily,
        fontSize: payload.fontSize,
      });
    }
  }, [editingNote, updateNote, addNote, newNoteFolderPath]);

  const handleClearAll = useCallback(() => {
    setNotes([]);
  }, [setNotes]);

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
            initialFontFamily={editingNote?.fontFamily ?? activeDefaultFont}
            initialFontSize={editingNote?.fontSize ?? activeDefaultFontSize}
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
            folders={flattenFolderTree(settings.folders)}
            onBack={() => setView('list')}
            onOpenNote={handleOpenNote}
            onCreateFolder={handleCreateFolder}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
            onDuplicateNote={handleDuplicateNote}
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
            onOpenNote={handleOpenNote}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
            onDuplicateNote={handleDuplicateNote}
          />
        )}
        {view === 'settings' && (
          <SettingsView
            key="settings"
            settings={settings}
            noteCount={notes.length}
            onUpdate={updateSettings}
            defaultNoteFont={activeDefaultFont}
            defaultNoteFontSize={activeDefaultFontSize}
            onDefaultNoteFontChange={handleDefaultFontChange}
            onDefaultNoteFontSizeChange={handleDefaultFontSizeChange}
            onBack={() => setView('list')}
            onClearAll={handleClearAll}
            cloudConfigured={cloudBackup.configured}
            cloudUserEmail={cloudBackup.user?.email ?? null}
            cloudUserPhotoUrl={cloudBackup.user?.photoURL ?? null}
            cloudBusyAction={cloudBackup.busyAction}
            cloudStatus={cloudBackup.statusMessage}
            cloudLastUploadedAt={cloudBackup.lastUploadedAt}
            notes={notes}
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
