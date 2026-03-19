import { motion } from 'framer-motion';
import { ArrowLeft, Sun, Monitor, Download, Trash2, Cloud, CloudUpload, LogIn, LogOut } from 'lucide-react';
import type { AppSettings, ThemeMode } from '@/lib/store';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  onBack: () => void;
  onClearAll: () => void;
  onExport: () => void;
  cloudConfigured: boolean;
  cloudUserEmail: string | null;
  cloudBusyAction: 'sign-in' | 'sign-out' | 'upload' | null;
  cloudStatus: string;
  cloudLastUploadedAt: string | null;
  onCloudSignIn: () => void;
  onCloudSignOut: () => void;
  onCloudUpload: () => void;
}

const SettingsView = ({
  settings,
  onUpdate,
  onBack,
  onClearAll,
  onExport,
  cloudConfigured,
  cloudUserEmail,
  cloudBusyAction,
  cloudStatus,
  cloudLastUploadedAt,
  onCloudSignIn,
  onCloudSignOut,
  onCloudUpload,
}: SettingsViewProps) => {
  const themes: { mode: ThemeMode; label: string; icon: any }[] = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'amoled', label: 'AMOLED', icon: Monitor },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 app-shell bg-background z-50 flex flex-col overflow-y-auto"
    >
      <div className="px-5 safe-top safe-bottom pb-8">
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
        </Section>

        {/* Editor */}
        <Section title="Editor">
          <ToggleRow label="Spell Check" on={settings.spellCheck} onToggle={() => onUpdate({ spellCheck: !settings.spellCheck })} />
        </Section>

        <Section title="Cloud Backup">
          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-xl bg-secondary p-3">
                <Cloud size={22} className="text-foreground" />
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
                    label={cloudBusyAction === 'upload' ? 'Uploading Notes...' : 'Upload Notes to Firebase'}
                    icon={CloudUpload}
                    disabled={cloudBusyAction !== null}
                    onClick={onCloudUpload}
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
          <button onClick={onExport} className="w-full flex items-center gap-4 py-4 text-foreground">
            <Download size={22} className="text-muted-foreground" />
            <span className="text-base font-medium">Export Notes</span>
          </button>
          <button onClick={onClearAll} className="w-full flex items-center gap-4 py-4 text-destructive">
            <Trash2 size={22} />
            <span className="text-base font-medium">Clear All Notes</span>
          </button>
        </Section>

        <p className="text-center text-sm text-muted-foreground mt-8">PRnote v2.4.0 • Crafted for clarity.</p>
      </div>
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

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-base font-medium text-foreground">{label}</span>
      <button
        onClick={onToggle}
        className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${
          on ? 'bg-foreground' : 'bg-muted'
        }`}
      >
        <div className={`w-5 h-5 rounded-full bg-background transition-transform ${
          on ? 'translate-x-5' : ''
        }`} />
      </button>
    </div>
  );
}

export default SettingsView;
