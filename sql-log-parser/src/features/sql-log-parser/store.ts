import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { LazyStore } from '@tauri-apps/plugin-store';
import { DaoSession, parseSqlLogs } from './parser';
import { useConfigStore } from '../../components/configStore';

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
  detectedEncoding?: string;
}

interface SqlLogState {
  files: LogFile[];
  activeFilePath: string | null;
  filters: Filter[];
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
  
  // Modals state
  isFilterModalOpen: boolean;
  selectedSql: string;
  isModalOpen: boolean;
  aliasModalProps: { isOpen: boolean; initialValue: string; onSave: (alias: string) => void; filePath: string } | null;

  // Actions
  addFile: (path: string, content: string, detectedEncoding?: string) => void;
  removeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  setAlias: (path: string, alias: string) => void;
  clearAllFiles: () => void;
  setPage: (page: number) => void;
  
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
  sortOrder: 'desc',
  page: 1,
  pageSize: 100,

  isFilterModalOpen: false,
  selectedSql: '',
  isModalOpen: false,
  aliasModalProps: null,

  addFile: (path: string, content: string, detectedEncoding?: string) => {
    const trimEnabled = useConfigStore.getState().trimSql;
    const sessions = parseSqlLogs(content, { trimSql: trimEnabled });
    set((state) => {
      const existing = state.files.find(f => f.path === path);
      let newFiles: LogFile[];
      if (existing) {
        newFiles = state.files.map(f => f.path === path ? { ...f, sessions, detectedEncoding } : f);
      } else {
        newFiles = [...state.files, { path, sessions, detectedEncoding }];
      }
      db.set('savedFiles', newFiles.map(f => ({ path: f.path, alias: f.alias })));
      db.save();
      return { files: newFiles, activeFilePath: path, page: 1 };
    });
  },
  removeFile: (path: string) => {
    set((state) => {
      const newFiles = state.files.filter(f => f.path !== path);
      db.set('savedFiles', newFiles.map(f => ({ path: f.path, alias: f.alias })));
      db.save();
      return { 
        files: newFiles, 
        activeFilePath: state.activeFilePath === path ? null : state.activeFilePath,
        page: 1
      };
    });
  },
  setActiveFile: (path: string) => set({ activeFilePath: path, page: 1 }),
  setAlias: (path: string, alias: string) => {
    set((state) => {
      const newFiles = state.files.map(f => f.path === path ? { ...f, alias } : f);
      db.set('savedFiles', newFiles.map(f => ({ path: f.path, alias: f.alias })));
      db.save();
      return { files: newFiles };
    });
  },
  clearAllFiles: () => {
    set({ files: [], activeFilePath: null, page: 1 });
    db.set('savedFiles', []);
    db.save();
  },

  setPage: (page: number) => set({ page }),

  addFilter: (type: Filter['type'], operator: Filter['operator'], value: string) => {
    set((state) => ({
      filters: [...state.filters, { id: Date.now().toString(), type, operator, value }],
      page: 1
    }));
  },
  removeFilter: (id: string) => {
    set((state) => ({
      filters: state.filters.filter(f => f.id !== id),
      page: 1
    }));
  },
  clearAllFilters: () => set({ filters: [], page: 1 }),
  toggleSortOrder: () => set((state) => ({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc', page: 1 })),

  setFilterModalOpen: (isOpen: boolean) => set({ isFilterModalOpen: isOpen }),
  setFormatterModalOpen: (isOpen: boolean, sql: string = '') => set({ isModalOpen: isOpen, selectedSql: sql }),
  setAliasModalProps: (props: SqlLogState['aliasModalProps']) => set({ aliasModalProps: props }),

  reloadFiles: async (encoding: string) => {
    const saved = await db.get<{path: string, alias?: string}[]>('savedFiles') || [];
    const loadedFiles: LogFile[] = [];
    const trimEnabled = useConfigStore.getState().trimSql;
    for (const f of saved) {
      try {
        const res = await invoke<{content: string | null, is_binary: boolean, detected_encoding?: string, error: string | null}>('read_file_encoded', {
          path: f.path, encoding
        });
        if (res.content) {
          loadedFiles.push({ 
            path: f.path, 
            alias: f.alias, 
            sessions: parseSqlLogs(res.content, { trimSql: trimEnabled }),
            detectedEncoding: res.detected_encoding
          });
        }
      } catch (err) {
        console.error("Failed to load: " + f.path);
      }
    }
    set({ files: loadedFiles, activeFilePath: loadedFiles.length > 0 ? loadedFiles[0].path : null });
  },

  reloadActiveFile: async (encoding: string) => {
    const state = get();
    if (!state.activeFilePath) return;
    try {
      const res = await invoke<{content: string | null, is_binary: boolean, detected_encoding?: string, error: string | null}>('read_file_encoded', {
        path: state.activeFilePath, encoding
      });
      if (res.content) {
         state.addFile(state.activeFilePath, res.content, res.detected_encoding);
      }
    } catch (err) {
      console.error(err);
    }
  }
}));
