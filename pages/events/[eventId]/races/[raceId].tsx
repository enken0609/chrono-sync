import React, { useState } from 'react';
import { GetStaticProps, GetStaticPaths, NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import LoadingSpinner from '@/components/common/loading-spinner';
import ErrorMessage from '@/components/common/error-message';
import Button from '@/components/common/button';
import RaceResultsTable from '@/components/race/race-results-table';
import { SponsorSection } from '@/components/sponsors/sponsor-section';
import { useRaceResults, RaceResultsResponse } from '@/hooks/use-race-results';
import { Event, Race } from '@/types';
import { fetcher } from '@/lib/api';
import { SITE_CONFIG } from '@/lib/constants';
import { trackRaceView, trackResultsRefresh } from '@/lib/gtag';

interface RaceResultPageProps {
  eventId: string;
  raceId: string;
  initialEventData?: Event;
  initialRaceData?: Race;
}

interface CacheSettings {
  raceResultsTtl: number;
  eventListTtl: number;
  dashboardStatsTtl: number;
}

/**
 * レース速報表示ページ（フロントエンド用）
 */
const RaceResultPage: NextPage<RaceResultPageProps> = ({ 
  eventId, 
  raceId, 
  initialEventData, 
  initialRaceData 
}) => {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 大会情報取得
  const { data: eventData } = useSWR<Event>(
    eventId ? `/api/events/${eventId}` : null,
    fetcher,
    {
      fallbackData: initialEventData,
    }
  );

  // レース情報を取得
  const { 
    data: raceData, 
    error: raceError 
  } = useSWR<Race>(
    raceId ? `/api/races/${raceId}/info` : null,
    fetcher,
    {
      fallbackData: initialRaceData,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // 30秒間キャッシュ
    }
  );

  // レース結果取得
  const { 
    data: raceResults, 
    error: resultsError, 
    mutate: mutateResults,
    isLoading: resultsLoading 
  } = useRaceResults(raceId);

  // キャッシュ設定取得
  const { data: cacheSettings } = useSWR<CacheSettings>(
    '/api/settings/cache',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5分間キャッシュ
    }
  );

  // レース情報を取得（結果データまたは初期データから）
  const raceInfo = raceResults?.raceInfo || initialRaceData;
  
  // レース名を安全に取得
  const getRaceName = () => {
    // 管理画面で設定したレース名を最優先（クライアントサイド）
    if (raceData?.name) {
      return raceData.name;
    }
    
    // 管理画面で設定したレース名を最優先（サーバーサイド）
    if (initialRaceData?.name) {
      return initialRaceData.name;
    }
    
    // フォールバック: WebScorer APIからの名前
    if (raceResults?.raceInfo?.Name) {
      return raceResults.raceInfo.Name;
    }
    
    return 'レース名';
  };

  // Google Analytics: レース表示イベント
  React.useEffect(() => {
    // スクリプト読み込み完了を待つ
    const trackRaceViewWithDelay = () => {
      if (eventData?.name && getRaceName()) {
        trackRaceView(raceId, getRaceName());
      }
    };

    // 少し遅延させてからイベントを送信
    const timer = setTimeout(trackRaceViewWithDelay, 1000);

    return () => clearTimeout(timer);
  }, [eventData?.name, raceId, raceData?.name, raceResults?.raceInfo?.Name]);

  if (router.isFallback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  /**
   * 手動更新処理
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Google Analytics: 更新ボタンクリック追跡
      trackResultsRefresh(raceId);
      
      await mutateResults();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * レースステータスバッジの色を取得
   */
  const getRaceStatusBadgeColor = (status: Race['status']): string => {
    switch (status) {
      case 'preparing':
        return 'badge-yellow';
      case 'active':
        return 'badge-green';
      case 'completed':
        return 'badge-blue';
      default:
        return 'badge-gray';
    }
  };

  /**
   * レースステータス表示名を取得
   */
  const getRaceStatusLabel = (status: Race['status']): string => {
    switch (status) {
      case 'preparing':
        return '準備中';
      case 'active':
        return '進行中';
      case 'completed':
        return '完了';
      default:
        return '不明';
    }
  };

  /**
   * 時間を読みやすい形式にフォーマット
   */
  const formatCacheTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}秒`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}分`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return `${hours}時間`;
    } else {
      const days = Math.floor(seconds / 86400);
      return `${days}日`;
    }
  };

  return (
    <>
      <Head>
        <title>
          {getRaceName()} - {eventData?.name || '大会'} - {SITE_CONFIG.name}
        </title>
        <meta 
          name="description" 
          content={`${getRaceName()}の速報 - ${eventData?.name || '大会'}`} 
        />
        <meta 
          property="og:title" 
          content={`${getRaceName()} - ${eventData?.name || '大会'} - ${SITE_CONFIG.name}`} 
        />
        <meta 
          property="og:description" 
          content={`${getRaceName()}の速報 - ${eventData?.name || '大会'}`} 
        />
        <meta property="og:type" content="website" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
          {/* パンくずナビ（スマホ対応） */}
          <nav className="flex mb-4 sm:mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm w-full min-w-0">
              <li className="flex-shrink-0">
                <Link href="/" className="text-gray-400 hover:text-gray-500">
                  ホーム
                </Link>
              </li>
              <li className="flex-shrink-0">
                <span className="text-gray-400">/</span>
              </li>
              <li className="flex-shrink-0">
                <Link href="/events" className="text-gray-400 hover:text-gray-500">
                  大会一覧
                </Link>
              </li>
              <li className="flex-shrink-0">
                <span className="text-gray-400">/</span>
              </li>
              <li className="hidden sm:block flex-shrink-0 min-w-0 max-w-32 lg:max-w-48">
                <Link href={`/events/${eventId}`} className="text-gray-400 hover:text-gray-500 block truncate" title={eventData?.name || '大会詳細'}>
                  {eventData?.name || '大会詳細'}
                </Link>
              </li>
              <li className="hidden sm:block flex-shrink-0">
                <span className="text-gray-400">/</span>
              </li>
              <li className="flex-shrink-0">
                <span className="text-gray-900 font-medium">
                  レース速報
                </span>
              </li>
            </ol>
          </nav>

          {/* スポンサーセクション */}
          <SponsorSection 
            title="スポンサー" 
            limit={10}
            className=""
          />

          {/* レースヘッダー（スマホ対応改善） */}
          <div className="bg-white shadow rounded-lg mb-4 sm:mb-6">
            <div className="px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex flex-col space-y-4">
                {/* タイトル部分 */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-2">
                      <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">
                        {eventData?.name || '大会名'}
                      </h1>
                      {(raceData || initialRaceData) && (
                        <span className={`badge text-xs mt-1 sm:mt-0 self-start ${getRaceStatusBadgeColor((raceData || initialRaceData)!.status)}`}>
                          {getRaceStatusLabel((raceData || initialRaceData)!.status)}
                        </span>
                      )}
                    </div>

                    <div className="text-sm sm:text-base text-gray-600 break-words">
                      {getRaceName()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
              {/* 注意書き */}
              <div className="mt-2 mb-4">
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                  ⚠️ 速報のため順位が変動する場合があります
                </p>
              </div>
          {/* レース速報 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-xl font-semibold text-gray-900">レース速報</h2>
                <Button
                  variant="warning"
                  size="sm"
                  onClick={handleRefresh}
                  loading={isRefreshing}
                  disabled={resultsLoading}
                  className="text-xs px-4 py-2"
                >
                  🔄 更新
                </Button>
              </div>

            </div>

            <div className="p-4 sm:p-6">
              {resultsError ? (
                <ErrorMessage 
                  message="レース速報の取得に失敗しました" 
                  onRetry={handleRefresh}
                />
              ) : resultsLoading ? (
                <div className="text-center py-8 sm:py-12">
                  <LoadingSpinner size="lg" />
                  <p className="mt-2 text-gray-500 text-sm">レース速報を読み込み中...</p>
                </div>
              ) : !raceResults?.results || raceResults.results.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="text-gray-400 text-4xl sm:text-6xl mb-4">⏱️</div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    速報がまだ公開されていません
                  </h3>
                  <p className="text-gray-500 mb-4 text-sm">
                    レースが進行中か、まだ速報が公開されていません。
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRefresh}
                    loading={isRefreshing}
                  >
                    再読み込み
                  </Button>
                </div>
              ) : (
                <RaceResultsTable 
                  results={raceResults.results}
                  raceInfo={raceResults.raceInfo}
                />
              )}
            </div>

            {/* 最終更新情報（画面下部） */}
            {raceResults?.lastUpdated && (
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-100 bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                    <span>
                      Last updated: {new Date(raceResults.lastUpdated).toLocaleString('ja-JP', {
                        timeZone: 'Asia/Tokyo',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {(raceData || initialRaceData)?.status === 'completed' && (
                      <span className="inline-flex items-center text-blue-600">
                        📁 Archived (30 days)
                      </span>
                    )}
                    {(raceData || initialRaceData)?.status === 'active' && (
                      <span className="inline-flex items-center text-green-600">
                        ⚡ Live cache ({cacheSettings ? formatCacheTime(cacheSettings.raceResultsTtl) : '3min'})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 戻るボタン（スマホ対応） */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
            <Link href={`/events/${eventId}`}>
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                ← 大会詳細に戻る
              </Button>
            </Link>
            <Link href="/events">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                大会一覧に戻る
              </Button>
            </Link>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

/**
 * 静的パス生成
 */
export const getStaticPaths: GetStaticPaths = async () => {
  // 開発時は空のパスを返す（オンデマンド生成）
  return {
    paths: [],
    fallback: true,
  };
};

/**
 * 静的プロパティ生成
 */
export const getStaticProps: GetStaticProps<RaceResultPageProps> = async ({ params }) => {
  const eventId = params?.eventId as string;
  const raceId = params?.raceId as string;

  if (!eventId || !raceId) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      eventId,
      raceId,
    },
    revalidate: 60, // 1分間キャッシュ
  };
};

export default RaceResultPage; 