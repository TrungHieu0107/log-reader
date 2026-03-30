import React from "react";
import { open } from "@tauri-apps/plugin-dialog";

interface FilterBarProps {
  filePath: string;
  pattern: string;
  isTailing: boolean;
  onFileOpen: (path: string) => void;
  onPatternChange: (p: string) => void;
  onSearch: () => void;
  onToggleTail: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filePath,
  pattern,
  isTailing,
  onFileOpen,
  onPatternChange,
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
