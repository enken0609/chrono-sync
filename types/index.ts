// スポーツ競技種別
export type SportType = 
  | 'trail-running' 
  | 'sky-running' 
  | 'ultra-running' 
  | 'mountain-running' 
  | 'road-running'
  | 'triathlon'
  | 'cycling'
  | 'other';

// イベント（大会）
export interface Event {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  description?: string;
  status: 'upcoming' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// レース
export interface Race {
  id: string;
  eventId: string;
  name: string;
  category: string;
  webScorerRaceId?: string;
  status: 'preparing' | 'active' | 'completed';
  sportType: SportType;
  createdAt: string;
  updatedAt: string;
}

// WebScorer参加者結果（実際のAPIレスポンス構造）
export interface WebScorerRacer {
  Place: string;
  Bib: string;
  Name: string;
  TeamName?: string | null;
  Category?: string;
  Age?: number;
  Gender?: string;
  Time: string;
  Difference?: string;
  PercentBack?: string;
  PercentWinning?: string;
  PercentAverage?: string;
  PercentMedian?: string;
  StartTime?: string;
}

// WebScorerグループ化された結果（実際のAPIレスポンス構造）
export interface WebScorerGrouping {
  Grouping: {
    Overall?: boolean;
    Category?: string;
    Gender?: string;
    Distance?: string;
  };
  Racers: WebScorerRacer[];
}

// WebScorer APIレスポンス（実際の構造）
export interface WebScorerResponse {
  RaceInfo: {
    RaceId: number;
    Name: string;
    DisplayURL: string;
    Date: string;
    Sport: string;
    StartTime?: string;
    Country?: string;
    City?: string;
    Latitude?: number;
    Longitude?: number;
    StartType?: string;
    CompletionState?: string;
    ResultsOrder?: string;
    TimedOn?: string;
    TimedWith?: string;
    Visibility?: string;
    UpdatedFrom?: string;
    UpdatedTime?: string;
    ImageUrl?: string;
  };
  Results: WebScorerGrouping[];
}

// 内部使用用の正規化された参加者結果
export interface RaceResult {
  place: string;
  bib: string;
  name: string;
  time: string;
  category?: string;
  age?: string;
  gender?: string;
  team?: string;
  status?: 'finished' | 'dnf' | 'dns' | 'dsq';
  difference?: string;
  percentBack?: string;
}

// 内部使用用の正規化されたグループ化結果
export interface RaceGrouping {
  name: string;
  overall?: boolean;
  category?: string;
  gender?: string;
  ageGroup?: string;
  racers: RaceResult[];
}

// キャッシュされたレース結果
export interface CachedRaceResults {
  raceId: string;
  results: WebScorerResponse;
  lastUpdated: string;
  cacheAge: number;
}

// API レスポンス型
export interface SuccessResponse<T> {
  success: true;
  data: T;
  lastUpdated?: string;
  cacheHit?: boolean;
  cacheAge?: number;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// 認証関連
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthUser {
  username: string;
  role: 'admin';
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}

// 管理画面用フォーム
export interface EventFormData {
  name: string;
  date: string;
  description?: string;
}

export interface RaceFormData {
  name: string;
  category: string;
  webScorerRaceId?: string;
}

// 統計情報
export interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  totalRaces: number;
  activeRaces: number;
  lastUpdated: string;
}

// 設定関連
export interface CacheSettings {
  raceResultsTtl: number; // 秒
  eventListTtl: number; // 秒
  dashboardStatsTtl: number; // 秒
}

export interface SystemSettings {
  cache: CacheSettings;
  lastUpdated: string;
}

// KVストレージキー
export interface KVKeys {
  eventsList: 'events:list';
  eventInfo: (eventId: string) => `event:${string}:info`;
  eventRaces: (eventId: string) => `event:${string}:races`;
  raceConfig: (raceId: string) => `race:${string}:config`;
  raceResults: (raceId: string) => `race:${string}:results`;
  raceTimestamp: (raceId: string) => `race:${string}:timestamp`;
}

// エラー型
export class ChronoSyncError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ChronoSyncError';
  }
}

// フィルター条件
export interface EventFilters {
  status?: Event['status'];
  search?: string;
}

export interface RaceFilters {
  category?: string;
  status?: Race['status'];
  search?: string;
} 