/**
 * スポンサー一覧取得API
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSponsors, type Sponsor } from '@/lib/microcms';

/**
 * 成功レスポンス
 */
interface SuccessResponse {
  success: true;
  data: Sponsor[];
  totalCount: number;
}

/**
 * エラーレスポンス
 */
interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

type ApiResponse = SuccessResponse | ErrorResponse;

/**
 * スポンサー一覧取得API
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  console.log('=== スポンサーAPI呼び出し ===');
  console.log('メソッド:', req.method);
  console.log('クエリ:', req.query);

  // GETメソッドのみ許可
  if (req.method !== 'GET') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
    return;
  }

  try {
    // クエリパラメータから取得件数を取得
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    console.log('取得件数:', limit);

    // バリデーション
    if (isNaN(limit) || limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        error: 'limitは1から100の間の数値である必要があります',
      });
      return;
    }

    // スポンサー一覧を取得
    console.log('getSponsors呼び出し開始');
    const sponsors = await getSponsors(limit);
    console.log('getSponsors結果:', {
      sponsorsLength: sponsors.length,
      sponsors: sponsors,
    });

    res.status(200).json({
      success: true,
      data: sponsors,
      totalCount: sponsors.length,
    });
  } catch (error) {
    console.error('スポンサー一覧取得API エラー:', error);
    res.status(500).json({
      success: false,
      error: 'スポンサー情報の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 