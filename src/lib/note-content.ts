import type { Note } from '@/lib/store';

export const NOTE_IMAGE_BREAK_MARKER = '\n[[PRNOTE_IMAGE_BREAK]]\n';
export const NOTE_IMAGE_MARKER_PREFIX = '[[PRNOTE_IMAGE:';
export const NOTE_IMAGE_MARKER_SUFFIX = ']]';

const NOTE_IMAGE_MARKER_REGEX = /\[\[PRNOTE_IMAGE:([^\]\n]+)\]\]/g;
const NOTE_LEGACY_BREAK_REGEX = /\n\[\[PRNOTE_IMAGE_BREAK\]\]\n/g;

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export type NoteContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; imageId: string }
  | { type: 'legacy-break' };

export function buildNoteImageMarker(imageId: string) {
  return `${NOTE_IMAGE_MARKER_PREFIX}${imageId}${NOTE_IMAGE_MARKER_SUFFIX}`;
}

export function parseNoteContentBlocks(content: string): NoteContentBlock[] {
  const blocks: NoteContentBlock[] = [];
  let lastIndex = 0;

  const tokenRegex = /(\[\[PRNOTE_IMAGE:([^\]\n]+)\]\]|\n\[\[PRNOTE_IMAGE_BREAK\]\]\n)/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index);
    if (before) {
      blocks.push({ type: 'text', text: before });
    }

    if (match[0] === NOTE_IMAGE_BREAK_MARKER) {
      blocks.push({ type: 'legacy-break' });
    } else {
      blocks.push({ type: 'image', imageId: match[2] });
    }
    lastIndex = match.index + match[0].length;
  }

  const tail = content.slice(lastIndex);
  if (tail) {
    blocks.push({ type: 'text', text: tail });
  }

  if (blocks.length === 0) {
    return [{ type: 'text', text: content }];
  }

  return blocks;
}

export function buildNoteContentFromBlocks(blocks: NoteContentBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === 'text') {
        return block.text;
      }

      if (block.type === 'legacy-break') {
        return NOTE_IMAGE_BREAK_MARKER;
      }

      return buildNoteImageMarker(block.imageId);
    })
    .join('');
}

export function insertImageMarkersAtCursor(content: string, cursorIndex: number, imageIds: string[]) {
  const before = content.slice(0, cursorIndex);
  const after = content.slice(cursorIndex);
  const blocks: NoteContentBlock[] = [
    { type: 'text', text: before },
    ...imageIds.map((imageId) => ({ type: 'image' as const, imageId })),
    { type: 'text', text: after },
  ];

  return buildNoteContentFromBlocks(blocks);
}

export function removeImageMarkerFromContent(content: string, imageId: string) {
  const marker = buildNoteImageMarker(imageId);
  return content.split(marker).join('');
}

export function splitNoteTextSections(content: string) {
  const normalized = content.replace(NOTE_LEGACY_BREAK_REGEX, NOTE_IMAGE_BREAK_MARKER);
  const markerIndex = normalized.indexOf(NOTE_IMAGE_BREAK_MARKER);

  if (markerIndex === -1) {
    return { beforeImages: normalized, afterImages: '' };
  }

  return {
    beforeImages: normalized.slice(0, markerIndex),
    afterImages: normalized.slice(markerIndex + NOTE_IMAGE_BREAK_MARKER.length),
  };
}

export function joinNoteTextSections(beforeImages: string, afterImages: string) {
  if (!afterImages.trim()) {
    return beforeImages;
  }

  return `${beforeImages}${NOTE_IMAGE_BREAK_MARKER}${afterImages}`;
}

export function stripNoteTextMarkers(content: string) {
  return content
    .replace(NOTE_LEGACY_BREAK_REGEX, '\n\n')
    .replace(NOTE_IMAGE_MARKER_REGEX, '')
    .split(NOTE_IMAGE_BREAK_MARKER)
    .join('\n\n');
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

  return stripNoteTextMarkers(note.content);
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

  return stripNoteTextMarkers(note.content).trim();
}

export function getShareText(note: Pick<Note, 'title' | 'content' | 'checklistItems' | 'noteType'>): string {
  const title = note.title.trim() || 'Untitled';

  if (note.noteType === 'checklist') {
    const lines = note.checklistItems
      .map((item) => item.text.trim() ? `- [${item.checked ? 'x' : ' '}] ${item.text.trim()}` : null)
      .filter((line): line is string => Boolean(line));

    return [title, ...lines].join('\n').trim();
  }

  const content = stripNoteTextMarkers(note.content).trim();
  return content ? `${title}\n\n${content}` : title;
}

export function hasNoteContent(note: Pick<Note, 'title' | 'content' | 'checklistItems' | 'noteType'>): boolean {
  if (note.title.trim()) {
    return true;
  }

  if (note.noteType === 'checklist') {
    return note.checklistItems.some((item) => item.text.trim());
  }

  return Boolean(stripNoteTextMarkers(note.content).trim());
}

export function getNoteSearchText(note: Pick<Note, 'title' | 'content' | 'checklistItems' | 'noteType' | 'priority'>): string {
  const checklistText = note.checklistItems.map((item) => item.text).join(' ');
  const priorityText = note.priority !== 'none' ? `${note.priority} priority` : '';
  return [note.title, stripNoteTextMarkers(note.content), checklistText, priorityText].join(' ').toLowerCase();
}
