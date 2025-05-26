import React from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import '@/styles/globals.css';

/**
 * Next.js アプリケーションのルートコンポーネント
 */
export default function App({ Component, pageProps }: AppProps): JSX.Element {
  return (
    <>
      <Head>
        {/* ファビコン */}
        <link rel="icon" href="/images/favicon/favicon.ico" />
        
        {/* メタタグ */}
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* デフォルトタイトル */}
        <title>ChronoSync - リアルタイム速報システム</title>
        <meta name="description" content="トレイルランニング・ランニング大会のリアルタイム結果速報システム" />
      </Head>
      <Component {...pageProps} />
    </>
  );
} 