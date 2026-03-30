export interface LogLine {
  index: number;
  content: string;
  offset: number;
}

export interface LogChunk {
  lines: LogLine[];
  total_lines: number;
  has_more: boolean;
}
