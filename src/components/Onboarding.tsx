import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Feather, Cloud, Lock, Sun, Moon, Monitor } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(0);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-between min-h-screen">
      <AnimatePresence mode="wait">
        {step === 0 && <SplashStep key="splash" onNext={() => setStep(1)} onSkip={onComplete} />}
        {step === 1 && <FeaturesStep key="features" onNext={() => setStep(2)} onSkip={onComplete} />}
        {step === 2 && <ThemeStep key="theme" onComplete={onComplete} />}
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
      className="flex flex-col items-center justify-between h-full w-full px-6 py-12 max-w-md mx-auto"
    >
      <button onClick={onSkip} className="self-end text-sm text-muted-foreground">Skip</button>
      
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
      className="flex flex-col items-center justify-between h-full w-full px-6 py-12 max-w-md mx-auto"
    >
      <button onClick={onSkip} className="self-end text-sm text-muted-foreground">Skip</button>

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

function ThemeStep({ onComplete }: { onComplete: () => void }) {
  const [selected, setSelected] = useState<string>('Dark');
  const themes = [
    { name: 'Light', icon: Sun },
    { name: 'Dark', icon: Moon },
    { name: 'AMOLED', icon: Monitor },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex flex-col items-center justify-between h-full w-full px-6 py-12 max-w-md mx-auto"
    >
      <div />

      <div className="flex flex-col items-center gap-8 w-full">
        <h2 className="font-serif-display text-2xl font-semibold text-foreground">Make it yours.</h2>
        <div className="flex gap-4">
          {themes.map((t) => (
            <button
              key={t.name}
              onClick={() => setSelected(t.name)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                selected === t.name ? 'border-foreground bg-secondary' : 'border-border'
              }`}
            >
              <t.icon size={24} className={selected === t.name ? 'text-foreground' : 'text-muted-foreground'} />
              <span className={`text-xs ${selected === t.name ? 'text-foreground' : 'text-muted-foreground'}`}>{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full py-4 bg-foreground text-background rounded-2xl text-sm font-medium"
      >
        Start writing
      </button>
    </motion.div>
  );
}

export default Onboarding;
