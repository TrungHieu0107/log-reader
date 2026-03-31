import React, { useState, useEffect } from 'react';
import { useSqlLogStore, Filter } from './store';
import { Database, Clock, TerminalSquare } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterModal({ isOpen, onClose }: Props) {
  const addFilter = useSqlLogStore((state) => state.addFilter);
  const [type, setType] = useState<Filter['type']>('query');
  const [operator, setOperator] = useState<Filter['operator']>('contains');
  const [value, setValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setType('query');
      setOperator('contains');
      setValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!value.trim()) return;
    addFilter(type, operator, value);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="w-[450px] rounded shadow-lg p-5"
        style={{ backgroundColor: '#252526', border: '1px solid #454545', color: '#D4D4D4' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 text-white">Add Filter</h2>
        
        {/* Type Selector */}
        <div className="flex space-x-2 mb-4">
          <button 
            className={`flex-1 py-2 flex items-center justify-center rounded border transition-colors ${type === 'query' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#3C3C3C] border-[#454545] hover:bg-[#505050]'}`}
            onClick={() => setType('query')}
          >
            <Database size={16} className="mr-2" /> Query
          </button>
          <button 
            className={`flex-1 py-2 flex items-center justify-center rounded border transition-colors ${type === 'dao' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#3C3C3C] border-[#454545] hover:bg-[#505050]'}`}
            onClick={() => setType('dao')}
          >
            <TerminalSquare size={16} className="mr-2" /> DAO
          </button>
          <button 
            className={`flex-1 py-2 flex items-center justify-center rounded border transition-colors ${type === 'time' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#3C3C3C] border-[#454545] hover:bg-[#505050]'}`}
            onClick={() => setType('time')}
          >
            <Clock size={16} className="mr-2" /> Time
          </button>
        </div>

        {/* Operator Dropdown */}
        <div className="mb-4">
          <label className="block text-sm mb-1 text-gray-400">Operator</label>
          <select 
            className="w-full px-3 py-2 rounded border focus:outline-none focus:border-blue-500"
            style={{ backgroundColor: '#3C3C3C', borderColor: '#454545', color: '#D4D4D4' }}
            value={operator}
            onChange={(e) => setOperator(e.target.value as Filter['operator'])}
          >
            <option value="contains">Contains</option>
            <option value="not_contains">Does Not Contain</option>
            <option value="equals">Equals</option>
            <option value="not_equals">Does Not Equal</option>
            <option value="greater_than">Greater Than</option>
            <option value="less_than">Less Than</option>
          </select>
        </div>

        {/* Value Input */}
        <div className="mb-6">
          <label className="block text-sm mb-1 text-gray-400">Value</label>
          <input
            autoFocus
            className="w-full px-3 py-2 rounded border focus:outline-none focus:border-blue-500"
            style={{ backgroundColor: '#3C3C3C', borderColor: '#454545', color: '#D4D4D4' }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter search value"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button 
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white transition-colors"
            onClick={handleAdd}
          >
            Add Filter
          </button>
        </div>
      </div>
    </div>
  );
}
