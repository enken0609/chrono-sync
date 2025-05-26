# ChronoSync

リアルタイムレース速報システム - トレイルランニング、スカイランニング、ウルトラランニングなど、あらゆる耐久競技のリアルタイム速報を提供するプラットフォーム

## 🏃‍♂️ 概要

ChronoSyncは、WebScorer APIと連携してレース結果をリアルタイムで表示する速報システムです。

### 主な機能

- **リアルタイム速報**: WebScorer APIからのオンデマンドキャッシュ（3分TTL）
- **複数競技対応**: Trail Running, Sky Running, Ultra Running, Mountain Running, Road Running, Triathlon, Cycling
- **レスポンシブデザイン**: モバイルファーストアプローチ
- **管理画面**: 大会・レース管理機能
- **Docker対応**: ローカル開発環境の統一

## 🚀 クイックスタート

### 前提条件

- Docker & Docker Compose
- WebScorer API ID（[WebScorer](https://www.webscorer.com)で取得）

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd chrono-sync
```

### 2. 環境変数の設定

`.env.local`ファイルを作成：

```bash
# システム設定
NEXT_PUBLIC_SITE_NAME=ChronoSync
NEXT_PUBLIC_SITE_DESCRIPTION=Real-time race results synchronization platform
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 認証設定
ADMIN_USERNAME=chronosync-admin
ADMIN_PASSWORD=ChronoSync2024!
JWT_SECRET=your-jwt-secret-key-here-please-change-this-in-production

# KV設定（ローカル開発用）
KV_URL=redis://localhost:6379
NODE_ENV=development

# WebScorer API設定
WEBSCORER_API_ID=your-webscorer-api-id-here

# カスタマイズ設定
NEXT_PUBLIC_DEFAULT_ORGANIZER=Race Organization
NEXT_PUBLIC_SUPPORT_EMAIL=support@chrono-sync.com
NEXT_PUBLIC_BRAND_COLOR=#6366F1
NEXT_PUBLIC_ACCENT_COLOR=#8B5CF6
```

### 3. Docker環境の起動

```bash
# 初回起動（ビルド含む）
docker-compose up --build

# 通常起動
docker-compose up
```

### 4. アクセス

- **フロントエンド**: http://localhost:3000
- **管理画面**: http://localhost:3000/admin/login
- **Redis**: localhost:6379

## 📖 WebScorer API設定

### API IDの取得方法

1. [WebScorer](https://www.webscorer.com)にログイン
2. `Organizers` → `My organizer settings`に移動
3. `Unique organizer URL`の末尾の数字がAPI ID
4. 例: `https://www.webscorer.com/organizer?id=86255` → API ID: `86255`

### API仕様

- **エンドポイント**: `https://www.webscorer.com/json/race?raceid={raceId}&apiid={apiId}`
- **認証**: API ID（クエリパラメータ）
- **レスポンス**: JSON形式
- **制限**: PRO Results subscription必須

詳細: [WebScorer JSON API Documentation](https://www.webscorer.com/blog/post/2021/09/28/how-to-access-race-data-via-json-api)

## 🏗️ アーキテクチャ

### 技術スタック

- **フレームワーク**: Next.js 14 (Pages Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **データベース**: Redis (ローカル) / Vercel KV (本番)
- **認証**: JWT + HttpOnly Cookie
- **状態管理**: SWR

### ディレクトリ構造

```
chrono-sync/
├── components/          # Reactコンポーネント
│   ├── common/         # 共通コンポーネント
│   ├── layout/         # レイアウトコンポーネント
│   └── race/           # レース関連コンポーネント
├── hooks/              # カスタムフック
├── lib/                # ユーティリティライブラリ
├── pages/              # Next.js Pages Router
│   ├── api/           # API Routes
│   ├── admin/         # 管理画面
│   └── events/        # 大会・レース画面
├── styles/             # スタイルシート
└── types/              # TypeScript型定義
```

### オンデマンドキャッシュ

```typescript
// キャッシュフロー
1. キャッシュ確認（TTL: 3分）
2. 有効 → 即返却（API呼び出しなし）
3. 期限切れ → WebScorer API呼び出し
4. 新データをキャッシュ保存
5. クライアントに返却
```

## 🔧 開発

### ローカル開発

```bash
# 開発サーバー起動
docker-compose up

# ログ確認
docker-compose logs -f app

# Redis CLI接続
docker-compose exec redis redis-cli
```

### 型チェック・リント

```bash
# コンテナ内で実行
docker-compose exec app npm run type-check
docker-compose exec app npm run lint
docker-compose exec app npm run build
```

### デバッグ

- **アプリケーションログ**: `docker-compose logs app`
- **Redisデータ確認**: `docker-compose exec redis redis-cli`
- **キャッシュキー**: `race:{raceId}:results`, `race:{raceId}:timestamp`

## 📱 使用方法

### フロントエンド

1. **ホーム**: 大会ハイライト表示
2. **大会一覧**: 全大会の一覧・フィルタリング
3. **レース結果**: リアルタイム結果表示・手動更新

### 管理画面

1. **ログイン**: `/admin/login`（環境変数の認証情報）
2. **ダッシュボード**: 統計情報・クイック管理
3. **大会管理**: 大会の作成・編集・削除
4. **レース管理**: レース設定・WebScorer Race ID設定

## 🚀 本番デプロイ

### Vercel + Vercel KV

1. **Vercelプロジェクト作成**
2. **Vercel KVデータベース作成**
3. **環境変数設定**:
   ```
   KV_REST_API_URL=<vercel-kv-url>
   KV_REST_API_TOKEN=<vercel-kv-token>
   WEBSCORER_API_ID=<your-api-id>
   ADMIN_USERNAME=<admin-username>
   ADMIN_PASSWORD=<secure-password>
   JWT_SECRET=<secure-jwt-secret>
   ```
4. **デプロイ**: `vercel --prod`

## 🔒 セキュリティ

- **認証**: 環境変数ベースの認証情報
- **JWT**: HttpOnly Cookie + 7日間有効期限
- **API**: 入力検証・エラーハンドリング
- **CORS**: 適切なオリジン制限

## 📊 パフォーマンス

- **初期表示**: 1秒以内
- **データ更新**: 3秒以内
- **キャッシュ**: 3分TTL（手動更新可能）
- **ISR**: 静的生成 + オンデマンド更新

## 🤝 コントリビューション

1. フォーク
2. フィーチャーブランチ作成
3. 変更をコミット
4. プルリクエスト作成

## 📄 ライセンス

MIT License

## 🆘 サポート

- **Email**: support@chrono-sync.com
- **Issues**: GitHubのIssues
- **Documentation**: [WebScorer API Docs](https://www.webscorer.com/blog/post/2021/09/28/how-to-access-race-data-via-json-api)

---

**ChronoSync** - リアルタイム速報で、レースの感動をその瞬間に。
