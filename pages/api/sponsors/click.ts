/**
 * スポンサーロゴクリックカウントAPI
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@/lib/kv';

/**
 * クリック情報
 */
interface ClickData {
  sponsorId: string;
  sponsorName: string;
  logoUrl: string;
  targetUrl: string;
  timestamp: string;
  userAgent?: string;
  referer?: string;
  ipAddress?: string;
}

/**
 * 成功レスポンス
 */
interface SuccessResponse {
  success: true;
  message: string;
  clickCount: number;
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
 * スポンサーロゴクリックカウントAPI
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  // POSTメソッドのみ許可
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
    return;
  }

  try {
    const { sponsorId, sponsorName, logoUrl, targetUrl } = req.body;

    // バリデーション
    if (!sponsorId || !sponsorName || !logoUrl || !targetUrl) {
      res.status(400).json({
        success: false,
        error: '必須パラメータが不足しています',
        details: 'sponsorId, sponsorName, logoUrl, targetUrl が必要です',
      });
      return;
    }

    // クリック情報を作成
    const clickData: ClickData = {
      sponsorId,
      sponsorName,
      logoUrl,
      targetUrl,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
      ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
    };

    // Redis キー
    const countKey = `sponsor:${sponsorId}:click_count`;
    const logKey = `sponsor:${sponsorId}:click_log`;
    const dailyKey = `sponsor:${sponsorId}:daily:${new Date().toISOString().split('T')[0]}`;

    // 並行処理でカウントとログを更新
    const [newCount] = await Promise.all([
      // 総クリック数をインクリメント
      kv.incr(countKey),
      
      // クリックログを追加（最新100件まで保持）
      kv.lpush(logKey, JSON.stringify(clickData)).then(() => 
        kv.ltrim(logKey, 0, 99)
      ),
      
      // 日別カウントをインクリメント（30日間保持）
      kv.incr(dailyKey).then(() => 
        kv.expire(dailyKey, 30 * 24 * 60 * 60)
      ),
    ]);

    console.log(`スポンサークリック記録: ${sponsorName} (ID: ${sponsorId}) - 総クリック数: ${newCount}`);

    res.status(200).json({
      success: true,
      message: 'クリックが記録されました',
      clickCount: newCount,
    });
  } catch (error) {
    console.error('スポンサークリックカウントAPI エラー:', error);
    res.status(500).json({
      success: false,
      error: 'クリック記録に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 