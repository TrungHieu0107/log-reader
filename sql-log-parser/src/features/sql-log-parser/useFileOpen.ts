import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FileReadResponse } from '../../types/tauri';

export function useFileOpen(
  encoding: string,
  addFile: (path: string, content: string, detectedEncoding?: string) => void,
  onError: (msg: string) => void
) {
  return async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Log Files', extensions: ['log', 'txt', '*'] }],
      });
      
      if (typeof selected !== 'string') return;

      const response: FileReadResponse = await invoke('read_file_encoded', { 
        path: selected, 
        encoding 
      });

      if (response.error) {
        onError(`Failed to read file: ${response.error}`);
        return;
      }
      
      if (response.is_binary) {
        onError('This file appears to be binary and cannot be parsed as a log file.');
        return;
      }
      
      if (!response.content) {
        onError('File is empty or could not be read.');
        return;
      }

      addFile(selected, response.content, response.detected_encoding || undefined);
    } catch (err) {
      console.error(err);
      onError(`An unexpected error occurred: ${err}`);
    }
  };
}
