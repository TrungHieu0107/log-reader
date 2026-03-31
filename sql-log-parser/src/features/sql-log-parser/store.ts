import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { LazyStore } from '@tauri-apps/plugin-store';
import { DaoSession } from './parser';
import { useConfigStore } from '../../components/configStore';
import { FileReadResponse } from '../../types/tauri';

export type FilterType = 'query' | 'dao' | 'time' | 'time_range';

export type FilterOperator = 'contains' | 'not_contains' | 'equals' | 'not_equals' | 'greater_than' | 'less_than';

export interface Filter {
  id: string;
  type: FilterType;
  operator: FilterOperator;
  value: string;
  valueTo?: string;
  isRegex?: boolean;
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
  isParsing: boolean;
  
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
  setPageSize: (size: number) => void;
  setParsing: (isParsing: boolean) => void;
  setSessions: (path: string, sessions: DaoSession[]) => void;
  
  addFilter: (type: Filter['type'], operator: Filter['operator'], value: string, isRegex?: boolean, valueTo?: string) => void;
  removeFilter: (id: string) => void;
  clearAllFilters: () => void;
  toggleSortOrder: () => void;

  setFilterModalOpen: (isOpen: boolean) => void;
  setFormatterModalOpen: (isOpen: boolean, sql?: string) => void;
  setAliasModalProps: (props: SqlLogState['aliasModalProps']) => void;

  reloadFiles: (encoding: string) => Promise<void>;
  reloadActiveFile: (encoding: string) => Promise<void>;
  clearFileContent: (path: string) => Promise<void>;
}

const db = new LazyStore('sql_log_files.json');

export const useSqlLogStore = create<SqlLogState>((set, get) => ({
  files: [],
  activeFilePath: null,
  filters: [],
  sortOrder: 'desc',
  page: 1,
  pageSize: useConfigStore.getState().pageSize,
  isParsing: false,

  isFilterModalOpen: false,
  selectedSql: '',
  isModalOpen: false,
  aliasModalProps: null,

  addFile: (path: string, content: string, detectedEncoding?: string) => {
    const config = useConfigStore.getState();
    const { setParsing, setSessions } = get();

    setParsing(true);
    set((state) => {
      const existing = state.files.find(f => f.path === path);
      if (existing) return { activeFilePath: path, page: 1 };
      
      const newFiles = [...state.files, { path, sessions: [], detectedEncoding }];
      db.set('savedFiles', newFiles.map(f => ({ path: f.path, alias: f.alias })));
      db.save();
      return { files: newFiles, activeFilePath: path, page: 1 };
    });

    const worker = new Worker(new URL('./parser.worker.ts', import.meta.url), { type: 'module' });
    
    worker.postMessage({ 
      content, 
      options: { trimSql: config.trimSql },
      initialLimit: config.pageSize 
    });

    worker.onmessage = (e) => {
      const { type, sessions } = e.data;
      if (type === 'partial' || type === 'done') {
        setSessions(path, sessions);
      }
      if (type === 'done') {
        setParsing(false);
        worker.terminate();
      }
    };

    worker.onerror = (err) => {
      console.error("Worker error:", err);
      setParsing(false);
      worker.terminate();
    };
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
  setPageSize: (size: number) => set({ pageSize: size, page: 1 }),
  setParsing: (isParsing: boolean) => set({ isParsing }),
  setSessions: (path: string, sessions: DaoSession[]) => {
    set((state) => {
      const newFiles = state.files.map(f => f.path === path ? { ...f, sessions } : f);
      db.set('savedFiles', newFiles.map(f => ({ path: f.path, alias: f.alias })));
      db.save();
      return { files: newFiles };
    });
  },

  addFilter: (type, operator, value, isRegex, valueTo) => {
    set((state) => ({
      filters: [...state.filters, { 
        id: crypto.randomUUID(), 
        type, 
        operator, 
        value, 
        isRegex: isRegex ?? false,
        valueTo 
      }],
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
    set({ files: [], isParsing: true });

    for (const f of saved) {
      try {
        const res: FileReadResponse = await invoke('read_file_encoded', {
          path: f.path, encoding
        });
        if (res.content) {
          // Initialize empty record
          loadedFiles.push({ 
            path: f.path, 
            alias: f.alias, 
            sessions: [],
            detectedEncoding: res.detected_encoding || undefined
          });
          
          // Trigger worker for this file
          const config = useConfigStore.getState();
          const worker = new Worker(new URL('./parser.worker.ts', import.meta.url), { type: 'module' });
          worker.postMessage({ 
            content: res.content, 
            options: { trimSql: config.trimSql },
            initialLimit: config.pageSize 
          });
          worker.onmessage = (e) => {
            if (e.data.type === 'partial' || e.data.type === 'done') {
              set((state) => ({
                files: state.files.map(file => file.path === f.path ? { ...file, sessions: e.data.sessions } : file)
              }));
            }
            if (e.data.type === 'done') {
              worker.terminate();
              // Check if all workers are done (approximate)
              set((state) => ({ isParsing: state.files.some(file => file.sessions.length === 0) }));
            }
          };
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
      const res: FileReadResponse = await invoke('read_file_encoded', {
        path: state.activeFilePath, encoding
      });
      if (res.content) {
         state.addFile(state.activeFilePath, res.content, res.detected_encoding || undefined);
      }
    } catch (err) {
      console.error(err);
    }
  },

  clearFileContent: async (path: string) => {
    try {
      await invoke('clear_file_content', { path });
      set((state) => {
        const newFiles = state.files.map(f => f.path === path ? { ...f, sessions: [] } : f);
        return { 
          files: newFiles,
          page: state.activeFilePath === path ? 1 : state.page
        };
      });
    } catch (err) {
      console.error("Failed to clear file:", err);
      throw err;
    }
  }
}));

