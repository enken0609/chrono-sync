import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/use-auth';
import Button from '@/components/common/button';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * 管理画面レイアウト
 */
export default function AdminLayout({ 
  children, 
  title = '管理画面' 
}: AdminLayoutProps): JSX.Element {
  const router = useRouter();
  const { user, logout } = useAuth();

  /**
   * ログアウト処理
   */
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  /**
   * ナビゲーションアイテム
   */
  const navigationItems = [
    {
      name: 'ダッシュボード',
      href: '/admin/dashboard',
      icon: '📊',
    },
    {
      name: '大会管理',
      href: '/admin/events',
      icon: '🏃',
    },
    {
      name: '設定',
      href: '/admin/settings',
      icon: '⚙️',
    },
  ];

  /**
   * アクティブなナビゲーションアイテムかチェック
   */
  const isActiveNavItem = (href: string): boolean => {
    if (href === '/admin/dashboard') {
      return router.pathname === href;
    }
    return router.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* ロゴ・タイトル */}
            <div className="flex items-center">
              <Link href="/admin/dashboard" className="flex items-center">
                <Image
                  src="/images/logos/logo-chronosync.png"
                  alt="ChronoSync"
                  width={160}
                  height={40}
                  className="h-8 w-auto"
                />
                <div className="ml-3">
                  <div className="flex items-center">
                    <h1 className="text-lg font-bold text-gray-900">
                      ChronoSync
                    </h1>
                    <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      管理画面
                    </span>
                  </div>
                </div>
              </Link>
            </div>

            {/* ユーザー情報・ログアウト */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.username}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
              >
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* サイドバー */}
        <nav className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-4">
            <ul className="space-y-2">
              {navigationItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActiveNavItem(item.href)
                        ? 'bg-brand-100 text-brand-700 border-r-2 border-brand-500'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* フロントエンドへのリンク */}
          <div className="border-t border-gray-200 p-4">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
            >
              <span className="mr-3 text-lg">🌐</span>
              フロントエンドを表示
              <span className="ml-auto text-xs text-gray-400">↗</span>
            </Link>
          </div>
        </nav>

        {/* メインコンテンツ */}
        <main className="flex-1 p-8">
          {/* ページタイトル */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>

          {/* コンテンツ */}
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 