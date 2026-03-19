import type { Note } from '@/lib/store';

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export function normalizeChecklistItems(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const candidate = item as Partial<ChecklistItem>;
      const text = typeof candidate.text === 'string' ? candidate.text : '';
      const checked = Boolean(candidate.checked);
      const id = typeof candidate.id === 'string' && candidate.id.trim()
        ? candidate.id
        : `item-${index}-${text.slice(0, 12) || 'check'}`;

      return { id, text, checked };
    })
    .filter((item): item is ChecklistItem => item !== null);
}

export function getNoteBodyText(note: Pick<Note, 'content' | 'checklistItems' | 'noteType'>): string {
  if (note.noteType === 'checklist') {
    return note.checklistItems
      .map((item) => item.text.trim())
      .filter(Boolean)
      .join(' ');
  }

  return note.content;
}

export function getNoteWordCount(note: Pick<Note, 'content' | 'checklistItems' | 'noteType'>): number {
  return getNoteBodyText(note).split(/\s+/).filter(Boolean).length;
}

export function getChecklistProgress(note: Pick<Note, 'noteType' | 'checklistItems'>) {
  const total = note.noteType === 'checklist' ? note.checklistItems.filter((item) => item.text.trim()).length : 0;
  const completed = note.noteType === 'checklist'
    ? note.checklistItems.filter((item) => item.text.trim() && item.checked).length
    : 0;

  return { total, completed };
}

export function getNotePreview(note: Pick<Note, 'content' | 'checklistItems' | 'noteType'>): string {
  if (note.noteType === 'checklist') {
    const meaningfulItems = note.checklistItems
      .map((item) => item.text.trim())
      .filter(Boolean);

    if (meaningfulItems.length === 0) {
      return '';
    }

    return meaningfulItems.slice(0, 3).join(' • ');
  }

  return note.content.trim();
}

export function getShareText(note: Pick<Note, 'title' | 'content' | 'checklistItems' | 'noteType'>): string {
  const title = note.title.trim() || 'Untitled';

  if (note.noteType === 'checklist') {
    const lines = note.checklistItems
      .map((item) => item.text.trim() ? `- [${item.checked ? 'x' : ' '}] ${item.text.trim()}` : null)
      .filter((line): line is string => Boolean(line));

    return [title, ...lines].join('\n').trim();
  }

  const content = note.content.trim();
  return content ? `${title}\n\n${content}` : title;
}

export function hasNoteContent(note: Pick<Note, 'title' | 'content' | 'checklistItems' | 'noteType'>): boolean {
  if (note.title.trim()) {
    return true;
  }

  if (note.noteType === 'checklist') {
    return note.checklistItems.some((item) => item.text.trim());
  }

  return Boolean(note.content.trim());
}

export function getNoteSearchText(note: Pick<Note, 'title' | 'content' | 'checklistItems' | 'noteType' | 'priority'>): string {
  const checklistText = note.checklistItems.map((item) => item.text).join(' ');
  const priorityText = note.priority !== 'none' ? `${note.priority} priority` : '';
  return [note.title, note.content, checklistText, priorityText].join(' ').toLowerCase();
}
