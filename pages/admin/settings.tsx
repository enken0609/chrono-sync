import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import useSWR from 'swr';
import { useRequireAuth } from '@/hooks/use-auth';
import AdminLayout from '@/components/layout/admin-layout';
import Button from '@/components/common/button';
import LoadingSpinner from '@/components/common/loading-spinner';
import ErrorMessage from '@/components/common/error-message';
import { SITE_CONFIG } from '@/lib/constants';
import { fetcher } from '@/lib/api';

interface CacheSettings {
  raceResultsTtl: number; // 秒
  eventListTtl: number; // 秒
  dashboardStatsTtl: number; // 秒
}

interface SystemSettings {
  cache: CacheSettings;
  lastUpdated: string;
}

/**
 * 管理画面設定ページ
 */
const AdminSettingsPage: NextPage = () => {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'cache' | 'data'>('cache');

  // 設定データを取得
  const { data: settings, error, mutate } = useSWR<SystemSettings>(
    user ? '/api/admin/settings' : null,
    fetcher
  );

  // 認証ローディング中は何も表示しない
  if (authLoading) {
    return (
      <AdminLayout title="設定">
        <div className="p-8 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-2 text-gray-500">認証確認中...</p>
        </div>
      </AdminLayout>
    );
  }

  /**
   * キャッシュ設定更新処理
   */
  const handleUpdateCacheSettings = async (newSettings: CacheSettings) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/settings/cache', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error('設定の更新に失敗しました');
      }

      await mutate(); // データを再取得
      alert('キャッシュ設定を更新しました');
    } catch (error) {
      console.error('Update cache settings error:', error);
      alert('設定の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * キャッシュクリア処理
   */
  const handleClearCache = async () => {
    if (!confirm('すべてのキャッシュをクリアしますか？')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/settings/cache/clear', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('キャッシュのクリアに失敗しました');
      }

      alert('キャッシュをクリアしました');
    } catch (error) {
      console.error('Clear cache error:', error);
      alert('キャッシュのクリアに失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <AdminLayout title="設定">
        <ErrorMessage 
          message="設定の取得に失敗しました" 
          onRetry={() => mutate()} 
        />
      </AdminLayout>
    );
  }

  if (!settings) {
    return (
      <AdminLayout title="設定">
        <div className="p-8 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-2 text-gray-500">設定を読み込み中...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>設定 - {SITE_CONFIG.name}</title>
        <meta name="description" content="ChronoSync管理画面設定" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <AdminLayout title="設定">
        {/* タブナビゲーション */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('cache')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'cache'
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⚡ キャッシュ設定
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'data'
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🗄️ データ管理
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* キャッシュ設定タブ */}
            {activeTab === 'cache' && (
              <CacheSettingsTab
                settings={settings.cache}
                onUpdate={handleUpdateCacheSettings}
                onClearCache={handleClearCache}
                isSubmitting={isSubmitting}
              />
            )}

            {/* データ管理タブ */}
            {activeTab === 'data' && (
              <DataManagementTab />
            )}
          </div>
        </div>

        {/* 最終更新情報 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            最終更新: {new Date(settings.lastUpdated).toLocaleString('ja-JP')}
          </p>
        </div>
      </AdminLayout>
    </>
  );
};

/**
 * キャッシュ設定タブコンポーネント
 */
interface CacheSettingsTabProps {
  settings: CacheSettings;
  onUpdate: (settings: CacheSettings) => Promise<void>;
  onClearCache: () => Promise<void>;
  isSubmitting: boolean;
}

function CacheSettingsTab({ settings, onUpdate, onClearCache, isSubmitting }: CacheSettingsTabProps): JSX.Element {
  const [formData, setFormData] = useState<CacheSettings>(settings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}時間`;
    return `${Math.floor(seconds / 86400)}日`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">キャッシュ設定</h3>
        <p className="text-sm text-gray-600 mb-6">
          各種データのキャッシュ有効期限を設定できます。短すぎるとAPI呼び出しが頻繁になり、長すぎるとデータの更新が遅れます。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* レース結果TTL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            レース結果キャッシュ（進行中レース）
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              min="30"
              max="3600"
              value={formData.raceResultsTtl}
              onChange={(e) => setFormData(prev => ({ ...prev, raceResultsTtl: parseInt(e.target.value) }))}
              className="form-input w-32"
            />
            <span className="text-sm text-gray-500">
              秒 ({formatTime(formData.raceResultsTtl)})
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            推奨: 180秒（3分）- 進行中レースの結果更新頻度
          </p>
        </div>

        {/* イベントリストTTL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            大会一覧キャッシュ
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              min="300"
              max="86400"
              value={formData.eventListTtl}
              onChange={(e) => setFormData(prev => ({ ...prev, eventListTtl: parseInt(e.target.value) }))}
              className="form-input w-32"
            />
            <span className="text-sm text-gray-500">
              秒 ({formatTime(formData.eventListTtl)})
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            推奨: 3600秒（1時間）- 大会情報は頻繁に変更されない
          </p>
        </div>

        {/* ダッシュボード統計TTL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ダッシュボード統計キャッシュ
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              min="60"
              max="3600"
              value={formData.dashboardStatsTtl}
              onChange={(e) => setFormData(prev => ({ ...prev, dashboardStatsTtl: parseInt(e.target.value) }))}
              className="form-input w-32"
            />
            <span className="text-sm text-gray-500">
              秒 ({formatTime(formData.dashboardStatsTtl)})
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            推奨: 300秒（5分）- 統計情報の更新頻度
          </p>
        </div>

        <div className="flex space-x-4">
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
          >
            設定を保存
          </Button>
          <Button
            type="button"
            variant="warning"
            onClick={onClearCache}
            loading={isSubmitting}
          >
            全キャッシュクリア
          </Button>
        </div>
      </form>
    </div>
  );
}

/**
 * データ管理タブコンポーネント
 */
function DataManagementTab(): JSX.Element {
  const [isClearing, setIsClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  /**
   * リザルトデータ全削除処理
   */
  const handleClearResults = async () => {
    if (!confirm('すべてのレース結果データを削除しますか？\n\n⚠️ この操作は取り消せません。\n・レース設定や大会情報は保持されます\n・結果データのみが削除されます')) {
      return;
    }

    setIsClearing(true);
    setClearResult(null);

    try {
      const response = await fetch('/api/admin/settings/data/clear-results', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('リザルトデータの削除に失敗しました');
      }

      const data = await response.json();
      
      if (data.success) {
        setClearResult(`✅ ${data.data.message}`);
      } else {
        setClearResult('❌ 削除失敗: ' + data.error);
      }
    } catch (error) {
      console.error('Clear results error:', error);
      setClearResult('❌ 接続エラー: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">データ管理</h3>
        <p className="text-sm text-gray-600 mb-6">
          データベースの管理とメンテナンス機能です。
        </p>
      </div>

      {/* リザルトデータ削除セクション */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-red-500 text-xl">🗑️</span>
          </div>
          <div className="ml-4 flex-1">
            <h4 className="text-lg font-medium text-red-800 mb-2">
              リザルトデータ全削除
            </h4>
            <div className="text-sm text-red-700 mb-4">
              <p className="mb-2">すべてのレース結果データを削除します。</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>レース設定や大会情報は保持されます</li>
                <li>WebScorerから取得した結果データのみが削除されます</li>
                <li>次回アクセス時に新しいデータが取得されます</li>
                <li>この操作は取り消せません</li>
              </ul>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="danger"
                size="sm"
                onClick={handleClearResults}
                loading={isClearing}
              >
                全リザルトデータを削除
              </Button>
              {clearResult && (
                <p className="text-sm font-medium">{clearResult}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* その他の管理機能 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-400">ℹ️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              その他の管理機能
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>キャッシュクリア機能は「キャッシュ設定」タブから利用できます。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettingsPage; 