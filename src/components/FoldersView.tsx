import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Star, Clock, Plus, Folder, Tag } from 'lucide-react';
import type { Note } from '@/lib/store';

interface FoldersViewProps {
  notes: Note[];
  folders: string[];
  onBack: () => void;
  onCreateFolder: (name: string) => boolean;
  onOpenNote: (note: Note) => void;
}

type SmartFolderKey = 'all' | 'favorites' | 'recent';
type ActiveView =
  | { type: 'smart'; key: SmartFolderKey; label: string }
  | { type: 'folder'; key: string; label: string };

const FoldersView = ({ notes, folders, onBack, onCreateFolder, onOpenNote }: FoldersViewProps) => {
  const [activeView, setActiveView] = useState<ActiveView>({ type: 'smart', key: 'all', label: 'All Notes' });
  const [folderDraft, setFolderDraft] = useState('');

  const stats = useMemo(() => ({
    all: notes.filter((note) => !note.archived).length,
    favorites: notes.filter((note) => note.favorite && !note.archived).length,
    recent: notes.filter((note) => Date.now() - note.updatedAt < 7 * 24 * 60 * 60 * 1000 && !note.archived).length,
  }), [notes]);

  const folderCounts = useMemo(() => {
    const map = new Map<string, number>();

    folders.forEach((folder) => {
      map.set(folder, 0);
    });

    notes.forEach((note) => {
      if (note.folder) {
        map.set(note.folder, (map.get(note.folder) || 0) + 1);
      }
    });

    return Array.from(map.entries()).sort((left, right) => left[0].localeCompare(right[0]));
  }, [folders, notes]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((note) => note.tags.forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [notes]);

  const visibleNotes = useMemo(() => {
    switch (activeView.type) {
      case 'folder':
        return notes.filter((note) => note.folder === activeView.key && !note.archived);
      case 'smart':
        switch (activeView.key) {
          case 'favorites':
            return notes.filter((note) => note.favorite && !note.archived);
          case 'recent':
            return notes
              .filter((note) => !note.archived)
              .sort((left, right) => right.updatedAt - left.updatedAt)
              .slice(0, 10);
          default:
            return notes.filter((note) => !note.archived);
        }
    }
  }, [activeView, notes]);

  const smartFolders = [
    { icon: FileText, key: 'all' as const, label: 'All Notes', count: stats.all },
    { icon: Star, key: 'favorites' as const, label: 'Favorites', count: stats.favorites },
    { icon: Clock, key: 'recent' as const, label: 'Recent Edits', count: stats.recent },
  ];

  const handleCreateFolder = () => {
    const created = onCreateFolder(folderDraft);
    if (!created) {
      return;
    }

    const name = folderDraft.trim();
    setFolderDraft('');
    setActiveView({ type: 'folder', key: name, label: name });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 app-shell bg-background z-50 flex flex-col"
    >
      <div className="flex-1 overflow-y-auto px-5 safe-top safe-bottom pb-4 hide-scrollbar">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-1"><ArrowLeft size={20} className="text-foreground" /></button>
          <h1 className="font-serif-display text-xl font-semibold text-foreground">Organize</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card/40 p-4 mb-6">
          <p className="text-xs text-muted-foreground font-medium mb-3">Create Folder</p>
          <div className="flex gap-2">
            <input
              value={folderDraft}
              onChange={(event) => setFolderDraft(event.target.value)}
              placeholder="Work, Personal, Ideas..."
              className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={handleCreateFolder}
              disabled={!folderDraft.trim()}
              className="rounded-xl bg-foreground px-4 py-2.5 text-sm text-background disabled:opacity-50"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground font-medium mb-3">Smart Folders</p>
        <div className="space-y-1 mb-6">
          {smartFolders.map((folder) => (
            <button
              key={folder.key}
              onClick={() => setActiveView({ type: 'smart', key: folder.key, label: folder.label })}
              className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors ${
                activeView.type === 'smart' && activeView.key === folder.key ? 'bg-secondary' : 'hover:bg-secondary'
              }`}
            >
              <div className="flex items-center gap-3">
                <folder.icon size={18} className="text-muted-foreground" />
                <span className="text-sm text-foreground">{folder.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{folder.count}</span>
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground font-medium mb-3">My Folders</p>
        {folderCounts.length > 0 ? (
          <div className="space-y-1 mb-6">
            {folderCounts.map(([name, count]) => (
              <button
                key={name}
                onClick={() => setActiveView({ type: 'folder', key: name, label: name })}
                className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors ${
                  activeView.type === 'folder' && activeView.key === name ? 'bg-secondary' : 'hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Folder size={18} className="text-muted-foreground" />
                  <span className="text-sm text-foreground">{name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{count}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mb-6 text-sm text-muted-foreground">No folders yet. Create one above, then move notes into it.</p>
        )}

        {tags.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground font-medium mb-3">Tags</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {tags.map((tag) => (
                <span key={tag} className="px-3 py-1.5 rounded-full bg-secondary text-xs text-muted-foreground">
                  <Tag size={10} className="inline mr-1" />{tag}
                </span>
              ))}
            </div>
          </>
        )}

        <div className="pt-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">{activeView.label}</p>
            <span className="text-xs text-muted-foreground">{visibleNotes.length} notes</span>
          </div>

          {visibleNotes.length > 0 ? (
            <div className="space-y-2">
              {visibleNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => onOpenNote(note)}
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{note.title}</p>
                    {note.folder && (
                      <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
                        {note.folder}
                      </span>
                    )}
                  </div>
                  {note.content && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{note.content}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No notes in this folder yet.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default FoldersView;
