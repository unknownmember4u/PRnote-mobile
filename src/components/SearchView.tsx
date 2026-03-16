import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Mic, X } from 'lucide-react';
import type { Note } from '@/lib/store';

interface SearchViewProps {
  notes: Note[];
  onBack: () => void;
  onOpenNote: (note: Note) => void;
}

const SearchView = ({ notes, onBack, onOpenNote }: SearchViewProps) => {
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(n => n.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [notes]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [query, notes]);

  const recent = notes.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-50 flex flex-col"
    >
      {/* Search bar */}
      <div className="px-4 pt-12 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <div className="flex-1 flex items-center bg-card border border-border rounded-xl px-3 py-2.5">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search"
              autoFocus
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {query ? (
              <button onClick={() => setQuery('')}><X size={16} className="text-muted-foreground" /></button>
            ) : (
              <button onClick={() => setListening(!listening)}>
                <Mic size={16} className={listening ? 'text-foreground' : 'text-muted-foreground'} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 hide-scrollbar">
        {/* Listening indicator */}
        {listening && (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="flex items-end gap-1 h-5">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-1 bg-foreground rounded-full animate-pulse-wave"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Listening for keywords...</p>
          </div>
        )}

        {/* Results */}
        {query && results.length > 0 && (
          <div className="py-3">
            <p className="text-xs text-muted-foreground font-medium mb-3">Results</p>
            <div className="space-y-2">
              {results.map(n => (
                <button
                  key={n.id}
                  onClick={() => onOpenNote(n)}
                  className="w-full text-left p-3 rounded-xl bg-card border border-border"
                >
                  <p className="text-sm font-medium text-foreground line-clamp-1">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{n.content}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {query && results.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No results found</p>
          </div>
        )}

        {/* Recent & tags when no query */}
        {!query && (
          <>
            {recent.length > 0 && (
              <div className="py-3">
                <p className="text-xs text-muted-foreground font-medium mb-3">Recent</p>
                <div className="space-y-2">
                  {recent.map(n => (
                    <button
                      key={n.id}
                      onClick={() => onOpenNote(n)}
                      className="w-full text-left p-3 rounded-xl bg-card border border-border"
                    >
                      <p className="text-sm font-medium text-foreground line-clamp-1">{n.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {allTags.length > 0 && (
              <div className="py-3">
                <p className="text-xs text-muted-foreground font-medium mb-3">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setQuery(tag)}
                      className="px-3 py-1.5 rounded-full bg-secondary text-xs text-muted-foreground"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default SearchView;
