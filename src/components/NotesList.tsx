import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, Plus, Search, Settings, Folder, Star, MoreHorizontal } from 'lucide-react';
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
}

type TabType = 'All' | 'Pinned' | 'Favorites' | 'Tagged' | 'Archived';

const NotesList = ({ notes, folders, onNewNote, onOpenNote, onOpenSearch, onOpenSettings, onOpenFolders, onCreateFolder, onUpdateNote, onDeleteNote }: NotesListProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [actionNote, setActionNote] = useState<Note | null>(null);
  const tabs: TabType[] = ['All', 'Pinned', 'Favorites', 'Tagged', 'Archived'];

  const filtered = notes.filter(n => {
    switch (activeTab) {
      case 'Pinned': return n.pinned && !n.archived;
      case 'Favorites': return n.favorite && !n.archived;
      case 'Tagged': return n.tags.length > 0 && !n.archived;
      case 'Archived': return n.archived;
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
      className="w-full text-left p-4 rounded-2xl bg-[hsl(var(--pr-surface))] border border-border hover:border-muted-foreground/30 transition-colors"
    >
      <div className="flex justify-between items-start">
        <h3 className="text-base font-semibold text-foreground line-clamp-1 flex-1">{note.title}</h3>
        <div className="flex items-center gap-2 ml-2">
          {note.favorite && <Star size={18} className="text-muted-foreground fill-muted-foreground" />}
          <button
            onClick={(e) => { e.stopPropagation(); setActionNote(note); }}
            className="p-1"
          >
            <MoreHorizontal size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>
      {note.content && (
        <p className="text-sm italic text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{note.content}</p>
      )}
      <p className="text-xs text-muted-foreground mt-3">{formatDate(note.updatedAt)}</p>
    </motion.button>
  );

  return (
    <div className="relative flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-5 safe-top pb-2">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif-display text-2xl font-semibold text-foreground">PRnote</h1>
          <div className="flex gap-2">
            <button onClick={onOpenSearch} className="p-2"><Search size={22} className="text-muted-foreground" /></button>
            <button onClick={onOpenFolders} className="p-2"><Folder size={22} className="text-muted-foreground" /></button>
            <button onClick={onOpenSettings} className="p-2"><Settings size={22} className="text-muted-foreground" /></button>
          </div>
        </div>

        {/* Tabs */}
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
      </div>

      {/* Notes */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4 space-y-4 hide-scrollbar"
        style={{ paddingBottom: 'calc(var(--fab-clearance) + var(--safe-area-bottom) + var(--keyboard-offset))' }}
      >
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
      </div>

      {/* FAB */}
      <button
        onClick={onNewNote}
        className="fixed safe-bottom-fab safe-right-fab bg-foreground text-background rounded-full flex items-center justify-center shadow-lg z-30"
        style={{ width: 'var(--fab-size)', height: 'var(--fab-size)' }}
      >
        <Plus size={24} />
      </button>

      {/* Note Actions Sheet */}
      <AnimatePresence>
        {actionNote && (
          <NoteActions
            note={actionNote}
            folders={Array.from(new Set([...folders, ...notes.map((note) => note.folder).filter(Boolean) as string[]]))}
            onClose={() => setActionNote(null)}
            onCreateFolder={onCreateFolder}
            onUpdate={(updates) => { onUpdateNote(actionNote.id, updates); setActionNote(null); }}
            onDelete={() => { onDeleteNote(actionNote.id); setActionNote(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotesList;
