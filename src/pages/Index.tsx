import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNotes, useOnboarded, useSettings } from '@/lib/store';
import type { Note } from '@/lib/store';
import Onboarding from '@/components/Onboarding';
import NotesList from '@/components/NotesList';
import NoteEditor from '@/components/NoteEditor';
import SearchView from '@/components/SearchView';
import FoldersView from '@/components/FoldersView';
import SettingsView from '@/components/SettingsView';

type View = 'list' | 'editor' | 'search' | 'folders' | 'settings';

const Index = () => {
  const { done: onboarded, complete: completeOnboarding } = useOnboarded();
  const { notes, addNote, updateNote, deleteNote } = useNotes();
  const { settings, update: updateSettings } = useSettings();
  const [view, setView] = useState<View>('list');
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const handleNewNote = useCallback(() => {
    setEditingNote(null);
    setView('editor');
  }, []);

  const handleOpenNote = useCallback((note: Note) => {
    setEditingNote(note);
    setView('editor');
  }, []);

  const handleSaveNote = useCallback((title: string, content: string) => {
    if (editingNote) {
      updateNote(editingNote.id, { title, content });
    } else {
      addNote(title, content);
    }
  }, [editingNote, updateNote, addNote]);

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

  if (!onboarded) {
    return <Onboarding onComplete={completeOnboarding} onSetTheme={(theme) => updateSettings({ theme })} />;
  }

  return (
    <div className="h-screen w-full max-w-md mx-auto relative overflow-hidden bg-background">
      <NotesList
        notes={notes}
        onNewNote={handleNewNote}
        onOpenNote={handleOpenNote}
        onOpenSearch={() => setView('search')}
        onOpenSettings={() => setView('settings')}
        onOpenFolders={() => setView('folders')}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
      />

      <AnimatePresence>
        {view === 'editor' && (
          <NoteEditor
            key="editor"
            initialTitle={editingNote?.title}
            initialContent={editingNote?.content}
            onSave={handleSaveNote}
            onBack={() => setView('list')}
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
            onBack={() => setView('list')}
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
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
