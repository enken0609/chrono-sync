import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import useSWR from 'swr';
import { useRequireAuth } from '@/hooks/use-auth';
import AdminLayout from '@/components/layout/admin-layout';
import EventForm from '@/components/admin/event-form';
import Button from '@/components/common/button';
import LoadingSpinner from '@/components/common/loading-spinner';
import ErrorMessage from '@/components/common/error-message';
import { Event, EventFormData } from '@/types';
import { fetcher } from '@/lib/api';
import Link from 'next/link';

/**
 * 大会管理ページ
 */
export default function AdminEventsPage(): JSX.Element {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState({
    status: 'all',
    search: '',
  });

  // 大会一覧取得
  const { data: events, error, mutate } = useSWR<Event[]>(
    user ? `/api/events?status=${filter.status}&search=${filter.search}` : null,
    fetcher
  );

  // 認証ローディング中は何も表示しない
  if (authLoading) {
    return (
      <AdminLayout title="大会管理">
        <div className="p-8 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-2 text-gray-500">認証確認中...</p>
        </div>
      </AdminLayout>
    );
  }

  /**
   * 大会作成処理
   */
  const handleCreateEvent = async (formData: EventFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('大会の作成に失敗しました');
      }

      await mutate(); // データを再取得
      setShowCreateForm(false);
      alert('大会が作成されました');
    } catch (error) {
      console.error('Create event error:', error);
      alert('大会の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 大会更新処理
   */
  const handleUpdateEvent = async (formData: EventFormData) => {
    if (!editingEvent) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('大会の更新に失敗しました');
      }

      await mutate(); // データを再取得
      setEditingEvent(null);
      alert('大会が更新されました');
    } catch (error) {
      console.error('Update event error:', error);
      alert('大会の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 大会削除処理
   */
  const handleDeleteEvent = async (event: Event) => {
    if (!confirm(`「${event.name}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('大会の削除に失敗しました');
      }

      await mutate(); // データを再取得
      alert('大会が削除されました');
    } catch (error) {
      console.error('Delete event error:', error);
      alert('大会の削除に失敗しました');
    }
  };

  /**
   * フィルター変更処理
   */
  const handleFilterChange = (key: string, value: string) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

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

  if (error) {
    return (
      <AdminLayout title="大会管理">
        <ErrorMessage 
          message="大会一覧の取得に失敗しました" 
          onRetry={() => mutate()} 
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="大会管理">
      {/* フォーム表示時 */}
      {(showCreateForm || editingEvent) && (
        <div className="mb-8">
          <EventForm
            event={editingEvent || undefined}
            onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}
            onCancel={() => {
              setShowCreateForm(false);
              setEditingEvent(null);
            }}
            isLoading={isSubmitting}
          />
        </div>
      )}

      {/* 通常表示時 */}
      {!showCreateForm && !editingEvent && (
        <>
          {/* ヘッダー・フィルター */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">大会一覧</h2>
              <Button
                variant="primary"
                onClick={() => setShowCreateForm(true)}
              >
                新規大会作成
              </Button>
            </div>

            {/* フィルター */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select
                  value={filter.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="form-input"
                >
                  <option value="all">すべて</option>
                  <option value="upcoming">開催予定</option>
                  <option value="active">開催中</option>
                  <option value="completed">終了</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  検索
                </label>
                <input
                  type="text"
                  value={filter.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="大会名で検索..."
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* 大会一覧 */}
          <div className="bg-white rounded-lg shadow-md">
            {!events ? (
              <div className="p-8 text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-2 text-gray-500">大会一覧を読み込み中...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">大会が見つかりませんでした</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>大会名</th>
                      <th>開催日</th>
                      <th>ステータス</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td>
                          <div className="font-medium text-gray-900">
                            {event.name}
                          </div>
                          {event.description && (
                            <div className="text-sm text-gray-500 line-clamp-2">
                              {event.description}
                            </div>
                          )}
                        </td>
                        <td className="text-sm text-gray-900">
                          {new Date(event.date).toLocaleDateString('ja-JP', {
                            timeZone: 'Asia/Tokyo'
                          })}
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeColor(event.status)}`}>
                            {getStatusLabel(event.status)}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingEvent(event)}
                            >
                              編集
                            </Button>
                            <Link href={`/admin/events/${event.id}/races`}>
                              <Button
                                variant="primary"
                                size="sm"
                              >
                                レース管理
                              </Button>
                            </Link>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteEvent(event)}
                            >
                              削除
                            </Button>
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