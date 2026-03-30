import React from "react";

interface StatusBarProps {
  totalLines: number;
  currentPage: number;
  totalPages: number;
  isTailing: boolean;
  filePath: string;
}

const StatusBar: React.FC<StatusBarProps> = ({
  totalLines,
  currentPage,
  totalPages,
  isTailing,
  filePath,
}) => {
  return (
    <div className="status-bar">
      <div className="status-item">
        <strong>File:</strong> {filePath || "none"}
      </div>
      <div className="status-item">
        <strong>Total Lines:</strong> {totalLines}
      </div>
      <div className="status-item">
        <strong>Page:</strong> {currentPage + 1} / {totalPages}
      </div>
      {isTailing && (
        <div className="status-item tail-indicator">
          <span className="dot"></span> TAILING
        </div>
      )}
    </div>
  );
};

export default StatusBar;
