import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, Share as ShareIcon, Pin, Star, Type, CheckSquare2, Square, ListTodo, AlignLeft, Plus, X } from 'lucide-react';
import { Share } from '@capacitor/share';
import type { ChecklistItem, NoteFont, NoteFontSize, NoteType } from '@/lib/store';
import { getChecklistProgress, getNoteWordCount, getShareText, hasNoteContent } from '@/lib/note-content';

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
  initialNoteType?: NoteType;
  initialChecklistItems?: ChecklistItem[];
  initialPinned?: boolean;
  initialFavorite?: boolean;
  initialCreatedAt?: number;
  initialFontFamily?: NoteFont;
  initialFontSize?: NoteFontSize;
  onSave: (payload: {
    title: string;
    content: string;
    noteType: NoteType;
    checklistItems: ChecklistItem[];
    pinned: boolean;
    favorite: boolean;
    createdAt: number;
    fontFamily: NoteFont;
    fontSize: NoteFontSize;
  }) => void;
  onBack: () => void;
}

const NoteEditor = ({
  initialTitle = '',
  initialContent = '',
  initialNoteType = 'text',
  initialChecklistItems = [],
  initialPinned = false,
  initialFavorite = false,
  initialCreatedAt,
  initialFontFamily = 'playfair',
  initialFontSize = 'md',
  onSave,
  onBack,
}: NoteEditorProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [noteType, setNoteType] = useState<NoteType>(initialNoteType);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    initialChecklistItems.length > 0 ? initialChecklistItems : [{ id: crypto.randomUUID(), text: '', checked: false }],
  );
  const [pinned, setPinned] = useState(initialPinned);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [createdAt] = useState(initialCreatedAt ?? Date.now());
  const [fontFamily, setFontFamily] = useState<NoteFont>(initialFontFamily);
  const [fontSize, setFontSize] = useState<NoteFontSize>(initialFontSize);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'saved'>('idle');
  const lastSavedSnapshotRef = useRef('');

  // Memoize word count calculation
  const wordCount = useMemo(
    () => getNoteWordCount({ content, checklistItems, noteType }),
    [content, checklistItems, noteType],
  );

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

  const hasMeaningfulContent = useMemo(
    () => hasNoteContent({ title, content, checklistItems, noteType }),
    [title, content, checklistItems, noteType],
  );

  const buildPayload = useCallback(() => ({
    title: title || 'Untitled',
    content,
    noteType,
    checklistItems: checklistItems.map((item) => ({ ...item })),
    pinned,
    favorite,
    createdAt,
    fontFamily,
    fontSize,
  }), [title, content, noteType, checklistItems, pinned, favorite, createdAt, fontFamily, fontSize]);

  const createPayloadSnapshot = useCallback(() => JSON.stringify(buildPayload()), [buildPayload]);

  useEffect(() => {
    if (!hasMeaningfulContent) {
      setSaveState('idle');
      return;
    }

    const snapshot = createPayloadSnapshot();
    if (!lastSavedSnapshotRef.current) {
      lastSavedSnapshotRef.current = snapshot;
      setSaveState('saved');
      return;
    }

    if (snapshot === lastSavedSnapshotRef.current) {
      setSaveState('saved');
      return;
    }

    setSaveState('pending');
    const autosaveTimer = window.setTimeout(() => {
      const payload = buildPayload();
      onSave(payload);
      lastSavedSnapshotRef.current = JSON.stringify(payload);
      setSaveState('saved');
    }, 1000);

    return () => window.clearTimeout(autosaveTimer);
  }, [hasMeaningfulContent, createPayloadSnapshot, buildPayload, onSave]);

  // Memoize font family lookup
  const getFontFamily = useCallback((font: NoteFont): string => {
    const option = FONT_OPTIONS.find((opt) => opt.value === font);
    return option?.family ?? FONT_OPTIONS[0].family;
  }, []);

  // Memoize script font styles
  const getScriptFontStyles = useCallback((font: NoteFont, size: NoteFontSize): React.CSSProperties => {
    const scriptFonts = ['great-vibes', 'whispering', 'allura'];
    if (!scriptFonts.includes(font)) return {};

    const basePx = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
    const scaledPx = font === 'whispering' ? Math.round(basePx * 1.2) : Math.round(basePx * 1.35);
    
    return {
      fontSize: `${scaledPx}px`,
      fontStyle: 'normal',
      letterSpacing: font === 'whispering' ? '0.05em' : '0.1em',
      fontWeight: font === 'whispering' ? 600 : 400,
      lineHeight: '1.45',
    };
  }, []);

  const getBaseFontSize = useCallback((size: NoteFontSize): string => {
    if (size === 'sm') return '1rem';
    if (size === 'lg') return '1.5rem';
    return '1.25rem';
  }, []);

  // Memoize textarea styles to prevent recalculation on every render
  const textareaStyles = useMemo(() => ({
    fontFamily: getFontFamily(fontFamily),
    fontSize: getBaseFontSize(fontSize),
    fontStyle: ['great-vibes', 'whispering', 'allura'].includes(fontFamily) ? 'normal' : 'italic',
    ...getScriptFontStyles(fontFamily, fontSize),
  }), [fontFamily, fontSize, getBaseFontSize, getFontFamily, getScriptFontStyles]);

  // Memoize event handlers
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  const ensureChecklistHasRow = useCallback(() => {
    setChecklistItems((current) =>
      current.length > 0 ? current : [{ id: crypto.randomUUID(), text: '', checked: false }],
    );
  }, []);

  const handlePinToggle = useCallback(() => {
    setPinned((current) => !current);
  }, []);

  const handleFavoriteToggle = useCallback(() => {
    setFavorite((current) => !current);
  }, []);

  const handleNoteTypeChange = useCallback((nextType: NoteType) => {
    setNoteType(nextType);
    if (nextType === 'checklist') {
      ensureChecklistHasRow();
    }
  }, [ensureChecklistHasRow]);

  const handleFontMenuToggle = useCallback(() => {
    setFontMenuOpen((prev) => !prev);
  }, []);

  const handleFontSelect = useCallback((font: NoteFont) => {
    setFontFamily(font);
    setFontMenuOpen(false);
  }, []);

  const handleFontSizeSelect = useCallback((size: NoteFontSize) => {
    setFontSize(size);
  }, []);

  const handleChecklistItemChange = useCallback((id: string, text: string) => {
    setChecklistItems((current) =>
      current.map((item) => (item.id === id ? { ...item, text } : item)),
    );
  }, []);

  const handleChecklistItemToggle = useCallback((id: string) => {
    setChecklistItems((current) =>
      current.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  }, []);

  const handleAddChecklistItem = useCallback((afterId?: string) => {
    setChecklistItems((current) => {
      const nextItem = { id: crypto.randomUUID(), text: '', checked: false };

      if (!afterId) {
        return [...current, nextItem];
      }

      const index = current.findIndex((item) => item.id === afterId);
      if (index === -1) {
        return [...current, nextItem];
      }

      return [...current.slice(0, index + 1), nextItem, ...current.slice(index + 1)];
    });
  }, []);

  const handleRemoveChecklistItem = useCallback((id: string) => {
    setChecklistItems((current) => {
      if (current.length === 1) {
        return [{ ...current[0], text: '', checked: false }];
      }
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const handleChecklistKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>, item: ChecklistItem) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddChecklistItem(item.id);
      return;
    }

    if (event.key === 'Backspace' && !item.text && checklistItems.length > 1) {
      event.preventDefault();
      handleRemoveChecklistItem(item.id);
    }
  }, [checklistItems.length, handleAddChecklistItem, handleRemoveChecklistItem]);

  const handleShare = useCallback(async () => {
    const trimmedTitle = title.trim() || 'Untitled';
    const shareText = getShareText({ title: trimmedTitle, content, checklistItems, noteType });

    try {
      const canNativeShare = await Share.canShare();
      if (canNativeShare.value) {
        await Share.share({
          title: trimmedTitle,
          text: shareText,
          dialogTitle: 'Share note',
        });
        return;
      }
    } catch {
      // Fall through to web and clipboard fallback.
    }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: trimmedTitle,
          text: shareText,
        });
        return;
      } catch {
        // User-cancel and unsupported cases continue to clipboard fallback.
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
      } catch {
        // No-op if clipboard is unavailable.
      }
    }
  }, [title, content, checklistItems, noteType]);

  const checklistProgress = useMemo(
    () => getChecklistProgress({ noteType, checklistItems }),
    [noteType, checklistItems],
  );

  const handleBack = useCallback(() => {
    if (hasMeaningfulContent) {
      const payload = buildPayload();
      const snapshot = JSON.stringify(payload);
      if (snapshot !== lastSavedSnapshotRef.current) {
        onSave(payload);
        lastSavedSnapshotRef.current = snapshot;
      }
    }
    onBack();
  }, [hasMeaningfulContent, buildPayload, onSave, onBack]);

  return (
    <div className="fixed inset-0 app-shell z-50 flex flex-col overflow-hidden bg-background">
      {/* Header with Top Icons and Font Selector Menu */}
      <div className="safe-top sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-border bg-background px-4 py-4">
        <button onClick={handleBack} className="p-2 -ml-2" aria-label="Back">
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
            <button onClick={handleShare} className="p-2" aria-label="Share note" title="Share note">
              <ShareIcon size={20} className="text-muted-foreground" />
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
              <div className="flex w-full gap-2 pb-2 mb-1 border-b border-border">
                {(['sm', 'md', 'lg'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => handleFontSizeSelect(size)}
                    className={`flex-1 rounded-md border px-2 py-1 text-[11px] font-medium ${
                      fontSize === size
                        ? 'border-foreground bg-secondary text-foreground'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {size === 'sm' ? 'Small' : size === 'md' ? 'Medium' : 'Large'}
                  </button>
                ))}
              </div>
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
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden px-6 py-3">
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="Title"
          className="w-full bg-transparent text-3xl font-serif-display font-semibold text-foreground placeholder:text-muted-foreground outline-none mb-2"
        />
        <p className="text-sm font-medium text-muted-foreground mb-4">
          {createdDate} • {createdTime} • {wordCount} words
          {noteType === 'checklist' && (
            <span className="ml-2 text-xs text-muted-foreground/90">
              • {checklistProgress.completed}/{checklistProgress.total} done
            </span>
          )}
          {hasMeaningfulContent && (
            <span className="ml-2 inline-flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  saveState === 'pending' ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              <span className="text-xs text-muted-foreground/90">
                {saveState === 'pending' ? 'Saving...' : 'Saved'}
              </span>
            </span>
          )}
        </p>
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => handleNoteTypeChange('text')}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
              noteType === 'text'
                ? 'border-foreground bg-secondary text-foreground'
                : 'border-border text-muted-foreground'
            }`}
          >
            <AlignLeft size={14} />
            Text
          </button>
          <button
            onClick={() => handleNoteTypeChange('checklist')}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
              noteType === 'checklist'
                ? 'border-foreground bg-secondary text-foreground'
                : 'border-border text-muted-foreground'
            }`}
          >
            <ListTodo size={14} />
            Checklist
          </button>
        </div>
        {noteType === 'checklist' ? (
          <div className="flex-1 overflow-y-auto overscroll-contain pb-2">
            <div className="space-y-3">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <button
                    onClick={() => handleChecklistItemToggle(item.id)}
                    className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label={item.checked ? 'Mark item incomplete' : 'Mark item complete'}
                    title={item.checked ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {item.checked ? <CheckSquare2 size={20} className="text-foreground" /> : <Square size={20} />}
                  </button>
                  <input
                    value={item.text}
                    onChange={(event) => handleChecklistItemChange(item.id, event.target.value)}
                    onKeyDown={(event) => handleChecklistKeyDown(event, item)}
                    placeholder="List item"
                    className={`min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground ${
                      item.checked ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                  />
                  <button
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label="Remove item"
                    title="Remove item"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => handleAddChecklistItem()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Plus size={16} />
              Add item
            </button>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing..."
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none resize-none flex-1 leading-[1.4] pb-2 overflow-y-auto overscroll-contain"
            style={textareaStyles}
          />
        )}
      </div>
    </div>
  );
};

export default NoteEditor;
