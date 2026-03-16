import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Star, Clock, Plus, Folder, Tag } from 'lucide-react';
import type { Note } from '@/lib/store';

interface FoldersViewProps {
  notes: Note[];
  onBack: () => void;
}

const FoldersView = ({ notes, onBack }: FoldersViewProps) => {
  const stats = useMemo(() => ({
    all: notes.filter(n => !n.archived).length,
    favorites: notes.filter(n => n.favorite).length,
    recent: notes.filter(n => Date.now() - n.updatedAt < 7 * 24 * 60 * 60 * 1000).length,
  }), [notes]);

  const folders = useMemo(() => {
    const map = new Map<string, number>();
    notes.forEach(n => {
      if (n.folder) map.set(n.folder, (map.get(n.folder) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [notes]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => n.tags.forEach(t => set.add(t)));
    return Array.from(set);
  }, [notes]);

  const smartFolders = [
    { icon: FileText, label: 'All Notes', count: stats.all },
    { icon: Star, label: 'Favorites', count: stats.favorites },
    { icon: Clock, label: 'Recent Edits', count: stats.recent },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-50 flex flex-col"
    >
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-1"><ArrowLeft size={20} className="text-foreground" /></button>
          <h1 className="font-serif-display text-xl font-semibold text-foreground">Organize</h1>
        </div>

        <p className="text-xs text-muted-foreground font-medium mb-3">Smart Folders</p>
        <div className="space-y-1 mb-6">
          {smartFolders.map(f => (
            <div key={f.label} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <f.icon size={18} className="text-muted-foreground" />
                <span className="text-sm text-foreground">{f.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{f.count}</span>
            </div>
          ))}
        </div>

        {folders.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground font-medium mb-3">My Folders</p>
            <div className="space-y-1 mb-6">
              {folders.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <Folder size={18} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tags.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground font-medium mb-3">Tags</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {tags.map(tag => (
                <span key={tag} className="px-3 py-1.5 rounded-full bg-secondary text-xs text-muted-foreground">
                  <Tag size={10} className="inline mr-1" />{tag}
                </span>
              ))}
            </div>
          </>
        )}

        <button className="w-full py-3 rounded-xl border border-border text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Plus size={16} />
          New Folder
        </button>
      </div>
    </motion.div>
  );
};

export default FoldersView;
