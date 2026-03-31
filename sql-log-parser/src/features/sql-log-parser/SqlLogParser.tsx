import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSqlLogStore } from './store';
import { useConfigStore } from '../../components/configStore';
import { StatusBar } from '../../components/StatusBar';
import { FilterModal } from './FilterModal';
import { AliasModal } from './AliasModal';
import { SqlFormatterModal } from './SqlFormatterModal';
import { useVirtualizer } from '@tanstack/react-virtual';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { 
  FolderOpen, RefreshCw, Filter, ArrowDownUp, 
  Copy, Check, Database, FileText, ChevronLeft, ChevronRight, X, Settings, Plus
} from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import { PathModal } from './PathModal';

export function SqlLogParser() {
  const store = useSqlLogStore();
  const config = useConfigStore();
  
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modals state
  const [contextMenu, setContextMenu] = useState<{path: string, x: number, y: number} | null>(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isPathModalOpen, setPathModalOpen] = useState(false);

  // Load persistence
  useEffect(() => {
    config.loadConfig().then(() => {
      store.reloadFiles(config.encoding);
    });
    const hideMenu = () => setContextMenu(null);
    window.addEventListener('click', hideMenu);
    return () => window.removeEventListener('click', hideMenu);
  }, []); // run once on mount

  // Sidebar resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      setSidebarWidth(Math.max(200, Math.min(800, e.clientX)));
    };
    const handleMouseUp = () => setIsResizing(false);
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleOpenFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Log files", extensions: ["log", "txt", "*"] }],
    });
    if (selected && typeof selected === 'string') {
      handleOpenFileByPath(selected);
    }
  };

  const handleOpenFileByPath = async (path: string) => {
    try {
      const res = await invoke<{content: string | null, is_binary: boolean, error: string | null}>('read_file_encoded', {
        path, encoding: config.encoding
      });
      if (res.content) {
        store.addFile(path, res.content);
      } else if (res.error) {
        alert("Error: " + res.error);
      }
    } catch (err) {
      console.error(err);
      alert("Invalid path or file not found.");
    }
  };

  const handleRefresh = async () => {
    if (!store.activeFilePath) return;
    setRefreshing(true);
    await store.reloadActiveFile(config.encoding);
    setRefreshing(false);
  };

  const handleEncodingChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const enc = e.target.value;
    config.updateConfig({ encoding: enc });
    if (store.activeFilePath) {
      setRefreshing(true);
      await store.reloadActiveFile(enc);
      setRefreshing(false);
    }
  };

  // 1. All Filtered & Sorted Logs
  const allFilteredLogs = useMemo(() => {
    const activeFile = store.files.find(f => f.path === store.activeFilePath);
    if (!activeFile) return [];
    
    let logs = activeFile.sessions
      .flatMap(s => s.logs)
      .filter(l => l.type === 'sql' && l.reconstructedSql);

    for (const f of store.filters) {
      logs = logs.filter(l => {
        let fieldVal = '';
        if (f.type === 'query') fieldVal = l.reconstructedSql || '';
        if (f.type === 'dao') fieldVal = l.daoName || '';
        if (f.type === 'time') fieldVal = l.timestamp || '';

        const valLower = fieldVal.toLowerCase();
        const searchLower = f.value.toLowerCase();

        switch (f.operator) {
          case 'contains': return valLower.includes(searchLower);
          case 'not_contains': return !valLower.includes(searchLower);
          case 'equals': return valLower === searchLower;
          case 'not_equals': return valLower !== searchLower;
          case 'greater_than': return valLower > searchLower;
          case 'less_than': return valLower < searchLower;
          default: return true;
        }
      });
    }

    logs.sort((a, b) => {
      if (store.sortOrder === 'asc') return a.logIndex - b.logIndex;
      return b.logIndex - a.logIndex;
    });

    return logs;
  }, [store.files, store.activeFilePath, store.filters, store.sortOrder]);

  // 2. Paginated Slice
  const visibleLogs = useMemo(() => {
    const start = (store.page - 1) * store.pageSize;
    return allFilteredLogs.slice(start, start + store.pageSize);
  }, [allFilteredLogs, store.page, store.pageSize]);

  const totalPages = Math.ceil(allFilteredLogs.length / store.pageSize);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: visibleLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  // Action Buttons row state
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  const copySql = (sql: string, index: number) => {
    navigator.clipboard.writeText(sql).then(() => {
      setCopiedId(index);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-[#D4D4D4] bg-[#1E1E1E]">
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
                    className={`px-4 py-1.5 flex items-center cursor-pointer text-sm truncate ${store.activeFilePath === f.path ? 'bg-[#37373D] text-white' : 'hover:bg-[#2A2D2E]'}`}
                    onClick={() => store.setActiveFile(f.path)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ path: f.path, x: e.clientX, y: e.clientY });
                    }}
                   >
                     <FileText size={14} className="mr-2 text-blue-400 shrink-0" />
                     <span className="truncate">{f.alias || f.path.split(/[/\\]/).pop()}</span>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-[#3C3C3D]">
                <button 
                  className="w-full text-xs text-gray-400 hover:text-white pb-1"
                  onClick={() => store.clearAllFiles()}
                >
                  Clear All
                </button>
              </div>
            </>
          )}

          {/* Drag Handle */}
          <div 
            className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-blue-500 cursor-col-resize z-10"
            onMouseDown={() => setIsResizing(true)}
          />
        </div>

        {/* Sidebar Toggle */}
        <div className="bg-[#1E1E1E] flex flex-col justify-center border-r border-[#3C3C3D]">
          <button 
            className="h-10 w-4 flex items-center justify-center hover:bg-[#3C3C3C] text-gray-500"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
          </button>
        </div>

        {/* Main Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3C3C3D]">
            <div className="flex items-center space-x-2">
              <button 
                className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm shadow transition-colors"
                onClick={handleOpenFile}
              >
                <FolderOpen size={16} className="mr-2" /> Open File
              </button>
              <button 
                className="flex items-center px-2 py-1 bg-[#3C3C3C] hover:bg-[#4D4D4D] text-white rounded text-sm shadow transition-colors"
                onClick={() => setPathModalOpen(true)}
                title="Open by path"
              >
                <Plus size={16} />
              </button>
              <button 
                className="flex items-center px-3 py-1 bg-[#3C3C3C] hover:bg-[#4D4D4D] text-white rounded text-sm shadow transition-colors disabled:opacity-50"
                onClick={handleRefresh}
                disabled={!store.activeFilePath || refreshing}
              >
                <RefreshCw size={14} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <select
                className="bg-[#3C3C3C] px-2 py-1 ml-2 rounded text-sm text-gray-200 border-none outline-none focus:ring-1 ring-blue-500"
                value={config.encoding}
                onChange={handleEncodingChange}
              >
                <option value="Auto">Auto Detect</option>
                <option value="UTF-8">UTF-8</option>
                <option value="Shift_JIS">Shift_JIS (MS932)</option>
                <option value="EUC-JP">EUC-JP</option>
                <option value="UTF-16LE">UTF-16LE</option>
                <option value="Windows-1252">Windows-1252</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded font-mono">
                {allFilteredLogs.length} Total
              </span>
              <button 
                className="flex items-center px-3 py-1 bg-[#3C3C3C] hover:bg-[#4D4D4D] text-white rounded text-sm shadow disabled:opacity-50 transition-colors"
                onClick={() => store.setFilterModalOpen(true)}
                disabled={!store.activeFilePath}
              >
                <Filter size={14} className="mr-2" /> Filter
              </button>
              <button 
                className="flex items-center px-3 py-1 bg-[#3C3C3C] hover:bg-[#4D4D4D] text-white rounded text-sm shadow transition-colors"
                onClick={() => store.toggleSortOrder()}
                title="Toggle Time Sort Order"
              >
                <ArrowDownUp size={14} className="mr-2" />
                {store.sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
              </button>
              <button 
                className="p-1.5 bg-[#3C3C3C] hover:bg-[#4D4D4D] text-white rounded shadow transition-colors"
                onClick={() => setSettingsOpen(true)}
                title="Application Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Active Filters Bar */}
          {store.filters.length > 0 && store.activeFilePath && (
            <div className="flex items-center bg-[#1E1E1E] px-4 py-2 border-b border-[#3C3C3D] overflow-x-auto space-x-2 scrollbar-hide">
              <span className="text-xs text-gray-400 mr-2 flex-shrink-0">Active Filters:</span>
              {store.filters.map(f => (
                <div key={f.id} className="flex items-center bg-[#3C3C3C] text-xs px-2 py-1 rounded whitespace-nowrap">
                  <span className="text-blue-400 mr-1">{f.type}</span>
                  <span className="text-gray-400 mr-1">{f.operator.replace('_', ' ')}:</span>
                  <span className="font-mono text-gray-200">{f.value}</span>
                  <button onClick={() => store.removeFilter(f.id)} className="ml-2 hover:text-white text-gray-400">
                    <X size={12}/>
                  </button>
                </div>
              ))}
              <div className="flex-1" />
              <button 
                className="text-xs text-red-400 hover:text-red-300 ml-4 flex-shrink-0"
                onClick={() => store.clearAllFilters()}
              >
                Clear All
              </button>
            </div>
          )}

          {/* Table Header */}
          <div className="flex items-center bg-[#252526] text-gray-300 text-xs font-semibold uppercase tracking-wider py-2 pr-4 border-b border-[#3C3C3D]">
            <div className="w-[160px] px-4">Timestamp</div>
            <div className="w-[200px] px-2">DAO</div>
            <div className="flex-1 px-2">Reconstructed SQL Query</div>
            <div className="w-[80px] text-center">Actions</div>
          </div>

          {/* Table Content (Virtualized) */}
          <div ref={parentRef} className="flex-1 overflow-y-auto" style={{ height: "100%" }}>
            {!store.activeFilePath ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Database size={48} className="mb-4 opacity-50" />
                <p className="text-lg">Select a log file to view SQL queries</p>
              </div>
            ) : visibleLogs.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Database size={48} className="mb-4 opacity-50" />
                <p className="text-lg italic">No SQL queries match the current filters.</p>
              </div>
            ) : (
              <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
                {virtualizer.getVirtualItems().map((vRow) => {
                  const log = visibleLogs[vRow.index];
                  return (
                    <div
                      key={vRow.key}
                      data-index={vRow.index}
                      ref={virtualizer.measureElement}
                      className="absolute top-0 left-0 w-full flex border-b border-[#2C2C2D] group hover:bg-[#2A2D2E] transition-colors py-2"
                      style={{ transform: `translateY(${vRow.start}px)` }}
                    >
                      <div className="w-[160px] px-4 font-mono text-xs text-gray-500 flex-shrink-0 pt-1">
                        {log.timestamp}
                      </div>
                      <div className="w-[200px] px-2 text-sm text-[#4ECAEA] truncate flex-shrink-0 pt-1" title={log.daoName}>
                        {log.daoName}
                      </div>
                      <div 
                        className={`flex-1 px-2 font-mono text-xs text-[#CE9178] cursor-pointer hover:underline underline-offset-2 ${config.sqlSingleLine ? 'whitespace-nowrap overflow-x-auto scrollbar-hide py-1' : 'whitespace-pre-wrap break-all'}`}
                        onClick={() => store.setFormatterModalOpen(true, log.reconstructedSql)}
                      >
                        {log.reconstructedSql}
                      </div>
                      <div className="w-[80px] flex justify-center flex-shrink-0 pt-1">
                        <button 
                          onClick={() => copySql(log.reconstructedSql || '', log.logIndex)}
                          className={`p-1.5 rounded transition ${copiedId === log.logIndex ? 'text-green-400 bg-green-400/10' : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-[#3A3D41] hover:text-white'}`}
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

          {/* Boxed Pagination Footer */}
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
                      
                      for (let i = start; i <= end; i++) {
                        if (!pages.includes(i)) pages.push(i);
                      }
                      
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

      {/* Footer */}
      <StatusBar 
        activeFileName={store.files.find(f => f.path === store.activeFilePath)?.alias || store.activeFilePath?.split(/[/\\]/).pop() || ''}
        activeLanguage="SQL"
        activeEncoding={config.encoding === 'Auto' ? `Auto (${store.files.find(f => f.path === store.activeFilePath)?.detectedEncoding || 'Detecting...'})` : config.encoding}
        isCompareMode={false}
        onLanguageChange={() => {}}
        onEncodingChange={(enc) => config.updateConfig({ encoding: enc })}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#252526] border border-[#454545] rounded shadow-lg py-1 w-40 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div 
            className="px-4 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer"
            onClick={() => {
              if (!contextMenu) return;
              const file = store.files.find(f => f.path === contextMenu.path);
              store.setAliasModalProps({
                isOpen: true,
                filePath: contextMenu.path,
                initialValue: file?.alias || '',
                onSave: (val) => store.setAlias(contextMenu.path, val)
              });
            }}
          >Set Alias</div>
          <div 
            className="px-4 py-1.5 text-red-400 hover:bg-red-600 hover:text-white cursor-pointer"
            onClick={() => {
              if (contextMenu) store.removeFile(contextMenu.path);
            }}
          >Remove</div>
        </div>
      )}

      {/* Modals */}
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
