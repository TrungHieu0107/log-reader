import React, { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { LogLine } from "../types";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

interface LogViewerProps {
  lines: LogLine[];
  isTailing: boolean;
}

const LogViewer: React.FC<LogViewerProps> = ({ lines, isTailing }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 10,
  });

  useEffect(() => {
    if (isTailing && lines.length > 0) {
      rowVirtualizer.scrollToIndex(lines.length - 1);
    }
  }, [lines.length, isTailing]);

  const getLogLevelClass = (content: string) => {
    const upper = content.toUpperCase();
    if (upper.includes("ERROR")) return "log-error";
    if (upper.includes("WARN")) return "log-warn";
    if (upper.includes("INFO")) return "log-info";
    if (upper.includes("DEBUG")) return "log-debug";
    return "";
  };

  const copyToClipboard = async (content: string) => {
    await writeText(content);
  };

  return (
    <div
      ref={parentRef}
      className="log-viewer-container"
      style={{
        height: "100%",
        width: "100%",
        overflow: "auto",
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const line = lines[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className={`log-line ${getLogLevelClass(line.content)}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                cursor: "pointer",
              }}
              onClick={() => copyToClipboard(line.content)}
            >
              <span className="line-number">{line.index + 1}</span>
              <span className="line-content">{line.content}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LogViewer;
