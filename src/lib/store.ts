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

export interface FolderNode {
  name: string;
  children: FolderNode[];
}

export interface AppSettings {
  theme: ThemeMode;
  spellCheck: boolean;
  defaultFont: string;
  folders: FolderNode[];
}

const defaultSettings: AppSettings = {
  theme: 'light',
  spellCheck: true,
  defaultFont: 'Fraunces',
  folders: [],
};

// Utility functions for tree operations
export function findFolder(nodes: FolderNode[], path: string): FolderNode | null {
  const parts = path.split('/').filter(Boolean);
  let current = nodes;
  
  for (const part of parts) {
    const found = current.find(node => node.name === part);
    if (!found) return null;
    current = found.children;
  }
  
  return parts.length === 0 ? null : current.find(node => node.name === parts[parts.length - 1]) || null;
}

export function addFolderToTree(nodes: FolderNode[], path: string): FolderNode[] {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return nodes;
  
  const newNodes = JSON.parse(JSON.stringify(nodes)); // Deep clone
  let current = newNodes;
  
  for (let i = 0; i < parts.length - 1; i++) {
    let found = current.find((node: FolderNode) => node.name === parts[i]);
    if (!found) {
      found = { name: parts[i], children: [] };
      current.push(found);
    }
    current = found.children;
  }
  
  const lastPart = parts[parts.length - 1];
  if (!current.find((node: FolderNode) => node.name === lastPart)) {
    current.push({ name: lastPart, children: [] });
  }
  
  return newNodes;
}

export function removeFolderFromTree(nodes: FolderNode[], path: string): FolderNode[] {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return nodes;

  const newNodes = JSON.parse(JSON.stringify(nodes));
  let current = newNodes;

  for (let i = 0; i < parts.length - 1; i++) {
    const found = current.find((node: FolderNode) => node.name === parts[i]);
    if (!found) {
      return nodes;
    }
    current = found.children;
  }

  const lastPart = parts[parts.length - 1];
  const index = current.findIndex((node: FolderNode) => node.name === lastPart);
  if (index === -1) {
    return nodes;
  }

  current.splice(index, 1);
  return newNodes;
}

export function flattenFolderTree(nodes: FolderNode[], prefix = ''): string[] {
  const result: string[] = [];
  
  for (const node of nodes) {
    const fullPath = prefix ? `${prefix}/${node.name}` : node.name;
    result.push(fullPath);
    result.push(...flattenFolderTree(node.children, fullPath));
  }
  
  return result;
}

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

  const addNote = useCallback((title: string, content: string, folder: string | null = null) => {
    const note: Note = {
      id: crypto.randomUUID(),
      title, content,
      createdAt: Date.now(), updatedAt: Date.now(),
      pinned: false, favorite: false, archived: false, locked: false,
      color: null, tags: [], folder,
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
      let parsed = raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
      
      // Migrate old darkMode setting
      if ('darkMode' in parsed && !('theme' in parsed)) {
        parsed.theme = parsed.darkMode ? 'amoled' : 'light';
      }

      // Migrate removed "dark" theme to AMOLED
      if (parsed.theme === 'dark') {
        parsed.theme = 'amoled';
      }
      
      // Migrate flat folder array to tree structure
      if (Array.isArray(parsed.folders) && parsed.folders.length > 0 && typeof parsed.folders[0] === 'string') {
        const flatFolders = parsed.folders as string[];
        const tree: FolderNode[] = [];
        for (const folder of flatFolders) {
          const newTree = addFolderToTree(tree, folder);
          // Merge the new folder into the tree
          for (const node of newTree) {
            if (!tree.find(n => n.name === node.name)) {
              tree.push(node);
            }
          }
        }
        parsed.folders = tree;
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
