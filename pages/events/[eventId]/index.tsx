import React from 'react';
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
import { Event, Race } from '@/types';
import { fetcher } from '@/lib/api';
import { SPORT_LABELS, SITE_CONFIG } from '@/lib/constants';

interface EventDetailPageProps {
  eventId: string;
  initialData?: Event & { races: Race[] };
}

/**
 * 大会詳細ページ（フロントエンド用）
 */
const EventDetailPage: NextPage<EventDetailPageProps> = ({ eventId, initialData }) => {
  const router = useRouter();
  
  // SWRでリアルタイムデータ取得
  const { data: eventData, error, mutate } = useSWR<Event & { races: Race[] }>(
    `/api/events/${eventId}`,
    fetcher,
    {
      fallbackData: initialData,
      revalidateOnMount: true,
    }
  );

  if (router.isFallback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <ErrorMessage 
            message="大会情報の取得に失敗しました" 
            onRetry={() => mutate()} 
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-gray-500">大会情報を読み込み中...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  /**
   * ステータスバッジの色を取得
   */
  const getStatusBadgeColor = (status: Event['status']): string => {
    switch (status) {
      case 'upcoming':
        return 'badge-blue';
      case 'active':
        return 'badge-green';
      case 'completed':
        return 'badge-gray';
      default:
        return 'badge-gray';
    }
  };

  /**
   * ステータス表示名を取得
   */
  const getStatusLabel = (status: Event['status']): string => {
    switch (status) {
      case 'upcoming':
        return '開催予定';
      case 'active':
        return '開催中';
      case 'completed':
        return '終了';
      default:
        return '不明';
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

  return (
    <>
      <Head>
        <title>{eventData.name} - {SITE_CONFIG.name}</title>
        <meta name="description" content={eventData.description || `${eventData.name}の詳細情報とレース結果`} />
        <meta property="og:title" content={`${eventData.name} - ${SITE_CONFIG.name}`} />
        <meta property="og:description" content={eventData.description || `${eventData.name}の詳細情報とレース結果`} />
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
              <li className="min-w-0 flex-1">
                <span className="text-gray-900 font-medium block truncate" title={eventData.name}>
                  {eventData.name}
                </span>
              </li>
            </ol>
          </nav>

          {/* 大会ヘッダー（コンパクト化） */}
          <div className="bg-white shadow rounded-lg mb-4 sm:mb-6">
            <div className="px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex flex-col space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-2">
                      <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">
                        {eventData.name}
                      </h1>
                      <span className={`badge text-xs mt-1 sm:mt-0 self-start ${getStatusBadgeColor(eventData.status)}`}>
                        {getStatusLabel(eventData.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center">
                        <span className="font-medium mr-2">📅 開催日:</span>
                        <span className="truncate">
                          {new Date(eventData.date).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            weekday: 'short'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium mr-2">🏁 レース数:</span>
                        {eventData.races?.length || 0}
                      </div>
                    </div>

                    {eventData.description && (
                      <div className="mt-3 sm:mt-4">
                        <p className="text-sm sm:text-base text-gray-700 leading-relaxed break-words">
                          {eventData.description}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-xs text-gray-500">
                    <p>
                      最終更新: {new Date(eventData.updatedAt).toLocaleDateString('ja-JP', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* レース一覧 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
              <h2 className="text-base sm:text-xl font-semibold text-gray-900">レース一覧</h2>
            </div>

            {!eventData.races || eventData.races.length === 0 ? (
              <div className="px-4 py-8 sm:px-6 sm:py-12 text-center">
                <div className="text-gray-400 text-4xl sm:text-6xl mb-4">🏁</div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  レースが登録されていません
                </h3>
                <p className="text-sm text-gray-500">
                  まだレースが登録されていません。しばらくお待ちください。
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {eventData.races.map((race) => (
                  <div key={race.id} className="px-4 py-4 sm:px-6 sm:py-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                          <h3 className="text-base sm:text-lg font-medium text-gray-900 break-words">
                            {race.name}
                          </h3>
                          <span className={`badge text-xs mt-1 sm:mt-0 self-start ${getRaceStatusBadgeColor(race.status)}`}>
                            {getRaceStatusLabel(race.status)}
                          </span>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {race.status === 'active' || race.status === 'completed' ? (
                          <Link href={`/events/${eventId}/races/${race.id}`}>
                            <Button variant="primary" size="sm" className="w-full sm:w-auto">
                              結果を見る
                            </Button>
                          </Link>
                        ) : (
                          <Button variant="secondary" size="sm" disabled className="w-full sm:w-auto">
                            準備中
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 戻るボタン */}
          <div className="mt-6 sm:mt-8 text-center">
            <Link href="/events">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                ← 大会一覧に戻る
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
export const getStaticProps: GetStaticProps<EventDetailPageProps> = async ({ params }) => {
  const eventId = params?.eventId as string;

  if (!eventId) {
    return {
      notFound: true,
    };
  }

  try {
    // 本番環境では実際のAPIを呼び出し
    // 開発環境ではfallbackに依存
    return {
      props: {
        eventId,
      },
      revalidate: 180, // 3分間キャッシュ
    };
  } catch (error) {
    console.error('Failed to fetch event data:', error);
    return {
      props: {
        eventId,
      },
      revalidate: 60, // エラー時は1分間キャッシュ
    };
  }
};

export default EventDetailPage; 