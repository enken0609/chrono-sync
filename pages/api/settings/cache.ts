import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createSuccessResponse, 
  handleApiError
} from '@/lib/api';
import { kvJson } from '@/lib/kv';
import { CACHE_CONFIG } from '@/lib/constants';

interface CacheSettings {
  raceResultsTtl: number; // 秒
  eventListTtl: number; // 秒
  dashboardStatsTtl: number; // 秒
}

interface SystemSettings {
  cache: CacheSettings;
  lastUpdated: string;
}

/**
 * フロントエンド用キャッシュ設定取得API（認証不要）
 * GET /api/settings/cache
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    if (req.method === 'GET') {
      // 設定を取得
      const settings = await kvJson.get<SystemSettings>('system:settings');
      
      // 設定が存在しない場合はデフォルト値を返す
      const cacheSettings: CacheSettings = settings?.cache || {
        raceResultsTtl: CACHE_CONFIG.raceResults.ttl,
        eventListTtl: CACHE_CONFIG.eventList.ttl,
        dashboardStatsTtl: CACHE_CONFIG.dashboardStats.ttl,
      };

      return res.status(200).json(createSuccessResponse(cacheSettings));
    } else {
      return res.status(405).json(handleApiError(new Error('Method not allowed')));
    }
  } catch (error) {
    console.error('Cache settings API error:', error);
    return res.status(500).json(handleApiError(error));
  }
} 