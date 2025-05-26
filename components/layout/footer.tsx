import React from 'react';
import Image from 'next/image';
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
              <Image
                src="/images/logos/logo-chronosync.png"
                alt="ChronoSync"
                width={160}
                height={40}
                className="h-8 w-auto"
              />
              <div className="ml-3">
                <h2 className="text-lg font-bold text-gray-900">
                  ChronoSync
                </h2>
              </div>
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