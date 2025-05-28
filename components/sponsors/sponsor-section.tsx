/**
 * スポンサーセクションコンポーネント
 * モバイルユーザー重視の実装
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
  const [isPaused, setIsPaused] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // スポンサーデータ取得（モバイルでの初期読み込み時間を考慮）
  const { data: sponsors, error, isLoading } = useSWR<Sponsor[]>(
    `/api/sponsors?limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5分間キャッシュ
      suspense: false, // モバイルでの初期表示を優先
    }
  );

  // ユーザーの設定を確認（アニメーション削減設定など）
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // データ読み込み完了時の処理（モバイルでの表示を最適化）
  useEffect(() => {
    if (!isLoading && sponsors && sponsors.length > 0) {
      // モバイルでの初期表示を高速化するため、遅延を短縮
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 300); // 300msに短縮
      return () => clearTimeout(timer);
    }
  }, [isLoading, sponsors]);

  // 自動スクロール機能（バッテリー消費を考慮）
  useEffect(() => {
    if (!scrollRef.current || !mobileScrollRef.current || !isReady || !sponsors?.length) return;
    if (isReducedMotion) return; // アニメーション削減設定の場合はスクロールしない

    const startAutoScroll = (element: HTMLDivElement, speed: number) => {
      let position = 0;
      let lastTime = performance.now();
      let animationId: number | null = null;

      const scroll = () => {
        if (!isPaused) {
          const currentTime = performance.now();
          const deltaTime = currentTime - lastTime;
          lastTime = currentTime;

          // バッテリー消費を抑えるため、60FPSではなく30FPSで動作
          position += (speed * deltaTime) / 32;

          // スクロール位置の巻き戻し（スムーズに）
          const maxScroll = element.scrollWidth / 2;
          if (position >= maxScroll) {
            position = 0;
            element.scrollLeft = 0;
          } else {
            element.scrollLeft = position;
          }
        }

        // 画面表示中のみアニメーション実行
        if (document.visibilityState === 'visible') {
          animationId = requestAnimationFrame(scroll);
        }
      };

      // スクロール開始
      animationId = requestAnimationFrame(scroll);

      // タッチ・マウスイベントハンドラ
      const handleInteractionStart = () => {
        setIsPaused(true);
      };

      const handleInteractionEnd = () => {
        // タッチ操作後の位置を保持
        position = element.scrollLeft;
        setIsPaused(false);
      };

      // イベントリスナー設定
      element.addEventListener('mouseenter', handleInteractionStart, { passive: true });
      element.addEventListener('mouseleave', handleInteractionEnd, { passive: true });
      element.addEventListener('touchstart', handleInteractionStart, { passive: true });
      element.addEventListener('touchend', handleInteractionEnd, { passive: true });
      element.addEventListener('touchcancel', handleInteractionEnd, { passive: true });

      // バッテリー消費を抑えるため、画面非表示時はアニメーションを停止
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          if (animationId) cancelAnimationFrame(animationId);
        } else {
          animationId = requestAnimationFrame(scroll);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (animationId) cancelAnimationFrame(animationId);
        element.removeEventListener('mouseenter', handleInteractionStart);
        element.removeEventListener('mouseleave', handleInteractionEnd);
        element.removeEventListener('touchstart', handleInteractionStart);
        element.removeEventListener('touchend', handleInteractionEnd);
        element.removeEventListener('touchcancel', handleInteractionEnd);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    };

    // スクロール速度をデバイスに最適化
    const isMobile = window.innerWidth < 768;
    const desktopCleanup = startAutoScroll(scrollRef.current, isMobile ? 0.5 : 0.6);
    const mobileCleanup = startAutoScroll(mobileScrollRef.current, 0.4);

    return () => {
      desktopCleanup();
      mobileCleanup();
    };
  }, [isReady, sponsors, isPaused, isReducedMotion]);

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
            className="flex space-x-8 overflow-x-hidden scrollbar-hide min-h-[4rem] touch-pan-x"
            style={{
              WebkitOverflowScrolling: 'touch', // iOSでのスムーズスクロール
            }}
          >
            {[...sponsors, ...sponsors].map((sponsor, index) => (
              <div key={`${sponsor.id}-${index}`} className="flex-shrink-0">
                <SponsorLogo sponsor={sponsor} size="md" />
              </div>
            ))}
          </div>
        </div>

        {/* モバイル表示（タッチ操作最適化） */}
        <div className="sm:hidden">
          <div
            ref={mobileScrollRef}
            className="flex space-x-6 overflow-x-hidden scrollbar-hide min-h-[3rem] touch-pan-x"
            style={{
              WebkitOverflowScrolling: 'touch', // iOSでのスムーズスクロール
            }}
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

export default SponsorSection; 