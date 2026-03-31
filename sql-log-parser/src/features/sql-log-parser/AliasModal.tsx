import React, { useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialValue: string;
  onSave: (alias: string) => void;
}

export function AliasModal({ isOpen, onClose, initialValue, onSave }: Props) {
  const [alias, setAlias] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setAlias(initialValue);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(alias);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="w-96 rounded shadow-lg p-4"
        style={{ backgroundColor: '#252526', border: '1px solid #454545', color: '#D4D4D4' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 text-white">Set File Alias</h2>
        <input
          autoFocus
          className="w-full px-3 py-2 mb-4 rounded border focus:outline-none focus:border-blue-500"
          style={{ backgroundColor: '#3C3C3C', borderColor: '#454545', color: '#D4D4D4' }}
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter alias"
        />
        <div className="flex justify-end space-x-2">
          <button 
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white transition-colors"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
