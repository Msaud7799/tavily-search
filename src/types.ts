export type ActionType = 'search' | 'extract' | 'crawl' | 'map' | 'research';

// ── Search ──
export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyResponse {
  answer?: string;
  query: string;
  response_time: number;
  results: SearchResult[];
  images?: string[];
}

// ── Extract ──
export interface ExtractResult {
  url: string;
  raw_content: string;
  images?: string[];
  favicon?: string;
}

export interface ExtractResponse {
  results: ExtractResult[];
  failed_results: { url: string; error: string }[];
  response_time: number;
}

// ── Crawl ──
export interface CrawlResult {
  url: string;
  raw_content: string;
  favicon?: string;
}

export interface CrawlResponse {
  base_url: string;
  results: CrawlResult[];
  response_time: number;
}

// ── Map ──
export interface MapResponse {
  base_url: string;
  results: string[]; // array of discovered URLs
  response_time: number;
}

// ── Research ──
export interface ResearchSource {
  title: string;
  url: string;
  favicon?: string;
}

export interface ResearchResponse {
  request_id: string;
  created_at?: string;
  status: 'pending' | 'completed' | 'failed';
  content?: string;
  sources?: ResearchSource[];
  response_time?: number;
  input?: string;
  model?: string;
}

// ── Search History ──
export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}
