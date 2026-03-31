export interface LogEntry {
  logIndex: number;
  timestamp: string;
  type: 'sql' | 'other';
  rawLine: string;
  reconstructedSql?: string;
  daoName?: string;
}

export interface DaoSession {
  daoName: string;
  logs: LogEntry[];
}

export function parseSqlLogs(content: string): DaoSession[] {
    const lines = content.split('\n');
    const sessions: DaoSession[] = [];
    let currentSession: DaoSession | null = null;

    // Local state to link SQL with Parameters via id
    const activeSqls = new Map<string, string>();

    lines.forEach((line, index) => {
        // 1. Timestamp extraction (YYYY-MM-DD HH:mm:ss)
        const timeMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
        const timestamp = timeMatch ? timeMatch[1] : "";

        // 2. DAO Session Boundary
        // Pattern: InvokeDao ,Daoの開始[FullClassName]
        const daoStartMatch = line.match(/Daoの開始(.*?)(?:\s|$)/);
        if (daoStartMatch) {
            const daoName = daoStartMatch[1].trim().split('.').pop() || "UnknownDao";
            currentSession = { daoName, logs: [] };
            sessions.push(currentSession);
        }

        // If no session started yet, create a dummy global one
        if (!currentSession) {
            currentSession = { daoName: "Global", logs: [] };
            sessions.push(currentSession);
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
            const sqlText = sqlMatch[2].trim();
            activeSqls.set(id, sqlText);
        }

        // 4. Parameter Detection & Reconstruction
        // Pattern: PreparedStatement.executeQuery() id=30aa46e9 params=[STRING:1:SHIIRE]
        const paramMatch = line.match(/PreparedStatement\.executeQuery\(\) id=([a-f0-9]+)\s+params=(.*)/);
        if (paramMatch) {
            const id = paramMatch[1];
            const pstr = paramMatch[2].trim();
            const rawSql = activeSqls.get(id);

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

    return sessions;
}
