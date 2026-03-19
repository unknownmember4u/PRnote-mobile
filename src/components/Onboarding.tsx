import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Feather, Cloud, Lock, Sun, Moon, Monitor } from 'lucide-react';
import type { ThemeMode } from '@/lib/store';
import { applyTheme } from '@/lib/store';
import { useFirebaseBackup } from '@/hooks/use-firebase-backup';
import { useNotes } from '@/lib/store';

interface OnboardingProps {
  onComplete: () => void;
  onSetTheme: (theme: ThemeMode) => void;
}

const Onboarding = ({ onComplete, onSetTheme }: OnboardingProps) => {
  const [step, setStep] = useState(0);
  const { notes, setNotes } = useNotes();
  const cloudBackup = useFirebaseBackup(notes, setNotes);

  return (
    <div className="fixed inset-0 app-shell bg-background flex flex-col items-center justify-between">
      <AnimatePresence mode="wait">
        {step === 0 && <SplashStep key="splash" onNext={() => setStep(1)} />}
        {step === 1 && <FeaturesStep key="features" onNext={() => setStep(2)} />}
        {step === 2 && <ThemeStep key="theme" onNext={() => setStep(3)} onSetTheme={onSetTheme} />}
        {step === 3 && <CloudLoginStep key="cloud" cloudBackup={cloudBackup} onComplete={onComplete} />}
      </AnimatePresence>
    </div>
  );
};

function SplashStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="safe-top safe-bottom flex flex-col items-center justify-between h-full w-full px-6 py-8 sm:py-12 max-w-md mx-auto"
    >
      
      <div className="flex flex-col items-center gap-6 flex-1 justify-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
          <span className="font-serif-display text-2xl font-semibold text-foreground">P</span>
        </div>
        <h1 className="font-serif-display text-3xl font-semibold text-foreground">PRnote</h1>
        <div className="w-8 h-px bg-muted-foreground" />
      </div>

      <div className="w-full space-y-4">
        <p className="text-center font-serif-display text-lg text-foreground">Write without limits.</p>
        <button
          onClick={onNext}
          className="w-full py-4 bg-foreground text-background rounded-2xl text-sm font-medium"
        >
          Get started
        </button>
      </div>
    </motion.div>
  );
}

function FeaturesStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const features = [
    { icon: Feather, title: 'Markdown support', desc: 'Format as you type with standard markdown shortcuts.' },
    { icon: Cloud, title: 'Cloud sync', desc: 'Access your notes on any device, instantly updated.' },
    { icon: Lock, title: 'Privacy first', desc: 'End-to-end encryption for your private thoughts.' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="safe-top safe-bottom flex flex-col items-center justify-between h-full w-full px-6 py-8 sm:py-12 max-w-md mx-auto"
    >

      <div className="flex-1 flex flex-col justify-center w-full gap-8">
        <h2 className="font-serif-display text-2xl font-semibold text-foreground">Packed with everything.</h2>
        <div className="space-y-6">
          {features.map((f) => (
            <div key={f.title} className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <f.icon size={18} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{f.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 bg-foreground text-background rounded-2xl text-sm font-medium"
      >
        Next
      </button>
    </motion.div>
  );
}

function ThemeStep({ onNext, onSetTheme }: { onNext: () => void; onSetTheme: (theme: ThemeMode) => void }) {
  const [selected, setSelected] = useState<ThemeMode>('light');
  const themes: { mode: ThemeMode; label: string; icon: any }[] = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'amoled', label: 'AMOLED', icon: Monitor },
  ];

  const handleSelect = (mode: ThemeMode) => {
    setSelected(mode);
    applyTheme(mode); // Live preview
  };

  const handleNext = () => {
    onSetTheme(selected);
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="safe-top safe-bottom flex flex-col items-center justify-between h-full w-full px-6 py-8 sm:py-12 max-w-md mx-auto"
    >
      <div />

      <div className="flex flex-col items-center gap-8 w-full">
        <h2 className="font-serif-display text-2xl font-semibold text-foreground">Make it yours.</h2>
        <div className="flex gap-4">
          {themes.map((t) => (
            <button
              key={t.mode}
              onClick={() => handleSelect(t.mode)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                selected === t.mode ? 'border-foreground bg-secondary' : 'border-border'
              }`}
            >
              <t.icon size={24} className={selected === t.mode ? 'text-foreground' : 'text-muted-foreground'} />
              <span className={`text-xs ${selected === t.mode ? 'text-foreground' : 'text-muted-foreground'}`}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleNext}
        className="w-full py-4 bg-foreground text-background rounded-2xl text-sm font-medium"
      >
        Next
      </button>
    </motion.div>
  );
}

function CloudLoginStep({ cloudBackup, onComplete }: { cloudBackup: any; onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="safe-top safe-bottom flex flex-col items-center justify-between h-full w-full px-6 py-8 sm:py-12 max-w-md mx-auto"
    >
      <div />

      <div className="flex flex-col items-center gap-8 w-full">
        <h2 className="font-serif-display text-2xl font-semibold text-foreground">Sign in to sync</h2>
        <p className="text-center text-base text-muted-foreground">Sign in with Google to restore your notes from the cloud and enable backup.</p>
        <button
          onClick={cloudBackup.signIn}
          disabled={cloudBackup.busyAction === 'sign-in'}
          className="w-full py-4 bg-foreground text-background rounded-2xl text-sm font-medium"
        >
          {cloudBackup.busyAction === 'sign-in' ? 'Signing in...' : 'Sign in with Google'}
        </button>
        {cloudBackup.statusMessage && (
          <p className="text-xs text-muted-foreground mt-2 text-center">{cloudBackup.statusMessage}</p>
        )}
        {cloudBackup.user && (
          <button
            onClick={onComplete}
            className="w-full py-4 bg-secondary text-foreground rounded-2xl text-sm font-medium mt-4"
          >
            Continue to app
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default Onboarding;
