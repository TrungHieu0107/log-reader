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
          // Feature 2: Time Range is handled separately
          if (f.type === 'time_range' && f.valueTo) {
            const ts = (log.timestamp || '').slice(11, 19); // HH:MM:SS
            return ts >= f.value && ts <= f.valueTo;
          }

          let textValue = '';
          if (f.type === 'query') textValue = log.reconstructedSql || '';
          if (f.type === 'dao')   textValue = log.daoName;
          if (f.type === 'time')  textValue = log.timestamp || '';
          
          const target = textValue.toLowerCase();
          const search = f.value.toLowerCase();
          
          switch (f.operator) {
            case 'contains':
            default:
              if (f.isRegex && f.type === 'query') {
                try {
                  return new RegExp(f.value, 'i').test(textValue);
                } catch {
                  return false;
                }
              }
              return target.includes(search);

            case 'not_contains':
              if (f.isRegex && f.type === 'query') {
                try {
                  return !new RegExp(f.value, 'i').test(textValue);
                } catch {
                  return true;
                }
              }
              return !target.includes(search);

            case 'equals':       return target === search;
            case 'not_equals':   return target !== search;
            case 'greater_than': return target > search;
            case 'less_than':    return target < search;
          }
        });
      });
    }

    return logs;
  }, [activeFile, filters, sortOrder]);
}
