import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, Share as ShareIcon, Pin, Star, Type, CheckSquare2, Square, ListTodo, AlignLeft, Plus, X, ImagePlus } from 'lucide-react';
import type { ChecklistItem, NoteFont, NoteFontSize, NoteImage, NoteType } from '@/lib/store';
import { getChecklistProgress, getNoteWordCount, hasNoteContent, joinNoteTextSections, splitNoteTextSections } from '@/lib/note-content';
import NoteExportModal from './NoteExportModal';

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
  initialImages?: NoteImage[];
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
    images: NoteImage[];
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
  initialImages = [],
  initialPinned = false,
  initialFavorite = false,
  initialCreatedAt,
  initialFontFamily = 'playfair',
  initialFontSize = 'md',
  onSave,
  onBack,
}: NoteEditorProps) => {
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const topTextContentRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomTextContentRef = useRef<HTMLTextAreaElement | null>(null);
  const checklistFirstInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const initialTextSections = useMemo(() => splitNoteTextSections(initialContent), [initialContent]);
  const [contentBeforeImages, setContentBeforeImages] = useState(initialTextSections.beforeImages);
  const [contentAfterImages, setContentAfterImages] = useState(initialTextSections.afterImages);
  const [noteType, setNoteType] = useState<NoteType>(initialNoteType);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    initialChecklistItems.length > 0 ? initialChecklistItems : [{ id: crypto.randomUUID(), text: '', checked: false }],
  );
  const [images, setImages] = useState<NoteImage[]>(initialImages);
  const [pinned, setPinned] = useState(initialPinned);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [createdAt] = useState(initialCreatedAt ?? Date.now());
  const [fontFamily, setFontFamily] = useState<NoteFont>(initialFontFamily);
  const [fontSize, setFontSize] = useState<NoteFontSize>(initialFontSize);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'saved'>('idle');
  const lastSavedSnapshotRef = useRef('');
  const isNativeMobile = Capacitor.isNativePlatform() && ['android', 'ios'].includes(Capacitor.getPlatform());
  const content = useMemo(
    () => joinNoteTextSections(contentBeforeImages, contentAfterImages),
    [contentAfterImages, contentBeforeImages],
  );
  const shouldAutoFocusExistingNote = useMemo(
    () =>
      Boolean(
        initialTitle.trim() ||
        initialContent.trim() ||
        initialImages.length > 0 ||
        initialChecklistItems.some((item) => item.text.trim()),
      ),
    [initialChecklistItems, initialContent, initialImages.length, initialTitle],
  );

  useEffect(() => {
    if (!shouldAutoFocusExistingNote || isNativeMobile) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      if (noteType === 'checklist') {
        checklistFirstInputRef.current?.focus();
        return;
      }

      const focusTarget = images.length > 0
        ? bottomTextContentRef.current ?? topTextContentRef.current
        : topTextContentRef.current;
      focusTarget?.focus();
      const length = focusTarget?.value.length ?? 0;
      focusTarget?.setSelectionRange(length, length);
    }, 10);

    return () => window.clearTimeout(focusTimer);
  }, [images.length, isNativeMobile, noteType, shouldAutoFocusExistingNote]);

  useEffect(() => {
    if (noteType !== 'text') {
      return;
    }

    [topTextContentRef.current, bottomTextContentRef.current].forEach((textarea) => {
      if (!textarea) {
        return;
      }

      textarea.style.height = '0px';
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  }, [contentAfterImages, contentBeforeImages, fontFamily, fontSize, noteType]);

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
    images: images.map((image) => ({ ...image })),
    pinned,
    favorite,
    createdAt,
    fontFamily,
    fontSize,
  }), [title, content, noteType, checklistItems, images, pinned, favorite, createdAt, fontFamily, fontSize]);

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

  const focusTextCursorAtEnd = useCallback((section: 'before' | 'after' = 'after') => {
    const target = section === 'before' || !images.length
      ? topTextContentRef.current
      : bottomTextContentRef.current ?? topTextContentRef.current;

    if (!target) {
      return;
    }

    target.focus();
    const length = target.value.length;
    target.setSelectionRange(length, length);
  }, [images.length]);

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

  const handleContentBeforeImagesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContentBeforeImages(e.target.value);
  }, []);

  const handleContentAfterImagesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContentAfterImages(e.target.value);
  }, []);

  const moveImageBlockToCursor = useCallback(() => {
    if (noteType !== 'text') {
      return;
    }

    const activeElement = document.activeElement;

    if (activeElement === topTextContentRef.current && topTextContentRef.current) {
      const cursorPosition = topTextContentRef.current.selectionStart ?? contentBeforeImages.length;
      const nextBefore = contentBeforeImages.slice(0, cursorPosition);
      const movedTail = contentBeforeImages.slice(cursorPosition);
      setContentBeforeImages(nextBefore);
      setContentAfterImages(`${movedTail}${contentAfterImages}`);
      return;
    }

    if (activeElement === bottomTextContentRef.current && bottomTextContentRef.current) {
      const cursorPosition = bottomTextContentRef.current.selectionStart ?? contentAfterImages.length;
      const movedHead = contentAfterImages.slice(0, cursorPosition);
      const nextAfter = contentAfterImages.slice(cursorPosition);
      setContentBeforeImages(`${contentBeforeImages}${movedHead}`);
      setContentAfterImages(nextAfter);
    }
  }, [contentAfterImages, contentBeforeImages, noteType]);

  const fileToNoteImage = useCallback((file: File) => new Promise<NoteImage>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        reject(new Error('Could not read image.'));
        return;
      }

      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: file.type,
        dataUrl: result,
      });
    };
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  }), []);

  const appendImages = useCallback(async (files: File[]) => {
    const supported = files.filter((file) => ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type));
    if (supported.length === 0) {
      return;
    }

    moveImageBlockToCursor();
    const nextImages = await Promise.all(supported.map((file) => fileToNoteImage(file)));
    setImages((current) => [...current, ...nextImages]);
    window.setTimeout(() => {
      focusTextCursorAtEnd();
    }, 0);
  }, [fileToNoteImage, focusTextCursorAtEnd, moveImageBlockToCursor]);

  const handleImageFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    await appendImages(files);
    event.target.value = '';
  }, [appendImages]);

  const handlePaste = useCallback(async (event: React.ClipboardEvent<HTMLElement>) => {
    const clipboardFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (clipboardFiles.length === 0) {
      return;
    }

    event.preventDefault();
    await appendImages(clipboardFiles);
  }, [appendImages]);

  const handleRemoveImage = useCallback((id: string) => {
    setImages((current) => current.filter((image) => image.id !== id));
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

  const resizeContentFont = useCallback((direction: 'increase' | 'decrease') => {
    setFontSize((current) => {
      const order: NoteFontSize[] = ['sm', 'md', 'lg'];
      const currentIndex = order.indexOf(current);
      const nextIndex = direction === 'increase'
        ? Math.min(order.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
      return order[nextIndex];
    });
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

  const focusNoteContent = useCallback(() => {
    if (noteType === 'checklist') {
      checklistFirstInputRef.current?.focus();
      return;
    }

    focusTextCursorAtEnd(images.length > 0 ? 'after' : 'before');
  }, [focusTextCursorAtEnd, images.length, noteType]);

  const handleTitleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Tab') {
      return;
    }

    event.preventDefault();
    focusNoteContent();
  }, [focusNoteContent]);

  const handleContentWheel = useCallback((event: React.WheelEvent<HTMLElement>) => {
    const activeElement = document.activeElement;
    const currentTarget = event.currentTarget;

    if (!currentTarget.contains(activeElement)) {
      return;
    }

    event.preventDefault();
    resizeContentFont(event.deltaY < 0 ? 'increase' : 'decrease');
  }, [resizeContentFont]);

  return (
    <div className="fixed inset-0 app-shell z-50 flex flex-col overflow-hidden bg-background" onPaste={handlePaste}>
      {/* Header with Top Icons and Font Selector Menu */}
      <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-border bg-background px-6 py-6 md:px-7 md:py-7">
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
            <button onClick={() => setShowExportModal(true)} className="p-2" aria-label="Share note" title="Share note">
              <ShareIcon size={20} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              className="p-2"
              aria-label="Add image"
              title="Add image"
            >
              <ImagePlus size={20} className="text-muted-foreground" />
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
          ref={imageInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={handleImageFileChange}
        />
        <input
          ref={titleInputRef}
          value={title}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
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
                    ref={item.id === checklistItems[0]?.id ? checklistFirstInputRef : null}
                    value={item.text}
                    onChange={(event) => handleChecklistItemChange(item.id, event.target.value)}
                    onKeyDown={(event) => handleChecklistKeyDown(event, item)}
                    onWheel={handleContentWheel}
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
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-2"
                    onClick={focusTextCursorAtEnd}
                  >
                    <img src={image.dataUrl} alt={image.name} className="max-h-[32rem] w-full rounded-xl object-contain" />
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveImage(image.id);
                      }}
                      className="absolute right-3 top-3 rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur-sm"
                      aria-label={`Remove ${image.name}`}
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overscroll-contain pb-2">
            <textarea
              ref={topTextContentRef}
              value={contentBeforeImages}
              onChange={handleContentBeforeImagesChange}
              onWheel={handleContentWheel}
              placeholder="Start writing..."
              className="w-full min-h-[3.5rem] overflow-hidden bg-transparent text-foreground placeholder:text-muted-foreground outline-none resize-none leading-[1.4]"
              style={textareaStyles}
            />
            {images.length > 0 && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-2"
                      onClick={() => focusTextCursorAtEnd('after')}
                    >
                      <img src={image.dataUrl} alt={image.name} className="max-h-[32rem] w-full rounded-xl object-contain" />
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveImage(image.id);
                        }}
                        className="absolute right-3 top-3 rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur-sm"
                        aria-label={`Remove ${image.name}`}
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <textarea
                  ref={bottomTextContentRef}
                  value={contentAfterImages}
                  onChange={handleContentAfterImagesChange}
                  onWheel={handleContentWheel}
                  placeholder="Continue writing..."
                  className="w-full min-h-[3.5rem] overflow-hidden bg-transparent text-foreground placeholder:text-muted-foreground outline-none resize-none leading-[1.4]"
                  style={textareaStyles}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <NoteExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        note={{
          title: title.trim() || 'Untitled',
          content,
          checklistItems,
          noteType,
        }}
      />
    </div>
  );
};

export default NoteEditor;
