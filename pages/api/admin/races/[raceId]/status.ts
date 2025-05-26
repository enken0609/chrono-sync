import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createSuccessResponse, 
  handleApiError,
  getRequiredQueryParam,
  createTimestamp,
  fetchWebScorerResults
} from '@/lib/api';
import { requireAuthCheck } from '@/lib/auth';
import { kv, kvJson } from '@/lib/kv';
import { KV_KEYS, CACHE_CONFIG } from '@/lib/constants';
import { Race } from '@/types';

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
 * レースステータス管理API（管理者のみ）
 * PUT /api/admin/races/[raceId]/status - レースステータス更新
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // 認証チェック
  await requireAuthCheck(req, res);

  try {
    if (req.method !== 'PUT') {
      return res.status(405).json(handleApiError(new Error('Method not allowed')));
    }

    const raceId = getRequiredQueryParam(req.query, 'raceId');
    const { status } = req.body;

    // バリデーション
    if (!status) {
      return res.status(400).json(handleApiError(new Error('ステータスは必須です')));
    }

    const validStatuses: Race['status'][] = ['preparing', 'active', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(handleApiError(new Error('無効なステータスです')));
    }

    // 既存のレースを取得
    const existingRace = await kvJson.get<Race>(KV_KEYS.raceConfig(raceId));
    if (!existingRace) {
      return res.status(404).json(handleApiError(new Error('レースが見つかりません')));
    }

    // ステータス変更のバリデーション（柔軟な切り替えを許可）
    const statusTransitions: Record<Race['status'], Race['status'][]> = {
      preparing: ['active'],
      active: ['completed'],
      completed: ['active'], // 完了後も進行中に戻せる
    };

    const allowedTransitions = statusTransitions[existingRace.status];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json(handleApiError(
        new Error(`「${existingRace.status}」から「${status}」への変更はできません`)
      ));
    }

    // レースステータスを更新
    const updatedRace: Race = {
      ...existingRace,
      status,
      updatedAt: createTimestamp(),
    };

    // ステータス変更に応じたキャッシュ管理
    if (existingRace.webScorerRaceId) {
      try {
        console.log(`Updating cache for race ${raceId} (WebScorer: ${existingRace.webScorerRaceId}) - ${existingRace.status} -> ${status}`);
        
        // 最新結果を取得
        const latestResults = await fetchWebScorerResults(existingRace.webScorerRaceId);
        const timestamp = createTimestamp();
        
        // ステータスに応じてTTLを設定
        let ttl: number;
        let description: string;
        
        if (status === 'completed') {
          // 完了時は30日間の長期保存
          ttl = 30 * 24 * 60 * 60; // 30日
          description = '30日間';
        } else {
          // 進行中は設定されたTTL
          ttl = await getCacheTtl();
          description = `${ttl}秒`;
        }
        
        // キャッシュに保存
        await Promise.all([
          kvJson.set(KV_KEYS.raceResults(raceId), latestResults, { ex: ttl }),
          kv.set(KV_KEYS.raceTimestamp(raceId), timestamp, { ex: ttl }),
        ]);

        console.log(`Race ${raceId} results cached with TTL: ${ttl}s (${description})`);

      } catch (cacheError) {
        console.error(`Failed to update cache for race ${raceId}:`, cacheError);
        // キャッシュ更新に失敗してもステータス更新は続行
      }
    }

    // データベースに保存
    await kvJson.set(KV_KEYS.raceConfig(raceId), updatedRace);

    console.log(`Race status updated: ${raceId} - ${existingRace.status} -> ${status}`);

    return res.status(200).json(createSuccessResponse({
      race: updatedRace,
      message: `レースステータスを「${status}」に変更しました`,
    }));
  } catch (error) {
    console.error('Race status API error:', error);
    return res.status(500).json(handleApiError(error));
  }
} 