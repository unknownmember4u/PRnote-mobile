import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Sun, Monitor, Trash2, Cloud, CloudUpload, LogIn, LogOut } from 'lucide-react';
import type { AppSettings, ThemeMode, Note, NoteFont, NoteFontSize } from '@/lib/store';

interface SettingsViewProps {
  settings: AppSettings;
  noteCount: number;
  onUpdate: (updates: Partial<AppSettings>) => void;
  defaultNoteFont: NoteFont;
  defaultNoteFontSize: NoteFontSize;
  onDefaultNoteFontChange: (font: NoteFont) => void;
  onDefaultNoteFontSizeChange: (size: NoteFontSize) => void;
  onBack: () => void;
  onClearAll: () => void;
  cloudConfigured: boolean;
  cloudUserEmail: string | null;
  cloudUserPhotoUrl: string | null;
  cloudBusyAction: 'sign-in' | 'sign-out' | 'upload' | null;
  cloudStatus: string;
  cloudLastUploadedAt: string | null;
  notes: Note[];
  onCloudSignIn: () => void;
  onCloudSignOut: () => void;
  onCloudUpload: (selectedNoteIds?: string[]) => void;
}

const SettingsView = ({
  settings,
  noteCount,
  onUpdate,
  defaultNoteFont,
  defaultNoteFontSize,
  onDefaultNoteFontChange,
  onDefaultNoteFontSizeChange,
  onBack,
  onClearAll,
  cloudConfigured,
  cloudUserEmail,
  cloudUserPhotoUrl,
  cloudBusyAction,
  cloudStatus,
  cloudLastUploadedAt,
  notes,
  onCloudSignIn,
  onCloudSignOut,
  onCloudUpload,
}: SettingsViewProps) => {
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [showUploadPicker, setShowUploadPicker] = useState(false);
  const [selectedUploadIds, setSelectedUploadIds] = useState<string[]>([]);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const themes: { mode: ThemeMode; label: string; icon: any }[] = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'amoled', label: 'AMOLED', icon: Monitor },
  ];
  const fontOptions: Array<{ value: NoteFont; label: string }> = [
    { value: 'playfair', label: 'Playfair' },
    { value: 'rustico', label: 'Rustico' },
    { value: 'priestacy', label: 'Priestacy' },
    { value: 'great-vibes', label: 'Great Vibes' },
    { value: 'whispering', label: 'Whispering' },
    { value: 'allura', label: 'Allura' },
  ];
  const fontSizeOptions: Array<{ value: NoteFontSize; label: string }> = [
    { value: 'sm', label: 'Small' },
    { value: 'md', label: 'Medium' },
    { value: 'lg', label: 'Large' },
  ];

  const handleConfirmClearAll = () => {
    onClearAll();
    setShowClearAllConfirm(false);
  };

  const openUploadPicker = () => {
    setSelectedUploadIds([]);
    setShowUploadPicker(true);
  };

  const toggleUploadSelection = (noteId: string) => {
    setSelectedUploadIds((prev) => (prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]));
  };

  const allSelected = notes.length > 0 && selectedUploadIds.length === notes.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedUploadIds([]);
      return;
    }
    setSelectedUploadIds(notes.map((note) => note.id));
  };

  const handleUploadSelected = () => {
    onCloudUpload(selectedUploadIds);
    setShowUploadPicker(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 app-shell bg-background z-50 flex flex-col overflow-hidden"
    >
      <div className="px-5 safe-top safe-bottom pb-4 min-h-0 flex-1 overflow-y-auto hide-scrollbar flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="p-1"><ArrowLeft size={24} className="text-foreground" /></button>
          <h1 className="font-serif-display text-2xl font-semibold text-foreground">Settings</h1>
        </div>

        {/* Appearance */}
        <Section title="Appearance">
          <div className="flex gap-4 py-4">
            {themes.map(t => (
              <button
                key={t.mode}
                onClick={() => onUpdate({ theme: t.mode })}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  settings.theme === t.mode ? 'border-foreground bg-secondary' : 'border-border'
                }`}
              >
                <t.icon size={24} className={settings.theme === t.mode ? 'text-foreground' : 'text-muted-foreground'} />
                <span className={`text-sm font-medium ${
                  settings.theme === t.mode ? 'text-foreground' : 'text-muted-foreground'
                }`}>{t.label}</span>
              </button>
            ))}
          </div>
          <div className="py-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">Default Note Font</p>
            <div className="flex flex-wrap gap-2">
              {fontOptions.map((font) => (
                <button
                  key={font.value}
                  onClick={() => onDefaultNoteFontChange(font.value)}
                  className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                    defaultNoteFont === font.value
                      ? 'border-foreground bg-secondary text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/50'
                  }`}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>
          <div className="py-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">Default Note Font Size</p>
            <div className="flex gap-2">
              {fontSizeOptions.map((size) => (
                <button
                  key={size.value}
                  onClick={() => onDefaultNoteFontSizeChange(size.value)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    defaultNoteFontSize === size.value
                      ? 'border-foreground bg-secondary text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/50'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {cloudUserEmail ? `Saved for ${cloudUserEmail}.` : 'Sign in with Google to save per-account defaults.'}
            </p>
          </div>
        </Section>

        <Section title="Cloud Backup">
          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="flex items-start gap-4">
              <div className="mt-1 h-14 w-14 overflow-hidden rounded-xl bg-secondary">
                {cloudUserEmail && cloudUserPhotoUrl && !profileImageFailed ? (
                  <img
                    src={cloudUserPhotoUrl}
                    alt="Google profile"
                    className="h-full w-full object-cover"
                    onError={() => setProfileImageFailed(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Cloud size={22} className="text-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-foreground">
                  {cloudUserEmail ? cloudUserEmail : 'Google backup is disconnected'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cloudStatus}</p>
                {cloudLastUploadedAt && (
                  <p className="mt-3 text-xs text-muted-foreground">Last upload: {cloudLastUploadedAt}</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {!cloudUserEmail ? (
                <ActionButton
                  label={cloudBusyAction === 'sign-in' ? 'Connecting Google...' : 'Continue with Google'}
                  icon={LogIn}
                  disabled={!cloudConfigured || cloudBusyAction !== null}
                  onClick={onCloudSignIn}
                />
              ) : (
                <>
                  <ActionButton
                    label={cloudBusyAction === 'upload' ? 'Uploading to Cloud...' : 'Upload Notes to Cloud'}
                    icon={CloudUpload}
                    disabled={cloudBusyAction !== null}
                    onClick={openUploadPicker}
                  />
                  <ActionButton
                    label={cloudBusyAction === 'sign-out' ? 'Disconnecting...' : 'Disconnect Google'}
                    icon={LogOut}
                    disabled={cloudBusyAction !== null}
                    onClick={onCloudSignOut}
                    muted
                  />
                </>
              )}

              {!cloudConfigured && (
                <p className="pt-2 text-xs leading-relaxed text-muted-foreground">
                  Add your Firebase env values to enable Google login and cloud backup.
                </p>
              )}
            </div>
          </div>
        </Section>

        {/* Data */}
        <Section title="Data">
          <button
            onClick={() => setShowClearAllConfirm(true)}
            className="w-full flex items-center gap-4 py-4 text-destructive"
          >
            <Trash2 size={22} />
            <span className="text-base font-medium">Clear All Notes</span>
          </button>
        </Section>

        <p className="text-center text-sm text-muted-foreground mt-auto pt-8">PRnote v2.4.0 • Crafted for clarity.</p>
      </div>

      {showClearAllConfirm && (
        <div className="fixed inset-0 z-[70]">
          <div
            onClick={() => setShowClearAllConfirm(false)}
            className="absolute inset-0 bg-background/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="absolute inset-x-5 top-1/2 -translate-y-1/2 mx-auto max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-foreground">Clear all notes?</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This will permanently delete {noteCount} {noteCount === 1 ? 'note' : 'notes'} from your device.
              This action cannot be undone.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowClearAllConfirm(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground"
              >
                Keep Notes
              </button>
              <button
                onClick={handleConfirmClearAll}
                disabled={noteCount === 0}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-60"
              >
                Delete All
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showUploadPicker && (
        <div className="fixed inset-0 z-[75]">
          <div
            onClick={() => setShowUploadPicker(false)}
            className="absolute inset-0 bg-background/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="absolute inset-x-5 top-1/2 -translate-y-1/2 mx-auto max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-foreground">Upload Notes to Cloud</h3>
              <button
                onClick={handleToggleSelectAll}
                className="text-xs font-medium text-muted-foreground underline underline-offset-4"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">Choose notes to upload now.</p>

            <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-border bg-background/50 p-2">
              {notes.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No notes available.</p>
              ) : (
                <div className="space-y-1">
                  {notes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => toggleUploadSelection(note.id)}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-secondary"
                    >
                      <span
                        className={`mt-0.5 h-4 w-4 rounded border ${
                          selectedUploadIds.includes(note.id)
                            ? 'border-foreground bg-foreground'
                            : 'border-border bg-transparent'
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{note.title || 'Untitled'}</span>
                        <span className="block text-xs text-muted-foreground">
                          {new Date(note.updatedAt).toLocaleDateString()} {note.archived ? '• Archived' : ''}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowUploadPicker(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSelected}
                disabled={selectedUploadIds.length === 0 || cloudBusyAction !== null}
                className="flex-1 rounded-xl bg-foreground py-2.5 text-sm font-medium text-background disabled:opacity-50"
              >
                Upload Selected ({selectedUploadIds.length})
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

function ActionButton({
  label,
  icon: Icon,
  disabled,
  muted = false,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  disabled?: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl border px-5 py-4 text-left transition-colors ${
        muted
          ? 'border-border bg-transparent text-muted-foreground'
          : 'border-border bg-secondary/60 text-foreground'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <Icon size={22} className={muted ? 'text-muted-foreground' : 'text-foreground'} />
      <span className="text-base font-medium">{label}</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="text-sm font-semibold text-muted-foreground mb-3">{title}</p>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

export default SettingsView;
