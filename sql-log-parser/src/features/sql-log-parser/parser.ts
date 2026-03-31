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

    let currentSql = "";
    let parameters: string[] = [];
    let collectingSql = false;

    lines.forEach((line, index) => {
        // very simplified dummy Java/Struts DAO SQL matching
        const timeMatch = line.match(/^(\d{2}:\d{2}:\d{2})/);
        const timestamp = timeMatch ? timeMatch[1] : "";

        // Example trigger for DAO: "Dao[UserDao]"
        const daoMatch = line.match(/Dao\[(.*?)\]/);
        
        let localDaoName = "UnknownDao";
        if (daoMatch) {
            localDaoName = daoMatch[1];
        }

        if (!currentSession || (daoMatch && currentSession.daoName !== localDaoName)) {
            currentSession = { daoName: localDaoName, logs: [] };
            sessions.push(currentSession);
        }

        const log: LogEntry = {
            logIndex: index,
            timestamp,
            rawLine: line,
            type: 'other',
            daoName: currentSession.daoName
        };

        if (line.includes("Preparing:")) {
            currentSql = line.split("Preparing:")[1].trim();
            parameters = [];
            collectingSql = true;
            log.type = 'other';
        } else if (line.includes("Parameters:") && collectingSql) {
            const pstr = line.split("Parameters:")[1].trim();
            if (pstr) {
                // simple parameter splitting
                parameters = pstr.split(",").map(p => p.trim());
            }
            
            // Reconstruct SQL: substitute ? with params
            let rSql = currentSql;
            for (const p of parameters) {
                // VERY rudimentary substitution
                rSql = rSql.replace("?", `'${p}'`);
            }
            log.reconstructedSql = rSql;
            log.type = 'sql';
            collectingSql = false;
        } else if (line.includes("Executed SQL:")) {
             log.reconstructedSql = line.split("Executed SQL:")[1].trim();
             log.type = 'sql';
        }

        currentSession.logs.push(log);
    });

    return sessions;
}
