import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import useSWR from 'swr';
import Button from '@/components/common/button';
import LoadingSpinner from '@/components/common/loading-spinner';
import { SITE_CONFIG } from '@/lib/constants';
import { useRequireAuth, useAuth } from '@/hooks/use-auth';
import { Event, Race, SuccessResponse } from '@/types';
import { fetcher } from '@/lib/api';

/**
 * 管理画面ダッシュボード
 */
const AdminDashboardPage: NextPage = () => {
  const { user, isLoading } = useRequireAuth();

  // 大会データを取得
  const { data: events, error: eventsError } = useSWR<Event[]>(
    '/api/events',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner text="認証確認中..." />
      </div>
    );
  }

  if (!user) {
    return null; // useRequireAuthがリダイレクト処理
  }

  // 統計情報を計算
  const totalEvents = events?.length || 0;
  const activeEvents = events?.filter(event => event.status === 'active').length || 0;
  const upcomingEvents = events?.filter(event => event.status === 'upcoming').length || 0;
  const completedEvents = events?.filter(event => event.status === 'completed').length || 0;

  return (
    <>
      <Head>
        <title>管理画面ダッシュボード - {SITE_CONFIG.name}</title>
        <meta name="description" content="ChronoSync管理画面ダッシュボード" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-brand-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CS</span>
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-gray-900">
                    {SITE_CONFIG.name} 管理画面
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {user.username}
                </span>
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* ページタイトル */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
              <p className="mt-2 text-gray-600">
                システムの概要と主要機能へのアクセス
              </p>
            </div>

            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">📊</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          総大会数
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {events ? totalEvents : (eventsError ? 'エラー' : '...')}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">🏃</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          進行中
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {events ? activeEvents : (eventsError ? 'エラー' : '...')}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">📅</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          開催予定
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {events ? upcomingEvents : (eventsError ? 'エラー' : '...')}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">✅</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          完了済み
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {events ? completedEvents : (eventsError ? 'エラー' : '...')}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* クイックアクション */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">
                    大会管理
                  </h3>
                </div>
                <div className="card-body">
                  <p className="text-gray-600 mb-4">
                    大会の作成、編集、削除を行います
                  </p>
                  <div className="flex gap-2">
                    <Link href="/admin/events">
                      <Button size="sm" variant="primary">
                        大会一覧
                      </Button>
                    </Link>
                    <Link href="/admin/events/new">
                      <Button size="sm" variant="secondary">
                        新規作成
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">
                    API テスト
                  </h3>
                </div>
                <div className="card-body">
                  <p className="text-gray-600 mb-4">
                    WebScorer API接続とキャッシュ機能をテストします
                  </p>
                  <div className="flex gap-2">
                    <Link href="/test/race-results">
                      <Button size="sm" variant="primary">
                        デモページ
                      </Button>
                    </Link>
                    <ApiTestButton />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">
                    システム管理
                  </h3>
                </div>
                <div className="card-body">
                  <p className="text-gray-600 mb-4">
                    システム設定とデータ管理を行います
                  </p>
                  <div className="flex gap-2">
                    <Link href="/admin/settings">
                      <Button size="sm" variant="primary">
                        設定画面
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

/**
 * ログアウトボタンコンポーネント
 */
function LogoutButton(): JSX.Element {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Button size="sm" variant="secondary" onClick={handleLogout}>
      ログアウト
    </Button>
  );
}

/**
 * APIテストボタンコンポーネント
 */
function ApiTestButton(): JSX.Element {
  const [testing, setTesting] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await fetch('/api/races/371034/results');
      const data = await response.json();
      
      if (data.success) {
        setResult('✅ API接続成功');
      } else {
        setResult('❌ API接続失敗: ' + data.error);
      }
    } catch (error) {
      setResult('❌ 接続エラー: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <Button size="sm" variant="secondary" onClick={handleTest} loading={testing}>
        API テスト
      </Button>
      {result && (
        <p className="mt-2 text-xs text-gray-600">{result}</p>
      )}
    </div>
  );
}

export default AdminDashboardPage; 