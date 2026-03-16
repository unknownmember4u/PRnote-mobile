import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Moon, Type, ShieldCheck, Download, Trash2 } from 'lucide-react';
import type { AppSettings } from '@/lib/store';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  onBack: () => void;
  onClearAll: () => void;
}

const SettingsView = ({ settings, onUpdate, onBack, onClearAll }: SettingsViewProps) => {
  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${on ? 'bg-foreground' : 'bg-muted'}`}
    >
      <div className={`w-5 h-5 rounded-full bg-background transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-50 flex flex-col overflow-y-auto"
    >
      <div className="px-5 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="p-1"><ArrowLeft size={20} className="text-foreground" /></button>
          <h1 className="font-serif-display text-xl font-semibold text-foreground">Settings</h1>
        </div>

        {/* Account */}
        <Section title="Account">
          <Row label="Profile" value="Editorial Team" />
          <ToggleRow label="Email Notifications" on={true} onToggle={() => {}} />
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <ToggleRow icon={Moon} label="Dark Mode" sublabel="Always On" on={settings.darkMode} onToggle={() => onUpdate({ darkMode: !settings.darkMode })} />
        </Section>

        {/* Editor */}
        <Section title="Editor">
          <Row icon={Type} label="Default Typography" value={settings.defaultFont} />
          <ToggleRow label="Spell Check" on={settings.spellCheck} onToggle={() => onUpdate({ spellCheck: !settings.spellCheck })} />
        </Section>

        {/* Security */}
        <Section title="Security">
          <ToggleRow icon={ShieldCheck} label="Biometric Lock" on={settings.biometricLock} onToggle={() => onUpdate({ biometricLock: !settings.biometricLock })} />
        </Section>

        {/* Backup */}
        <Section title="Backup">
          <Row icon={Download} label="Export Data" value="JSON / Markdown" />
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

function Row({ icon: Icon, label, value }: { icon?: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={18} className="text-muted-foreground" />}
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <span className="text-xs">{value}</span>
        <ChevronRight size={14} />
      </div>
    </div>
  );
}

function ToggleRow({ icon: Icon, label, sublabel, on, onToggle }: { icon?: any; label: string; sublabel?: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={18} className="text-muted-foreground" />}
        <div>
          <span className="text-sm text-foreground">{label}</span>
          {sublabel && <span className="text-xs text-muted-foreground ml-1">{sublabel}</span>}
        </div>
      </div>
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
