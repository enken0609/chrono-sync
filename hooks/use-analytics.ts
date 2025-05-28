/**
 * Google Analytics用カスタムフック
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { pageview } from '@/lib/gtag';

/**
 * ページ遷移を追跡するフック
 */
export const useAnalytics = (): void => {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      pageview(url);
    };

    // 初回ページロード時の追跡
    pageview(router.asPath);

    // ページ遷移時の追跡
    router.events.on('routeChangeComplete', handleRouteChange);

    // クリーンアップ
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, router.asPath]);
}; 