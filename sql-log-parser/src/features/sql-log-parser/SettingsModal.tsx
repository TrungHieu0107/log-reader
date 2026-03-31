import { useState, useEffect } from 'react';
import { useConfigStore } from '../../components/configStore';
import { useSqlLogStore } from './store';
import { Settings, X, Type, LayoutList, CheckCircle2, HelpCircle, Info, Keyboard } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: Props) {
  const config = useConfigStore();
  const store = useSqlLogStore();

  const [localSingleLine, setLocalSingleLine] = useState(config.sqlSingleLine);
  const [localTrim, setLocalTrim] = useState(config.trimSql);
  const [localPageSize, setLocalPageSize] = useState(config.pageSize);

  useEffect(() => {
    if (isOpen) {
      setLocalSingleLine(config.sqlSingleLine);
      setLocalTrim(config.trimSql);
      setLocalPageSize(config.pageSize);
    }
  }, [isOpen, config.sqlSingleLine, config.trimSql, config.pageSize]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const isTrimChanged = localTrim !== config.trimSql;
    
    config.updateConfig({
      sqlSingleLine: localSingleLine,
      trimSql: localTrim,
      pageSize: localPageSize
    });

    store.setPageSize(localPageSize);

    // If trimming was toggled, we should re-parse the active file immediately
    if (isTrimChanged && store.activeFilePath) {
       await store.reloadActiveFile(config.encoding);
    }

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div 
        className="w-[850px] rounded shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        style={{ backgroundColor: '#252526', border: '1px solid #454545', color: '#D4D4D4' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3C3C3D]">
          <div className="flex items-center text-white text-sm font-semibold uppercase tracking-wider">
            <Settings size={16} className="mr-2" /> Settings & Guide
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#3C3C3C] rounded text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-[1.2fr_1fr] overflow-hidden">
          {/* LEFT COLUMN: SETTINGS */}
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar border-r border-[#3C3C3D]">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Configuration</div>
            
            {/* SQL Display Mode */}
            <div className="space-y-3">
               <div className="flex items-center text-gray-300 font-medium">
                 <LayoutList size={16} className="mr-2" /> Application Display
               </div>
               <div className="bg-[#1E1E1E] p-4 rounded border border-[#3C3C3D] flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-200">Single Line SQL Mode</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Show query in one row with horizontal scroll</div>
                  </div>
                  <button 
                    onClick={() => setLocalSingleLine(!localSingleLine)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${localSingleLine ? 'bg-blue-600' : 'bg-[#3C3C3C]'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${localSingleLine ? 'translate-x-6' : ''}`} />
                  </button>
               </div>
            </div>

            {/* Pagination Settings */}
            <div className="space-y-3">
               <div className="flex items-center text-gray-300 font-medium">
                 <LayoutList size={16} className="mr-2" /> Pagination & Performance
               </div>
               <div className="bg-[#1E1E1E] p-4 rounded border border-[#3C3C3D] flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-200">Records per page</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Adjust for optimal responsiveness</div>
                  </div>
                  <select 
                    className="bg-[#3C3C3C] border border-[#454545] rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 ring-blue-500"
                    value={localPageSize}
                    onChange={(e) => setLocalPageSize(Number(e.target.value))}
                  >
                    {[50, 100, 200, 500, 1000].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
               </div>
            </div>

            {/* SQL Cleaning Options */}
            <div className="space-y-3">
               <div className="flex items-center text-gray-300 font-medium">
                 <Type size={16} className="mr-2" /> SQL Processing
               </div>
               <div className="bg-[#1E1E1E] p-4 rounded border border-[#3C3C3D] flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-200">Smart Whitespace Trimming</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Collapse extra spaces outside string literals</div>
                  </div>
                  <button 
                    onClick={() => setLocalTrim(!localTrim)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${localTrim ? 'bg-blue-600' : 'bg-[#3C3C3C]'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${localTrim ? 'translate-x-6' : ''}`} />
                  </button>
               </div>
               {localTrim && (
                 <div className="flex items-start px-2 py-1 bg-blue-900/20 text-blue-400 rounded text-[11px]">
                   <CheckCircle2 size={12} className="mr-1.5 mt-0.5 shrink-0" />
                   <span>This preserves whitespace inside single-quoted literals ('...').</span>
                 </div>
               )}
            </div>
          </div>

          {/* RIGHT COLUMN: GUIDE & SHORTCUTS */}
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar bg-[#1E1E1E]/50">
            {/* Shortcuts Section */}
            <div className="space-y-3">
               <div className="flex items-center text-gray-300 font-medium">
                 <Keyboard size={16} className="mr-2" /> Keyboard Shortcuts
               </div>
               <div className="grid grid-cols-2 gap-2">
                 {[
                   { key: 'Ctrl + O', desc: 'Open Log File' },
                   { key: 'Ctrl + F', desc: 'Filter Queries' },
                   { key: 'Alt + S', desc: 'Open Settings' },
                   { key: 'Ctrl + R', desc: 'Reload File' },
                   { key: 'Esc', desc: 'Close Modal' },
                   { key: 'F5', desc: 'Refresh Logs' },
                 ].map(shortcut => (
                   <div key={shortcut.key} className="flex flex-col p-2 bg-[#1E1E1E] border border-[#3C3C3D] rounded">
                     <kbd className="text-[10px] bg-[#333] px-1.5 py-0.5 rounded border border-[#444] text-blue-400 font-mono w-fit mb-1">{shortcut.key}</kbd>
                     <span className="text-[11px] text-gray-400">{shortcut.desc}</span>
                   </div>
                 ))}
               </div>
            </div>

            {/* User Guide Section */}
            <div className="space-y-3">
               <div className="flex items-center text-gray-300 font-medium border-t border-[#3C3C3D] pt-4">
                 <HelpCircle size={16} className="mr-2" /> Feature Guide
               </div>
               <div className="bg-[#1E1E1E] rounded border border-[#3C3C3D] overflow-hidden">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <tbody className="divide-y divide-[#3C3C3D] text-gray-300">
                      <tr>
                        <td className="px-3 py-2 font-bold text-blue-400 w-24">Loading</td>
                        <td className="px-3 py-2 opacity-80">Click the <span className="font-bold">+</span> button to paste absolute paths directly.</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-bold text-blue-400">Regex</td>
                        <td className="px-3 py-2 opacity-80">Enable <span className="italic font-bold text-purple-400">Regex mode</span> in filters for pattern matching.</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-bold text-blue-400">Orphans</td>
                        <td className="px-3 py-2 opacity-80">Detect params without SQL. Look for the amber warning banner.</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-bold text-blue-400">Formatter</td>
                        <td className="px-3 py-2 opacity-80">Click on any <span className="font-mono text-orange-200">Reconstructed SQL</span> to format it.</td>
                      </tr>
                    </tbody>
                  </table>
               </div>
               <div className="flex items-center gap-2 px-1 text-[10px] text-gray-500 italic">
                  <Info size={12} className="shrink-0" />
                  <span>Tip: Hover over items to see full content.</span>
               </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center px-6 py-4 bg-[#1E1E1E] border-t border-[#3C3C3D] space-x-3">
          <button 
            className="px-4 py-1.5 text-sm hover:bg-[#3C3C3C] rounded transition-colors text-gray-300"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-6 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm shadow transition-colors font-medium border border-blue-500/50"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
