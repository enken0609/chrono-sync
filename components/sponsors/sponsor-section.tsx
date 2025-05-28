/**
 * スポンサーセクションコンポーネント
 */
import React, { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { SponsorLogo } from './sponsor-logo';
import type { Sponsor } from '@/lib/microcms';

/**
 * API レスポンス型
 */
interface SponsorsResponse {
  success: boolean;
  data: Sponsor[];
  totalCount: number;
}

/**
 * Props
 */
interface SponsorSectionProps {
  title?: string;
  limit?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  forceShow?: boolean; // デバッグ用: 強制表示
}

/**
 * データフェッチャー
 */
const fetcher = async (url: string): Promise<SponsorsResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch sponsors');
  }
  const data = await response.json();
  return data;
};

/**
 * スポンサーセクションコンポーネント
 */
export const SponsorSection: React.FC<SponsorSectionProps> = ({
  title = 'スポンサー',
  limit = 10,
  size = 'md',
  className = '',
  forceShow = false,
}) => {
  // hooksは常に最初に実行する必要がある
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading } = useSWR<SponsorsResponse>(
    `/api/sponsors?limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5分間キャッシュ
    }
  );

  // 自動スクロール機能
  useEffect(() => {
    if (!data?.data || data.data.length === 0 || forceShow) return;

    const startAutoScroll = (element: HTMLDivElement, speed: number) => {
      let scrollPosition = 0;
      let isUserScrolling = false;
      let userScrollTimeout: NodeJS.Timeout | null = null;
      let animationId: number | null = null;
      
      const scroll = () => {
        if (isUserScrolling) {
          animationId = requestAnimationFrame(scroll);
          return;
        }
        
        scrollPosition += speed;
        const maxScroll = element.scrollWidth - element.clientWidth;
        
        if (scrollPosition >= maxScroll) {
          scrollPosition = 0;
        }
        
        element.scrollLeft = scrollPosition;
        animationId = requestAnimationFrame(scroll);
      };

      const handleUserScroll = () => {
        isUserScrolling = true;
        scrollPosition = element.scrollLeft;
        
        if (userScrollTimeout) {
          clearTimeout(userScrollTimeout);
        }
        
        userScrollTimeout = setTimeout(() => {
          isUserScrolling = false;
        }, 3000);
      };

      element.addEventListener('scroll', handleUserScroll, { passive: true });
      
      setTimeout(() => {
        animationId = requestAnimationFrame(scroll);
      }, 1000);
      
      return () => {
        if (animationId) cancelAnimationFrame(animationId);
        if (userScrollTimeout) clearTimeout(userScrollTimeout);
        element.removeEventListener('scroll', handleUserScroll);
      };
    };

    let desktopCleanup: (() => void) | null = null;
    if (scrollRef.current) {
      desktopCleanup = startAutoScroll(scrollRef.current, 0.6);
    }

    let mobileCleanup: (() => void) | null = null;
    if (mobileScrollRef.current) {
      mobileCleanup = startAutoScroll(mobileScrollRef.current, 0.5);
    }

    const handleMouseEnter = () => {
      if (desktopCleanup) desktopCleanup();
      if (mobileCleanup) mobileCleanup();
    };

    const handleMouseLeave = () => {
      if (scrollRef.current) {
        desktopCleanup = startAutoScroll(scrollRef.current, 0.6);
      }
      if (mobileScrollRef.current) {
        mobileCleanup = startAutoScroll(mobileScrollRef.current, 0.5);
      }
    };

    const desktopElement = scrollRef.current;
    const mobileElement = mobileScrollRef.current;

    if (desktopElement) {
      desktopElement.addEventListener('mouseenter', handleMouseEnter);
      desktopElement.addEventListener('mouseleave', handleMouseLeave);
    }

    if (mobileElement) {
      mobileElement.addEventListener('touchstart', handleMouseEnter);
      mobileElement.addEventListener('touchend', handleMouseLeave);
    }

    return () => {
      if (desktopCleanup) desktopCleanup();
      if (mobileCleanup) mobileCleanup();
      
      if (desktopElement) {
        desktopElement.removeEventListener('mouseenter', handleMouseEnter);
        desktopElement.removeEventListener('mouseleave', handleMouseLeave);
      }
      
      if (mobileElement) {
        mobileElement.removeEventListener('touchstart', handleMouseEnter);
        mobileElement.removeEventListener('touchend', handleMouseLeave);
      }
    };
  }, [data?.data, forceShow]);

  // デバッグ用: 強制表示モード
  if (forceShow) {
    return (
      <section className={`py-8 bg-yellow-50 border-2 border-yellow-300 ${className}`}>
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            {title} (デバッグモード)
          </h2>
          <div className="text-center">
            <p className="text-yellow-800 mb-4">
              スポンサーセクションが正常にレンダリングされています
            </p>
            <div className="bg-white p-4 rounded border">
              <p><strong>データ状態:</strong></p>
              <p>ローディング: {isLoading ? 'Yes' : 'No'}</p>
              <p>エラー: {error ? 'Yes' : 'No'}</p>
              <p>データ: {data ? 'Yes' : 'No'}</p>
              <p>スポンサー数: {data?.data?.length || 0}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ローディング状態
  if (isLoading) {
    return (
      <section className={`py-8 ${className}`}>
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            {title}
          </h2>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </section>
    );
  }

  // エラー状態
  if (error) {
    return null; // エラー時は何も表示しない
  }

  // データが空の場合
  if (!data?.success || !data.data || data.data.length === 0) {
    return null; // スポンサーがない場合は何も表示しない
  }

  const sponsors = data.data;

  // スポンサーを複製して無限スクロール効果を作成
  const duplicatedSponsors = [...sponsors, ...sponsors, ...sponsors];

  return (
    <section className={`py-6 from-gray-50 to-gray-100 ${className}`}>
      <div className="container mx-auto">
        
        {/* デスクトップ: 自動スクロールカルーセル */}
        <div className="hidden md:block">
          <div 
            ref={scrollRef}
            className="flex overflow-x-scroll scrollbar-hide gap-8 py-2"
            style={{
              scrollBehavior: 'auto',
              overflowX: 'scroll',
              whiteSpace: 'nowrap',
            }}
          >
            {duplicatedSponsors.map((sponsor, index) => (
              <div key={`${sponsor.id}-${index}`} className="flex-shrink-0">
                <SponsorLogo
                  sponsor={sponsor}
                  size={size}
                />
              </div>
            ))}
          </div>
        </div>

        {/* スマホ: 自動スクロールカルーセル */}
        <div className="md:hidden">
          <div 
            ref={mobileScrollRef}
            className="flex overflow-x-scroll scrollbar-hide gap-4 pb-2 px-2"
            style={{
              scrollBehavior: 'auto',
              overflowX: 'scroll',
              whiteSpace: 'nowrap',
            }}
          >
            {duplicatedSponsors.map((sponsor, index) => (
              <div key={`mobile-${sponsor.id}-${index}`} className="flex-shrink-0">
                <SponsorLogo
                  sponsor={sponsor}
                  size="sm"
                  className="bg-white rounded-lg shadow-md p-3 hover:shadow-lg transition-shadow"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// default export も追加
export default SponsorSection; 