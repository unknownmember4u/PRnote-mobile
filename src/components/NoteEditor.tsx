import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Share, Pin, Star, Type } from 'lucide-react';
import type { NoteFont } from '@/lib/store';

const FONT_OPTIONS: Array<{ value: NoteFont; label: string; family: string }> = [
  { value: 'playfair', label: 'Playfair', family: "'Playfair Display', serif" },
  { value: 'rustico', label: 'Rustico', family: "'Lora', serif" },
  { value: 'priestacy', label: 'Priestacy', family: "'Fredoka One', sans-serif" },
  { value: 'great-vibes', label: 'Great Vibes', family: "'Great Vibes', cursive" },
  { value: 'whispering', label: 'Whispering', family: "'Dancing Script', cursive" },
  { value: 'allura', label: 'Allura', family: "'Allura', cursive" },
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
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  // Memoize word count calculation
  const wordCount = useMemo(() => content.split(/\s+/).filter(Boolean).length, [content]);

  // Memoize date formatting
  const createdDate = useMemo(() => 
    new Date(createdAt).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }), 
  [createdAt]);

  // Memoize time formatting
  const createdTime = useMemo(() => 
    new Date(createdAt).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }), 
  [createdAt]);

  const selectedFont = FONT_OPTIONS.find((option) => option.value === fontFamily) ?? FONT_OPTIONS[0];

  // Memoize font family lookup
  const getFontFamily = useCallback((font: NoteFont): string => {
    const option = FONT_OPTIONS.find((opt) => opt.value === font);
    return option?.family ?? FONT_OPTIONS[0].family;
  }, []);

  // Memoize script font styles
  const getScriptFontStyles = useCallback((font: NoteFont): React.CSSProperties => {
    const scriptFonts = ['great-vibes', 'whispering', 'allura'];
    if (!scriptFonts.includes(font)) return {};
    
    return {
      fontSize: font === 'whispering' ? '1.625rem' : '2rem',
      fontStyle: 'normal',
      letterSpacing: font === 'whispering' ? '0.05em' : '0.1em',
      fontWeight: font === 'whispering' ? 600 : 400,
      lineHeight: '1.8',
    };
  }, []);

  // Memoize textarea styles to prevent recalculation on every render
  const textareaStyles = useMemo(() => ({
    fontFamily: getFontFamily(fontFamily),
    fontStyle: ['great-vibes', 'whispering', 'allura'].includes(fontFamily) ? 'normal' : 'italic',
    ...getScriptFontStyles(fontFamily),
  }), [fontFamily, getFontFamily, getScriptFontStyles]);

  // Memoize event handlers
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  const handlePinToggle = useCallback(() => {
    setPinned((current) => !current);
  }, []);

  const handleFavoriteToggle = useCallback(() => {
    setFavorite((current) => !current);
  }, []);

  const handleFontMenuToggle = useCallback(() => {
    setFontMenuOpen((prev) => !prev);
  }, []);

  const handleFontSelect = useCallback((font: NoteFont) => {
    setFontFamily(font);
    setFontMenuOpen(false);
  }, []);

  const handleBack = useCallback(() => {
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
  }, [title, content, pinned, favorite, createdAt, fontFamily, onSave, onBack]);

  return (
    <div className="fixed inset-0 app-shell bg-background flex flex-col z-50 overflow-hidden">
      {/* Header with Top Icons and Font Selector Menu */}
      <div className="safe-top sticky top-0 z-20 bg-background flex items-start justify-between px-4 py-4 border-b border-border gap-4">
        <button onClick={handleBack} className="p-2 -ml-2">
          <ArrowLeft size={24} className="text-foreground" />
        </button>

        {/* Center content area */}
        <div className="flex-1" />

        {/* Right side: Action buttons and Font menu */}
        <div className="flex flex-col items-end relative">
          {/* Top action buttons */}
          <div className="flex gap-1">
            <button
              onClick={handlePinToggle}
              className="p-2"
              aria-label={pinned ? 'Unpin note' : 'Pin note'}
              title={pinned ? 'Unpin note' : 'Pin note'}
            >
              <Pin size={20} className={pinned ? 'text-foreground fill-foreground' : 'text-muted-foreground'} />
            </button>
            <button
              onClick={handleFavoriteToggle}
              className="p-2"
              aria-label={favorite ? 'Unfavorite note' : 'Favorite note'}
              title={favorite ? 'Unfavorite note' : 'Favorite note'}
            >
              <Star size={20} className={favorite ? 'text-foreground fill-foreground' : 'text-muted-foreground'} />
            </button>
            <button className="p-2" aria-label="Share note" title="Share note">
              <Share size={20} className="text-muted-foreground" />
            </button>
            {/* Font selector root icon */}
            <button
              onClick={handleFontMenuToggle}
              className={`p-2 rounded-lg border transition-all ${
                fontMenuOpen
                  ? 'border-foreground bg-secondary text-foreground'
                  : 'border-border text-muted-foreground'
              }`}
              title="Change font"
              aria-label="Font menu"
            >
              <Type size={20} />
            </button>
          </div>

          {/* Font selector dropdown menu - appears below the font icon */}
          {fontMenuOpen && (
            <div className="absolute top-full right-0 mt-2 bg-background border border-border rounded-lg shadow-lg p-2 flex flex-wrap gap-2 w-max max-w-xs z-50">
              {FONT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFontSelect(option.value)}
                  className={`flex items-center rounded-lg border px-3 py-2 text-xs transition-all ${
                    fontFamily === option.value
                      ? 'border-foreground bg-secondary text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/50'
                  }`}
                  style={{ fontFamily: option.family }}
                  title={`Switch to ${option.label} font`}
                >
                  <span style={{ fontFamily: option.family }} className="font-medium">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden px-6 py-3 flex flex-col">
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="Title"
          className="w-full bg-transparent text-3xl font-serif-display font-semibold text-foreground placeholder:text-muted-foreground outline-none mb-2"
        />
        <p className="text-sm font-medium text-muted-foreground mb-4">
          {createdDate} • {createdTime} • {wordCount} words
        </p>
        <textarea
          ref={contentRef}
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing..."
          className="w-full bg-transparent text-xl text-foreground placeholder:text-muted-foreground outline-none resize-none flex-1 leading-relaxed pb-safe overflow-y-auto overscroll-contain"
          style={textareaStyles}
        />
      </div>

      <div className="safe-bottom border-t border-border" />
    </div>
  );
};

export default NoteEditor;
