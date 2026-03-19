import { motion, AnimatePresence } from 'framer-motion';
import prnoteAmoledMark from '@/assets/branding/prnote-amoled-mark.png';

interface LaunchSplashProps {
  visible: boolean;
  isAmoledBranding?: boolean;
}

const orbTransition = {
  duration: 5.6,
  repeat: Infinity,
  repeatType: 'reverse' as const,
  ease: 'easeInOut' as const,
};

const LaunchSplash = ({ visible, isAmoledBranding = false }: LaunchSplashProps) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeOut' } }}
          className="fixed inset-0 z-[120] overflow-hidden bg-background"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_42%)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.05),_transparent_42%)] amoled:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.03),_transparent_40%)]" />
          <motion.div
            animate={{ x: 28, y: 22, scale: 1.08 }}
            transition={orbTransition}
            className="absolute -top-16 right-[-3.5rem] h-52 w-52 rounded-full bg-foreground/10 blur-3xl"
          />
          <motion.div
            animate={{ x: -24, y: -26, scale: 0.94 }}
            transition={{ ...orbTransition, duration: 6.2 }}
            className="absolute bottom-[-4.5rem] left-[-3rem] h-56 w-56 rounded-full bg-foreground/10 blur-3xl"
          />

          <div className="safe-top safe-bottom relative flex h-full flex-col items-center justify-center px-8">
            {isAmoledBranding ? (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="flex flex-col items-center"
              >
                <img
                  src={prnoteAmoledMark}
                  alt="PRnote"
                  className="w-[15.5rem] max-w-[82vw] select-none pointer-events-none"
                  draggable={false}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="flex flex-col items-center"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] border border-foreground/10 bg-card/80 shadow-[0_24px_60px_rgba(0,0,0,0.12)] backdrop-blur"
                >
                  <span className="font-serif-display text-4xl font-semibold text-foreground">P</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, letterSpacing: '0.22em' }}
                  animate={{ opacity: 1, letterSpacing: '0.04em' }}
                  transition={{ duration: 0.8, delay: 0.12, ease: 'easeOut' }}
                  className="font-serif-display text-[2.35rem] font-semibold text-foreground"
                >
                  PRnote
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 0.82, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.24, ease: 'easeOut' }}
                  className="mt-3 text-sm tracking-[0.22em] text-muted-foreground uppercase"
                >
                  Crafted for clarity
                </motion.p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="absolute bottom-[calc(var(--safe-area-bottom)+2.25rem)] flex items-center gap-2"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
              <span className="h-1.5 w-10 rounded-full bg-foreground/18" />
              <motion.span
                animate={{ x: [-12, 12, -12] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-0 h-1.5 w-6 rounded-full bg-foreground/75"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LaunchSplash;
