import { useState } from 'react';
import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';

interface PasscodeScreenProps {
  onUnlock: () => void;
}

const PasscodeScreen = ({ onUnlock }: PasscodeScreenProps) => {
  const [code, setCode] = useState('');
  const passcode = '000000'; // default passcode

  const handleDigit = (d: string) => {
    const next = code + d;
    if (next.length <= 6) {
      setCode(next);
      if (next.length === 6) {
        if (next === passcode) {
          setTimeout(onUnlock, 200);
        } else {
          setTimeout(() => setCode(''), 400);
        }
      }
    }
  };

  const handleDelete = () => setCode(prev => prev.slice(0, -1));

  const digits = ['1','2','3','4','5','6','7','8','9','','0','del'];

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[60]">
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-2">
          <span className="font-serif-display text-lg font-semibold text-foreground">P</span>
        </div>
        <h2 className="font-serif-display text-lg font-semibold text-foreground">PRnote</h2>
        <p className="text-xs text-muted-foreground">Private & Secure</p>
      </div>

      {/* Dots */}
      <div className="flex gap-3 mb-12">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ scale: i < code.length ? 1.2 : 1 }}
            className={`w-3 h-3 rounded-full ${i < code.length ? 'bg-foreground' : 'bg-muted'}`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4 max-w-[280px]">
        {digits.map((d, i) => {
          if (d === '') return <div key={i} />;
          if (d === 'del') return (
            <button key={i} onClick={handleDelete} className="w-16 h-16 flex items-center justify-center mx-auto">
              <Delete size={22} className="text-muted-foreground" />
            </button>
          );
          return (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-xl font-medium text-foreground active:bg-muted transition-colors mx-auto"
            >
              {d}
            </button>
          );
        })}
      </div>

      <button className="mt-8 text-xs text-muted-foreground">Forgot Passcode?</button>
    </div>
  );
};

export default PasscodeScreen;
