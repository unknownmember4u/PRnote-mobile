import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, Plus, Search, Settings, Folder, Star, MoreHorizontal } from 'lucide-react';
import type { Note } from '@/lib/store';
import NoteActions from './NoteActions';

interface NotesListProps {
  notes: Note[];
  onNewNote: () => void;
  onOpenNote: (note: Note) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenFolders: () => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
}

type TabType = 'All' | 'Pinned' | 'Favorites' | 'Tagged' | 'Archived';

const NotesList = ({ notes, onNewNote, onOpenNote, onOpenSearch, onOpenSettings, onOpenFolders, onUpdateNote, onDeleteNote }: NotesListProps) => {
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
      className="w-full text-left p-4 rounded-2xl bg-card border border-border hover:border-muted-foreground/30 transition-colors"
    >
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium text-foreground line-clamp-1 flex-1">{note.title}</h3>
        <div className="flex items-center gap-1 ml-2">
          {note.favorite && <Star size={12} className="text-muted-foreground fill-muted-foreground" />}
          <button
            onClick={(e) => { e.stopPropagation(); setActionNote(note); }}
            className="p-1"
          >
            <MoreHorizontal size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>
      {note.content && (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{note.content}</p>
      )}
      <p className="text-[10px] text-muted-foreground mt-2">{formatDate(note.updatedAt)}</p>
    </motion.button>
  );

  return (
    <div className="relative flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-5 safe-top pb-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-serif-display text-2xl font-semibold text-foreground">PRnote</h1>
          <div className="flex gap-1">
            <button onClick={onOpenSearch} className="p-2"><Search size={20} className="text-muted-foreground" /></button>
            <button onClick={onOpenFolders} className="p-2"><Folder size={20} className="text-muted-foreground" /></button>
            <button onClick={onOpenSettings} className="p-2"><Settings size={20} className="text-muted-foreground" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto hide-scrollbar -mx-1 px-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
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
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 hide-scrollbar">
        {pinned.length > 0 && activeTab === 'All' && (
          <>
            <div className="flex items-center gap-1.5 mb-2">
              <Pin size={12} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Pinned</span>
            </div>
            {pinned.map(n => <NoteCard key={n.id} note={n} />)}
            {unpinned.length > 0 && (
              <p className="text-xs text-muted-foreground font-medium mt-4 mb-2">Notes</p>
            )}
          </>
        )}
        {unpinned.map(n => <NoteCard key={n.id} note={n} />)}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <p className="text-sm">No notes yet</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={onNewNote}
        className="absolute safe-bottom-fab right-6 w-14 h-14 bg-foreground text-background rounded-full flex items-center justify-center shadow-lg z-30"
      >
        <Plus size={24} />
      </button>

      {/* Note Actions Sheet */}
      <AnimatePresence>
        {actionNote && (
          <NoteActions
            note={actionNote}
            onClose={() => setActionNote(null)}
            onUpdate={(updates) => { onUpdateNote(actionNote.id, updates); setActionNote(null); }}
            onDelete={() => { onDeleteNote(actionNote.id); setActionNote(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotesList;
