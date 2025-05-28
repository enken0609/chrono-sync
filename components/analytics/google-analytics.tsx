/**
 * Google Analytics 4 コンポーネント
 */
import Script from 'next/script';
import { GA_MEASUREMENT_ID } from '@/lib/gtag';

/**
 * Google Analytics 4のスクリプトを読み込むコンポーネント
 */
export const GoogleAnalytics: React.FC = () => {
  // 測定IDが設定されていない場合は何も表示しない
  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      {/* Google Analytics 4 スクリプト */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}; 