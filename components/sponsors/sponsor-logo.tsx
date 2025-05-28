/**
 * スポンサーロゴコンポーネント
 */
import React, { useState } from 'react';
import Image from 'next/image';
import { trackSponsorClick } from '@/lib/gtag';
import type { Sponsor } from '@/lib/microcms';

// デフォルトのプレースホルダー画像（Base64エンコードされた小さな画像）
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==';

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
  const [imageError, setImageError] = useState(false);

  // サイズ設定
  const sizeClasses = {
    sm: 'h-12 w-24',   // スマホ用: コンパクト
    md: 'h-16 w-32',   // デスクトップ用: 標準
    lg: 'h-20 w-40',   // 大画面用: 大きめ
  };

  /**
   * ロゴクリック処理
   */
  const handleClick = async (): Promise<void> => {
    if (isLoading || !sponsor.websiteUrl) return;

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
      if (sponsor.websiteUrl) {
        window.open(sponsor.websiteUrl, '_blank', 'noopener,noreferrer');
      }
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
            ${imageError ? 'hidden' : ''}
          `}
          sizes="(max-width: 768px) 96px, (max-width: 1200px) 128px, 160px"
          priority={true}
          loading="eager"
          onClick={isLoading ? undefined : handleClick}
          onError={(e) => {
            console.error(`スポンサーロゴの読み込みに失敗しました: ${sponsor.name}`, e);
            setImageError(true);
          }}
          title={isLoading ? 'ローディング中...' : `${sponsor.name}のサイトを開く`}
        />
        
        {/* エラー時の代替表示 */}
        {imageError && (
          <div 
            className={`
              flex items-center justify-center bg-gray-100 rounded-lg w-full h-full
              text-xs text-gray-500 cursor-pointer hover:bg-gray-200 transition-colors
            `}
            onClick={handleClick}
            title={`${sponsor.name}のサイトを開く`}
          >
            {sponsor.name}
          </div>
        )}

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