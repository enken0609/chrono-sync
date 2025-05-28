/**
 * Google Analytics 4 ユーティリティ
 */

// GA4の測定ID
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// gtagの型定義
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: {
        [key: string]: any;
      }
    ) => void;
  }
}

/**
 * ページビューを送信
 * @param url ページURL
 */
export const pageview = (url: string): void => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
  });
};

/**
 * カスタムイベントを送信
 * @param action イベントアクション
 * @param category イベントカテゴリ
 * @param label イベントラベル（オプション）
 * @param value イベント値（オプション）
 */
export const event = (
  action: string,
  category: string,
  label?: string,
  value?: number
): void => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

/**
 * スポンサーロゴクリックイベント
 * @param sponsorName スポンサー名
 * @param logoUrl ロゴURL
 * @param targetUrl リンク先URL
 */
export const trackSponsorClick = (
  sponsorName: string,
  logoUrl: string,
  targetUrl: string
): void => {
  event('sponsor_logo_click', 'engagement', sponsorName, 1);
  
  // 追加の詳細情報
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'sponsor_logo_click_detail', {
      event_category: 'sponsor',
      sponsor_name: sponsorName,
      logo_url: logoUrl,
      target_url: targetUrl,
      page_path: window.location.pathname,
    });
  }
};

/**
 * レース結果表示イベント
 * @param raceId レースID
 * @param raceName レース名
 */
export const trackRaceView = (raceId: string, raceName: string): void => {
  event('race_view', 'content', raceName, 1);
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'race_view_detail', {
      event_category: 'race',
      race_id: raceId,
      race_name: raceName,
      page_path: window.location.pathname,
    });
  }
};

/**
 * 大会詳細表示イベント
 * @param eventId 大会ID
 * @param eventName 大会名
 */
export const trackEventView = (eventId: string, eventName: string): void => {
  event('event_view', 'content', eventName, 1);
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'event_view_detail', {
      event_category: 'event',
      event_id: eventId,
      event_name: eventName,
      page_path: window.location.pathname,
    });
  }
};

/**
 * 結果更新ボタンクリックイベント
 * @param raceId レースID
 */
export const trackResultsRefresh = (raceId: string): void => {
  event('results_refresh', 'interaction', raceId, 1);
};

/**
 * GA4が有効かどうかを確認
 */
export const isGAEnabled = (): boolean => {
  return !!(GA_MEASUREMENT_ID && typeof window !== 'undefined' && window.gtag);
}; 