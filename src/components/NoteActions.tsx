import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pin, Star, Palette, FolderOpen, Tag, Lock, Archive, Share, Trash2, X, AlertTriangle } from 'lucide-react';
import type { Note } from '@/lib/store';

interface NoteActionsProps {
  note: Note;
  folders: string[];
  onClose: () => void;
  onUpdate: (updates: Partial<Note>) => void;
  onCreateFolder: (name: string) => boolean;
  onDelete: () => void;
}

const NoteActions = ({ note, folders, onClose, onUpdate, onCreateFolder, onDelete }: NoteActionsProps) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');

  const actions = [
    { icon: Pin, label: note.pinned ? 'Unpin' : 'Pin', action: () => onUpdate({ pinned: !note.pinned }) },
    { icon: Star, label: note.favorite ? 'Unfavorite' : 'Favorite', action: () => onUpdate({ favorite: !note.favorite }) },
    { icon: Palette, label: 'Color', action: () => {} },
    { icon: FolderOpen, label: 'Move', action: () => setShowFolderPicker((current) => !current) },
    { icon: Tag, label: 'Tag', action: () => {} },
    { icon: Lock, label: note.locked ? 'Unlock' : 'Lock', action: () => onUpdate({ locked: !note.locked }) },
    { icon: Archive, label: note.archived ? 'Unarchive' : 'Archive', action: () => onUpdate({ archived: !note.archived }) },
    { icon: Share, label: 'Share', action: () => {} },
  ];
  const availableFolders = Array.from(new Set(folders.filter(Boolean)));

  const handleMoveToFolder = (folder: string | null) => {
    onUpdate({ folder });
    setShowFolderPicker(false);
  };

  const handleCreateFolder = () => {
    const created = onCreateFolder(folderDraft);
    if (!created) {
      return;
    }

    onUpdate({ folder: folderDraft.trim() });
    setFolderDraft('');
    setShowFolderPicker(false);
  };

  if (confirmDelete) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setConfirmDelete(false)}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-x-6 top-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl p-6 z-50 max-w-sm mx-auto"
        >
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={20} className="text-destructive" />
            <h3 className="text-base font-medium text-foreground">Delete Note?</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">This action cannot be undone. The note will be permanently removed.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 rounded-xl border border-border text-sm text-foreground">Cancel</button>
            <button onClick={onDelete} className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium">Delete</button>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 inset-x-0 bg-card border-t border-border rounded-t-3xl z-50 max-w-md mx-auto"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>
        <div className="grid grid-cols-4 gap-2 p-4">
          {actions.map(a => (
            <button
              key={a.label}
              onClick={a.action}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-secondary transition-colors"
            >
              <a.icon size={20} className="text-foreground" />
              <span className="text-[10px] text-muted-foreground">{a.label}</span>
            </button>
          ))}
        </div>
        {showFolderPicker && (
          <div className="border-t border-border px-4 pb-4">
            <div className="flex items-center justify-between pt-4">
              <h4 className="text-sm font-medium text-foreground">Move to folder</h4>
              {note.folder && (
                <button
                  onClick={() => handleMoveToFolder(null)}
                  className="text-xs text-muted-foreground underline underline-offset-4"
                >
                  Remove folder
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {availableFolders.length > 0 ? availableFolders.map((folder) => (
                <button
                  key={folder}
                  onClick={() => handleMoveToFolder(folder)}
                  className={`rounded-full border px-3 py-2 text-xs transition-colors ${
                    note.folder === folder
                      ? 'border-foreground bg-secondary text-foreground'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {folder}
                </button>
              )) : (
                <p className="text-xs text-muted-foreground">Create a folder first to organize this note.</p>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={folderDraft}
                onChange={(event) => setFolderDraft(event.target.value)}
                placeholder="New folder"
                className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={handleCreateFolder}
                disabled={!folderDraft.trim()}
                className="rounded-xl bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}
        <div className="px-4 pb-8">
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-destructive/30 text-destructive text-sm"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default NoteActions;
