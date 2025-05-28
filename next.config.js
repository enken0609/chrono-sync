/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // ISR設定
    isrMemoryCacheSize: 50,
    // Pages Router必須（App Router無効化）
    appDir: false
  },
  // 画像最適化設定
  images: {
    domains: [
      'images.microcms-assets.io', // microCMS画像ホスト
    ],
    formats: ['image/webp', 'image/avif'],
  },
  // パスエイリアス設定
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': process.cwd(),
    };
    return config;
  },
  // 環境変数の公開設定
  env: {
    NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
    NEXT_PUBLIC_SITE_DESCRIPTION: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
};

module.exports = nextConfig; 