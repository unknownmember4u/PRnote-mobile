import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, Plus, Search, Settings, Folder, Star, Archive, RotateCcw, Trash2, ArrowLeft } from 'lucide-react';
import type { Note } from '@/lib/store';
import NoteActions from './NoteActions';

interface NotesListProps {
  notes: Note[];
  folders: string[];
  onNewNote: () => void;
  onOpenNote: (note: Note) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenFolders: () => void;
  onCreateFolder: (name: string) => boolean;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onDuplicateNote: (note: Note) => void;
}

type TabType = 'All' | 'Pinned' | 'Favorites' | 'Tagged';

const NotesList = ({ notes, folders, onNewNote, onOpenNote, onOpenSearch, onOpenSettings, onOpenFolders, onCreateFolder, onUpdateNote, onDeleteNote, onDuplicateNote }: NotesListProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [actionNote, setActionNote] = useState<Note | null>(null);
  const [showArchivedView, setShowArchivedView] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const tabs: TabType[] = ['All', 'Pinned', 'Favorites', 'Tagged'];

  const startLongPress = (note: Note) => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = window.setTimeout(() => {
      setActionNote(note);
      longPressTimerRef.current = null;
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    const handleAndroidBack = (event: Event) => {
      if (pendingDelete) {
        event.preventDefault();
        setPendingDelete(null);
        return;
      }

      if (actionNote) {
        event.preventDefault();
        setActionNote(null);
        return;
      }

      if (showArchivedView) {
        event.preventDefault();
        setShowArchivedView(false);
      }
    };

    window.addEventListener('prnote:android-back', handleAndroidBack);
    return () => window.removeEventListener('prnote:android-back', handleAndroidBack);
  }, [showArchivedView, actionNote, pendingDelete]);

  const archivedNotes = notes
    .filter((n) => n.archived)
    .sort((left, right) => right.updatedAt - left.updatedAt);

  const filtered = notes.filter(n => {
    switch (activeTab) {
      case 'Pinned': return n.pinned && !n.archived;
      case 'Favorites': return n.favorite && !n.archived;
      case 'Tagged': return n.tags.length > 0 && !n.archived;
      default: return !n.archived;
    }
  });

  const pinned = filtered.filter(n => n.pinned && activeTab === 'All');
  const unpinned = activeTab === 'All' ? filtered.filter(n => !n.pinned) : filtered;

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const NoteCard = ({ note }: { note: Note }) => (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onOpenNote(note)}
      onPointerDown={() => startLongPress(note)}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      className="w-full text-left p-4 rounded-2xl bg-[hsl(var(--pr-surface))] border border-border hover:border-muted-foreground/30 transition-colors"
    >
      <div className="flex justify-between items-start">
        <h3 className="text-base font-semibold text-foreground line-clamp-1 flex-1">{note.title}</h3>
        <div className="flex items-center gap-2 ml-2">
          {note.favorite && <Star size={18} className="text-muted-foreground fill-muted-foreground" />}
        </div>
      </div>
      {note.content && (
        <p className="text-sm italic text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{note.content}</p>
      )}
      <p className="text-xs text-muted-foreground mt-3">{formatDate(note.updatedAt)}</p>
    </motion.button>
  );

  const ArchivedNoteCard = ({ note }: { note: Note }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full text-left p-4 rounded-2xl bg-[hsl(var(--pr-surface))] border border-border"
    >
      <button onClick={() => onOpenNote(note)} className="w-full text-left">
        <h3 className="text-base font-semibold text-foreground line-clamp-1">{note.title}</h3>
        {note.content && (
          <p className="text-sm italic text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{note.content}</p>
        )}
        <p className="text-xs text-muted-foreground mt-3">Archived on {formatDate(note.updatedAt)}</p>
      </button>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onUpdateNote(note.id, { archived: false })}
          className="flex-1 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} />
          Recover
        </button>
        <button
          onClick={() => setPendingDelete(note)}
          className="flex-1 rounded-xl bg-destructive text-destructive-foreground px-3 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <Trash2 size={16} />
          Delete Permanently
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="relative flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-5 safe-top pb-2">
        <div className="flex items-center justify-between mb-6">
          {showArchivedView ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setShowArchivedView(false)}
                  className="p-2 -ml-2 rounded-lg transition-colors hover:bg-secondary"
                  aria-label="Back to notes"
                  title="Back"
                >
                  <ArrowLeft size={22} className="text-foreground" />
                </button>
                <h1 className="font-serif-display text-2xl font-semibold text-foreground truncate">Archived Notes</h1>
              </div>
              <button onClick={onOpenSettings} className="p-2 rounded-lg transition-colors hover:bg-secondary" aria-label="Open settings">
                <Settings size={22} className="text-muted-foreground" />
              </button>
            </>
          ) : (
            <>
              <h1 className="font-serif-display text-2xl font-semibold text-foreground">PRnote</h1>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowArchivedView(true)}
                  className="relative p-2 rounded-lg transition-colors hover:bg-secondary"
                  title="View archived notes"
                  aria-label="View archived notes"
                >
                  <Archive size={22} className="text-muted-foreground" />
                  {archivedNotes.length > 0 && (
                    <span className="absolute -top-1 -right-1 rounded-full bg-foreground text-background text-[10px] min-w-5 h-5 px-1.5 flex items-center justify-center font-semibold">
                      {archivedNotes.length}
                    </span>
                  )}
                </button>
                <button onClick={onOpenSearch} className="p-2 rounded-lg transition-colors hover:bg-secondary"><Search size={22} className="text-muted-foreground" /></button>
                <button onClick={onOpenFolders} className="p-2 rounded-lg transition-colors hover:bg-secondary"><Folder size={22} className="text-muted-foreground" /></button>
                <button onClick={onOpenSettings} className="p-2 rounded-lg transition-colors hover:bg-secondary"><Settings size={22} className="text-muted-foreground" /></button>
              </div>
            </>
          )}
        </div>

        {/* Tabs */}
        {!showArchivedView && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4 space-y-4 hide-scrollbar"
        style={{ paddingBottom: 'calc(var(--fab-clearance) + var(--safe-area-bottom) + var(--keyboard-offset))' }}
      >
        {showArchivedView ? (
          archivedNotes.length > 0 ? (
            <div className="space-y-4">
              {archivedNotes.map((n) => <ArchivedNoteCard key={n.id} note={n} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <p className="text-base">No archived notes</p>
            </div>
          )
        ) : (
          <>
        {pinned.length > 0 && activeTab === 'All' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Pin size={18} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">Pinned</span>
            </div>
            {pinned.map(n => <NoteCard key={n.id} note={n} />)}
            {unpinned.length > 0 && (
              <p className="text-sm font-semibold text-muted-foreground mt-6 mb-4">Notes</p>
            )}
          </>
        )}
        {unpinned.map(n => <NoteCard key={n.id} note={n} />)}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <p className="text-base">No notes yet</p>
          </div>
        )}
          </>
        )}
      </div>

      {/* FAB */}
      {!showArchivedView && (
        <button
          onClick={onNewNote}
          className="fixed safe-bottom-fab safe-right-fab bg-foreground text-background rounded-full flex items-center justify-center shadow-lg z-30"
          style={{ width: 'var(--fab-size)', height: 'var(--fab-size)' }}
        >
          <Plus size={24} />
        </button>
      )}

      {/* Note Actions Sheet */}
      <AnimatePresence>
        {actionNote && (
          <NoteActions
            note={actionNote}
            folders={Array.from(new Set([...folders, ...notes.map((note) => note.folder).filter(Boolean) as string[]]))}
            onClose={() => setActionNote(null)}
            onCreateFolder={onCreateFolder}
            onUpdate={(updates) => { onUpdateNote(actionNote.id, updates); }}
            onDuplicate={() => onDuplicateNote(actionNote)}
            onDelete={() => { onDeleteNote(actionNote.id); setActionNote(null); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingDelete(null)}
              className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-6 top-1/2 -translate-y-1/2 bg-[hsl(var(--pr-surface))] border border-border rounded-2xl p-6 z-50 max-w-sm mx-auto"
            >
              <h3 className="text-base font-semibold text-foreground">Permanently delete this archived note?</h3>
              <p className="text-sm text-muted-foreground mt-2">This cannot be undone.</p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setPendingDelete(null)}
                  className="flex-1 py-3 rounded-xl border border-border text-sm text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteNote(pendingDelete.id);
                    setPendingDelete(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotesList;
