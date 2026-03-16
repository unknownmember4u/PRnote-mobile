import { useState, useEffect, useCallback } from 'react';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  locked: boolean;
  color: string | null;
  tags: string[];
  folder: string | null;
}

const STORAGE_KEY = 'prnote-notes';
const ONBOARDED_KEY = 'prnote-onboarded';
const SETTINGS_KEY = 'prnote-settings';

export type ThemeMode = 'light' | 'dark' | 'amoled';

export interface AppSettings {
  theme: ThemeMode;
  spellCheck: boolean;
  defaultFont: string;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  spellCheck: true,
  defaultFont: 'Fraunces',
};

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);

  useEffect(() => { saveNotes(notes); }, [notes]);

  const addNote = useCallback((title: string, content: string) => {
    const note: Note = {
      id: crypto.randomUUID(),
      title, content,
      createdAt: Date.now(), updatedAt: Date.now(),
      pinned: false, favorite: false, archived: false, locked: false,
      color: null, tags: [], folder: null,
    };
    setNotes(prev => [note, ...prev]);
    return note;
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  return { notes, addNote, updateNote, deleteNote, setNotes };
}

export function useOnboarded() {
  const [done, setDone] = useState(() => localStorage.getItem(ONBOARDED_KEY) === 'true');
  const complete = () => { localStorage.setItem(ONBOARDED_KEY, 'true'); setDone(true); };
  return { done, complete };
}

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark', 'amoled');
  root.classList.add(theme);
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const parsed = raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
      // Migrate old darkMode setting
      if ('darkMode' in parsed && !('theme' in parsed)) {
        parsed.theme = parsed.darkMode ? 'dark' : 'light';
      }
      return parsed;
    } catch { return defaultSettings; }
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applyTheme(settings.theme);
  }, [settings]);

  // Apply theme on mount
  useEffect(() => {
    applyTheme(settings.theme);
  }, []);

  const update = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  return { settings, update };
}
