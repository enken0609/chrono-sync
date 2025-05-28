/**
 * スポンサーセクションコンポーネント
 */
import React, { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { SponsorLogo } from './sponsor-logo';
import type { Sponsor } from '@/lib/microcms';
import { fetcher } from '@/lib/api';

interface SponsorSectionProps {
  title?: string;
  limit?: number;
  className?: string;
}

export const SponsorSection: React.FC<SponsorSectionProps> = ({
  title = 'スポンサー',
  limit = 10,
  className = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  // スポンサーデータ取得
  const { data: sponsors, error, isLoading } = useSWR<Sponsor[]>(
    `/api/sponsors?limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5分間キャッシュ
    }
  );

  // データ読み込み完了時の処理
  useEffect(() => {
    if (!isLoading && sponsors && sponsors.length > 0) {
      // 少し遅延を入れて画像の読み込みを待つ
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, sponsors]);

  // 自動スクロール機能
  useEffect(() => {
    if (!scrollRef.current || !mobileScrollRef.current || !isReady || !sponsors?.length) return;

    const startAutoScroll = (element: HTMLDivElement, speed: number) => {
      let animationId: number;
      let lastTime = performance.now();
      let isPaused = false;

      const scroll = (currentTime: number) => {
        if (!isPaused) {
          const deltaTime = currentTime - lastTime;
          element.scrollLeft += speed * deltaTime / 16;

          if (element.scrollLeft >= element.scrollWidth - element.clientWidth) {
            element.scrollLeft = 0;
          }
        }
        lastTime = currentTime;
        animationId = requestAnimationFrame(scroll);
      };

      // スクロール開始（遅延なし）
      animationId = requestAnimationFrame(scroll);

      // マウスイベントハンドラ
      const handleMouseEnter = () => {
        isPaused = true;
      };

      const handleMouseLeave = () => {
        isPaused = false;
      };

      // イベントリスナー設定
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        cancelAnimationFrame(animationId);
        element.removeEventListener('mouseenter', handleMouseEnter);
        element.removeEventListener('mouseleave', handleMouseLeave);
      };
    };

    // スクロール開始
    const desktopCleanup = startAutoScroll(scrollRef.current, 0.6);
    const mobileCleanup = startAutoScroll(mobileScrollRef.current, 0.5);

    return () => {
      desktopCleanup();
      mobileCleanup();
    };
  }, [isReady, sponsors]);

  // 表示条件をチェック
  const shouldShow = !isLoading && !error && sponsors && sponsors.length > 0 && isReady;

  if (!shouldShow) {
    return null;
  }

  return (
    <section className={`py-2 from-gray-50 to-gray-100 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* デスクトップ表示 */}
        <div className="hidden sm:block">
          <div
            ref={scrollRef}
            className="flex space-x-8 overflow-x-hidden scrollbar-hide min-h-[4rem]"
          >
            {[...sponsors, ...sponsors].map((sponsor, index) => (
              <div key={`${sponsor.id}-${index}`} className="flex-shrink-0">
                <SponsorLogo sponsor={sponsor} size="md" />
              </div>
            ))}
          </div>
        </div>

        {/* モバイル表示 */}
        <div className="sm:hidden">
          <div
            ref={mobileScrollRef}
            className="flex space-x-6 overflow-x-hidden scrollbar-hide min-h-[3rem]"
          >
            {[...sponsors, ...sponsors].map((sponsor, index) => (
              <div key={`${sponsor.id}-${index}`} className="flex-shrink-0">
                <SponsorLogo sponsor={sponsor} size="sm" />
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