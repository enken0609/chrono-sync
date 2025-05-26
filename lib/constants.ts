/**
 * システム全体で使用する定数定義
 */

// サイト設定
export const SITE_CONFIG = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'ChronoSync',
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Real-time race results synchronization platform',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@chrono-sync.com',
  defaultOrganizer: process.env.NEXT_PUBLIC_DEFAULT_ORGANIZER || 'Race Organization',
} as const;

// カラー設定
export const COLORS = {
  brand: {
    primary: process.env.NEXT_PUBLIC_BRAND_COLOR || '#6366F1',
    accent: process.env.NEXT_PUBLIC_ACCENT_COLOR || '#8B5CF6',
  },
  race: {
    preparing: '#F59E0B',
    active: '#10B981',
    completed: '#6B7280',
  },
} as const;

// レースステータスの表示名
export const RACE_STATUS_LABELS = {
  preparing: '準備中',
  active: '進行中',
  completed: '完了',
} as const;

// イベントステータスの表示名
export const EVENT_STATUS_LABELS = {
  upcoming: '開催予定',
  active: '開催中',
  completed: '完了',
} as const;

// キャッシュ設定
export const CACHE_CONFIG = {
  raceResults: {
    ttl: 180, // 3分
    staleWhileRevalidate: 300, // 5分
  },
  eventList: {
    ttl: 3600, // 1時間
    staleWhileRevalidate: 7200, // 2時間
  },
  dashboardStats: {
    ttl: 300, // 5分
    staleWhileRevalidate: 600, // 10分
  },
} as const;

// API設定
export const API_CONFIG = {
  timeout: 10000, // 10秒
  retryAttempts: 3,
  retryDelay: 1000, // 1秒
} as const;

// JWT設定
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'default-jwt-secret',
  expiresIn: '7d',
  algorithm: 'HS256' as const,
} as const;

// KVキー生成関数
export const KV_KEYS = {
  eventsList: 'events:list' as const,
  eventInfo: (eventId: string) => `event:${eventId}:info`,
  eventRaces: (eventId: string) => `event:${eventId}:races`,
  raceConfig: (raceId: string) => `race:${raceId}:config`,
  raceResults: (raceId: string) => `race:${raceId}:results`,
  raceTimestamp: (raceId: string) => `race:${raceId}:timestamp`,
} as const;

// エラーコード
export const ERROR_CODES = {
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
} as const;

// WebScorer API設定（実際のAPI仕様に基づく）
export const WEBSCORER_CONFIG = {
  apiId: process.env.WEBSCORER_API_ID || '',
  baseUrl: 'https://www.webscorer.com',
  endpoints: {
    raceResults: (raceId: string, apiId: string) => `/json/race?raceid=${raceId}&apiid=${apiId}`,
    myPostedRaces: (apiId: string) => `/json/mypostedraces?apiid=${apiId}`,
    startList: (raceId: string, apiId: string) => `/json/startlist?raceid=${raceId}&apiid=${apiId}`,
  },
} as const;

// SWR設定
export const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 5000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  loadingTimeout: 30000,
} as const;

// ページネーション設定
export const PAGINATION_CONFIG = {
  defaultPageSize: 20,
  maxPageSize: 100,
} as const; 