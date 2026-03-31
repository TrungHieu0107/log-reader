import { useState, useEffect } from 'react';
import { useConfigStore } from '../../components/configStore';
import { useSqlLogStore } from './store';
import { Settings, X, Type, LayoutList, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: Props) {
  const config = useConfigStore();
  const store = useSqlLogStore();

  const [localSingleLine, setLocalSingleLine] = useState(config.sqlSingleLine);
  const [localTrim, setLocalTrim] = useState(config.trimSql);

  useEffect(() => {
    if (isOpen) {
      setLocalSingleLine(config.sqlSingleLine);
      setLocalTrim(config.trimSql);
    }
  }, [isOpen, config.sqlSingleLine, config.trimSql]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const isTrimChanged = localTrim !== config.trimSql;
    
    config.updateConfig({
      sqlSingleLine: localSingleLine,
      trimSql: localTrim
    });

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

        <div className="p-6 space-y-6">
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
