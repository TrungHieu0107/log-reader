import { create } from 'zustand';
import { LazyStore } from '@tauri-apps/plugin-store';

interface ConfigState {
  encoding: string;
  sqlSingleLine: boolean;
  trimSql: boolean;
  updateConfig: (config: Partial<ConfigState>) => void;
  loadConfig: () => Promise<void>;
}

const db = new LazyStore('config_settings.json');

export const useConfigStore = create<ConfigState>((set) => ({
  encoding: 'Auto',
  sqlSingleLine: false,
  trimSql: false,
  updateConfig: (config) => {
    set((state) => {
      const newState = { ...state, ...config };
      // Persist to store (skip functions)
      const { updateConfig, loadConfig, ...persistState } = newState;
      db.set('settings', persistState);
      db.save();
      return newState;
    });
  },
  loadConfig: async () => {
    const saved = await db.get<Partial<ConfigState>>('settings');
    if (saved) {
      set((state) => ({ ...state, ...saved }));
    }
  }
}));
