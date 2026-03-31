import { useMemo } from 'react';
import { LogFile, Filter } from './store';

export function useSqlLogs(
  activeFile: LogFile | undefined,
  filters: Filter[],
  sortOrder: 'asc' | 'desc'
) {
  return useMemo(() => {
    if (!activeFile) return [];
    
    // Extract all SQL logs and attach daoName
    let logs = activeFile.sessions
      .flatMap(sess =>
        sess.logs
          .filter(l => l.type === 'sql' && l.reconstructedSql)
          .map(l => ({ ...l, daoName: sess.daoName }))
      );

    // Apply sorting
    logs.sort((a, b) => {
      const factor = sortOrder === 'asc' ? 1 : -1;
      return (a.logIndex - b.logIndex) * factor;
    });

    // Apply filters
    if (filters.length > 0) {
      logs = logs.filter(log => {
        return filters.every(f => {
          let textValue = '';
          if (f.type === 'query') textValue = log.reconstructedSql || '';
          if (f.type === 'dao')   textValue = log.daoName;
          if (f.type === 'time')  textValue = log.timestamp || '';
          
          const target = textValue.toLowerCase();
          const search = f.value.toLowerCase();
          
          switch (f.operator) {
            case 'equals':       return target === search;
            case 'not_equals':   return target !== search;
            case 'greater_than': return target > search;
            case 'less_than':    return target < search;
            case 'not_contains': return !target.includes(search);
            case 'contains':
            default:             return target.includes(search);
          }
        });
      });
    }

    return logs;
  }, [activeFile, filters, sortOrder]);
}
