import { AnimatePresence, motion } from 'framer-motion';
import { Download, FileText, FileType2, X } from 'lucide-react';
import type { ExportFormat, ExportableNote } from '@/lib/note-export';
import { shareOrDownloadNote } from '@/lib/note-export';
import { useState } from 'react';

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
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-background/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="absolute inset-x-5 top-1/2 -translate-y-1/2 mx-auto max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">Share note</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Choose a format to export this note.
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

            <div className="mt-5 space-y-2">
              {exportOptions.map((option) => (
                <button
                  key={option.format}
                  onClick={() => handleExport(option.format)}
                  disabled={busyFormat !== null}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/50 px-3 py-3 text-left transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  <div className="rounded-lg border border-border bg-card/70 p-2">
                    <option.icon size={16} className="text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {busyFormat === option.format ? `Preparing ${option.label}...` : option.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NoteExportModal;
