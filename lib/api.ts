import { ApiResponse, WebScorerResponse, ChronoSyncError, SuccessResponse } from '@/types';
import { API_CONFIG, WEBSCORER_CONFIG, ERROR_CODES } from '@/lib/constants';

/**
 * API共通処理とユーティリティ
 */

/**
 * タイムアウト付きfetch
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = API_CONFIG.timeout
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ChronoSyncError(
        'リクエストがタイムアウトしました',
        ERROR_CODES.EXTERNAL_API_ERROR,
        408
      );
    }
    throw error;
  }
}

/**
 * リトライ機能付きfetch
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = API_CONFIG.retryAttempts
): Promise<Response> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      // 5xx エラーの場合はリトライ対象
      if (response.status >= 500 && attempt < maxRetries) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = API_CONFIG.retryDelay * Math.pow(2, attempt); // 指数バックオフ
        await new Promise(resolve => setTimeout(resolve, delay));
        console.warn(`Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
      }
    }
  }

  throw lastError!;
}

/**
 * SWR用のfetcher関数
 */
export const fetcher = async <T>(url: string): Promise<T> => {
  try {
    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      throw new ChronoSyncError(
        `API request failed: ${response.status} ${response.statusText}`,
        ERROR_CODES.EXTERNAL_API_ERROR,
        response.status
      );
    }

    const data: ApiResponse<T> = await response.json();
    
    if (!data.success) {
      throw new ChronoSyncError(
        data.error,
        ERROR_CODES.EXTERNAL_API_ERROR,
        400
      );
    }

    return data.data;
  } catch (error) {
    if (error instanceof ChronoSyncError) {
      throw error;
    }
    
    console.error('Fetcher error:', error);
    throw new ChronoSyncError(
      'データの取得に失敗しました',
      ERROR_CODES.EXTERNAL_API_ERROR,
      500
    );
  }
};

/**
 * WebScorer API呼び出し（実際のAPI仕様に基づく）
 */
export async function fetchWebScorerResults(raceId: string): Promise<WebScorerResponse> {
  const apiId = WEBSCORER_CONFIG.apiId;
  
  if (!apiId) {
    throw new ChronoSyncError(
      'WebScorer API IDが設定されていません',
      ERROR_CODES.EXTERNAL_API_ERROR,
      500
    );
  }

  const url = `${WEBSCORER_CONFIG.baseUrl}${WEBSCORER_CONFIG.endpoints.raceResults(raceId, apiId)}`;
  
  try {
    const response = await fetchWithRetry(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ChronoSync/1.0',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new ChronoSyncError(
          `レースID ${raceId} が見つかりません`,
          ERROR_CODES.NOT_FOUND,
          404
        );
      } else if (response.status === 401 || response.status === 403) {
        throw new ChronoSyncError(
          'WebScorer APIの認証に失敗しました。API IDを確認してください',
          ERROR_CODES.EXTERNAL_API_ERROR,
          401
        );
      } else {
        throw new ChronoSyncError(
          `WebScorer API error: ${response.status}`,
          ERROR_CODES.EXTERNAL_API_ERROR,
          response.status
        );
      }
    }

    const data: WebScorerResponse | { Error: string } = await response.json();
    
    // エラーレスポンスのチェック
    if ('Error' in data) {
      throw new ChronoSyncError(
        `WebScorer API Error: ${data.Error}`,
        ERROR_CODES.EXTERNAL_API_ERROR,
        400
      );
    }
    
    // データ構造の基本検証
    if (!data.RaceInfo || !data.Results) {
      throw new ChronoSyncError(
        'WebScorer APIレスポンスの形式が無効です',
        ERROR_CODES.EXTERNAL_API_ERROR,
        500
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ChronoSyncError) {
      throw error;
    }
    
    console.error('WebScorer API error:', error);
    throw new ChronoSyncError(
      'WebScorer APIからのデータ取得に失敗しました',
      ERROR_CODES.EXTERNAL_API_ERROR,
      500
    );
  }
}

/**
 * WebScorerレスポンスを内部形式に正規化
 */
