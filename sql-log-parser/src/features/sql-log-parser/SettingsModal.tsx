import { useState, useEffect } from 'react';
import { useConfigStore } from '../../components/configStore';
import { useSqlLogStore } from './store';
import { Settings, X, Type, LayoutList, CheckCircle2, HelpCircle, Info } from 'lucide-react';

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
        className="w-[450px] rounded shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: '#252526', border: '1px solid #454545', color: '#D4D4D4' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3C3C3D]">
          <div className="flex items-center text-white text-sm font-semibold uppercase tracking-wider">
            <Settings size={16} className="mr-2" /> Settings
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#3C3C3C] rounded text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* SQL Display Mode */}
          <div className="space-y-3">
             <div className="flex items-center text-gray-300 font-medium">
               <LayoutList size={16} className="mr-2" /> Application Display
             </div>
             <div className="bg-[#1E1E1E] p-4 rounded border border-[#3C3C3D] flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Single Line SQL Mode</div>
                  <div className="text-xs text-gray-500 mt-0.5">Show query in one row with horizontal scroll</div>
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
                  <div className="text-sm font-medium">Records per page</div>
                  <div className="text-xs text-gray-500 mt-0.5">Adjust for optimal responsiveness</div>
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
                  <div className="text-sm font-medium">Smart Whitespace Trimming</div>
                  <div className="text-xs text-gray-500 mt-0.5">Collapse extra spaces outside string literals</div>
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

          {/* User Guide Section */}
          <div className="space-y-3">
             <div className="flex items-center text-gray-300 font-medium">
               <HelpCircle size={16} className="mr-2" /> User Guide & Tips
             </div>
             <div className="bg-[#1E1E1E] rounded border border-[#3C3C3D] overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#2A2D2E] border-b border-[#3C3C3D] text-gray-400 uppercase tracking-tighter">
                      <th className="px-3 py-2 font-black">Feature</th>
                      <th className="px-3 py-2 font-black">How to use / Shortcut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3C3C3D] text-gray-300">
                    <tr>
                      <td className="px-3 py-2.5 font-bold text-blue-400">Loading</td>
                      <td className="px-3 py-2.5 opacity-80">Click <span className="bg-[#333] px-1 rounded font-mono text-white inline-block border border-[#444]">+</span> to paste absolute paths directly.</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5 font-bold text-blue-400">Regex</td>
                      <td className="px-3 py-2.5 opacity-80">Enable <span className="italic font-bold text-purple-400">Regex mode</span> for complex pattern matching (case-insensitive).</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5 font-bold text-blue-400">Orphans</td>
                      <td className="px-3 py-2.5 opacity-80">Amber warning banner shows params without parent SQL. Click <span className="underline">Show orphans</span>.</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5 font-bold text-blue-400">Formatter</td>
                      <td className="px-3 py-2.5 opacity-80">Click on any <span className="font-mono text-orange-200">Reconstructed SQL</span> to open the Pretty Formatter.</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5 font-bold text-blue-400">Sorting</td>
                      <td className="px-3 py-2.5 opacity-80">Switch between <span className="font-bold whitespace-nowrap">Newest First</span> and <span className="font-bold whitespace-nowrap">Oldest First</span> using the toggle.</td>
                    </tr>
                  </tbody>
                </table>
             </div>
             <div className="flex items-center gap-2 px-1 text-[10px] text-gray-500 italic">
                <Info size={12} className="shrink-0" />
                <span>Tip: Hover over DAO names or file paths to see the full content.</span>
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
            className="px-6 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm shadow transition-colors font-medium"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
