import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createSuccessResponse, 
  handleApiError,
  getRequiredQueryParam
} from '@/lib/api';
import { kvJson } from '@/lib/kv';
import { KV_KEYS } from '@/lib/constants';
import { Race } from '@/types';

/**
 * レース情報取得API（公開）
 * GET /api/races/[raceId]/info - レース基本情報取得
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json(handleApiError(new Error('Method not allowed')));
  }

  try {
    const raceId = getRequiredQueryParam(req.query, 'raceId');

    // レース設定を取得
    const race = await kvJson.get<Race>(KV_KEYS.raceConfig(raceId));
    
    if (!race) {
      return res.status(404).json(handleApiError(new Error('レースが見つかりません')));
    }

    return res.status(200).json(createSuccessResponse(race));
  } catch (error) {
    console.error('Race info API error:', error);
    return res.status(500).json(handleApiError(error));
  }
} 