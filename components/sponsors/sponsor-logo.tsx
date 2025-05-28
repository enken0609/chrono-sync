/**
 * スポンサーロゴコンポーネント
 */
import React, { useState } from 'react';
import Image from 'next/image';
import { trackSponsorClick } from '@/lib/gtag';
import type { Sponsor } from '@/lib/microcms';

/**
 * Props
 */
interface SponsorLogoProps {
  sponsor: Sponsor;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * スポンサーロゴコンポーネント
 */
export const SponsorLogo: React.FC<SponsorLogoProps> = ({
  sponsor,
  size = 'md',
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // サイズ設定
  const sizeClasses = {
    sm: 'h-10 w-20',   // スマホ用: コンパクト
    md: 'h-15 w-30',   // デスクトップ用: 標準
    lg: 'h-20 w-40',   // 大画面用: 大きめ
  };

  /**
   * ロゴクリック処理
   */
  const handleClick = async (): Promise<void> => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      // ロゴURLを取得（microCMS形式または従来形式に対応）
      const logoUrl = sponsor.logo?.url || sponsor.logoUrl || '';

      // Google Analytics イベント送信
      trackSponsorClick(sponsor.name, logoUrl, sponsor.websiteUrl);

      // クリックカウントAPI呼び出し
      const response = await fetch('/api/sponsors/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sponsorId: sponsor.id,
          sponsorName: sponsor.name,
          logoUrl: logoUrl,
          targetUrl: sponsor.websiteUrl,
        }),
      });

      if (!response.ok) {
        console.warn('クリックカウントの記録に失敗しました:', response.statusText);
      }

      // 新しいタブでスポンサーサイトを開く
      window.open(sponsor.websiteUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('スポンサーロゴクリック処理エラー:', error);
      // エラーが発生してもリンクは開く
      window.open(sponsor.websiteUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsLoading(false);
    }
  };

  // ロゴURLを取得（microCMS形式または従来形式に対応）
  const logoUrl = sponsor.logo?.url || sponsor.logoUrl || '';

  // ロゴURLが存在しない場合は何も表示しない
  if (!logoUrl) {
    return null;
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        <Image
          src={logoUrl}
          alt={`${sponsor.name}のロゴ`}
          fill
          className={`
            object-contain transition-all duration-200 rounded-lg
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 hover:shadow-lg'}
          `}
          sizes="(max-width: 768px) 80px, (max-width: 1200px) 120px, 160px"
          priority={false}
          onClick={isLoading ? undefined : handleClick}
          onError={(e) => {
            console.error(`スポンサーロゴの読み込みに失敗しました: ${sponsor.name}`, e);
          }}
          title={isLoading ? 'ローディング中...' : `${sponsor.name}のサイトを開く`}
        />
        
        {/* ローディング表示 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}; 