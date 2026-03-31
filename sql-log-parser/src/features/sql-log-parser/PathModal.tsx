import { useState, useEffect } from 'react';
import { X, FileCode } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpen: (path: string) => void;
}

export function PathModal({ isOpen, onClose, onOpen }: Props) {
  const [path, setPath] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPath('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!path.trim()) return;
    onOpen(path.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div 
        className="w-[500px] rounded shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: '#252526', border: '1px solid #454545', color: '#D4D4D4' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3C3C3D]">
          <div className="flex items-center text-white text-sm font-semibold uppercase tracking-wider">
            <FileCode size={16} className="mr-2" /> Open from Absolute Path
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#3C3C3C] rounded text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm text-gray-400">
            Paste the absolute path to your log file below.
          </div>
          <input
            autoFocus
            className="w-full px-3 py-2 rounded border focus:outline-none focus:border-blue-500 font-mono text-sm"
            style={{ backgroundColor: '#3C3C3C', borderColor: '#454545', color: '#D4D4D4' }}
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="D:\logs\app.log"
          />
        </div>

        <div className="flex justify-end items-center px-6 py-4 bg-[#1E1E1E] border-t border-[#3C3C3D] space-x-3">
          <button 
            className="px-4 py-1.5 text-sm hover:bg-[#3C3C3C] rounded transition-colors text-gray-300"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-6 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm shadow transition-colors font-medium"
            onClick={handleSubmit}
            disabled={!path.trim()}
          >
            Open File
          </button>
        </div>
      </div>
    </div>
  );
}
