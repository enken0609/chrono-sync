import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createSuccessResponse, 
  handleApiError,
  getRequiredQueryParam,
  validateRequired,
  createTimestamp
} from '@/lib/api';
import { requireAuthCheck } from '@/lib/auth';
import { kv, kvJson } from '@/lib/kv';
import { KV_KEYS } from '@/lib/constants';
import { Race, RaceFormData } from '@/types';

/**
 * レース管理API（管理者のみ）
 * GET /api/admin/races/[raceId] - レース詳細取得
 * PUT /api/admin/races/[raceId] - レース更新
 * DELETE /api/admin/races/[raceId] - レース削除
 * POST /api/admin/races/new - レース作成（eventIdをクエリパラメータで指定）
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // 認証チェック
  await requireAuthCheck(req, res);

  try {
    const raceId = getRequiredQueryParam(req.query, 'raceId');

    if (req.method === 'POST' && raceId === 'new') {
      return await handleCreateRace(req, res);
    }

    if (req.method === 'GET') {
      return await handleGetRace(req, res, raceId);
    } else if (req.method === 'PUT') {
      return await handleUpdateRace(req, res, raceId);
    } else if (req.method === 'DELETE') {
      return await handleDeleteRace(req, res, raceId);
    } else {
      return res.status(405).json(handleApiError(new Error('Method not allowed')));
    }
  } catch (error) {
    console.error('Race admin API error:', error);
    return res.status(500).json(handleApiError(error));
  }
}

/**
 * レース作成
 */
async function handleCreateRace(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    const eventId = getRequiredQueryParam(req.query, 'eventId');
    const formData: RaceFormData = req.body;

    // バリデーション
    validateRequired(formData.name, 'name');
    validateRequired(formData.category, 'category');

    // 大会の存在確認
    const event = await kvJson.get(KV_KEYS.eventInfo(eventId));
    if (!event) {
      return res.status(404).json(handleApiError(new Error('大会が見つかりません')));
    }

    // レースIDを生成
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

    console.log(`Race created: ${raceId} - ${race.name} (Event: ${eventId})`);

    return res.status(201).json(createSuccessResponse(race));
  } catch (error) {
    throw error;
  }
}

/**
 * レース詳細取得
 */
async function handleGetRace(
  req: NextApiRequest,
  res: NextApiResponse,
  raceId: string
): Promise<void> {
  try {
    const race = await kvJson.get<Race>(KV_KEYS.raceConfig(raceId));
    
    if (!race) {
      return res.status(404).json(handleApiError(new Error('レースが見つかりません')));
    }

    return res.status(200).json(createSuccessResponse(race));
  } catch (error) {
    throw error;
  }
}

/**
 * レース更新
 */
async function handleUpdateRace(
  req: NextApiRequest,
  res: NextApiResponse,
  raceId: string
): Promise<void> {
  try {
    // 既存のレースを取得
    const existingRace = await kvJson.get<Race>(KV_KEYS.raceConfig(raceId));
    if (!existingRace) {
      return res.status(404).json(handleApiError(new Error('レースが見つかりません')));
    }

    const formData: RaceFormData = req.body;

    // バリデーション
    validateRequired(formData.name, 'name');
    validateRequired(formData.category, 'category');

    // 更新されたレースオブジェクトを作成
    const updatedRace: Race = {
      ...existingRace,
      name: formData.name,
      category: formData.category,
      webScorerRaceId: formData.webScorerRaceId || undefined,
      updatedAt: createTimestamp(),
    };

    // データベースに保存
    await kvJson.set(KV_KEYS.raceConfig(raceId), updatedRace);

    console.log(`Race updated: ${raceId} - ${updatedRace.name}`);

    return res.status(200).json(createSuccessResponse(updatedRace));
  } catch (error) {
    throw error;
  }
}

/**
 * レース削除
 */
async function handleDeleteRace(
  req: NextApiRequest,
  res: NextApiResponse,
  raceId: string
): Promise<void> {
  try {
    // 既存のレースを取得
    const existingRace = await kvJson.get<Race>(KV_KEYS.raceConfig(raceId));
    if (!existingRace) {
      return res.status(404).json(handleApiError(new Error('レースが見つかりません')));
    }

    const eventId = existingRace.eventId;

    // レース関連データを削除
    const deletePromises = [
      // レース設定を削除
      kv.del(KV_KEYS.raceConfig(raceId)),
      // レース結果キャッシュを削除
      kv.del(KV_KEYS.raceResults(raceId)),
      kv.del(KV_KEYS.raceTimestamp(raceId)),
      // 大会のレースリストから削除
      kv.srem(KV_KEYS.eventRaces(eventId), raceId),
    ];

    await Promise.all(deletePromises);

    console.log(`Race deleted: ${raceId} - ${existingRace.name} (Event: ${eventId})`);

    return res.status(200).json(createSuccessResponse({ 
      message: 'レースが削除されました',
      deletedRace: existingRace
    }));
  } catch (error) {
    throw error;
  }
} 