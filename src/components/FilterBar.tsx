import React from "react";
import { open } from "@tauri-apps/plugin-dialog";

interface FilterBarProps {
  filePath: string;
  pattern: string;
  isTailing: boolean;
  encoding: string;
  onFileOpen: (path: string) => void;
  onPatternChange: (p: string) => void;
  onEncodingChange: (enc: string) => void;
  onSearch: () => void;
  onToggleTail: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filePath,
  pattern,
  isTailing,
  encoding,
  onFileOpen,
  onPatternChange,
  onEncodingChange,
  onSearch,
  onToggleTail,
}) => {
  const handleOpen = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Log Files", extensions: ["log", "txt", "out"] }],
    });
    if (selected && typeof selected === "string") {
      onFileOpen(selected);
    }
  };

  return (
    <div className="filter-bar">
      <button onClick={handleOpen} className="btn-primary">
        Open File
      </button>
      <div className="file-info">{filePath || "No file selected"}</div>
      
      <select 
        value={encoding} 
        onChange={(e) => onEncodingChange(e.target.value)}
        className="encoding-select"
        style={{ padding: '4px', marginRight: '8px' }}
      >
        <option value="auto">Auto-Detect</option>
        <option value="UTF-8">UTF-8</option>
        <option value="Windows-1252">Windows-1252</option>
        <option value="windows-1258">Windows-1258 (Vietnamese)</option>
        <option value="Shift_JIS">Shift-JIS (Japanese)</option>
        <option value="GBK">GBK (Chinese)</option>
      </select>

      <input
        type="text"
        placeholder="Regex pattern..."
        value={pattern}
        onChange={(e) => onPatternChange(e.target.value)}
        className="search-input"
      />
      <button onClick={onSearch} className="btn-secondary">
        Search
      </button>
      <button
        onClick={onToggleTail}
        className={`btn-tail ${isTailing ? "active" : ""}`}
      >
        {isTailing ? "Stop Tail" : "Live Tail"}
      </button>
    </div>
  );
};

export default FilterBar;
