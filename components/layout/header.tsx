import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SITE_CONFIG } from '@/lib/constants';

/**
 * サイトヘッダーコンポーネント
 */
export default function Header(): JSX.Element {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string): boolean => {
    return router.pathname === path;
  };

  /**
   * モバイルメニューのトグル
   */
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  /**
   * モバイルメニューを閉じる
   */
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* ロゴ・ブランド */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center" onClick={closeMobileMenu}>
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-brand-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CS</span>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">
                  {SITE_CONFIG.name}
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  リアルタイム速報システム
                </p>
              </div>
            </Link>
          </div>

          {/* ナビゲーション */}
          <nav className="hidden md:flex space-x-8">
            <Link
              href="/"
              className={`${
                isActive('/') ? 'nav-link-active' : 'nav-link'
              }`}
            >
              ホーム
            </Link>
            <Link
              href="/events"
              className={`${
                isActive('/events') || router.pathname.startsWith('/events/')
                  ? 'nav-link-active'
                  : 'nav-link'
              }`}
            >
              大会一覧
            </Link>
          </nav>

          {/* モバイルメニューボタン */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-primary p-2 rounded-md"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">メニューを開く</span>
              {isMobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* モバイルメニュー */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t border-gray-200">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/') 
                  ? 'text-brand-primary bg-brand-primary bg-opacity-10' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              ホーム
            </Link>
            <Link
              href="/events"
              onClick={closeMobileMenu}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/events') || router.pathname.startsWith('/events/')
                  ? 'text-brand-primary bg-brand-primary bg-opacity-10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              大会一覧
            </Link>
          </div>
        </div>
      )}
    </header>
  );
} 