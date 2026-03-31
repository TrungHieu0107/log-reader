import React, { useState, useEffect } from 'react';
import { useSqlLogStore, Filter } from './store';
import { Database, Clock, TerminalSquare, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterModal({ isOpen, onClose }: Props) {
  const addFilter = useSqlLogStore((state) => state.addFilter);
  const [type, setType] = useState<Filter['type']>('query');
  const [operator, setOperator] = useState<Filter['operator']>('contains');
  const [value, setValue] = useState('');
  
  // Feature 1: Regex Mode
  const [isRegexMode, setIsRegexMode] = useState(false);
  const [regexError, setRegexError] = useState<string | null>(null);

  // Feature 2: Time Range
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');

  // Validate Regex
  useEffect(() => {
    if (!isRegexMode || !value || type !== 'query') {
      setRegexError(null);
      return;
    }
    try {
      new RegExp(value);
      setRegexError(null);
    } catch (e: any) {
      setRegexError(e.message);
    }
  }, [value, isRegexMode, type]);

  useEffect(() => {
    if (!isOpen) {
      setValue('');
      setTimeFrom('');
      setTimeTo('');
      setIsRegexMode(false);
      setRegexError(null);
      setType('query');
      setOperator('contains');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (type === 'time_range') {
      if (!timeFrom || !timeTo) return;
      if (timeFrom > timeTo) return;
      addFilter('time_range', 'contains', timeFrom, false, timeTo);
      onClose();
      return;
    }

    if (!value.trim()) return;
    if (isRegexMode && regexError) return;
    
    addFilter(type, operator, value.trim(), isRegexMode);
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
        className="w-[450px] rounded shadow-lg p-5 animate-in fade-in zoom-in duration-200"
        style={{ backgroundColor: '#252526', border: '1px solid #454545', color: '#D4D4D4' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 text-white">Add Filter</h2>
        
        {/* Type Selector */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button 
            className={`py-2 px-3 flex items-center justify-center rounded border text-xs transition-all ${type === 'query' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-[#3C3C3C] border-[#454545] hover:bg-[#505050]'}`}
            onClick={() => setType('query')}
          >
            <Database size={14} className="mr-2" /> Query
          </button>
          <button 
            className={`py-2 px-3 flex items-center justify-center rounded border text-xs transition-all ${type === 'dao' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-[#3C3C3C] border-[#454545] hover:bg-[#505050]'}`}
            onClick={() => setType('dao')}
          >
            <TerminalSquare size={14} className="mr-2" /> DAO
          </button>
          <button 
            className={`py-2 px-3 flex items-center justify-center rounded border text-xs transition-all ${type === 'time' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-[#3C3C3C] border-[#454545] hover:bg-[#505050]'}`}
            onClick={() => setType('time')}
          >
            <Clock size={14} className="mr-2" /> Time
          </button>
          <button 
            className={`py-2 px-3 flex items-center justify-center rounded border text-xs transition-all ${type === 'time_range' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-[#3C3C3C] border-[#454545] hover:bg-[#505050]'}`}
            onClick={() => setType('time_range')}
          >
            <Clock size={14} className="mr-2" /> Range
          </button>
        </div>

        {/* Dynamic Inputs Based on Type */}
        {type === 'time_range' ? (
          <div className="flex flex-col gap-2 mb-6">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Time Range (From → To)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                step="1"
                value={timeFrom}
                onChange={(e) => setTimeFrom(e.target.value)}
                className="flex-1 bg-[#1e1e1e] border border-[#333] text-gray-200 px-3 py-2 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
              />
              <span className="text-gray-500 text-xs font-bold">to</span>
              <input
                type="time"
                step="1"
                value={timeTo}
                onChange={(e) => setTimeTo(e.target.value)}
                className="flex-1 bg-[#1e1e1e] border border-[#333] text-gray-200 px-3 py-2 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
              />
            </div>
            {timeFrom && timeTo && timeFrom > timeTo && (
              <div className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                <X size={10} /> Start time must be before end time
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Operator Dropdown */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Operator</label>
              <select 
                className="w-full px-3 py-2 rounded border focus:outline-none focus:border-blue-500 bg-[#3C3C3C] border-[#454545] text-sm"
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
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Value</label>
              <input
                autoFocus
                className="w-full px-3 py-2 rounded border focus:outline-none focus:border-blue-500 bg-[#3C3C3C] border-[#454545] text-sm"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRegexMode ? "e.g. SELECT.+FROM" : "Enter search value"}
              />
            </div>

            {/* Feature 1: Regex Validation UI */}
            {type === 'query' && (
              <div className="flex flex-col gap-2 mb-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isRegexMode}
                    onChange={(e) => {
                      setIsRegexMode(e.target.checked);
                      setRegexError(null);
                    }}
                    className="w-3.5 h-3.5 accent-blue-500"
                  />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Regex mode
                  </span>
                  <span className="text-[10px] text-gray-600 italic normal-case">
                    (Case-insensitive)
                  </span>
                </label>

                {isRegexMode && regexError && (
                  <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/40 rounded px-3 py-2">
                    <span className="text-red-400 text-[10px] font-mono break-all">{regexError}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex justify-end space-x-2 pt-2 border-t border-[#3C3C3D]">
          <button 
            className="px-4 py-2 bg-[#3C3C3C] hover:bg-[#4D4D4D] rounded text-sm text-white transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 rounded text-sm text-white transition-colors font-medium"
            onClick={handleAdd}
            disabled={
              (type === 'time_range' && (!timeFrom || !timeTo || timeFrom > timeTo)) ||
              (type !== 'time_range' && !value.trim()) ||
              (isRegexMode && !!regexError)
            }
          >
            Add Filter
          </button>
        </div>
      </div>
    </div>
  );
}
