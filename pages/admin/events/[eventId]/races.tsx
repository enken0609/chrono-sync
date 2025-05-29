import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useRequireAuth } from '@/hooks/use-auth';
import AdminLayout from '@/components/layout/admin-layout';
import Button from '@/components/common/button';
import LoadingSpinner from '@/components/common/loading-spinner';
import ErrorMessage from '@/components/common/error-message';
import RaceForm from '@/components/admin/race-form';
import { RaceExportButton } from '@/components/admin/race-export-button';
import { SITE_CONFIG } from '@/lib/constants';
import { fetcher } from '@/lib/api';
import { Event, Race, RaceFormData } from '@/types';

interface CacheSettings {
  raceResultsTtl: number;
  eventListTtl: number;
  dashboardStatsTtl: number;
}

/**
 * 大会別レース管理ページ
 */
export default function AdminEventRacesPage(): JSX.Element {
  const router = useRouter();
  const { eventId } = router.query;
  const { user, isLoading: authLoading } = useRequireAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRace, setEditingRace] = useState<Race | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshingRaces, setRefreshingRaces] = useState<Set<string>>(new Set());

  // 大会詳細取得（レース一覧含む）
  const { data: eventData, error: eventError, mutate: mutateEvent } = useSWR<Event & { races: Race[] }>(
    user && eventId ? `/api/events/${eventId}` : null,
    fetcher
  );

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

  // 認証ローディング中は何も表示しない
  if (authLoading) {
    return (
      <AdminLayout title="レース管理">
        <div className="p-8 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-2 text-gray-500">認証確認中...</p>
        </div>
      </AdminLayout>
    );
  }

  /**
   * レース作成処理
   */
  const handleCreateRace = async (formData: RaceFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/races/new?eventId=${eventId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('レースの作成に失敗しました');
      }

      await mutateEvent(); // データを再取得
      setShowCreateForm(false);
      alert('レースが作成されました');
    } catch (error) {
      console.error('Create race error:', error);
      alert('レースの作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * レース更新処理
   */
  const handleUpdateRace = async (formData: RaceFormData) => {
    if (!editingRace) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/races/${editingRace.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('レースの更新に失敗しました');
      }

      await mutateEvent(); // データを再取得
      setEditingRace(null);
      alert('レースが更新されました');
    } catch (error) {
      console.error('Update race error:', error);
      alert('レースの更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * レース削除処理
   */
  const handleDeleteRace = async (race: Race) => {
    if (!confirm(`「${race.name}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/races/${race.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('レースの削除に失敗しました');
      }

      await mutateEvent(); // データを再取得
      alert('レースが削除されました');
    } catch (error) {
      console.error('Delete race error:', error);
      alert('レースの削除に失敗しました');
    }
  };

  /**
   * レースステータス更新処理
   */
  const handleUpdateRaceStatus = async (race: Race, newStatus: Race['status']) => {
    try {
      const response = await fetch(`/api/admin/races/${race.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('レースステータスの更新に失敗しました');
      }

      await mutateEvent(); // データを再取得
      
      // ステータスに応じたメッセージを表示
      let message = `レースステータスを「${getStatusLabel(newStatus)}」に変更しました`;
      if (newStatus === 'completed') {
        message += '\n速報は30日間保存されます';
      } else if (newStatus === 'active' && race.status === 'completed') {
        message += '\n速報は3分間のキャッシュに変更されます';
      }
      
      alert(message);
    } catch (error) {
      console.error('Update race status error:', error);
      alert('レースステータスの更新に失敗しました');
    }
  };

  /**
   * レース結果手動更新処理
   */
  const handleRefreshRaceResults = async (race: Race) => {
    if (!race.webScorerRaceId) {
      alert('WebScorer Race IDが設定されていません');
      return;
    }

    setRefreshingRaces(prev => new Set(prev).add(race.id));
    
    try {
      const response = await fetch(`/api/races/${race.id}/results?force=true`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('レース速報の更新に失敗しました');
      }

      alert('レース速報を更新しました');
    } catch (error) {
      console.error('Refresh race results error:', error);
      alert('レース速報の更新に失敗しました');
    } finally {
      setRefreshingRaces(prev => {
        const newSet = new Set(prev);
        newSet.delete(race.id);
        return newSet;
      });
    }
  };

  /**
   * ステータスバッジの色を取得
   */
  const getStatusBadgeColor = (status: Race['status']): string => {
    switch (status) {
      case 'preparing':
        return 'badge-gray';
      case 'active':
        return 'badge-green';
      case 'completed':
        return 'badge-blue';
      default:
        return 'badge-gray';
    }
  };

  /**
   * レースステータスのラベルを取得
   */
  const getStatusLabel = (status: Race['status']): string => {
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

  if (eventError) {
    return (
      <AdminLayout title="レース管理">
        <ErrorMessage 
          message="大会情報の取得に失敗しました" 
          onRetry={() => mutateEvent()} 
        />
      </AdminLayout>
    );
  }

  if (!eventData) {
    return (
      <AdminLayout title="レース管理">
        <div className="p-8 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-2 text-gray-500">大会情報を読み込み中...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`レース管理 - ${eventData.name}`}>
      {/* パンくずナビ */}
      <div className="mb-6">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link href="/admin/events" className="text-gray-400 hover:text-gray-500">
                大会管理
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li>
              <span className="text-gray-900 font-medium">{eventData.name}</span>
            </li>
          </ol>
        </nav>
      </div>

      {/* 大会情報サマリー */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">開催日</h3>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(eventData.date).toLocaleDateString('ja-JP', {
                timeZone: 'Asia/Tokyo'
              })}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">レース数</h3>
            <p className="mt-1 text-sm text-gray-900">{eventData.races?.length || 0}レース</p>
          </div>
        </div>
      </div>

      {/* フォーム表示時 */}
      {(showCreateForm || editingRace) && (
        <div className="mb-8">
          <RaceForm
            race={editingRace || undefined}
            onSubmit={editingRace ? handleUpdateRace : handleCreateRace}
            onCancel={() => {
              setShowCreateForm(false);
              setEditingRace(null);
            }}
            isLoading={isSubmitting}
          />
        </div>
      )}

      {/* 通常表示時 */}
      {!showCreateForm && !editingRace && (
        <>
          {/* ヘッダー */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">レース一覧</h2>
              <Button
                variant="primary"
                onClick={() => setShowCreateForm(true)}
              >
                新規レース作成
              </Button>
            </div>
          </div>

          {/* レース一覧 */}
          <div className="bg-white rounded-lg shadow-md">
            {!eventData.races || eventData.races.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">レースが登録されていません</p>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => setShowCreateForm(true)}
                >
                  最初のレースを作成
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>レース名</th>
                      <th>カテゴリー</th>
                      <th>WebScorer ID</th>
                      <th>ステータス</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventData.races.map((race) => (
                      <tr key={race.id}>
                        <td>
                          <div className="font-medium text-gray-900">
                            {race.name}
                          </div>
                        </td>
                        <td className="text-sm text-gray-900">
                          {race.category}
                        </td>
                        <td className="text-sm text-gray-900">
                          {race.webScorerRaceId || '-'}
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeColor(race.status)}`}>
                            {getStatusLabel(race.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            <RaceExportButton
                              raceId={race.id}
                              raceName={race.name}
                              className="mr-1"
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingRace(race)}
                            >
                              編集
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteRace(race)}
                            >
                              削除
                            </Button>
                            {race.status === 'preparing' && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleUpdateRaceStatus(race, 'active')}
                              >
                                開始
                              </Button>
                            )}
                            {race.status === 'active' && (
                              <div title="完了にすると30日間の長期保存に切り替わります">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleUpdateRaceStatus(race, 'completed')}
                                >
                                  完了
                                </Button>
                              </div>
                            )}
                            {race.status === 'completed' && (
                              <div title={`進行中に戻すと${cacheSettings ? formatCacheTime(cacheSettings.raceResultsTtl) : '3分'}の速報キャッシュに切り替わります`}>
                                <Button
                                  variant="warning"
                                  size="sm"
                                  onClick={() => handleUpdateRaceStatus(race, 'active')}
                                >
                                  進行中に戻す
                                </Button>
                              </div>
                            )}
                            {race.webScorerRaceId && (race.status === 'active' || race.status === 'completed') && (
                              <Button
                                variant="warning"
                                size="sm"
                                onClick={() => handleRefreshRaceResults(race)}
                                loading={refreshingRaces.has(race.id)}
                              >
                                速報更新
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}

/**
 * サーバーサイド認証チェック
 */
export const getServerSideProps: GetServerSideProps = async (context) => {
  // 認証チェックはクライアントサイドで実行
  return {
    props: {},
  };
}; 