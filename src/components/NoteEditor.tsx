import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MoreHorizontal, Share } from 'lucide-react';

interface NoteEditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave: (title: string, content: string) => void;
  onBack: () => void;
}

const NoteEditor = ({ initialTitle = '', initialContent = '', onSave, onBack }: NoteEditorProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  const handleBack = () => {
    if (title.trim() || content.trim()) {
      onSave(title || 'Untitled', content);
    }
    onBack();
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={handleBack} className="p-2 -ml-2">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div className="flex gap-2">
          <button className="p-2"><Share size={18} className="text-muted-foreground" /></button>
          <button className="p-2"><MoreHorizontal size={18} className="text-muted-foreground" /></button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full bg-transparent text-2xl font-serif-display font-semibold text-foreground placeholder:text-muted-foreground outline-none mb-4"
        />
        <textarea
          ref={contentRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Start writing..."
          className="w-full bg-transparent text-base text-foreground/80 placeholder:text-muted-foreground outline-none resize-none min-h-[60vh] leading-relaxed"
        />
      </div>

      {/* Bottom bar */}
      <div className="px-5 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {content.split(/\s+/).filter(Boolean).length} words
        </p>
      </div>
    </div>
  );
};

export default NoteEditor;
