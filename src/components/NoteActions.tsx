import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pin, Star, Copy, FolderOpen, Zap, Lock, Archive, Share, Trash2, AlertTriangle } from 'lucide-react';
import { Share as CapacitorShare } from '@capacitor/share';
import type { Note, NotePriority } from '@/lib/store';
import { authenticateWithDeviceLock, hashSecret, verifySecret } from '@/lib/note-security';

interface NoteActionsProps {
  note: Note;
  folders: string[];
  onClose: () => void;
  onUpdate: (updates: Partial<Note>) => void;
  onCreateFolder: (name: string) => boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}

const NoteActions = ({ note, folders, onClose, onUpdate, onCreateFolder, onDuplicate, onDelete }: NoteActionsProps) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showLockPicker, setShowLockPicker] = useState(false);
  const [showCustomLockSetup, setShowCustomLockSetup] = useState(false);
  const [showCustomUnlock, setShowCustomUnlock] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');
  const [customPasscode, setCustomPasscode] = useState('');
  const [customPasscodeConfirm, setCustomPasscodeConfirm] = useState('');
  const [unlockPasscode, setUnlockPasscode] = useState('');
  const [lockError, setLockError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const updateAndClose = (updates: Partial<Note>) => {
    onUpdate(updates);
    onClose();
  };

  const handleCopyNote = async () => {
    try {
      const text = `${note.title}\n\n${note.content}`.trim();
      await navigator.clipboard.writeText(text);
      onClose();
    } catch {
      // Ignore clipboard errors in unsupported contexts.
    }
  };

  const handleShareNote = async () => {
    const text = `${note.title}\n\n${note.content}`.trim();

    try {
      const capability = await CapacitorShare.canShare();
      if (capability.value) {
        await CapacitorShare.share({
          title: note.title,
          text,
          dialogTitle: 'Share note',
        });
        onClose();
        return;
      }
    } catch {
      // Fall through to web share fallback.
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: note.title, text });
        onClose();
      } catch {
        // User cancelled or share unavailable.
      }
      return;
    }

    await handleCopyNote();
  };

  const handleDeviceLock = async () => {
    setIsBusy(true);
    setLockError('');
    const authenticated = await authenticateWithDeviceLock('Lock note', 'Confirm with device lock to protect this note');
    setIsBusy(false);

    if (!authenticated) {
      setLockError('Device authentication failed. Please try again.');
      return;
    }

    updateAndClose({ locked: true, lockType: 'device', customLockHash: null });
  };

  const handleSetupCustomLock = async () => {
    if (!customPasscode.trim() || customPasscode.length < 4) {
      setLockError('Enter a passcode with at least 4 characters.');
      return;
    }

    if (customPasscode !== customPasscodeConfirm) {
      setLockError('Passcodes do not match.');
      return;
    }

    setIsBusy(true);
    setLockError('');
    const lockHash = await hashSecret(customPasscode);
    setIsBusy(false);
    updateAndClose({ locked: true, lockType: 'custom', customLockHash: lockHash });
  };

  const handleUnlockNote = async () => {
    if (note.lockType === 'custom') {
      setShowCustomUnlock(true);
      setLockError('');
      return;
    }

    setIsBusy(true);
    setLockError('');
    const authenticated = await authenticateWithDeviceLock('Unlock note', 'Confirm with device lock to unlock this note');
    setIsBusy(false);

    if (!authenticated) {
      setLockError('Unable to verify identity.');
      return;
    }

    updateAndClose({ locked: false, lockType: 'none', customLockHash: null });
  };

  const handleCustomUnlockSubmit = async () => {
    setIsBusy(true);
    setLockError('');
    const valid = await verifySecret(unlockPasscode, note.customLockHash);
    setIsBusy(false);

    if (!valid) {
      setLockError('Incorrect passcode.');
      return;
    }

    updateAndClose({ locked: false, lockType: 'none', customLockHash: null });
  };

  const actions = [
    { icon: Pin, label: note.pinned ? 'Unpin' : 'Pin', action: () => updateAndClose({ pinned: !note.pinned }) },
    { icon: Star, label: note.favorite ? 'Unfavorite' : 'Favorite', action: () => updateAndClose({ favorite: !note.favorite }) },
    { icon: Copy, label: 'Duplicate', action: () => { onDuplicate(); onClose(); } },
    { icon: FolderOpen, label: 'Move', action: () => setShowFolderPicker((current) => !current) },
    { icon: Zap, label: 'Priority', action: () => setShowPriorityPicker((current) => !current) },
    { icon: Lock, label: note.locked ? 'Unlock' : 'Lock', action: () => (note.locked ? handleUnlockNote() : setShowLockPicker((current) => !current)) },
    { icon: Archive, label: note.archived ? 'Unarchive' : 'Archive', action: () => updateAndClose({ archived: !note.archived }) },
    { icon: Share, label: 'Share', action: () => handleShareNote() },
  ];

  const availableFolders = Array.from(new Set(folders.filter(Boolean)));

  const handleMoveToFolder = (folder: string | null) => {
    onUpdate({ folder });
    setShowFolderPicker(false);
    onClose();
  };

  const handleCreateFolder = () => {
    const created = onCreateFolder(folderDraft);
    if (!created) {
      return;
    }

    onUpdate({ folder: folderDraft.trim() });
    setFolderDraft('');
    setShowFolderPicker(false);
    onClose();
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

        {showPriorityPicker && (
          <div className="border-t border-border px-4 pb-4">
            <h4 className="pt-4 text-sm font-medium text-foreground">Set Priority Level</h4>
            <p className="mt-1 text-xs text-muted-foreground">Choose how important this note is.</p>
            <div className="mt-4 space-y-2">
              {(['none', 'low', 'medium', 'high'] as const).map((priority) => (
                <button
                  key={priority}
                  onClick={() => {
                    onUpdate({ priority });
                    setShowPriorityPicker(false);
                    onClose();
                  }}
                  className={`w-full text-left py-3 px-4 rounded-xl border transition-colors ${
                    note.priority === priority
                      ? 'border-foreground bg-secondary'
                      : 'border-border hover:border-foreground/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      priority === 'high' ? 'text-red-500' :
                      priority === 'medium' ? 'text-amber-500' :
                      priority === 'low' ? 'text-blue-500' :
                      'text-muted-foreground'
                    }`}>
                      {priority === 'none' ? 'No Priority' :
                       priority === 'low' ? 'Low Priority' :
                       priority === 'medium' ? 'Medium Priority' :
                       'High Priority'}
                    </span>
                    {note.priority === priority && (
                      <span className="text-foreground">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {showLockPicker && !note.locked && (
          <div className="border-t border-border px-4 pb-4">
            <h4 className="pt-4 text-sm font-medium text-foreground">Lock this note</h4>
            <p className="mt-1 text-xs text-muted-foreground">Choose your protection method.</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleDeviceLock}
                disabled={isBusy}
                className="flex-1 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground"
              >
                Use Device Lock
              </button>
              <button
                onClick={() => {
                  setShowCustomLockSetup((current) => !current);
                  setLockError('');
                }}
                disabled={isBusy}
                className="flex-1 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground"
              >
                Create New Lock
              </button>
            </div>
            {showCustomLockSetup && (
              <div className="mt-3 space-y-2">
                <input
                  value={customPasscode}
                  onChange={(event) => setCustomPasscode(event.target.value)}
                  placeholder="Enter passcode"
                  type="password"
                  className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <input
                  value={customPasscodeConfirm}
                  onChange={(event) => setCustomPasscodeConfirm(event.target.value)}
                  placeholder="Confirm passcode"
                  type="password"
                  className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  onClick={handleSetupCustomLock}
                  disabled={isBusy}
                  className="w-full rounded-xl bg-foreground px-4 py-2.5 text-sm text-background"
                >
                  Save Lock
                </button>
              </div>
            )}
            {!!lockError && <p className="mt-2 text-xs text-destructive">{lockError}</p>}
          </div>
        )}

        {showCustomUnlock && (
          <div className="border-t border-border px-4 pb-4">
            <h4 className="pt-4 text-sm font-medium text-foreground">Unlock note</h4>
            <p className="mt-1 text-xs text-muted-foreground">Enter your custom passcode.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={unlockPasscode}
                onChange={(event) => setUnlockPasscode(event.target.value)}
                placeholder="Passcode"
                type="password"
                className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={handleCustomUnlockSubmit}
                disabled={isBusy || !unlockPasscode.trim()}
                className="rounded-xl bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
              >
                Unlock
              </button>
            </div>
            {!!lockError && <p className="mt-2 text-xs text-destructive">{lockError}</p>}
          </div>
        )}

        {!!lockError && !showCustomUnlock && !showLockPicker && (
          <p className="px-4 pb-2 text-xs text-destructive">{lockError}</p>
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
