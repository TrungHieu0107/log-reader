export interface FileReadResponse {
  content: string | null;
  is_binary: boolean;
  detected_encoding?: string | null;
  error: string | null;
}
