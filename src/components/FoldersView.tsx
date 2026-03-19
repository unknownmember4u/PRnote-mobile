import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Star, Clock, Plus, Folder, Zap, ChevronDown, FilePlus2, FolderPlus, Trash2, MoreVertical } from 'lucide-react';
import type { Note, FolderNode } from '@/lib/store';
import { flattenFolderTree } from '@/lib/store';
import NoteActions from './NoteActions';

interface FoldersViewProps {
  notes: Note[];
  folderTree: FolderNode[];
  onBack: () => void;
  onCreateFolder: (name: string) => boolean;
  onDeleteFolder: (path: string) => void;
  onCreateNoteInFolder: (path: string) => void;
  onOpenNote: (note: Note) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onDuplicateNote: (note: Note) => void;
}

type SmartFolderKey = 'all' | 'favorites' | 'recent';
type ActiveView =
  | { type: 'smart'; key: SmartFolderKey; label: string; path: string }
  | { type: 'priority'; priority: 'low' | 'medium' | 'high'; label: string }
  | { type: 'folder'; path: string; label: string };

const FoldersView = ({
  notes,
  folderTree,
  onBack,
  onCreateFolder,
  onDeleteFolder,
  onCreateNoteInFolder,
  onOpenNote,
  onUpdateNote,
  onDeleteNote,
  onDuplicateNote,
}: FoldersViewProps) => {
  const [activeView, setActiveView] = useState<ActiveView>({ type: 'smart', key: 'all', label: 'All Notes', path: '' });
  const [rootFolderDraft, setRootFolderDraft] = useState('');
  const [childFolderDraft, setChildFolderDraft] = useState('');
  const [childComposerPath, setChildComposerPath] = useState<string | null>(null);
  const [pendingDeletePath, setPendingDeletePath] = useState<string | null>(null);
  const [showRootComposer, setShowRootComposer] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [actionNote, setActionNote] = useState<Note | null>(null);

  const stats = useMemo(() => ({
    all: notes.filter((note) => !note.archived).length,
    favorites: notes.filter((note) => note.favorite && !note.archived).length,
    recent: notes.filter((note) => Date.now() - note.updatedAt < 7 * 24 * 60 * 60 * 1000 && !note.archived).length,
  }), [notes]);

  const allFolderPaths = useMemo(() => flattenFolderTree(folderTree), [folderTree]);

  const priorities = useMemo(() => {
    const order: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
    return order
      .map((priority) => ({
        priority,
        count: notes.filter((note) => note.priority === priority && !note.archived).length,
      }))
      .filter((item) => item.count > 0);
  }, [notes]);

  const folderCounts = useMemo(() => {
    const map = new Map<string, number>();

    allFolderPaths.forEach((path) => {
      map.set(path, 0);
    });

    notes.forEach((note) => {
      if (note.folder) {
        map.set(note.folder, (map.get(note.folder) || 0) + 1);
      }
    });

    return Array.from(map.entries()).sort((left, right) => left[0].localeCompare(right[0]));
  }, [allFolderPaths, notes]);

  const visibleNotes = useMemo(() => {
    switch (activeView.type) {
      case 'priority':
        return notes.filter((note) => note.priority === activeView.priority && !note.archived);
      case 'folder':
        return notes.filter((note) => note.folder === activeView.path && !note.archived);
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

  const handleCreateRootFolder = () => {
    const name = rootFolderDraft.trim();
    if (!name) {
      return;
    }

    const created = onCreateFolder(name);
    if (!created) {
      return;
    }

    setRootFolderDraft('');
    setShowRootComposer(false);
    setActiveView({ type: 'folder', path: name, label: name });
  };

  const handleCreateChildFolder = (parentPath: string) => {
    const name = childFolderDraft.trim();
    if (!name) {
      return;
    }

    const fullPath = `${parentPath}/${name}`;
    const created = onCreateFolder(fullPath);
    if (!created) {
      return;
    }

    setChildFolderDraft('');
    setChildComposerPath(null);
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      let running = '';
      parentPath.split('/').forEach((part) => {
        running = running ? `${running}/${part}` : part;
        next.add(running);
      });
      return next;
    });
    setActiveView({ type: 'folder', path: fullPath, label: name });
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleDeleteFolder = (path: string) => {
    onDeleteFolder(path);

    setExpandedFolders((prev) => {
      const next = new Set(Array.from(prev).filter((item) => item !== path && !item.startsWith(`${path}/`)));
      return next;
    });

    if (childComposerPath === path || childComposerPath?.startsWith(`${path}/`)) {
      setChildComposerPath(null);
      setChildFolderDraft('');
    }

    if (activeView.type === 'folder' && (activeView.path === path || activeView.path.startsWith(`${path}/`))) {
      setActiveView({ type: 'smart', key: 'all', label: 'All Notes', path: '' });
    }
  };

  const pendingDeleteInfo = useMemo(() => {
    if (!pendingDeletePath) {
      return null;
    }

    const affectedNotes = notes.filter((note) => note.folder === pendingDeletePath || note.folder?.startsWith(`${pendingDeletePath}/`)).length;
    const affectedSubfolders = allFolderPaths.filter((path) => path.startsWith(`${pendingDeletePath}/`)).length;
    return {
      path: pendingDeletePath,
      affectedNotes,
      affectedSubfolders,
    };
  }, [allFolderPaths, notes, pendingDeletePath]);

  const renderFolderTree = (nodes: FolderNode[], parentPath = '') => {
    return nodes.map((node) => {
      const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
      const depth = Math.max(0, fullPath.split('/').length - 1);
      const isExpanded = expandedFolders.has(fullPath);
      const count = folderCounts.find(([path]) => path === fullPath)?.[1] ?? 0;
      const hasChildren = node.children.length > 0;
      const isComposerOpen = childComposerPath === fullPath;

      return (
        <div key={fullPath}>
          <button
            onClick={() => {
              if (hasChildren) toggleFolder(fullPath);
              setActiveView({ type: 'folder', path: fullPath, label: node.name });
            }}
            className={`flex w-full items-center justify-between rounded-xl p-4 text-left transition-colors ${
              activeView.type === 'folder' && activeView.path === fullPath ? 'bg-secondary' : 'hover:bg-secondary'
            }`}
            style={{ paddingLeft: `calc(1rem + ${depth * 1.25}rem)` }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {hasChildren && (
                <ChevronDown
                  size={20}
                  className={`flex-shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                />
              )}
              {!hasChildren && <div className="w-5" />}
              <Folder size={22} className="text-muted-foreground flex-shrink-0" />
              <span className="text-base font-medium text-foreground truncate">{node.name}</span>
            </div>
            <div className="ml-2 flex items-center gap-2">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveView({ type: 'folder', path: fullPath, label: node.name });
                  onCreateNoteInFolder(fullPath);
                }}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
                aria-label={`Create note in ${fullPath}`}
                title="New note in this folder"
              >
                <FilePlus2 size={18} />
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setExpandedFolders((prev) => {
                    const next = new Set(prev);
                    next.add(fullPath);
                    return next;
                  });
                  setChildComposerPath(fullPath);
                  setChildFolderDraft('');
                }}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
                aria-label={`Create subfolder in ${fullPath}`}
                title="New subfolder in this folder"
              >
                <FolderPlus size={18} />
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setPendingDeletePath(fullPath);
                }}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                aria-label={`Delete folder ${fullPath}`}
                title="Delete this folder"
              >
                <Trash2 size={18} />
              </button>
              <span className="text-sm font-semibold text-muted-foreground bg-background/50 rounded-full px-2.5 py-1 flex-shrink-0">{count}</span>
            </div>
          </button>
          {isComposerOpen && (
            <div
              className="mt-2 mb-2 mr-1 flex min-w-0 gap-2"
              style={{ marginLeft: `calc(1.5rem + ${(depth + 1) * 1.25}rem)` }}
            >
              <input
                value={childFolderDraft}
                onChange={(event) => setChildFolderDraft(event.target.value)}
                placeholder="Subfolder name"
                className="min-w-0 flex-1 rounded-xl border border-border bg-transparent px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <button
                onClick={() => handleCreateChildFolder(fullPath)}
                disabled={!childFolderDraft.trim()}
                className="shrink-0 rounded-xl bg-foreground px-4 py-3 text-base text-background font-medium disabled:opacity-50 transition-opacity"
              >
                <Plus size={18} />
              </button>
            </div>
          )}
          {hasChildren && isExpanded && (
            <div>
              {renderFolderTree(node.children, fullPath)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 app-shell bg-background z-50 flex flex-col"
    >
      <div className="flex-1 overflow-y-auto px-5 safe-top safe-bottom pb-4 hide-scrollbar">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="p-2 -ml-2"><ArrowLeft size={24} className="text-foreground" /></button>
          <h1 className="font-serif-display text-2xl font-semibold text-foreground">Organize</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card/40 p-5 mb-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-sm text-muted-foreground font-semibold">Add Root Folder</p>
            <button
              onClick={() => {
                setShowRootComposer((prev) => !prev);
                setRootFolderDraft('');
              }}
              className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {showRootComposer ? 'Cancel' : '+ New Folder'}
            </button>
          </div>
          {showRootComposer && (
            <div className="flex gap-2">
              <input
                value={rootFolderDraft}
                onChange={(event) => setRootFolderDraft(event.target.value)}
                placeholder="Enter folder name"
                className="flex-1 rounded-xl border border-border bg-transparent px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <button
                onClick={handleCreateRootFolder}
                disabled={!rootFolderDraft.trim()}
                className="rounded-xl bg-foreground px-5 py-3 text-base text-background font-medium disabled:opacity-50 transition-opacity"
              >
                <Plus size={20} />
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">Use folder row icons to create notes, add subfolders, or delete folders directly.</p>
        </div>

        <p className="text-sm text-muted-foreground font-semibold mb-4">Smart Folders</p>
        <div className="space-y-2 mb-8">
          {smartFolders.map((folder) => (
            <button
              key={folder.key}
              onClick={() => setActiveView({ type: 'smart', key: folder.key, label: folder.label, path: '' })}
              className={`flex w-full items-center justify-between rounded-xl p-4 text-left transition-colors ${
                activeView.type === 'smart' && activeView.key === folder.key ? 'bg-secondary' : 'hover:bg-secondary'
              }`}
            >
              <div className="flex items-center gap-3">
                <folder.icon size={22} className="text-muted-foreground" />
                <span className="text-base font-medium text-foreground">{folder.label}</span>
              </div>
              <span className="text-sm font-semibold text-muted-foreground bg-background/50 rounded-full px-2.5 py-1">{folder.count}</span>
            </button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground font-semibold mb-4">My Folders</p>
        {folderTree.length > 0 ? (
          <div className="space-y-1.5 mb-8">
            {renderFolderTree(folderTree)}
          </div>
        ) : (
          <p className="mb-8 text-base text-muted-foreground italic">No folders yet. Create a root folder above to get started.</p>
        )}

        {priorities.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground font-semibold mb-4">Priority</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {priorities.map(({ priority, count }) => (
                <button
                  key={priority}
                  onClick={() => setActiveView({
                    type: 'priority',
                    priority,
                    label: `${priority.charAt(0).toUpperCase()}${priority.slice(1)} Priority`,
                  })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeView.type === 'priority' && activeView.priority === priority
                      ? 'bg-foreground text-background'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  <Zap size={12} className="inline mr-2" />
                  {priority.charAt(0).toUpperCase() + priority.slice(1)} ({count})
                </button>
              ))}
            </div>
          </>
        )}

        <div className="pt-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-base text-muted-foreground font-semibold">{activeView.label}</p>
            <span className="text-sm text-muted-foreground bg-background/50 rounded-full px-3 py-1.5 font-semibold">{visibleNotes.length} notes</span>
          </div>

          {visibleNotes.length > 0 ? (
            <div className="space-y-3">
              {visibleNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onOpenNote(note)}
                  className="w-full rounded-2xl border border-border bg-[hsl(var(--pr-surface))] px-5 py-4 text-left transition-colors hover:bg-secondary"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="text-base font-semibold text-foreground line-clamp-1 flex-1">{note.title}</p>
                    <div className="ml-2 flex items-center gap-1">
                      {note.folder && (
                        <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground flex-shrink-0">
                          {note.folder.split('/').pop()}
                        </span>
                      )}
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setActionNote(note);
                        }}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                        aria-label="Open note actions"
                        title="More actions"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                  {note.content && (
                    <p className="text-sm italic text-muted-foreground line-clamp-2">{note.content}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-base text-muted-foreground italic">
              No notes in this folder yet.
            </div>
          )}
        </div>
      </div>

      {actionNote && (
        <NoteActions
          note={actionNote}
          folders={allFolderPaths}
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

      {pendingDeleteInfo && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 p-5">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-[hsl(var(--pr-surface))] p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground">Delete Folder?</h2>
            <p className="mt-3 text-sm text-muted-foreground break-all">
              <span className="font-semibold text-foreground">{pendingDeleteInfo.path}</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              This will remove the folder from Organizer.
            </p>
            <div className="mt-3 rounded-xl bg-secondary/70 p-3 text-sm text-foreground">
              <p>{pendingDeleteInfo.affectedSubfolders} subfolder(s) will also be removed.</p>
              <p className="mt-1">{pendingDeleteInfo.affectedNotes} note(s) will be moved to All Notes.</p>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingDeletePath(null)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteFolder(pendingDeleteInfo.path);
                  setPendingDeletePath(null);
                }}
                className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
              >
                Delete Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default FoldersView;
