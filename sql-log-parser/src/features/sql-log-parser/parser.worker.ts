import { DaoSession, LogEntry } from './parser';

interface WorkerOptions {
  content: string;
  options: { trimSql?: boolean };
  initialLimit: number;
}

function trimSqlOutsideQuotes(sql: string): string {
  return sql.replace(/('(?:''|[^'])*')|\s+/g, (_match, group1) => {
    if (group1) return group1;
    return ' ';
  }).trim();
}

self.onmessage = (e: MessageEvent<WorkerOptions>) => {
  const { content, options, initialLimit } = e.data;
  const lines = content.split('\n');
  const sessions: DaoSession[] = [];
  let currentSession: DaoSession | null = null;
  const sessionStack: DaoSession[] = [];
  const activeSqls = new Map<string, string>();
  const globalSqlMap = new Map<string, string>();
  
  let logCount = 0;
  let partialSent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const timeMatch = line.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    const timestamp = timeMatch ? timeMatch[0] : "";

    const daoStartMatch = line.match(/Daoの開始(.*?)(?:\s|$)/);
    if (daoStartMatch) {
      const daoName = daoStartMatch[1].trim().split('.').pop() || "UnknownDao";
      currentSession = { daoName, logs: [] };
      sessions.push(currentSession);
      sessionStack.push(currentSession);
    } else {
      const daoEndMatch = line.match(/Daoの終了(.*?)(?:\s|$)/);
      if (daoEndMatch) {
        if (sessionStack.length > 0) {
          sessionStack.pop();
        }
        currentSession = sessionStack.length > 0 ? sessionStack[sessionStack.length - 1] : null;
      }
    }

    if (!currentSession) {
      currentSession = { daoName: "Global", logs: [] };
      sessions.push(currentSession);
      sessionStack.push(currentSession);
    }

    const log: LogEntry = {
      logIndex: i,
      timestamp,
      rawLine: line,
      type: 'other',
      daoName: currentSession.daoName
    };

    const sqlMatch = line.match(/CreatePreparedStatement id=([a-f0-9]+)\s+sql=(.*)/);
    if (sqlMatch) {
      const id = sqlMatch[1];
      let sqlText = sqlMatch[2].trim();
      if (options.trimSql) sqlText = trimSqlOutsideQuotes(sqlText);
      activeSqls.set(id, sqlText);
      globalSqlMap.set(id.toLowerCase(), sqlText);
    }

    const directSqlMatch = line.match(/UseCommand=\s*sql=(.*)/);
    if (directSqlMatch) {
      let sqlText = directSqlMatch[1].trim();
      if (options.trimSql) sqlText = trimSqlOutsideQuotes(sqlText);
      log.reconstructedSql = sqlText;
      log.type = 'sql';
      
      const uniqIdMatch = line.match(/uniq_id=\((.*?)\)/);
      if (uniqIdMatch) {
        log.id = uniqIdMatch[1];
        globalSqlMap.set(log.id.toLowerCase(), sqlText);
      }
      
      logCount++;
    }

    const paramMatch = line.match(/PreparedStatement\.executeQuery\(\) id=([a-f0-9]+)\s+params=(.*)/);
    if (paramMatch) {
      const id = paramMatch[1];
      const pstr = paramMatch[2].trim();
      const rawSql = activeSqls.get(id);
      log.id = id;
      log.paramsString = pstr;

      if (rawSql) {
        const params: string[] = [];
        const pRegex = /\[.*?:.*?:(.*?)\]/g;
        let m;
        while ((m = pRegex.exec(pstr)) !== null) params.push(m[1]);

        let rSql = rawSql;
        params.forEach(p => {
          rSql = rSql.replace('?', isNaN(Number(p)) ? `'${p}'` : p);
        });

        log.reconstructedSql = rSql;
        log.type = 'sql';
        logCount++;
      }
    }

    currentSession.logs.push(log);

    // Initial limit for "Page 1 First" optimization
    if (!partialSent && logCount >= initialLimit) {
      self.postMessage({ type: 'partial', sessions: JSON.parse(JSON.stringify(sessions)) });
      partialSent = true;
    }
  }

  // THIRD PASS: mark orphan params entries
  for (const session of sessions) {
    for (const log of session.logs) {
      if (
        log.paramsString !== undefined &&
        log.reconstructedSql === undefined &&
        log.id &&
        !globalSqlMap.has(log.id.trim().toLowerCase())
      ) {
        log.type = 'orphan_params';
      }
    }
  }

  self.postMessage({ type: 'done', sessions });
};
