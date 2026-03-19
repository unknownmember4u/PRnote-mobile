import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Mic, MoreVertical, X } from 'lucide-react';
import type { Note } from '@/lib/store';
import NoteActions from './NoteActions';
import { getChecklistProgress, getNotePreview, getNoteSearchText } from '@/lib/note-content';

interface SearchViewProps {
  notes: Note[];
  folders: string[];
  onBack: () => void;
  onOpenNote: (note: Note) => void;
  onCreateFolder: (name: string) => boolean;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onDuplicateNote: (note: Note) => void;
}

const SearchView = ({
  notes,
  folders,
  onBack,
  onOpenNote,
  onCreateFolder,
  onUpdateNote,
  onDeleteNote,
  onDuplicateNote,
}: SearchViewProps) => {
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [actionNote, setActionNote] = useState<Note | null>(null);

  const priorities = useMemo(() => {
    const levels: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
    return levels.filter((level) => notes.some((n) => n.priority === level && !n.archived));
  }, [notes]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return notes.filter((n) => getNoteSearchText(n).includes(q));
  }, [query, notes]);

  const recent = notes.slice(0, 3);

  const NoteCard = ({ note }: { note: Note }) => (
    <div
      onClick={() => onOpenNote(note)}
      className="w-full text-left p-4 rounded-xl bg-[hsl(var(--pr-surface))] border border-border"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-base font-semibold text-foreground line-clamp-1 flex-1">{note.title}</p>
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
      {note.noteType === 'checklist' && (
        <p className="mt-2 text-xs font-medium text-muted-foreground">
          {getChecklistProgress(note).completed}/{getChecklistProgress(note).total} completed
        </p>
      )}
      {getNotePreview(note) && <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{getNotePreview(note)}</p>}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 app-shell bg-background z-50 flex flex-col overflow-hidden"
    >
      {/* Search bar */}
      <div className="px-4 safe-top pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft size={24} className="text-foreground" />
          </button>
          <div className="flex-1 flex items-center bg-card border border-border rounded-xl px-4 py-3">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search"
              autoFocus
              className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
            />
            {query ? (
              <button onClick={() => setQuery('')}><X size={18} className="text-muted-foreground" /></button>
            ) : (
              <button onClick={() => setListening(!listening)}>
                <Mic size={18} className={listening ? 'text-foreground' : 'text-muted-foreground'} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 safe-bottom hide-scrollbar">
        {/* Listening indicator */}
        {listening && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="flex items-end gap-2 h-6">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-1.5 bg-foreground rounded-full animate-pulse-wave"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-sm font-medium text-muted-foreground">Listening for keywords...</p>
          </div>
        )}

        {/* Results */}
        {query && results.length > 0 && (
          <div className="py-4">
            <p className="text-sm font-semibold text-muted-foreground mb-4">Results</p>
            <div className="space-y-3">
              {results.map(n => (
                <NoteCard key={n.id} note={n} />
              ))}
            </div>
          </div>
        )}

        {query && results.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-base text-muted-foreground">No results found</p>
          </div>
        )}

        {/* Recent & priority when no query */}
        {!query && (
          <>
            {recent.length > 0 && (
              <div className="py-4">
                <p className="text-sm font-semibold text-muted-foreground mb-4">Recent</p>
                <div className="space-y-3">
                  {recent.map(n => (
                    <NoteCard key={n.id} note={n} />
                  ))}
                </div>
              </div>
            )}
            {priorities.length > 0 && (
              <div className="py-4">
                <p className="text-sm font-semibold text-muted-foreground mb-4">Priority</p>
                <div className="flex flex-wrap gap-3">
                  {priorities.map((priority) => (
                    <button
                      key={priority}
                      onClick={() => setQuery(`${priority} priority`)}
                      className="px-4 py-2 rounded-full bg-secondary text-sm font-medium text-muted-foreground"
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {actionNote && (
        <NoteActions
          note={actionNote}
          folders={folders}
          onClose={() => setActionNote(null)}
          onUpdate={(updates) => {
            onUpdateNote(actionNote.id, updates);
            setActionNote(null);
          }}
          onCreateFolder={(name) => onCreateFolder(name)}
          onDuplicate={() => {
            onDuplicateNote(actionNote);
            setActionNote(null);
          }}
          onDelete={() => {
            onDeleteNote(actionNote.id);
            setActionNote(null);
          }}
        />
      )}
    </motion.div>
  );
};

export default SearchView;
