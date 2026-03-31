import { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { format, SqlLanguage } from 'sql-formatter';
import { Check, Copy, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sql: string;
}

const DIALECTS: { label: string, value: SqlLanguage }[] = [
  { label: 'Standard SQL', value: 'sql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'T-SQL', value: 'tsql' },
  { label: 'PL/SQL', value: 'plsql' },
  { label: 'SQLite', value: 'sqlite' },
  { label: 'DB2', value: 'db2' },
  { label: 'MariaDB', value: 'mariadb' },
  { label: 'BigQuery', value: 'bigquery' },
  { label: 'Snowflake', value: 'snowflake' }
];

export function SqlFormatterModal({ isOpen, onClose, sql }: Props) {
  const [dialect, setDialect] = useState<SqlLanguage>('sql');
  const [formattedSql, setFormattedSql] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && sql) {
      try {
        const formatted = format(sql, { language: dialect });
        setFormattedSql(formatted);
      } catch (err) {
        setFormattedSql(sql); // fallback
      }
    }
  }, [isOpen, sql, dialect]);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-10"
      onClick={onClose}
    >
      <div 
        className="flex flex-col w-full h-full max-w-5xl shadow-2xl overflow-hidden rounded-md"
        style={{ backgroundColor: '#1E1E1E', border: '1px solid #454545' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* VSCode Tab Bar Header */}
        <div 
          className="flex items-center justify-between px-3 select-none"
          style={{ backgroundColor: '#252526', borderBottom: '1px solid #2D2D2D' }}
        >
          <div className="flex">
            <div 
               className="px-4 py-2 text-sm text-white flex items-center bg-[#1E1E1E]"
               style={{ borderTop: '2px solid #007ACC' }}
            >
              query.sql
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <select
              title="Select SQL Dialect"
              className="text-xs px-2 py-1 rounded bg-[#3C3C3C] text-gray-300 border-[#454545] focus:outline-none"
              value={dialect}
              onChange={(e) => setDialect(e.target.value as SqlLanguage)}
            >
               {DIALECTS.map(d => (
                 <option key={d.value} value={d.value}>{d.label}</option>
               ))}
            </select>
            <button 
              onClick={onClose} 
              className="p-1 hover:bg-[#3C3C3C] rounded text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 relative">
          <Editor
            height="100%"
            language="sql"
            theme="vs-dark"
            value={formattedSql}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              fontSize: 14,
            }}
          />
          <button
            onClick={handleCopy}
            className="absolute top-4 right-6 flex items-center px-3 py-1.5 bg-[#3C3C3C] hover:bg-[#4D4D4D] text-white text-xs rounded transition-colors shadow"
          >
            {copied ? <Check size={14} className="mr-1.5 text-green-400" /> : <Copy size={14} className="mr-1.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* VSCode Status Bar Footer */}
        <div 
          className="flex items-center px-3 py-1 text-xs select-none"
          style={{ backgroundColor: '#007ACC', color: 'white' }}
        >
          <span className="mr-4">Formatted SQL</span>
          <span>{dialect.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
