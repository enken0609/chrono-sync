import React from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/use-auth';
import AdminLayout from '@/components/layout/admin-layout';
import EventForm from '@/components/admin/event-form';
import LoadingSpinner from '@/components/common/loading-spinner';
import { EventFormData } from '@/types';

/**
 * 新規大会作成ページ
 */
export default function AdminNewEventPage(): JSX.Element {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // 認証ローディング中は何も表示しない
  if (authLoading) {
    return (
      <AdminLayout title="新規大会作成">
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

      const result = await response.json();
      if (result.success) {
        alert('大会が作成されました');
        router.push('/admin/events');
      } else {
        throw new Error(result.error || '大会の作成に失敗しました');
      }
    } catch (error) {
      console.error('Create event error:', error);
      alert(error instanceof Error ? error.message : '大会の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * キャンセル処理
   */
  const handleCancel = () => {
    router.push('/admin/events');
  };

  return (
    <AdminLayout title="新規大会作成">
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
              <span className="text-gray-900 font-medium">新規大会作成</span>
            </li>
          </ol>
        </nav>
      </div>

      {/* フォーム */}
      <EventForm
        onSubmit={handleCreateEvent}
        onCancel={handleCancel}
        isLoading={isSubmitting}
      />
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