export function normalizeWebScorerResponse(webScorerData: WebScorerResponse): {
  raceInfo: {
    id: string;
    name: string;
    date: string;
    sport: string;
    location?: string;
  };
  results: Array<{
    grouping: {
      name: string;
      overall?: boolean;
      category?: string;
      gender?: string;
    };
    racers: Array<{
      place: string;
      bib: string;
      name: string;
      time: string;
      category?: string;
      age?: string;
      gender?: string;
      team?: string;
      difference?: string;
      percentBack?: string;
    }>;
  }>;
} {
  return {
    raceInfo: {
      id: webScorerData.RaceInfo.RaceId.toString(),
      name: webScorerData.RaceInfo.Name,
      date: webScorerData.RaceInfo.Date,
      sport: webScorerData.RaceInfo.Sport,
      location: webScorerData.RaceInfo.City ? 
        `${webScorerData.RaceInfo.City}${webScorerData.RaceInfo.Country ? `, ${webScorerData.RaceInfo.Country}` : ''}` : 
        undefined,
    },
    results: webScorerData.Results.map(result => ({
      grouping: {
        name: result.Grouping.Overall ? 'Overall' : 
              result.Grouping.Category || 
              result.Grouping.Gender || 
              'その他',
        overall: result.Grouping.Overall,
        category: result.Grouping.Category,
        gender: result.Grouping.Gender,
      },
      racers: result.Racers.map(racer => ({
        place: racer.Place,
        bib: racer.Bib,
        name: racer.Name,
        time: racer.Time,
        category: racer.Category,
        age: racer.Age?.toString(),
        gender: racer.Gender,
        team: racer.TeamName || undefined,
        difference: racer.Difference,
        percentBack: racer.PercentBack,
      })),
    })),
  };
}

/**
 * 成功レスポンスを作成
 */
export function createSuccessResponse<T>(
  data: T,
  metadata?: {
    lastUpdated?: string;
    cacheHit?: boolean;
    cacheAge?: number;
  }
): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...metadata,
  };
}

export function createErrorResponse(
  error: string,
  details?: string
): ApiResponse<never> {
  return {
    success: false,
    error,
    details,
  };
}

/**
 * エラーハンドリングヘルパー
 */
export function handleApiError(error: unknown): ApiResponse<never> {
  if (error instanceof ChronoSyncError) {
    return createErrorResponse(error.message, error.code);
  }
  
  if (error instanceof Error) {
    console.error('Unexpected API error:', error);
    return createErrorResponse(
      'サーバーエラーが発生しました',
      ERROR_CODES.INTERNAL_ERROR
    );
  }
  
  console.error('Unknown API error:', error);
  return createErrorResponse(
    '予期しないエラーが発生しました',
    ERROR_CODES.INTERNAL_ERROR
  );
}

/**
 * バリデーションヘルパー
 */
export function validateRequired<T>(
  value: T | undefined | null,
  fieldName: string
): T {
  if (value === undefined || value === null || value === '') {
    throw new ChronoSyncError(
      `${fieldName}は必須です`,
      ERROR_CODES.VALIDATION_ERROR,
      400
    );
  }
  return value;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && !!dateString.match(/^\d{4}-\d{2}-\d{2}$/);
}

/**
 * URLパラメータのヘルパー
 */
export function getQueryParam(
  query: { [key: string]: string | string[] | undefined },
  key: string
): string | undefined {
  const value = query[key];
  return Array.isArray(value) ? value[0] : value;
}

export function getRequiredQueryParam(
  query: { [key: string]: string | string[] | undefined },
  key: string
): string {
  const value = getQueryParam(query, key);
  if (!value) {
    throw new ChronoSyncError(
      `パラメータ ${key} は必須です`,
      ERROR_CODES.VALIDATION_ERROR,
      400
    );
  }
  return value;
}

/**
 * レスポンス時間計測ヘルパー
 */
export function createTimestamp(): string {
  return new Date().toISOString();
}

export function calculateCacheAge(timestamp: string): number {
  const now = new Date().getTime();
  const cacheTime = new Date(timestamp).getTime();
  return Math.floor((now - cacheTime) / 1000); // 秒単位
} 