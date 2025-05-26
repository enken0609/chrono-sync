import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Button from '@/components/common/button';
import { SITE_CONFIG } from '@/lib/constants';

/**
 * ChronoSync トップページ
 */
const HomePage: NextPage = () => {
  return (
    <>
      <Head>
        <title>{SITE_CONFIG.name} - リアルタイム速報システム</title>
        <meta name="description" content={SITE_CONFIG.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        
        <main className="flex-1">
          {/* ヒーローセクション */}
          <section className="relative bg-gradient-to-br from-brand-primary to-brand-accent">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
              <div className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                  <span className="block">ChronoSync</span>
                  <span className="block text-2xl sm:text-3xl lg:text-4xl font-normal mt-2 text-blue-100">
                    WebScorer連携速報サイト
                  </span>
                </h1>
                <p className="text-xl sm:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
                  WebScorer APIと連携したリアルタイム速報システム
                </p>
                <div className="flex justify-center">
                  <Link href="/events">
                    <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100 hover:text-indigo-700 border border-gray-200 shadow-sm">
                      大会一覧を見る
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default HomePage; 