import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Share, Pin, Star } from 'lucide-react';

interface NoteEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialPinned?: boolean;
  initialFavorite?: boolean;
  initialCreatedAt?: number;
  onSave: (payload: { title: string; content: string; pinned: boolean; favorite: boolean; createdAt: number }) => void;
  onBack: () => void;
}

const NoteEditor = ({
  initialTitle = '',
  initialContent = '',
  initialPinned = false,
  initialFavorite = false,
  initialCreatedAt,
  onSave,
  onBack,
}: NoteEditorProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [pinned, setPinned] = useState(initialPinned);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [createdAt] = useState(initialCreatedAt ?? Date.now());
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

  const handleBack = () => {
    if (title.trim() || content.trim()) {
      onSave({
        title: title || 'Untitled',
        content,
        pinned,
        favorite,
        createdAt,
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
          className="w-full bg-transparent text-3xl font-serif-display font-semibold text-foreground placeholder:text-muted-foreground outline-none mb-8"
        />
        <p className="text-base font-semibold text-foreground mb-8">
          {createdDate} • {createdTime} • {wordCount} words
        </p>
        <textarea
          ref={contentRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Start writing..."
          className="w-full bg-transparent text-lg italic text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[60vh] leading-relaxed"
        />
      </div>

      <div className="safe-bottom border-t border-border" />
    </div>
  );
};

export default NoteEditor;
