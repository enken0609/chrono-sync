/**
 * microCMS クライアント設定
 */
import { createClient } from 'microcms-js-sdk';

// microCMS クライアント
export const client = createClient({
  serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN || '',
  apiKey: process.env.MICROCMS_API_KEY || '',
});

/**
 * microCMS画像フィールドの型
 */
export interface MicroCMSImage {
  url: string;
  height: number;
  width: number;
}

/**
 * スポンサー情報の型定義
 */
export interface Sponsor {
  id: string;
  name: string;
  logo: MicroCMSImage; // microCMSの画像フィールド
  logoUrl?: string; // 後方互換性のため
  websiteUrl: string;
  displayOrder: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
}

/**
 * microCMSのレスポンス型
 */
export interface MicroCMSResponse<T> {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
}

/**
 * スポンサー一覧を取得
 * @param limit 取得件数（デフォルト: 10）
 * @returns スポンサー一覧
 */
export const getSponsors = async (limit: number = 10): Promise<Sponsor[]> => {
  try {
    console.log('=== microCMS デバッグ開始 ===');
    console.log('環境変数チェック:', {
      MICROCMS_SERVICE_DOMAIN: process.env.MICROCMS_SERVICE_DOMAIN,
      MICROCMS_API_KEY: process.env.MICROCMS_API_KEY ? '設定済み' : '未設定',
    });

    if (!process.env.MICROCMS_SERVICE_DOMAIN || !process.env.MICROCMS_API_KEY) {
      console.warn('microCMS設定が不完全です。スポンサー情報を取得できません。');
      return [];
    }

    console.log('microCMS API呼び出し:', {
      endpoint: 'sponsors',
      limit,
      url: `https://${process.env.MICROCMS_SERVICE_DOMAIN}.microcms.io/api/v1/sponsors`,
    });

    // アクティブなスポンサーのみを取得し、表示順でソート
    const response = await client.get<MicroCMSResponse<Sponsor>>({
      endpoint: 'sponsors',
      queries: {
        limit,
        filters: 'isActive[equals]true',
        orders: 'displayOrder',
      },
    });

    console.log('microCMS APIレスポンス:', {
      totalCount: response.totalCount,
      contentsLength: response.contents.length,
      firstContent: response.contents[0] || 'なし',
      allContents: response.contents, // 全データをログ出力
    });

    return response.contents;
  } catch (error) {
    console.error('=== microCMS エラー詳細 ===');
    console.error('エラー:', error);
    if (error instanceof Error) {
      console.error('メッセージ:', error.message);
      console.error('スタック:', error.stack);
    }
    return [];
  }
};

/**
 * 特定のスポンサー情報を取得
 * @param sponsorId スポンサーID
 * @returns スポンサー情報
 */
export const getSponsor = async (sponsorId: string): Promise<Sponsor | null> => {
  try {
    if (!process.env.MICROCMS_SERVICE_DOMAIN || !process.env.MICROCMS_API_KEY) {
      console.warn('microCMS設定が不完全です。スポンサー情報を取得できません。');
      return null;
    }

    const sponsor = await client.get<Sponsor>({
      endpoint: 'sponsors',
      contentId: sponsorId,
    });

    return sponsor;
  } catch (error) {
    console.error(`スポンサー情報の取得に失敗しました (ID: ${sponsorId}):`, error);
    return null;
  }
};

/**
 * microCMSの設定が有効かどうかを確認
 */
export const isMicroCMSEnabled = (): boolean => {
  return !!(process.env.MICROCMS_SERVICE_DOMAIN && process.env.MICROCMS_API_KEY);
}; 