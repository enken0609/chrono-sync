import React from 'react';
import { SITE_CONFIG } from '@/lib/constants';

/**
 * サイトフッターコンポーネント
 */
export default function Footer(): JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* ブランド情報 */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-brand-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CS</span>
              </div>
              <span className="ml-2 text-lg font-bold text-gray-900">
                {SITE_CONFIG.name}
              </span>
            </div>
            <p className="mt-4 text-sm text-gray-600 max-w-md">
              {SITE_CONFIG.description}
            </p>
          </div>
        </div>

        {/* コピーライト */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600">
              © {currentYear} ChronoSync. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
} 