import { AnimatePresence, motion } from 'framer-motion';
import { Download, FileText, FileType2, X } from 'lucide-react';
import type { Note } from '@/lib/store';
import type { ExportFormat } from '@/lib/note-export';
import { shareOrDownloadNote } from '@/lib/note-export';
import { useState } from 'react';

type ExportableNote = Pick<Note, 'title' | 'content' | 'checklistItems' | 'noteType'>;

interface NoteExportModalProps {
  note: ExportableNote;
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const exportOptions: Array<{
  format: ExportFormat;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  {
    format: 'text',
    label: 'Text',
    description: 'Share or download a clean plain-text version of the note.',
    icon: FileText,
  },
  {
    format: 'pdf',
    label: 'PDF',
    description: 'Export a polished PDF version for reading or printing.',
    icon: Download,
  },
  {
    format: 'docx',
    label: 'DOCX',
    description: 'Create an editable Word document version of the note.',
    icon: FileType2,
  },
];

const NoteExportModal = ({ note, open, onClose, onComplete }: NoteExportModalProps) => {
  const [busyFormat, setBusyFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    try {
      setBusyFormat(format);
      await shareOrDownloadNote(note, format);
      onComplete?.();
      onClose();
    } finally {
      setBusyFormat(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-background/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed inset-x-6 top-1/2 z-[71] mx-auto w-full max-w-lg -translate-y-1/2 rounded-3xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Share note</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Choose how you want to export this note. If direct sharing is unavailable, the file will download automatically.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close share options"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {exportOptions.map((option) => (
                <button
                  key={option.format}
                  onClick={() => handleExport(option.format)}
                  disabled={busyFormat !== null}
                  className="flex w-full items-start gap-4 rounded-2xl border border-border bg-background/50 px-4 py-4 text-left transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  <div className="rounded-xl border border-border bg-card/70 p-3">
                    <option.icon size={18} className="text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-foreground">
                      {busyFormat === option.format ? `Preparing ${option.label}...` : option.label}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NoteExportModal;
