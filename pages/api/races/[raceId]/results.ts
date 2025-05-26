import { NextApiRequest, NextApiResponse } from 'next';
import { 
  fetchWebScorerResults, 
  createSuccessResponse, 
  handleApiError,
  getRequiredQueryParam,
  createTimestamp,
  calculateCacheAge
} from '@/lib/api';
import { kv, kvJson } from '@/lib/kv';
import { KV_KEYS, CACHE_CONFIG } from '@/lib/constants';
import { WebScorerResponse, Race } from '@/types';

interface SystemSettings {
  cache: {
    raceResultsTtl: number;
    eventListTtl: number;
    dashboardStatsTtl: number;
  };
  lastUpdated: string;
}

/**
 * 設定からTTL値を取得
 */
async function getCacheTtl(): Promise<number> {
  try {
    const settings = await kvJson.get<SystemSettings>('system:settings');
    return settings?.cache?.raceResultsTtl || CACHE_CONFIG.raceResults.ttl;
  } catch (error) {
    console.warn('Failed to get cache settings, using default TTL:', error);
    return CACHE_CONFIG.raceResults.ttl;
  }
}

/**
 * レース結果取得API（TTLベースキャッシュ）
 * GET /api/races/[raceId]/results
 * POST /api/races/[raceId]/results?force=true (強制更新)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    const raceId = getRequiredQueryParam(req.query, 'raceId');
    const forceRefresh = req.query.force === 'true' || req.method === 'POST';

    console.log(`API called for race ${raceId}, force: ${forceRefresh}`);

    // レース設定を取得してWebScorer Race IDを確認
    const raceConfig = await kvJson.get<Race>(KV_KEYS.raceConfig(raceId));
    
    if (!raceConfig) {
      return res.status(404).json(handleApiError(new Error('Race not found')));
    }

    if (!raceConfig.webScorerRaceId) {
      return res.status(400).json(handleApiError(new Error('WebScorer Race ID not configured for this race')));
    }

    const webScorerRaceId = raceConfig.webScorerRaceId;
    console.log(`Using WebScorer Race ID: ${webScorerRaceId} for race: ${raceId}`);

    // キャッシュキーの生成
    const cacheKey = KV_KEYS.raceResults(raceId);
    const timestampKey = KV_KEYS.raceTimestamp(raceId);

    let cachedData: WebScorerResponse | null = null;
    let cacheTimestamp: string | null = null;
    let shouldFetchNew = forceRefresh;

    if (!forceRefresh) {
      try {
        // キャッシュの確認
        cachedData = await kvJson.get<WebScorerResponse>(cacheKey);
        cacheTimestamp = await kv.get(timestampKey);

        if (cachedData && cacheTimestamp) {
          const cacheAge = calculateCacheAge(cacheTimestamp);
          
          // 完了したレースは長期キャッシュ、進行中は設定されたTTL
          const ttlLimit = raceConfig.status === 'completed' ? 30 * 24 * 60 * 60 : await getCacheTtl();
          
          if (cacheAge < ttlLimit) {
            console.log(`Cache hit for race ${raceId}, age: ${cacheAge}s, status: ${raceConfig.status}, TTL: ${ttlLimit}s`);
            
            return res.status(200).json(
              createSuccessResponse(cachedData, {
                lastUpdated: cacheTimestamp,
                cacheHit: true,
                cacheAge,
              })
            );
          } else {
            console.log(`Cache expired for race ${raceId}, age: ${cacheAge}s, TTL: ${ttlLimit}s`);
            shouldFetchNew = true;
          }
        } else {
          console.log(`No cache found for race ${raceId}`);
          shouldFetchNew = true;
        }
      } catch (cacheError) {
        console.warn(`Cache access failed for race ${raceId}:`, cacheError);
        shouldFetchNew = true;
      }
    }

    if (shouldFetchNew) {
      try {
        console.log(`Fetching fresh data for WebScorer race ${webScorerRaceId}`);
        
        // WebScorer APIから新しいデータを取得
        const freshData = await fetchWebScorerResults(webScorerRaceId);
        const timestamp = createTimestamp();

        try {
          // TTLを決定（完了したレースは30日、進行中は設定値）
          const ttl = raceConfig.status === 'completed' ? 30 * 24 * 60 * 60 : await getCacheTtl();
          
          // キャッシュに保存
          await Promise.all([
            kvJson.set(cacheKey, freshData, { ex: ttl }),
            kv.set(timestampKey, timestamp, { ex: ttl }),
          ]);
          
          console.log(`Fresh data cached for race ${raceId} (WebScorer: ${webScorerRaceId}) with TTL: ${ttl}s`);
        } catch (cacheError) {
          console.warn(`Failed to cache data for race ${raceId}:`, cacheError);
          // キャッシュ保存に失敗してもデータは返す
        }

        return res.status(200).json(
          createSuccessResponse(freshData, {
            lastUpdated: timestamp,
            cacheHit: false,
            cacheAge: 0,
          })
        );
      } catch (apiError) {
        console.error(`WebScorer API error for race ${raceId} (WebScorer: ${webScorerRaceId}):`, apiError);
        
        // API呼び出しに失敗した場合、古いキャッシュがあれば返却
        if (cachedData && cacheTimestamp) {
          const cacheAge = calculateCacheAge(cacheTimestamp);
          console.log(`Falling back to stale cache for race ${raceId}, age: ${cacheAge}s`);
          
          return res.status(200).json(
            createSuccessResponse(cachedData, {
              lastUpdated: cacheTimestamp,
              cacheHit: true,
              cacheAge,
            })
          );
        }
        
        // キャッシュもない場合はエラーを返す
        throw apiError;
      }
    }

    // ここには到達しないはずだが、念のため
    return res.status(500).json(
      handleApiError(new Error('Unexpected code path'))
    );

  } catch (error) {
    console.error('Race results API error:', error);
    return res.status(500).json(handleApiError(error));
  }
} 