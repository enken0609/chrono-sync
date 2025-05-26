import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createSuccessResponse, 
  handleApiError
} from '@/lib/api';
import { requireAuthCheck } from '@/lib/auth';
import { kv } from '@/lib/kv';

/**
 * キャッシュクリアAPI（管理者のみ）
 * POST /api/admin/settings/cache/clear - 全キャッシュクリア
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // 認証チェック
  await requireAuthCheck(req, res);

  try {
    if (req.method === 'POST') {
      return await handleClearCache(req, res);
    } else {
      return res.status(405).json(handleApiError(new Error('Method not allowed')));
    }
  } catch (error) {
    console.error('Cache clear API error:', error);
    return res.status(500).json(handleApiError(error));
  }
}

/**
 * キャッシュクリア処理
 */
async function handleClearCache(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    // キャッシュ関連のキーパターンを定義
    const cachePatterns = [
      'race:*:results',
      'race:*:timestamp',
      // 設定とイベント情報は保持（永続データ）
    ];

    let clearedCount = 0;

    for (const pattern of cachePatterns) {
      try {
        // パターンに一致するキーを取得
        const keys = await kv.keys(pattern);
        
        if (keys.length > 0) {
          // キーを削除
          await kv.del(...keys);
          clearedCount += keys.length;
          console.log(`Cleared ${keys.length} keys matching pattern: ${pattern}`);
        }
      } catch (error) {
        console.error(`Failed to clear cache pattern ${pattern}:`, error);
      }
    }

    console.log(`Total cache keys cleared: ${clearedCount}`);

    return res.status(200).json(createSuccessResponse({
      message: `${clearedCount}個のキャッシュをクリアしました`,
      clearedCount,
    }));
  } catch (error) {
    throw error;
  }
} 