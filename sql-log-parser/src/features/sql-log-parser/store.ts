import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { LazyStore } from '@tauri-apps/plugin-store';
import { DaoSession, parseSqlLogs } from './parser';

export interface Filter {
  id: string;
  type: 'query' | 'dao' | 'time';
  operator: 'contains' | 'not_contains' | 'equals' | 'not_equals' | 'greater_than' | 'less_than';
  value: string;
}

export interface LogFile {
  path: string;
  alias?: string;
  sessions: DaoSession[];
}

interface SqlLogState {
  files: LogFile[];
  activeFilePath: string | null;
  filters: Filter[];
  sortOrder: 'asc' | 'desc';
  
  // Modals state
  isFilterModalOpen: boolean;
  selectedSql: string;
  isModalOpen: boolean;
  aliasModalProps: { isOpen: boolean; initialValue: string; onSave: (alias: string) => void; filePath: string } | null;

  // Actions
  addFile: (path: string, content: string) => void;
  removeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  setAlias: (path: string, alias: string) => void;
  clearAllFiles: () => void;
  
  addFilter: (type: Filter['type'], operator: Filter['operator'], value: string) => void;
  removeFilter: (id: string) => void;
  clearAllFilters: () => void;
  toggleSortOrder: () => void;

  setFilterModalOpen: (isOpen: boolean) => void;
  setFormatterModalOpen: (isOpen: boolean, sql?: string) => void;
  setAliasModalProps: (props: SqlLogState['aliasModalProps']) => void;

  reloadFiles: (encoding: string) => Promise<void>;
  reloadActiveFile: (encoding: string) => Promise<void>;
}

const db = new LazyStore('sql_log_files.json');

export const useSqlLogStore = create<SqlLogState>((set, get) => ({
  files: [],
  activeFilePath: null,
  filters: [],
  sortOrder: 'asc',

  isFilterModalOpen: false,
  selectedSql: '',
  isModalOpen: false,
  aliasModalProps: null,

  addFile: (path, content) => {
    const sessions = parseSqlLogs(content);
    set((state) => {
      const existing = state.files.find(f => f.path === path);
      let newFiles;
      if (existing) {
        newFiles = state.files.map(f => f.path === path ? { ...f, sessions } : f);
      } else {
        newFiles = [...state.files, { path, sessions }];
      }
      db.set('savedFiles', newFiles.map(f => ({ path: f.path, alias: f.alias })));
      db.save();
      return { files: newFiles, activeFilePath: path };
    });
  },
  removeFile: (path) => {
    set((state) => {
      const newFiles = state.files.filter(f => f.path !== path);
      db.set('savedFiles', newFiles.map(f => ({ path: f.path, alias: f.alias })));
      db.save();
      return { 
        files: newFiles, 
        activeFilePath: state.activeFilePath === path ? null : state.activeFilePath 
      };
    });
  },
  setActiveFile: (path) => set({ activeFilePath: path }),
  setAlias: (path, alias) => {
    set((state) => {
      const newFiles = state.files.map(f => f.path === path ? { ...f, alias } : f);
      db.set('savedFiles', newFiles.map(f => ({ path: f.path, alias: f.alias })));
      db.save();
      return { files: newFiles };
    });
  },
  clearAllFiles: () => {
    set({ files: [], activeFilePath: null });
    db.set('savedFiles', []);
    db.save();
  },

  addFilter: (type, operator, value) => {
    set((state) => ({
      filters: [...state.filters, { id: Date.now().toString(), type, operator, value }]
    }));
  },
  removeFilter: (id) => {
    set((state) => ({
      filters: state.filters.filter(f => f.id !== id)
    }));
  },
  clearAllFilters: () => set({ filters: [] }),
  toggleSortOrder: () => set((state) => ({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' })),

  setFilterModalOpen: (isOpen) => set({ isFilterModalOpen: isOpen }),
  setFormatterModalOpen: (isOpen, sql = '') => set({ isModalOpen: isOpen, selectedSql: sql }),
  setAliasModalProps: (props) => set({ aliasModalProps: props }),

  reloadFiles: async (encoding) => {
    const saved = await db.get<{path: string, alias?: string}[]>('savedFiles') || [];
    const loadedFiles: LogFile[] = [];
    for (const f of saved) {
      try {
        const res = await invoke<{content: string | null, is_binary: boolean, error: string | null}>('read_file_encoded', {
          path: f.path, encoding
        });
        if (res.content) {
          loadedFiles.push({ path: f.path, alias: f.alias, sessions: parseSqlLogs(res.content) });
        }
      } catch (err) {
        console.error("Failed to load: " + f.path);
      }
    }
    set({ files: loadedFiles, activeFilePath: loadedFiles.length > 0 ? loadedFiles[0].path : null });
  },

  reloadActiveFile: async (encoding) => {
    const state = get();
    if (!state.activeFilePath) return;
    try {
      const res = await invoke<{content: string | null, is_binary: boolean, error: string | null}>('read_file_encoded', {
        path: state.activeFilePath, encoding
      });
      if (res.content) {
         state.addFile(state.activeFilePath, res.content);
      }
    } catch (err) {
      console.error(err);
    }
  }
}));
