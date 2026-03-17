import { motion } from 'framer-motion';
import { ArrowLeft, Moon, Sun, Monitor, Type, Download, Trash2 } from 'lucide-react';
import type { AppSettings, ThemeMode } from '@/lib/store';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  onBack: () => void;
  onClearAll: () => void;
  onExport: () => void;
}

const SettingsView = ({ settings, onUpdate, onBack, onClearAll, onExport }: SettingsViewProps) => {
  const themes: { mode: ThemeMode; label: string; icon: any }[] = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
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
          <button onClick={onBack} className="p-1"><ArrowLeft size={20} className="text-foreground" /></button>
          <h1 className="font-serif-display text-xl font-semibold text-foreground">Settings</h1>
        </div>

        {/* Appearance */}
        <Section title="Appearance">
          <div className="flex gap-3 py-3">
            {themes.map(t => (
              <button
                key={t.mode}
                onClick={() => onUpdate({ theme: t.mode })}
                className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  settings.theme === t.mode ? 'border-foreground bg-secondary' : 'border-border'
                }`}
              >
                <t.icon size={20} className={settings.theme === t.mode ? 'text-foreground' : 'text-muted-foreground'} />
                <span className={`text-xs ${settings.theme === t.mode ? 'text-foreground' : 'text-muted-foreground'}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Editor */}
        <Section title="Editor">
          <ToggleRow label="Spell Check" on={settings.spellCheck} onToggle={() => onUpdate({ spellCheck: !settings.spellCheck })} />
        </Section>

        {/* Data */}
        <Section title="Data">
          <button onClick={onExport} className="w-full flex items-center gap-3 py-3 text-foreground">
            <Download size={18} className="text-muted-foreground" />
            <span className="text-sm">Export Notes</span>
          </button>
          <button onClick={onClearAll} className="w-full flex items-center gap-3 py-3 text-destructive">
            <Trash2 size={18} />
            <span className="text-sm">Clear All Notes</span>
          </button>
        </Section>

        <p className="text-center text-xs text-muted-foreground mt-8">PRnote v2.4.0 • Crafted for clarity.</p>
      </div>
    </motion.div>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs text-muted-foreground font-medium mb-2">{title}</p>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-foreground">{label}</span>
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${on ? 'bg-foreground' : 'bg-muted'}`}
      >
        <div className={`w-5 h-5 rounded-full bg-background transition-transform ${on ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

export default SettingsView;
