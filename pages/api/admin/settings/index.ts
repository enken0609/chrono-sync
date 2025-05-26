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

// デフォルト設定
const DEFAULT_SETTINGS: SystemSettings = {
  cache: {
    raceResultsTtl: 180, // 3分
    eventListTtl: 3600, // 1時間
    dashboardStatsTtl: 300, // 5分
  },
  lastUpdated: createTimestamp(),
};

/**
 * システム設定API（管理者のみ）
 * GET /api/admin/settings - 設定取得
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // 認証チェック
  await requireAuthCheck(req, res);

  try {
    if (req.method === 'GET') {
      return await handleGetSettings(req, res);
    } else {
      return res.status(405).json(handleApiError(new Error('Method not allowed')));
    }
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json(handleApiError(error));
  }
}

/**
 * 設定取得
 */
async function handleGetSettings(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    // 設定を取得（存在しない場合はデフォルト設定を使用）
    let settings = await kvJson.get<SystemSettings>(SETTINGS_KEY);
    
    if (!settings) {
      // デフォルト設定を保存
      settings = DEFAULT_SETTINGS;
      await kvJson.set(SETTINGS_KEY, settings);
      console.log('Default settings initialized');
    }

    return res.status(200).json(createSuccessResponse(settings));
  } catch (error) {
    throw error;
  }
} 