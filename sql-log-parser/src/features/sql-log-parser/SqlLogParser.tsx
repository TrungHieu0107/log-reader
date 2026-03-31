import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSqlLogStore } from './store';
import { useConfigStore } from '../../components/configStore';
import { StatusBar } from '../../components/StatusBar';
import { FilterModal } from './FilterModal';
import { AliasModal } from './AliasModal';
import { SqlFormatterModal } from './SqlFormatterModal';
import { invoke } from '@tauri-apps/api/core';
import { 
  FolderOpen, RefreshCw, Filter, ArrowDownUp, 
  Copy, Check, Database, FileText, ChevronLeft, ChevronRight, X, Settings, Plus, Clock
} from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import { PathModal } from './PathModal';

// Hooks & Types
import { useSqlLogs } from './useSqlLogs';
import { useFileOpen } from './useFileOpen';
import { FileReadResponse } from '../../types/tauri';
import { FilterOperator } from './store';

function operatorSymbol(op: FilterOperator): string {
  const map: Record<FilterOperator, string> = {
    contains: 'in', not_contains: 'not in',
    equals: '==', not_equals: '!=',
    greater_than: '>', less_than: '<'
  };
  return map[op] ?? op;
}

export function SqlLogParser() {
  const store = useSqlLogStore();
  const config = useConfigStore();
  
  // 5.2-5.4 Sidebar & State Persistence
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sql-parser-sidebar-width');
    return saved ? parseInt(saved, 10) : 300;
  });
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem('sql-parser-sidebar-collapsed') !== 'true';
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  
  // 4.1 Error Toast State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Feature 3: Orphan Params State
  const [showOrphans, setShowOrphans] = useState(false);
  
  // Modals & Menu
  const [contextMenu, setContextMenu] = useState<{ path: string, x: number, y: number } | null>(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isPathModalOpen, setPathModalOpen] = useState(false);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('sql-parser-sidebar-width', String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem('sql-parser-sidebar-collapsed', String(!isSidebarOpen));
  }, [isSidebarOpen]);

  // Load persistence
  useEffect(() => {
    config.loadConfig().then(() => {
      store.reloadFiles(config.encoding);
    });
  }, []);

  // 3.1 Sidebar Drag Cleanup (Refactored)
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(Math.max(e.clientX, 200), 800);
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // 4.1 Auto-dismiss error
  useEffect(() => {
    if (!errorMessage) return;
    const t = setTimeout(() => setErrorMessage(null), 5000);
    return () => clearTimeout(t);
  }, [errorMessage]);

  // 3.3 Context menu scroll close
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('click', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('click', close);
    };
  }, [contextMenu]);

  // 6.2 Extract file open logic
  const handleOpenFile = useFileOpen(
    config.encoding, 
    store.addFile, 
    setErrorMessage
  );

  const handleOpenFileByPath = async (path: string) => {
    try {
      const res: FileReadResponse = await invoke('read_file_encoded', {
        path, encoding: config.encoding
      });
      if (res.error) {
        setErrorMessage(`Failed to open: ${res.error}`);
      } else if (res.content) {
        store.addFile(path, res.content, res.detected_encoding || undefined);
      }
    } catch (err) {
      setErrorMessage(String(err));
    }
  };

  const handleRefresh = async () => {
    if (!store.activeFilePath) return;
    setIsReloading(true);
    try {
      await store.reloadActiveFile(config.encoding);
    } catch (err) {
      setErrorMessage("Failed to refresh file.");
    } finally {
      setIsReloading(false);
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;

      // Ctrl + O: Open
      if (ctrl && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenFile();
      }
      // Ctrl + F: Filter
      if (ctrl && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (store.activeFilePath) store.setFilterModalOpen(true);
      }
      // Alt + S: Settings
      if (alt && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSettingsOpen(true);
      }
      // Ctrl + R or F5: Reload
      if ((ctrl && e.key.toLowerCase() === 'r') || e.key === 'F5') {
        e.preventDefault();
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store.activeFilePath, handleOpenFile, handleRefresh]);

  const handleEncodingChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const enc = e.target.value;
    config.updateConfig({ encoding: enc });
    if (store.activeFilePath) {
      setIsReloading(true);
      try {
        await store.reloadActiveFile(enc);
      } catch (err) {
        setErrorMessage(`Failed to re-read file with encoding ${enc}`);
      } finally {
        setIsReloading(false);
      }
    }
  };

  // 6.1 Custom Hook for Logs
  const activeFile = useMemo(() => {
    return store.files.find(f => f.path === store.activeFilePath);
  }, [store.files, store.activeFilePath]);

  const allFilteredLogs = useSqlLogs(activeFile, store.filters, store.sortOrder);

  // 2. Paginated Slice for Virtual Scroll
  const visibleLogs = useMemo(() => {
    const start = (store.page - 1) * store.pageSize;
    return allFilteredLogs.slice(start, start + store.pageSize);
  }, [allFilteredLogs, store.page, store.pageSize]);

  const totalPages = Math.ceil(allFilteredLogs.length / store.pageSize);

  // Feature 3: Orphan Detection & Merging
  const { orphanLogs, orphanCount } = useMemo(() => {
    if (!activeFile) return { orphanLogs: [], orphanCount: 0 };
    
    const orphans = activeFile.sessions.flatMap(sess =>
      sess.logs
        .filter(l => l.type === 'orphan_params')
        .map(l => ({ ...l, daoName: sess.daoName, isOrphan: true }))
    ).sort((a, b) => a.logIndex - b.logIndex);

    return { 
      orphanLogs: showOrphans ? orphans : [], 
      orphanCount: orphans.length 
    };
  }, [activeFile, showOrphans]);

  const displayLogs = useMemo(() => {
    return [...visibleLogs, ...orphanLogs];
  }, [visibleLogs, orphanLogs]);

  // 2. Virtual Scroll (Removed - using direct paging)
  const parentRef = useRef<HTMLDivElement>(null);

  // 3.2 Copy Timeout with useRef
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const copySql = (sql: string, index: number) => {
    navigator.clipboard.writeText(sql).then(() => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      setCopiedId(index);
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      setErrorMessage("Failed to copy to clipboard.");
    });
  };

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  // 5.1 Context menu positioning
  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    const menuWidth = 160;
    const menuHeight = 80;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
    setContextMenu({ path, x, y });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-[#D4D4D4] bg-[#1E1E1E]">
      
      {/* 4.1 Error Toast Display */}
      {errorMessage && (
        <div className="flex items-center gap-3 px-4 py-2 bg-red-900/30 border-b border-red-700/50 text-red-300 text-xs animate-in slide-in-from-top duration-200">
          <span className="flex-1 font-medium">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <div 
          className="flex flex-col bg-[#252526] border-r border-[#3C3C3D] relative"
          style={{ width: isSidebarOpen ? sidebarWidth : 0, transition: isResizing ? 'none' : 'width 0.2s' }}
        >
          {isSidebarOpen && (
            <>
              <div className="px-4 py-3 uppercase text-xs tracking-wider text-gray-400 font-semibold border-b border-[#3C3C3D]">
                OPEN LOG FILES
              </div>
              <div className="flex-1 overflow-y-auto">
                {store.files.map(f => (
                  <div 
                    key={f.path}
                    className={`px-4 py-1.5 flex items-center cursor-pointer text-sm group ${store.activeFilePath === f.path ? 'bg-[#37373D] text-white' : 'hover:bg-[#2A2D2E]'}`}
                    onClick={() => store.setActiveFile(f.path)}
                    onContextMenu={(e) => handleContextMenu(e, f.path)}
                   >
                     <FileText size={14} className={`mr-2 shrink-0 ${store.activeFilePath === f.path ? 'text-blue-400' : 'text-gray-500 group-hover:text-blue-400'}`} />
                     <span className="truncate">{f.alias || (f.path.split(/[/\\]/).pop() || f.path)}</span>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-[#3C3C3D]">
                <button 
                  className="w-full text-xs text-center p-2 rounded hover:bg-red-900/20 text-gray-400 hover:text-red-400 transition-all"
                  onClick={() => store.clearAllFiles()}
                >
                  Clear All Files
                </button>
              </div>
            </>
          )}

          <div 
            className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-blue-500/50 cursor-col-resize z-10"
            onMouseDown={() => setIsResizing(true)}
          />
        </div>

        <div className="bg-[#1E1E1E] flex flex-col justify-center border-r border-[#3C3C3D]">
          <button 
            className="h-10 w-4 flex items-center justify-center hover:bg-[#3C3C3C] text-gray-500 transition-colors"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
          </button>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          
          <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3C3C3D]">
            <div className="flex items-center space-x-2">
              <button 
                className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm shadow transition-all active:scale-95"
                onClick={handleOpenFile}
              >
                <FolderOpen size={16} className="mr-2" /> Open File
              </button>
              <button 
                className="flex items-center px-2 py-1 bg-[#3C3C3C] hover:bg-[#4D4D4D] text-white rounded text-sm shadow transition-all active:scale-90"
                onClick={() => setPathModalOpen(true)}
                title="Open by path"
              >
                <Plus size={16} />
              </button>
              <button 
                className="flex items-center px-3 py-1 bg-[#3C3C3C] hover:bg-[#4D4D4D] text-white rounded text-sm shadow transition-all disabled:opacity-50"
                onClick={handleRefresh}
                disabled={!store.activeFilePath || isReloading}
              >
                <RefreshCw size={14} className={`mr-2 ${isReloading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <select
                className="bg-[#3C3C3C] px-2 py-1 ml-2 rounded text-sm text-gray-200 border-none outline-none focus:ring-1 ring-blue-500 cursor-pointer"
                value={config.encoding}
                onChange={handleEncodingChange}
              >
                <option value="Auto">Auto Detect</option>
                <optgroup label="Japanese">
                  <option value="Shift_JIS">Shift_JIS (Japanese)</option>
                  <option value="EUC-JP">EUC-JP</option>
                </optgroup>
                <optgroup label="Unicode">
                  <option value="UTF-8">UTF-8</option>
                  <option value="UTF-16LE">UTF-16LE</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="Windows-1252">Windows-1252 (Western)</option>
                </optgroup>
              </select>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-[11px] text-gray-400 bg-[#1e1e1e] px-2 py-1 rounded border border-[#3C3C3D] flex items-center gap-1.5 shadow-inner min-w-[120px]">
                {store.isParsing ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-blue-400" />
                    <span className="text-blue-400 font-bold animate-pulse">Parsing...</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span className="text-gray-300 font-bold">{allFilteredLogs.length} SQL Queries</span>
                  </>
                )}
                {orphanCount > 0 && (
                  <span className="text-amber-500/80 text-[10px] ml-1 px-1.5 bg-amber-500/10 rounded">
                    + {orphanCount} orphan
                  </span>
                )}
              </div>
              <button 
                className="flex items-center px-3 py-1 bg-[#3C3C3C] hover:bg-[#4D4D4D] text-white rounded text-sm shadow disabled:opacity-50 transition-all font-medium"
                onClick={() => store.setFilterModalOpen(true)}
                disabled={!store.activeFilePath}
              >
                <Filter size={14} className="mr-2" /> Filter
              </button>
              <button 
                className="flex items-center px-3 py-1 bg-[#3C3C3C] hover:bg-[#4D4D4D] text-white rounded text-sm shadow transition-all"
                onClick={() => store.toggleSortOrder()}
                title="Toggle Time Sort Order"
              >
                <ArrowDownUp size={14} className="mr-2 text-blue-400" />
                {store.sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
              </button>
              <button 
                className="p-1.5 bg-[#3C3C3C] hover:bg-[#4D4D4D] text-white rounded shadow transition-all"
                onClick={() => setSettingsOpen(true)}
                title="Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Feature 3: Orphan Warning Banner */}
          {orphanCount > 0 && activeFile && (
            <div className="flex items-center gap-3 px-4 py-1.5 bg-amber-900/10 border-b border-amber-700/20">
              <span className="text-amber-500/70 text-[11px] flex items-center gap-2">
                <Plus size={14} className="rotate-45" />
                {orphanCount} params log{orphanCount > 1 ? 's' : ''} found without matching SQL statement.
              </span>
              <button
                onClick={() => setShowOrphans(prev => !prev)}
                className="ml-auto text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider underline underline-offset-4"
              >
                {showOrphans ? 'Hide' : 'Show'} orphans
              </button>
            </div>
          )}

          {store.filters.length > 0 && store.activeFilePath && (
            <div className="flex items-center bg-[#1E1E1E] px-4 py-2 border-b border-[#3C3C3D] overflow-x-auto gap-2 scrollbar-hide">
              <span className="text-[10px] uppercase font-bold text-gray-500 mr-1 flex-shrink-0">Filters:</span>
              {store.filters.map(f => (
                <div key={f.id} className="flex items-center gap-1.5 bg-blue-600/10 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full text-[11px] font-medium group transition-all hover:border-blue-500/50 shadow-sm">
                  {f.isRegex && (
                    <span className="bg-purple-600/20 text-purple-400 text-[8px] font-black px-1 rounded uppercase tracking-tighter leading-none border border-purple-500/30">
                      regex
                    </span>
                  )}
                  {f.type === 'time_range' ? (
                    <>
                      <Clock className="w-3 h-3 opacity-60"/>
                      <span className="opacity-60 text-[9px] uppercase font-black tracking-tight">time:</span>
                      <span className="font-mono text-xs">{f.value} → {f.valueTo}</span>
                    </>
                  ) : (
                    <>
                      <span className="opacity-60 text-[9px] uppercase font-black tracking-tight">
                        {f.type} {operatorSymbol(f.operator)}:
                      </span>
                      <span className="max-w-[120px] truncate font-mono text-xs">{f.value}</span>
                    </>
                  )}
                  <button onClick={() => store.removeFilter(f.id)} className="opacity-40 group-hover:opacity-100 hover:text-white transition-opacity">
                    <X size={12}/>
                  </button>
                </div>
              ))}
              <div className="flex-1" />
              <button 
                className="text-[10px] uppercase font-black text-gray-600 hover:text-red-500 transition-colors tracking-widest px-2"
                onClick={() => store.clearAllFilters()}
              >
                Reset
              </button>
            </div>
          )}

          <div className="flex items-center bg-[#252526] text-gray-500 text-[10px] font-bold uppercase tracking-widest py-2 pr-4 border-b border-[#3C3C3D]">
            <div className="w-[160px] pl-4">Timestamp</div>
            <div className="w-[200px] px-2">DAO</div>
            <div className="flex-1 px-2">SQL Query</div>
            <div className="w-[80px] text-center">Actions</div>
          </div>

          <div ref={parentRef} className="flex-1 overflow-y-auto">
            {!store.activeFilePath ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-40 italic">
                <Database size={48} className="mb-4" />
                <p className="text-lg">Open a log file to extract SQL queries</p>
              </div>
            ) : allFilteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-40 space-y-3">
                <Database size={48} />
                <div className="text-center">
                  <p className="text-lg font-medium">No results found</p>
                  <p className="text-xs max-w-xs mt-1">Adjust filters or ensure file contains <code className="bg-[#333] px-1 rounded mx-1">Daoの開始</code> markers.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {displayLogs.map((log, index) => {
                  if (log.type === 'orphan_params') {
                    return (
                      <div
                        key={`orphan-${log.id}-${index}`}
                        className="flex border-b border-amber-900/30 bg-amber-950/10 items-stretch opacity-80 group hover:bg-amber-950/20 transition-colors py-1"
                        style={{ minHeight: 48 }}
                      >
                        <div className="w-[160px] flex-shrink-0 px-4 py-3 text-[11px] text-gray-500 font-mono border-r border-[#2d2d2d] flex items-center">
                          {log.timestamp || '--'}
                        </div>
                        <div className="w-[200px] flex-shrink-0 px-4 py-3 text-[12px] text-amber-500/60 font-bold border-r border-[#2d2d2d] flex items-center truncate">
                          {log.daoName}
                        </div>
                        <div className="flex-1 px-4 py-3 text-[12px] text-amber-300/60 font-mono border-r border-[#2d2d2d] flex items-center overflow-hidden">
                          <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded mr-3 uppercase font-black tracking-tighter shrink-0 border border-amber-500/30">
                            Orphan Params
                          </span>
                          <span className="break-all truncate opacity-60">id={log.id} params={log.paramsString}</span>
                        </div>
                        <div className="w-[80px] flex-shrink-0"/>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`log-${log.logIndex}-${index}`}
                      className="flex border-b border-[#2C2C2D] group hover:bg-[#2A2D2E] transition-colors items-stretch py-1"
                      style={{ minHeight: 48 }}
                    >
                      <div className="w-[160px] pl-4 py-2 font-mono text-[11px] text-gray-500 flex-shrink-0 flex items-center">
                        {log.timestamp}
                      </div>
                      <div className="w-[200px] px-2 py-2 text-sm text-[#4ECAEA] truncate flex-shrink-0 flex items-center font-semibold" title={log.daoName}>
                        {log.daoName}
                      </div>
                      <div 
                        className={`flex-1 px-2 py-2 font-mono text-xs text-[#CE9178] cursor-pointer hover:bg-[#333]/30 transition-all rounded m-1 overflow-x-auto custom-scrollbar flex items-center ${config.sqlSingleLine ? 'whitespace-nowrap' : 'whitespace-pre-wrap break-all'}`}
                        onClick={() => store.setFormatterModalOpen(true, log.reconstructedSql)}
                      >
                        {log.reconstructedSql}
                      </div>
                      <div className="w-[80px] flex justify-center py-2 flex-shrink-0 items-center">
                        <button 
                          onClick={() => copySql(log.reconstructedSql || '', log.logIndex)}
                          className={`p-1.5 rounded transition-all h-8 w-8 flex items-center justify-center ${copiedId === log.logIndex ? 'text-green-400 bg-green-400/10' : 'text-gray-600 opacity-0 group-hover:opacity-100 hover:bg-[#3A3D41] hover:text-white'}`}
                          title="Copy SQL"
                        >
                          {copiedId === log.logIndex ? <Check size={16}/> : <Copy size={16}/>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center p-3 bg-[#252526] border-t border-[#3C3C3D]">
              <div className="flex items-center justify-between w-full max-w-md">
                <button 
                  onClick={() => store.setPage(store.page - 1)}
                  disabled={store.page === 1}
                  className="p-1.5 rounded hover:bg-[#3C3C3C] disabled:opacity-10 disabled:hover:bg-transparent text-gray-400 hover:text-white transition-all flex items-center"
                >
                  <ChevronLeft size={18} className="mr-1" />
                  <span className="text-xs font-medium">Previous</span>
                </button>

                <div className="flex items-center space-x-1.5">
                  {(() => {
                    const pages: (number | string)[] = [];
                    const current = store.page;
                    const total = totalPages;

                    if (total <= 7) {
                      for (let i = 1; i <= total; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (current > 3) pages.push('...');
                      const start = Math.max(2, current - 1);
                      const end = Math.min(total - 1, current + 1);
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (current < total - 2) pages.push('...');
                      pages.push(total);
                    }

                    return pages.map((p, i) => (
                      <React.Fragment key={i}>
                        {p === '...' ? (
                          <span className="px-1 text-gray-500 font-bold select-none cursor-default">...</span>
                        ) : (
                          <button
                            onClick={() => store.setPage(p as number)}
                            className={`min-w-[32px] h-[32px] flex items-center justify-center rounded text-sm font-medium transition-all ${
                              store.page === p 
                              ? 'bg-blue-600 text-white shadow-lg' 
                              : 'bg-[#3C3C3C] text-gray-400 hover:bg-[#4D4D4D] hover:text-white'
                            }`}
                          >
                            {p}
                          </button>
                        )}
                      </React.Fragment>
                    ));
                  })()}
                </div>

                <button 
                  onClick={() => store.setPage(store.page + 1)}
                  disabled={store.page === totalPages}
                  className="p-1.5 rounded hover:bg-[#3C3C3C] disabled:opacity-10 disabled:hover:bg-transparent text-gray-400 hover:text-white transition-all flex items-center"
                >
                  <span className="text-xs font-medium">Next</span>
                  <ChevronRight size={18} className="ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <StatusBar 
        activeFileName={activeFile?.alias || (store.activeFilePath?.split(/[/\\]/).pop() || '')}
        activeLanguage="SQL"
        activeEncoding={config.encoding === 'Auto' ? `Auto (${activeFile?.detectedEncoding || 'Detecting...'})` : config.encoding}
        isCompareMode={false}
        onLanguageChange={() => {}}
        onEncodingChange={(enc) => config.updateConfig({ encoding: enc })}
      />

      {contextMenu && (
        <div 
          className="fixed z-[60] bg-[#252526] border border-[#454545] rounded shadow-xl py-1 w-40 text-sm animate-in fade-in zoom-in duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div 
            className="px-4 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors"
            onClick={() => {
              const file = store.files.find(f => f.path === contextMenu.path);
              store.setAliasModalProps({
                isOpen: true,
                filePath: contextMenu.path,
                initialValue: file?.alias || '',
                onSave: (val) => store.setAlias(contextMenu.path, val)
              });
              setContextMenu(null);
            }}
          >Set Alias</div>
          <div 
            className="px-4 py-1.5 text-red-400 hover:bg-red-600 hover:text-white cursor-pointer transition-colors"
            onClick={() => {
              store.removeFile(contextMenu.path);
              setContextMenu(null);
            }}
          >Remove</div>
        </div>
      )}

      <FilterModal 
        isOpen={store.isFilterModalOpen} 
        onClose={() => store.setFilterModalOpen(false)} 
      />
      <SqlFormatterModal 
        isOpen={store.isModalOpen} 
        onClose={() => store.setFormatterModalOpen(false)} 
        sql={store.selectedSql}
      />
      {store.aliasModalProps && (
        <AliasModal 
          isOpen={store.aliasModalProps.isOpen}
          initialValue={store.aliasModalProps.initialValue}
          onSave={store.aliasModalProps.onSave}
          onClose={() => store.setAliasModalProps({ ...(store.aliasModalProps || { isOpen: false, filePath: '', initialValue: '', onSave: () => {} }), isOpen: false })}
        />
      )}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <PathModal 
        isOpen={isPathModalOpen}
        onClose={() => setPathModalOpen(false)}
        onOpen={handleOpenFileByPath}
      />
    </div>
  );
}
