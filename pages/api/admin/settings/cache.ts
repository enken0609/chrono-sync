import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createSuccessResponse, 
  handleApiError,
  createTimestamp
} from '@/lib/api';
import { requireAuthCheck } from '@/lib/auth';
import { kv, kvJson } from '@/lib/kv';

interface CacheSettings {
  raceResultsTtl: number; // 秒
  eventListTtl: number; // 秒
  dashboardStatsTtl: number; // 秒
}

interface SystemSettings {
  cache: CacheSettings;
  lastUpdated: string;
}

const SETTINGS_KEY = 'system:settings';

/**
 * キャッシュ設定API（管理者のみ）
 * PUT /api/admin/settings/cache - キャッシュ設定更新
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // 認証チェック
  await requireAuthCheck(req, res);

  try {
    if (req.method === 'PUT') {
      return await handleUpdateCacheSettings(req, res);
    } else {
      return res.status(405).json(handleApiError(new Error('Method not allowed')));
    }
  } catch (error) {
    console.error('Cache settings API error:', error);
    return res.status(500).json(handleApiError(error));
  }
}

/**
 * キャッシュ設定更新
 */
async function handleUpdateCacheSettings(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    const newCacheSettings: CacheSettings = req.body;

    // バリデーション
    if (!newCacheSettings.raceResultsTtl || !newCacheSettings.eventListTtl || !newCacheSettings.dashboardStatsTtl) {
      return res.status(400).json(handleApiError(new Error('すべてのTTL設定は必須です')));
    }

    // 範囲チェック
    if (newCacheSettings.raceResultsTtl < 30 || newCacheSettings.raceResultsTtl > 3600) {
      return res.status(400).json(handleApiError(new Error('レース結果TTLは30秒〜3600秒の範囲で設定してください')));
    }

    if (newCacheSettings.eventListTtl < 300 || newCacheSettings.eventListTtl > 86400) {
      return res.status(400).json(handleApiError(new Error('大会一覧TTLは300秒〜86400秒の範囲で設定してください')));
    }

    if (newCacheSettings.dashboardStatsTtl < 60 || newCacheSettings.dashboardStatsTtl > 3600) {
      return res.status(400).json(handleApiError(new Error('ダッシュボード統計TTLは60秒〜3600秒の範囲で設定してください')));
    }

    // 既存設定を取得
    const existingSettings = await kvJson.get<SystemSettings>(SETTINGS_KEY);
    
    if (!existingSettings) {
      return res.status(404).json(handleApiError(new Error('設定が見つかりません')));
    }

    // 新しい設定を作成
    const updatedSettings: SystemSettings = {
      ...existingSettings,
      cache: newCacheSettings,
      lastUpdated: createTimestamp(),
    };

    // 設定を保存
    await kvJson.set(SETTINGS_KEY, updatedSettings);

    console.log('Cache settings updated:', newCacheSettings);

    return res.status(200).json(createSuccessResponse({
      settings: updatedSettings,
      message: 'キャッシュ設定を更新しました',
    }));
  } catch (error) {
    throw error;
  }
} 