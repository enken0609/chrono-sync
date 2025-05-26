import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createSuccessResponse, 
  handleApiError
} from '@/lib/api';
import { requireAuthCheck } from '@/lib/auth';
import { kv } from '@/lib/kv';

/**
 * リザルトデータ全削除API（管理者のみ）
 * POST /api/admin/settings/data/clear-results - 全レース結果データを削除
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // 認証チェック
  await requireAuthCheck(req, res);

  try {
    if (req.method === 'POST') {
      return await handleClearResults(req, res);
    } else {
      return res.status(405).json(handleApiError(new Error('Method not allowed')));
    }
  } catch (error) {
    console.error('Clear results API error:', error);
    return res.status(500).json(handleApiError(error));
  }
}

/**
 * リザルトデータクリア処理
 */
async function handleClearResults(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    // リザルト関連のキーパターンを定義
    const resultPatterns = [
      'race:*:results',
      'race:*:timestamp',
    ];

    let clearedCount = 0;
    const clearedRaces: string[] = [];

    for (const pattern of resultPatterns) {
      try {
        // パターンに一致するキーを取得
        const keys = await kv.keys(pattern);
        
        if (keys.length > 0) {
          // キーを削除
          await kv.del(...keys);
          clearedCount += keys.length;
          
          // レースIDを抽出（ログ用）
          if (pattern === 'race:*:results') {
            keys.forEach(key => {
              const match = key.match(/^race:(.+):results$/);
              if (match) {
                clearedRaces.push(match[1]);
              }
            });
          }
          
          console.log(`Cleared ${keys.length} keys matching pattern: ${pattern}`);
        }
      } catch (error) {
        console.error(`Failed to clear pattern ${pattern}:`, error);
      }
    }

    console.log(`Total result keys cleared: ${clearedCount}`);
    console.log(`Cleared results for races: ${clearedRaces.join(', ')}`);

    return res.status(200).json(createSuccessResponse({
      message: `${clearedRaces.length}レースの結果データ（${clearedCount}個のキー）を削除しました`,
      clearedCount,
      clearedRaces: clearedRaces.length,
      raceIds: clearedRaces,
    }));
  } catch (error) {
    throw error;
  }
} 