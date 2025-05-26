import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createSuccessResponse, 
  handleApiError,
  validateRequired,
  validateDate,
  createTimestamp
} from '@/lib/api';
import { requireAuth, requireAuthCheck } from '@/lib/auth';
import { kv, kvJson } from '@/lib/kv';
import { KV_KEYS } from '@/lib/constants';
import { Event, EventFormData } from '@/types';

/**
 * 大会管理API
 * GET /api/events - 大会一覧取得
 * POST /api/events - 大会作成（管理者のみ）
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    if (req.method === 'GET') {
      return await handleGetEvents(req, res);
    } else if (req.method === 'POST') {
      return await handleCreateEvent(req, res);
    } else {
      return res.status(405).json(handleApiError(new Error('Method not allowed')));
    }
  } catch (error) {
    console.error('Events API error:', error);
    return res.status(500).json(handleApiError(error));
  }
}

/**
 * 大会一覧取得
 */
async function handleGetEvents(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    // クエリパラメータでフィルタリング
    const { status, search } = req.query;

    // 大会IDリストを取得
    const eventIds = await kv.smembers(KV_KEYS.eventsList);
    
    if (eventIds.length === 0) {
      return res.status(200).json(createSuccessResponse([]));
    }

    // 各大会の詳細情報を取得
    const events: Event[] = [];
    for (const eventId of eventIds) {
      const event = await kvJson.get<Event>(KV_KEYS.eventInfo(eventId));
      if (event) {
        events.push(event);
      }
    }

    // フィルタリング
    let filteredEvents = events;

    if (status && status !== 'all') {
      filteredEvents = filteredEvents.filter(event => event.status === status);
    }

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredEvents = filteredEvents.filter(event =>
        event.name.toLowerCase().includes(searchTerm) ||
        event.description?.toLowerCase().includes(searchTerm)
      );
    }

    // 日付順でソート（新しい順）
    filteredEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.status(200).json(createSuccessResponse(filteredEvents));
  } catch (error) {
    throw error;
  }
}

/**
 * 大会作成（管理者のみ）
 */
async function handleCreateEvent(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // 認証チェック
  await requireAuthCheck(req, res);

  try {
    const formData: EventFormData = req.body;

    // バリデーション
    validateRequired(formData.name, 'name');
    validateRequired(formData.date, 'date');

    if (!validateDate(formData.date)) {
      throw new Error('日付の形式が正しくありません (YYYY-MM-DD)');
    }

    // 大会IDを生成（タイムスタンプベース）
    const eventId = `event_${Date.now()}`;
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

    // 大会オブジェクトを作成
    const event: Event = {
      id: eventId,
      name: formData.name,
      date: formData.date,
      description: formData.description || '',
      status,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // データベースに保存
    await Promise.all([
      // 大会情報を保存
      kvJson.set(KV_KEYS.eventInfo(eventId), event),
      // 大会IDリストに追加
      kv.sadd(KV_KEYS.eventsList, eventId),
      // 大会のレースリストは空のSetとして初期化（何もしない）
    ]);

    console.log(`Event created: ${eventId} - ${event.name}`);

    return res.status(201).json(createSuccessResponse(event));
  } catch (error) {
    throw error;
  }
} 