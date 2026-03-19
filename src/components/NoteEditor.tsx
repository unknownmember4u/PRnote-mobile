import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Share, Pin, Star, Type, Sparkles, Pen } from 'lucide-react';
import type { NoteFont } from '@/lib/store';

const FONT_OPTIONS: Array<{ value: NoteFont; label: string; family: string; icon: React.ReactNode }> = [
  { value: 'playfair', label: 'Playfair', family: "'Playfair Display', serif", icon: <Type size={16} /> },
  { value: 'rustico', label: 'Rustico', family: "'Lora', serif", icon: <Type size={16} /> },
  { value: 'priestacy', label: 'Priestacy', family: "'Fredoka One', sans-serif", icon: <Sparkles size={16} /> },
  { value: 'great-vibes', label: 'Great Vibes', family: "'Great Vibes', cursive", icon: <Pen size={16} /> },
  { value: 'whispering', label: 'Whispering', family: "'Dancing Script', cursive", icon: <Pen size={16} /> },
  { value: 'allura', label: 'Allura', family: "'Allura', cursive", icon: <Pen size={16} /> },
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
  initialFontFamily = 'playfair',
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

  // Get font family string for rendering
  const getFontFamily = (font: NoteFont): string => {
    const option = FONT_OPTIONS.find((opt) => opt.value === font);
    return option?.family ?? FONT_OPTIONS[0].family;
  };

  // Get special styling for script fonts
  const getScriptFontStyles = (font: NoteFont): React.CSSProperties => {
    const scriptFonts = ['great-vibes', 'whispering', 'allura'];
    if (!scriptFonts.includes(font)) return {};
    
    return {
      fontSize: font === 'whispering' ? '1.625rem' : '2rem', // 26px or 32px
      fontStyle: 'normal', // Remove italic for script fonts
      letterSpacing: font === 'whispering' ? '0.05em' : '0.1em', // Add spacing
      fontWeight: font === 'whispering' ? 600 : 400, // Whispering can use 600
      lineHeight: '1.8',
    };
  };

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
      {/* Header with Top Icons and Font Selector */}
      <div className="safe-top flex items-start justify-between px-4 py-4 border-b border-border gap-4">
        <button onClick={handleBack} className="p-2 -ml-2">
          <ArrowLeft size={24} className="text-foreground" />
        </button>

        {/* Center content area */}
        <div className="flex-1" />

        {/* Right side: Action buttons and Font selector */}
        <div className="flex flex-col items-end gap-1">
          {/* Top action buttons */}
          <div className="flex gap-1">
            <button
              onClick={() => setPinned((current) => !current)}
              className="p-2"
              aria-label={pinned ? 'Unpin note' : 'Pin note'}
              title={pinned ? 'Unpin note' : 'Pin note'}
            >
              <Pin size={20} className={pinned ? 'text-foreground fill-foreground' : 'text-muted-foreground'} />
            </button>
            <button
              onClick={() => setFavorite((current) => !current)}
              className="p-2"
              aria-label={favorite ? 'Unfavorite note' : 'Favorite note'}
              title={favorite ? 'Unfavorite note' : 'Favorite note'}
            >
              <Star size={20} className={favorite ? 'text-foreground fill-foreground' : 'text-muted-foreground'} />
            </button>
            <button className="p-2" aria-label="Share note" title="Share note">
              <Share size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Font selector icons - vertical stack */}
          <div className="flex flex-col gap-1 pt-2 border-t border-border/30">
            {FONT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFontFamily(option.value)}
                className={`p-2 rounded-lg border transition-all ${
                  fontFamily === option.value
                    ? 'border-foreground bg-secondary text-foreground shadow-md'
                    : 'border-border text-muted-foreground hover:border-foreground/50'
                }`}
                title={option.label}
              >
                <span className="flex items-center justify-center">{option.icon}</span>
              </button>
            ))}
          </div>
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
        <textarea
          ref={contentRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Start writing..."
          className="w-full bg-transparent text-xl text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[60vh] leading-relaxed"
          style={{ 
            fontFamily: getFontFamily(fontFamily),
            fontStyle: ['great-vibes', 'whispering', 'allura'].includes(fontFamily) ? 'normal' : 'italic',
            ...getScriptFontStyles(fontFamily)
          }}
        />
      </div>

      <div className="safe-bottom border-t border-border" />
    </div>
  );
};

export default NoteEditor;
