import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createSuccessResponse, 
  handleApiError,
  validateRequired,
  validateDate,
  createTimestamp
} from '@/lib/api';
import { requireAuthCheck } from '@/lib/auth';
import { kv, kvJson } from '@/lib/kv';
import { KV_KEYS } from '@/lib/constants';
import { Event, EventFormData, Race } from '@/types';

/**
 * 大会詳細API
 * GET /api/events/[eventId] - 大会詳細取得（レース一覧含む）
 * PUT /api/events/[eventId] - 大会更新（管理者のみ）
 * DELETE /api/events/[eventId] - 大会削除（管理者のみ）
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    const { eventId } = req.query;

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json(handleApiError(new Error('Invalid event ID')));
    }

    if (req.method === 'GET') {
      return await handleGetEvent(req, res, eventId);
    } else if (req.method === 'PUT') {
      return await handleUpdateEvent(req, res, eventId);
    } else if (req.method === 'DELETE') {
      return await handleDeleteEvent(req, res, eventId);
    } else {
      return res.status(405).json(handleApiError(new Error('Method not allowed')));
    }
  } catch (error) {
    console.error('Event detail API error:', error);
    return res.status(500).json(handleApiError(error));
  }
}

/**
 * 大会詳細取得（レース一覧含む）
 */
async function handleGetEvent(
  req: NextApiRequest,
  res: NextApiResponse,
  eventId: string
): Promise<void> {
  try {
    // 大会情報を取得
    const event = await kvJson.get<Event>(KV_KEYS.eventInfo(eventId));
    
    if (!event) {
      return res.status(404).json(handleApiError(new Error('Event not found')));
    }

    // レース一覧を取得
    const raceIds = await kv.smembers(KV_KEYS.eventRaces(eventId));
    const races: Race[] = [];

    for (const raceId of raceIds) {
      const race = await kvJson.get<Race>(KV_KEYS.raceConfig(raceId));
      if (race) {
        races.push(race);
      }
    }

    // レースを作成日時順でソート
    races.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const eventWithRaces = {
      ...event,
      races,
    };

    return res.status(200).json(createSuccessResponse(eventWithRaces));
  } catch (error) {
    throw error;
  }
}

/**
 * 大会更新（管理者のみ）
 */
async function handleUpdateEvent(
  req: NextApiRequest,
  res: NextApiResponse,
  eventId: string
): Promise<void> {
  // 認証チェック
  await requireAuthCheck(req, res);

  try {
    // 既存の大会情報を取得
    const existingEvent = await kvJson.get<Event>(KV_KEYS.eventInfo(eventId));
    
    if (!existingEvent) {
      return res.status(404).json(handleApiError(new Error('Event not found')));
    }

    const formData: EventFormData = req.body;

    // バリデーション
    validateRequired(formData.name, 'name');
    validateRequired(formData.date, 'date');

    if (!validateDate(formData.date)) {
      throw new Error('日付の形式が正しくありません (YYYY-MM-DD)');
    }

    const timestamp = createTimestamp();

    // 大会ステータスを決定
    const eventDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    let status: Event['status'];
    if (eventDate > today) {
      status = 'upcoming';
    } else if (eventDate.getTime() === today.getTime()) {
      status = 'active';
    } else {
      status = 'completed';
    }

    // 更新された大会オブジェクトを作成
    const updatedEvent: Event = {
      ...existingEvent,
      name: formData.name,
      date: formData.date,
      description: formData.description || '',
      status,
      updatedAt: timestamp,
    };

    // データベースに保存
    await kvJson.set(KV_KEYS.eventInfo(eventId), updatedEvent);

    console.log(`Event updated: ${eventId} - ${updatedEvent.name}`);

    return res.status(200).json(createSuccessResponse(updatedEvent));
  } catch (error) {
    throw error;
  }
}

/**
 * 大会削除（管理者のみ）
 */
async function handleDeleteEvent(
  req: NextApiRequest,
  res: NextApiResponse,
  eventId: string
): Promise<void> {
  // 認証チェック
  await requireAuthCheck(req, res);

  try {
    // 既存の大会情報を取得
    const existingEvent = await kvJson.get<Event>(KV_KEYS.eventInfo(eventId));
    
    if (!existingEvent) {
      return res.status(404).json(handleApiError(new Error('Event not found')));
    }

    // 関連するレースを取得
    const raceIds = await kv.smembers(KV_KEYS.eventRaces(eventId));

    // 関連するレースとその結果を削除
    const deletePromises = [];
    
    for (const raceId of raceIds) {
      deletePromises.push(
        kv.del(KV_KEYS.raceConfig(raceId)),
        kv.del(KV_KEYS.raceResults(raceId)),
        kv.del(KV_KEYS.raceTimestamp(raceId))
      );
    }

    // 大会関連データを削除
    deletePromises.push(
      // 大会情報を削除
      kv.del(KV_KEYS.eventInfo(eventId)),
      // 大会のレースリストを削除
      kv.del(KV_KEYS.eventRaces(eventId)),
      // 大会IDリストから削除
      kv.srem(KV_KEYS.eventsList, eventId)
    );

    await Promise.all(deletePromises);

    console.log(`Event deleted: ${eventId} - ${existingEvent.name}`);

    return res.status(200).json(createSuccessResponse({ 
      message: 'Event deleted successfully',
      deletedEvent: existingEvent,
      deletedRaces: raceIds.length
    }));
  } catch (error) {
    throw error;
  }
} 