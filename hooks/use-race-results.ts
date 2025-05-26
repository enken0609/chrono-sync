import useSWR from 'swr';
import { WebScorerResponse, SuccessResponse } from '@/types';
import { SWR_CONFIG } from '@/lib/constants';

// カスタムfetcher（メタデータも取得）
const fetcherWithMetadata = async (url: string): Promise<SuccessResponse<WebScorerResponse>> => {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
};

// レース結果APIのレスポンス型
export interface RaceResultsResponse {
  raceInfo: WebScorerResponse['RaceInfo'];
  results: WebScorerResponse['Results'];
  lastUpdated: string;
  cacheHit?: boolean;
  cacheAge?: number;
}

/**
 * レース結果取得用のSWRフック
 */
export function useRaceResults(raceId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<SuccessResponse<WebScorerResponse>>(
    raceId ? `/api/races/${raceId}/results` : null,
    fetcherWithMetadata,
    {
      revalidateOnFocus: SWR_CONFIG.revalidateOnFocus,
      revalidateOnReconnect: SWR_CONFIG.revalidateOnReconnect,
      dedupingInterval: SWR_CONFIG.dedupingInterval,
      errorRetryCount: SWR_CONFIG.errorRetryCount,
      errorRetryInterval: SWR_CONFIG.errorRetryInterval,
      loadingTimeout: SWR_CONFIG.loadingTimeout,
    }
  );

  // APIレスポンスから正規化されたデータを作成
  const normalizedData: RaceResultsResponse | undefined = data ? {
    raceInfo: data.data.RaceInfo,
    results: data.data.Results,
    lastUpdated: data.lastUpdated || new Date().toISOString(),
    cacheHit: data.cacheHit || false,
    cacheAge: data.cacheAge || 0,
  } : undefined;

  return {
    data: normalizedData,
    error,
    isLoading,
    mutate,
  };
}

/**
 * 手動更新機能付きレース結果フック
 */
export function useRaceResultsWithRefresh(raceId: string | null) {
  const { data, error, isLoading, mutate } = useRaceResults(raceId);

  const refresh = async (): Promise<void> => {
    if (!raceId) return;
    
    try {
      // キャッシュを無効化して再取得
      await mutate();
    } catch (error) {
      console.error('Failed to refresh race results:', error);
      throw error;
    }
  };

  const forceRefresh = async (): Promise<void> => {
    if (!raceId) return;
    
    try {
      // サーバーサイドキャッシュも無効化
      const response = await fetch(`/api/races/${raceId}/results?force=true`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Force refresh failed');
      }
      
      // クライアントキャッシュを更新
      await mutate();
    } catch (error) {
      console.error('Failed to force refresh race results:', error);
      throw error;
    }
  };

  return {
    data,
    error,
    isLoading,
    refresh,
    forceRefresh,
  };
}