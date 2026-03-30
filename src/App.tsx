import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { LogLine, LogChunk } from "./types";
import FilterBar from "./components/FilterBar";
import LogViewer from "./components/LogViewer";
import StatusBar from "./components/StatusBar";
import "./index.css";

const PAGE_SIZE = 500;

function App() {
  const [filePath, setFilePath] = useState<string>("");
  const [lines, setLines] = useState<LogLine[]>([]);
  const [page, setPage] = useState<number>(0);
  const [totalLines, setTotalLines] = useState<number>(0);
  const [pattern, setPattern] = useState<string>("");
  const [isTailing, setIsTailing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [encoding, setEncoding] = useState<string>("auto");

  const fetchPage = useCallback(async (path: string, pageNum: number, enc: string) => {
    setIsLoading(true);
    try {
      const chunk: LogChunk = await invoke("cmd_read_page", {
        path,
        page: pageNum,
        pageSize: PAGE_SIZE,
        encoding: enc === "auto" ? null : enc,
      });
      setLines(chunk.lines);
      setTotalLines(chunk.total_lines);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to read page:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileOpen = async (path: string) => {
    setFilePath(path);
    setPattern("");
    setIsTailing(false);
    await fetchPage(path, 0, encoding);
  };

  const handleEncodingChange = async (newEnc: string) => {
    setEncoding(newEnc);
    if (!filePath) return;
    if (isTailing) {
      await invoke("cmd_stop_tail");
      setIsTailing(false);
    }
    await fetchPage(filePath, page, newEnc);
  };

  const handleSearch = async () => {
    if (!filePath || !pattern) {
      if (filePath) await fetchPage(filePath, 0, encoding);
      return;
    }
    setIsLoading(true);
    try {
      const filtered: LogLine[] = await invoke("cmd_filter_log", {
        path: filePath,
        pattern,
        maxResults: 2000,
        encoding: encoding === "auto" ? null : encoding,
      });
      setLines(filtered);
      setTotalLines(filtered.length);
      setPage(0);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTail = async () => {
    if (!filePath) return;

    if (isTailing) {
      await invoke("cmd_stop_tail");
      setIsTailing(false);
    } else {
      setLines([]); // Clear before tailing
      try {
        await invoke("cmd_start_tail", { 
          path: filePath,
          encoding: encoding === "auto" ? null : encoding
        });
        setIsTailing(true);
      } catch (err) {
        console.error("Failed to start tail:", err);
      }
    }
  };

  useEffect(() => {
    let unlisten: any;
    const setupListener = async () => {
      unlisten = await listen<LogLine[]>("log:new-lines", (event) => {
        setLines((prev) => [...prev, ...event.payload]);
        setTotalLines((prev) => prev + event.payload.length);
      });
    };
    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const totalPages = Math.ceil(totalLines / PAGE_SIZE);

  return (
    <div className="app-container">
      <FilterBar
        filePath={filePath}
        pattern={pattern}
        isTailing={isTailing}
        encoding={encoding}
        onFileOpen={handleFileOpen}
        onPatternChange={setPattern}
        onEncodingChange={handleEncodingChange}
        onSearch={handleSearch}
        onToggleTail={toggleTail}
      />
      <main className="main-content">
        <LogViewer lines={lines} isTailing={isTailing} />
      </main>
      <div className="pagination-bar">
        {!isTailing && filePath && (
          <div className="pagination-controls">
            <button
              disabled={page === 0 || isLoading}
              onClick={() => fetchPage(filePath, page - 1, encoding)}
            >
              Previous
            </button>
            <span>Page {page + 1} of {totalPages || 1}</span>
            <button
              disabled={page >= totalPages - 1 || isLoading}
              onClick={() => fetchPage(filePath, page + 1, encoding)}
            >
              Next
            </button>
          </div>
        )}
      </div>
      <StatusBar
        totalLines={totalLines}
        currentPage={page}
        totalPages={totalPages}
        isTailing={isTailing}
        filePath={filePath}
      />
    </div>
  );
}

export default App;
