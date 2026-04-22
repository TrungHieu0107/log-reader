export interface LogEntry {
  logIndex: number;
  timestamp: string;
  type: 'sql' | 'other' | 'orphan_params';
  rawLine: string;
  reconstructedSql?: string;
  daoName?: string;
  id?: string;
  paramsString?: string;
}

export interface DaoSession {
  daoName: string;
  logs: LogEntry[];
}

function trimSqlOutsideQuotes(sql: string): string {
  // Matches '...', '', or non-quote characters (including escaped '')
  return sql.replace(/('(?:''|[^'])*')|\s+/g, (_match, group1) => {
    if (group1) return group1; // It's a string literal, keep as is
    return ' '; // It's whitespace, collapse to single space
  }).trim();
}

export function parseSqlLogs(content: string, options: { trimSql?: boolean } = {}): DaoSession[] {
    const lines = content.split('\n');
    const sessions: DaoSession[] = [];
    let currentSession: DaoSession | null = null;
    const sessionStack: DaoSession[] = [];

    // Local state to link SQL with Parameters via id
    const activeSqls = new Map<string, string>();
    // Global map to check for orphans in third pass
    const globalSqlMap = new Map<string, string>();

    lines.forEach((line, index) => {
        // 1. Timestamp extraction (YYYY-MM-DD HH:mm:ss)
        const timeMatch = line.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
        const timestamp = timeMatch ? timeMatch[0] : "";

        // 2. DAO Session Boundary
        // Pattern: InvokeDao ,Daoの開始[FullClassName]
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

        // If no session started yet, create a dummy global one
        if (!currentSession) {
            currentSession = { daoName: "Global", logs: [] };
            sessions.push(currentSession);
            sessionStack.push(currentSession);
        }

        const log: LogEntry = {
            logIndex: index,
            timestamp,
            rawLine: line,
            type: 'other',
            daoName: currentSession.daoName
        };

        // 3. SQL Detection (Extract Raw SQL and store by ID)
        // Pattern: CreatePreparedStatement id=([a-f0-9]+) sql=(.*)
        const sqlMatch = line.match(/CreatePreparedStatement id=([a-f0-9]+)\s+sql=(.*)/);
        if (sqlMatch) {
            const id = sqlMatch[1];
            let sqlText = sqlMatch[2].trim();
            if (options.trimSql) {
                sqlText = trimSqlOutsideQuotes(sqlText);
            }
            activeSqls.set(id, sqlText);
            globalSqlMap.set(id.toLowerCase(), sqlText);
        }

        // 3.5 Direct SQL Detection (UseCommand= sql=...)
        const directSqlMatch = line.match(/UseCommand=\s*sql=(.*)/);
        if (directSqlMatch) {
            let sqlText = directSqlMatch[1].trim();
            if (options.trimSql) {
                sqlText = trimSqlOutsideQuotes(sqlText);
            }
            log.reconstructedSql = sqlText;
            log.type = 'sql';
            
            const uniqIdMatch = line.match(/uniq_id=\((.*?)\)/);
            if (uniqIdMatch) {
                log.id = uniqIdMatch[1];
                globalSqlMap.set(log.id.toLowerCase(), sqlText);
            }
        }

        // 4. Parameter Detection & Reconstruction
        // Pattern: PreparedStatement.executeQuery() id=30aa46e9 params=[STRING:1:SHIIRE]
        const paramMatch = line.match(/PreparedStatement\.executeQuery\(\) id=([a-f0-9]+)\s+params=(.*)/);
        if (paramMatch) {
            const id = paramMatch[1];
            const pstr = paramMatch[2].trim();
            const rawSql = activeSqls.get(id);
            
            log.id = id;
            log.paramsString = pstr;

            if (rawSql) {
                // Parse params like [TYPE:INDEX:VALUE]
                const params: string[] = [];
                const pRegex = /\[.*?:.*?:(.*?)\]/g;
                let m;
                while ((m = pRegex.exec(pstr)) !== null) {
                    params.push(m[1]);
                }

                // Reconstruct SQL
                let rSql = rawSql;
                params.forEach(p => {
                    rSql = rSql.replace('?', isNaN(Number(p)) ? `'${p}'` : p);
                });

                log.reconstructedSql = rSql;
                log.type = 'sql';
                
                // Cleanup MAP if needed, though often IDs are reused
                // activeSqls.delete(id); 
            }
        }

        currentSession.logs.push(log);
    });

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

    return sessions;
}
