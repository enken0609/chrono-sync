import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createSuccessResponse, 
  handleApiError,
  validateRequired,
  createTimestamp
} from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { kv, kvJson } from '@/lib/kv';
import { KV_KEYS } from '@/lib/constants';
import { Event, Race, RaceFormData } from '@/types';

/**
 * レース作成API
 * POST /api/admin/races/new?eventId=xxx - 新規レース作成（管理者のみ）
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json(handleApiError(new Error('Method not allowed')));
    }

    return await handleCreateRace(req, res);
  } catch (error) {
    console.error('Race creation API error:', error);
    return res.status(500).json(handleApiError(error));
  }
}

/**
 * レース作成処理
 */
async function handleCreateRace(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // 認証チェック
  await requireAuth(req, res);

  try {
    const { eventId } = req.query;
    
    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json(handleApiError(new Error('Event ID is required')));
    }

    // 大会の存在確認
    const event = await kvJson.get<Event>(KV_KEYS.eventInfo(eventId));
    if (!event) {
      return res.status(404).json(handleApiError(new Error('Event not found')));
    }

    const formData: RaceFormData = req.body;

    // バリデーション
    validateRequired(formData.name, 'name');
    validateRequired(formData.category, 'category');

    // WebScorer Race IDの形式チェック（数字のみ）
    if (formData.webScorerRaceId && !/^\d+$/.test(formData.webScorerRaceId)) {
      throw new Error('WebScorer Race IDは数字のみで入力してください');
    }

    // レースIDを生成（タイムスタンプベース）
    const raceId = `race_${Date.now()}`;
    const timestamp = createTimestamp();

    // レースオブジェクトを作成
    const race: Race = {
      id: raceId,
      eventId,
      name: formData.name,
      category: formData.category,
      webScorerRaceId: formData.webScorerRaceId || undefined,
      status: 'preparing',
      sportType: 'trail-running', // デフォルト値
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // データベースに保存
    await Promise.all([
      // レース設定を保存
      kvJson.set(KV_KEYS.raceConfig(raceId), race),
      // 大会のレースリストに追加
      kv.sadd(KV_KEYS.eventRaces(eventId), raceId),
    ]);

    console.log(`Race created: ${raceId} - ${race.name} for event ${eventId}`);

    return res.status(201).json(createSuccessResponse(race));
  } catch (error) {
    throw error;
  }
} 