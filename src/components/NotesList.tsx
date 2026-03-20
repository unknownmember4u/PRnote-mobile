import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, Search, Settings, Folder, Star, Archive, RotateCcw, Trash2, ArrowLeft, MoreVertical } from 'lucide-react';
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

type TabType = 'All' | 'Pinned' | 'Favorites' | 'Priority';

const NotesList = ({ notes, folders, onNewNote, onOpenNote, onOpenSearch, onOpenSettings, onOpenFolders, onCreateFolder, onUpdateNote, onDeleteNote, onDuplicateNote }: NotesListProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [actionNote, setActionNote] = useState<Note | null>(null);
  const [showArchivedView, setShowArchivedView] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const tabs: TabType[] = ['All', 'Pinned', 'Favorites', 'Priority'];

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
      case 'Priority': return n.priority !== 'none' && !n.archived;
      default: return !n.archived;
    }
  });

  const pinned = filtered.filter(n => n.pinned && activeTab === 'All');
  const unpinned = activeTab === 'All' ? filtered.filter(n => !n.pinned) : filtered;

  const NoteCard = ({ note }: { note: Note }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onOpenNote(note)}
      className="w-full cursor-pointer rounded-3xl border border-border bg-[hsl(var(--pr-surface))] p-5 text-left transition-colors hover:border-muted-foreground/30 md:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif-display line-clamp-1 text-[1.45rem] font-semibold leading-tight text-foreground">{note.title}</h3>
        </div>
        <div className="ml-2 flex items-center gap-1">
          {note.favorite && <Star size={18} className="text-muted-foreground fill-muted-foreground" />}
          <button
            onClick={(event) => {
              event.stopPropagation();
              setActionNote(note);
            }}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Open note actions"
            title="More actions"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );

  const ArchivedNoteCard = ({ note }: { note: Note }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-3xl border border-border bg-[hsl(var(--pr-surface))] p-5 text-left md:p-6"
    >
      <button onClick={() => onOpenNote(note)} className="w-full text-left">
        <h3 className="font-serif-display line-clamp-1 text-[1.45rem] font-semibold leading-tight text-foreground">{note.title}</h3>
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
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1920px] flex-col px-6 pb-4 md:px-7">
        <div className="sticky top-0 z-20 -mx-6 mb-8 flex items-center justify-between border-b border-border bg-background px-6 py-6 md:-mx-7 md:px-7 md:py-7">
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

        <div
          className="hide-scrollbar flex-1 min-h-0 overflow-y-auto touch-pan-y"
          style={{
            paddingBottom: 'calc(var(--fab-clearance) + var(--app-safe-bottom) + var(--keyboard-offset))',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {showArchivedView ? (
            <section>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Archive</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {archivedNotes.length > 0 ? `${archivedNotes.length} archived notes` : 'No archived notes yet'}
                  </p>
                </div>
              </div>
              {archivedNotes.length > 0 ? (
                <div className="space-y-4">
                  {archivedNotes.map((n) => <ArchivedNoteCard key={n.id} note={n} />)}
                </div>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center rounded-3xl border border-border bg-card/20 text-muted-foreground">
                  <p className="text-base">No archived notes</p>
                </div>
              )}
            </section>
          ) : (
            <div className="space-y-8">
              <section className="md:hidden">
                <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {tabs.map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                        activeTab === tab
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </section>

              <section className="hidden rounded-3xl border border-border bg-card/20 p-5 md:block">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">Browse Notes</p>
                    <p className="mt-2 text-sm text-muted-foreground">Filter your notes by status and jump straight into archived items when you need them.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tabs.map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                          activeTab === tab
                            ? 'bg-foreground text-background'
                            : 'border border-border text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {pinned.length > 0 && activeTab === 'All' && (
                <section>
                  <div className="mb-4 flex items-center gap-3">
                    <Pin size={18} className="text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">Pinned</span>
                  </div>
                  <div className="space-y-4">
                    {pinned.map((n) => <NoteCard key={n.id} note={n} />)}
                  </div>
                </section>
              )}

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {activeTab === 'All' ? 'All Notes' : activeTab}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">
                    {filtered.length} {filtered.length === 1 ? 'note' : 'notes'}
                  </span>
                </div>
                {unpinned.length > 0 ? (
                  <div className="space-y-4">
                    {unpinned.map((n) => <NoteCard key={n.id} note={n} />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center rounded-3xl border border-border bg-card/20 text-muted-foreground">
                    <p className="text-base">No notes yet</p>
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      {!showArchivedView && (
        <button
          onClick={onNewNote}
          className="fab-animated fixed safe-bottom-fab safe-right-fab z-30 flex items-center justify-center rounded-full bg-foreground text-background shadow-lg"
          style={{ width: 'var(--fab-size)', height: 'var(--fab-size)' }}
          aria-label="Create new note"
          title="Create new note"
        >
          <span className="fab-plus-mark" aria-hidden="true">+</span>
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
