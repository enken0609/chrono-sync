import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import useSWR from 'swr';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Button from '@/components/common/button';
import LoadingSpinner from '@/components/common/loading-spinner';
import ErrorMessage from '@/components/common/error-message';
import { SITE_CONFIG, EVENT_STATUS_LABELS } from '@/lib/constants';
import { Event, SuccessResponse } from '@/types';
import { fetcher } from '@/lib/api';

/**
 * 大会一覧ページ
 */
const EventsPage: NextPage = () => {
  const [selectedStatus, setSelectedStatus] = useState<Event['status'] | 'all'>('all');

  // 大会一覧を取得
  const { data: events, error, isLoading, mutate } = useSWR<Event[]>(
    '/api/events',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateOnMount: true,
      dedupingInterval: 0, // キャッシュを無効化
      refreshInterval: 0, // 自動更新は無効
    }
  );

  // フィルタリング
  const filteredEvents = events ? events.filter(event => {
    const statusMatch = selectedStatus === 'all' || event.status === selectedStatus;
    return statusMatch;
  }) : [];

  // 手動更新
  const handleRefresh = async () => {
    try {
      // キャッシュをクリアして強制的に再取得
      await mutate(undefined, { revalidate: true });
    } catch (error) {
      console.error('Failed to refresh events:', error);
    }
  };

  return (
    <>
      <Head>
        <title>大会一覧 - {SITE_CONFIG.name}</title>
        <meta name="description" content="トレイルランニング、スカイランニング、ウルトラランニングなどの大会一覧" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        
        <main className="flex-1">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {/* ページヘッダー */}
            <div className="px-4 py-6 sm:px-0">
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">大会一覧</h1>
                  </div>
                  <div className="mt-4 sm:mt-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isLoading}
                    >
                      🔄 更新
                    </Button>
                  </div>
                </div>
              </div>

              {/* フィルター */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ステータスフィルター */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      開催状況
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as Event['status'] | 'all')}
                      className="select-modern"
                    >
                      <option value="all">すべて</option>
                      {Object.entries(EVENT_STATUS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 統計情報 */}
                {!isLoading && !error && events && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-brand-primary">{events.length}</div>
                        <div className="text-xs text-gray-500">総大会数</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {events.filter(e => e.status === 'active').length}
                        </div>
                        <div className="text-xs text-gray-500">開催中</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {events.filter(e => e.status === 'upcoming').length}
                        </div>
                        <div className="text-xs text-gray-500">開催予定</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-600">
                          {events.filter(e => e.status === 'completed').length}
                        </div>
                        <div className="text-xs text-gray-500">終了</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 大会一覧 */}
            <div className="px-4 sm:px-0">
              {error ? (
                <ErrorMessage 
                  message="大会一覧の取得に失敗しました" 
                  onRetry={handleRefresh}
                />
              ) : isLoading ? (
                <div className="text-center py-12">
                  <LoadingSpinner size="lg" />
                  <p className="mt-2 text-gray-500">大会一覧を読み込み中...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🏃‍♂️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {!events || events.length === 0 ? '大会がまだ登録されていません' : '該当する大会がありません'}
                  </h3>
                  <p className="text-gray-600">
                    {!events || events.length === 0 
                      ? '管理画面から大会を登録してください' 
                      : 'フィルター条件を変更してお試しください'
                    }
                  </p>
                  {(!events || events.length === 0) && (
                    <div className="mt-4">
                      <Link href="/admin/events">
                        <Button variant="primary">
                          管理画面へ
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredEvents.map((event) => (
                    <div key={event.id} className="card hover:shadow-lg transition-shadow">
                      <div className="card-body">
                        {/* ヘッダー */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {event.name}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              <span className={`badge ${
                                event.status === 'upcoming' ? 'badge-blue' :
                                event.status === 'active' ? 'badge-green' :
                                'badge-gray'
                              }`}>
                                {EVENT_STATUS_LABELS[event.status]}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 詳細情報 */}
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center">
                            <span className="mr-2">📅</span>
                            <span>{new Date(event.date).toLocaleDateString('ja-JP', {
                              timeZone: 'Asia/Tokyo'
                            })}</span>
                          </div>
                        </div>

                        {/* 説明 */}
                        {event.description && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {event.description}
                          </p>
                        )}

                        {/* アクション */}
                        <div className="flex gap-2">
                          <Link href={`/events/${event.id}`}>
                            <Button variant="primary" size="sm">
                              詳細を見る
                            </Button>
                          </Link>
                          {event.status === 'active' && (
                            <Link href={`/events/${event.id}`}>
                              <Button variant="success" size="sm">
                                🔴 ライブ速報
                              </Button>
                            </Link>
                          )}
                        </div>

                        {/* 最終更新時刻 */}
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <div className="text-xs text-gray-500">
                            最終更新: {new Date(event.updatedAt).toLocaleString('ja-JP')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default EventsPage; 