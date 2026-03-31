import { create } from 'zustand';

interface ConfigState {
  encoding: string;
  updateConfig: (config: { encoding: string }) => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  encoding: 'UTF-8',
  updateConfig: (config) => set((state) => ({ ...state, ...config })),
}));
