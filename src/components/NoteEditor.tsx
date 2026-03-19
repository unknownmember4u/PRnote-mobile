import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Share, Pin, Star } from 'lucide-react';
import type { NoteFont } from '@/lib/store';

const FONT_OPTIONS: Array<{ value: NoteFont; label: string; family: string }> = [
  { value: 'inter', label: 'Inter', family: "'Inter', sans-serif" },
  { value: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif" },
  { value: 'merriweather', label: 'Merriweather', family: "'Merriweather', serif" },
  { value: 'playfair', label: 'Playfair', family: "'Playfair Display', serif" },
  { value: 'mono', label: 'Mono', family: "'JetBrains Mono', monospace" },
];

interface NoteEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialPinned?: boolean;
  initialFavorite?: boolean;
  initialCreatedAt?: number;
  initialFontFamily?: NoteFont;
  onSave: (payload: {
    title: string;
    content: string;
    pinned: boolean;
    favorite: boolean;
    createdAt: number;
    fontFamily: NoteFont;
  }) => void;
  onBack: () => void;
}

const NoteEditor = ({
  initialTitle = '',
  initialContent = '',
  initialPinned = false,
  initialFavorite = false,
  initialCreatedAt,
  initialFontFamily = 'inter',
  onSave,
  onBack,
}: NoteEditorProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [pinned, setPinned] = useState(initialPinned);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [createdAt] = useState(initialCreatedAt ?? Date.now());
  const [fontFamily, setFontFamily] = useState<NoteFont>(initialFontFamily);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const createdDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const createdTime = new Date(createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const selectedFont = FONT_OPTIONS.find((option) => option.value === fontFamily) ?? FONT_OPTIONS[0];

  const handleBack = () => {
    if (title.trim() || content.trim()) {
      onSave({
        title: title || 'Untitled',
        content,
        pinned,
        favorite,
        createdAt,
        fontFamily,
      });
    }
    onBack();
  };

  return (
    <div className="fixed inset-0 app-shell bg-background flex flex-col z-50">
      {/* Header */}
      <div className="safe-top flex items-center justify-between px-4 py-4 border-b border-border">
        <button onClick={handleBack} className="p-2 -ml-2">
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setPinned((current) => !current)}
            className="p-2"
            aria-label={pinned ? 'Unpin note' : 'Pin note'}
            title={pinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin size={22} className={pinned ? 'text-foreground fill-foreground' : 'text-muted-foreground'} />
          </button>
          <button
            onClick={() => setFavorite((current) => !current)}
            className="p-2"
            aria-label={favorite ? 'Unfavorite note' : 'Favorite note'}
            title={favorite ? 'Unfavorite note' : 'Favorite note'}
          >
            <Star size={22} className={favorite ? 'text-foreground fill-foreground' : 'text-muted-foreground'} />
          </button>
          <button className="p-2" aria-label="Share note" title="Share note"><Share size={22} className="text-muted-foreground" /></button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full bg-transparent text-3xl font-serif-display font-semibold text-foreground placeholder:text-muted-foreground outline-none mb-3"
        />
        <p className="text-sm font-medium text-muted-foreground mb-5">
          {createdDate} • {createdTime} • {wordCount} words
        </p>
        <div className="mb-5 flex flex-wrap gap-2">
          {FONT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFontFamily(option.value)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                fontFamily === option.value
                  ? 'border-foreground bg-secondary text-foreground'
                  : 'border-border text-muted-foreground'
              }`}
              style={{ fontFamily: option.family }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <textarea
          ref={contentRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Start writing..."
          className="w-full bg-transparent text-xl italic text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[60vh] leading-relaxed"
          style={{ fontFamily: selectedFont.family }}
        />
      </div>

      <div className="safe-bottom border-t border-border" />
    </div>
  );
};

export default NoteEditor;
