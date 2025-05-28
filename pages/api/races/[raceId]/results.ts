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

    // レース設定を取得してWebScorer Race IDを確認
    const raceConfig = await kvJson.get<Race>(KV_KEYS.raceConfig(raceId));
    
    if (!raceConfig) {
      return res.status(404).json(handleApiError(new Error('Race not found')));
    }

    if (!raceConfig.webScorerRaceId) {
      return res.status(400).json(handleApiError(new Error('WebScorer Race ID not configured for this race')));
    }

    const webScorerRaceId = raceConfig.webScorerRaceId;

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
            return res.status(200).json(
              createSuccessResponse(cachedData, {
                lastUpdated: cacheTimestamp,
                cacheHit: true,
                cacheAge,
              })
            );
          } else {
            shouldFetchNew = true;
          }
        } else {
          shouldFetchNew = true;
        }
      } catch (cacheError) {
        shouldFetchNew = true;
      }
    }

    if (shouldFetchNew) {
      try {
        // WebScorer APIから最新データを取得
        const newData = await fetchWebScorerResults(webScorerRaceId);
        const timestamp = createTimestamp();

        // キャッシュを更新
        await Promise.all([
          kvJson.set(cacheKey, newData),
          kv.set(timestampKey, timestamp),
        ]);

        return res.status(200).json(
          createSuccessResponse(newData, {
            lastUpdated: timestamp,
            cacheHit: false,
            cacheAge: 0,
          })
        );
      } catch (apiError) {
        // API呼び出しに失敗した場合、古いキャッシュがあれば返却
        if (cachedData && cacheTimestamp) {
          const cacheAge = calculateCacheAge(cacheTimestamp);
          
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
    return res.status(500).json(handleApiError(error));
  }
} 