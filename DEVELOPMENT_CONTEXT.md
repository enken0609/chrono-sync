# Cursor Agent 一括開発指示 - ChronoSync

## 開発タスクの概要

汎用レース速報システム "ChronoSync" を作成してください。
リアルタイム結果同期プラットフォームとして、複数の競技・主催者で利用可能な、Docker環境で動作するNext.js（Pages Router）ベースのシステムです。
.cursorrules に記載されたルールに完全に従って実装してください。

## ChronoSync システムコンセプト
- **Chrono**: 時間・タイミング計測
- **Sync**: 同期・リアルタイム更新
- **統合プラットフォーム**: 複数のタイミングシステム（WebScorer等）との連携

## システムの対象競技
- Trail Running（トレイルランニング）
- Sky Running（スカイランニング）  
- Ultra Running（ウルトラランニング）
- Mountain Running（山岳競技）
- Road Running（ロードランニング）
- Triathlon（トライアスロン）
- Cycling（サイクリング）
- その他タイミング計測を伴う耐久競技全般

## 実装する機能

### 1. フロントエンド（ユーザー向け）
- **トップページ** (`pages/index.tsx`)
  - 大会・主催者情報の表示
  - 競技種別対応（Trail/Sky/Ultra/Mountain Running）
  - 進行中大会のハイライト表示
  - Tailwind CSSでレスポンシブデザイン

- **大会一覧ページ** (`pages/events/index.tsx`)
  - 全大会の一覧表示
  - 競技種別・主催者別フィルタリング
  - ステータス別フィルタリング（準備中/進行中/完了）

- **大会詳細ページ** (`pages/events/[eventId]/index.tsx`)
  - 大会基本情報表示
  - レース一覧をタブ形式で表示
  - 各レースの詳細ページへのリンク

- **レース結果ページ** (`pages/events/[eventId]/races/[raceId].tsx`)
  - ISR + SWRによるレース結果表示
  - カテゴリー別タブ切り替え
  - 手動更新ボタン
  - 最終更新時刻表示
  - オンデマンドキャッシュからのデータ取得

### 2. 管理画面
- **ログインページ** (`pages/admin/login.tsx`)
  - シンプルID/パスワード認証フォーム
  - 環境変数の認証情報と照合
  - JWT + HttpOnly Cookieでセッション管理

- **ダッシュボード** (`pages/admin/dashboard.tsx`)
  - 大会一覧と統計情報
  - 進行中レースのクイック管理

- **大会管理ページ** (`pages/admin/events/index.tsx`)
  - 大会の作成・編集・削除
  - ステータス管理

- **レース管理ページ** (`pages/admin/events/[eventId]/races.tsx`)
  - レース設定（名前、カテゴリー、WebScorer Race ID）
  - レースステータス制御（準備中/進行中/完了）
  - 手動結果更新機能

### 3. API Routes

#### フロントエンド用API
- `pages/api/events/index.ts` - 大会一覧取得
- `pages/api/events/[eventId].ts` - 大会詳細取得
- `pages/api/races/[raceId]/results.ts` - レース結果取得（オンデマンドキャッシュ）

#### 認証API
- `pages/api/auth/login.ts` - ログイン処理
- `pages/api/auth/check.ts` - 認証状態確認

#### 管理画面用API
- `pages/api/admin/events/index.ts` - 大会管理
- `pages/api/admin/events/[eventId].ts` - 大会詳細管理
- `pages/api/admin/races/[raceId].ts` - レース設定管理
- `pages/api/admin/races/[raceId]/status.ts` - レースステータス変更
- `pages/api/admin/races/[raceId]/fetch.ts` - 手動結果更新

### 4. 共通コンポーネント

#### Layout Components
- `components/layout/header.tsx` - サイトヘッダー（ChronoSyncブランド表示）
- `components/layout/footer.tsx` - サイトフッター（chrono-sync.com）
- `components/layout/admin-layout.tsx` - 管理画面レイアウト

#### Race Components
- `components/race/race-results-table.tsx` - レース結果テーブル
- `components/race/race-status-badge.tsx` - レースステータス表示
- `components/race/race-tabs.tsx` - カテゴリータブ

#### Admin Components
- `components/admin/event-form.tsx` - 大会登録・編集フォーム
- `components/admin/race-form.tsx` - レース設定フォーム
- `components/admin/race-control.tsx` - レース操作パネル

#### Common Components
- `components/common/loading-spinner.tsx` - ローディング表示
- `components/common/error-message.tsx` - エラーメッセージ
- `components/common/button.tsx` - 共通ボタン

### 5. ユーティリティ・設定ファイル

#### ライブラリ・設定
- `lib/kv.ts` - KV接続（ローカルRedis/本番Vercel KV）
- `lib/auth.ts` - 認証ユーティリティ（JWT生成・検証）
- `lib/api.ts` - API共通処理（fetcher関数等）
- `lib/constants.ts` - 定数定義

#### 型定義
- `types/index.ts` - 全型定義（Event, Race, RaceResult等）

#### カスタムフック
- `hooks/use-race-results.ts` - レース結果取得用SWRフック
- `hooks/use-auth.ts` - 認証状態管理フック

### 6. Docker設定

#### Docker関連ファイル
- `docker-compose.yml` - Next.js + Redis構成
- `Dockerfile` - Node.js 18 Alpine
- `.dockerignore` - 除外ファイル設定

#### 設定ファイル
- `next.config.js` - Next.js設定（パスエイリアス等）
- `tailwind.config.js` - Tailwind CSS設定
- `tsconfig.json` - TypeScript設定

#### 環境設定
- `.env.local.example` - 環境変数テンプレート
- `package.json` - 依存関係とスクリプト

## 重要な実装要件

### 1. オンデマンドキャッシュの実装
```typescript
// pages/api/races/[raceId]/results.ts での必須実装パターン
1. KVからキャッシュ確認（TTL: 3分）
2. 有効ならキャッシュ返却（API呼び出しなし）
3. 期限切れならWebScorer API呼び出し
4. 新データをKV保存
5. クライアントに返却
```

### 2. 認証システムの実装
```typescript
// 環境変数チェック → JWT生成 → HttpOnly Cookie保存
const isValid = username === process.env.ADMIN_USERNAME && 
                password === process.env.ADMIN_PASSWORD;
```

### 3. ISR + SWRの組み合わせ
```typescript
// getStaticPropsでISR実装
export const getStaticProps: GetStaticProps = async ({ params }) => {
  return {
    props: { initialData },
    revalidate: 180 // 3分
  };
};

// SWRでクライアント更新
const { data, mutate } = useSWR('/api/...', fetcher, { initialData });
```

### 4. エラーハンドリング
- 全API Routeで try-catch実装
- ユーザーフレンドリーなエラーメッセージ
- フォールバック処理（古いキャッシュ利用等）

### 5. レスポンシブデザイン
- モバイルファーストアプローチ
- Tailwind CSSのブレークポイント活用
- テーブルの横スクロール対応

## データ構造例

### KVキー設計（汎用対応）
```
events:list → Set["event1", "event2"]
event:event1:info → { id, name, date, status, ... }
event:event1:races → Set["race1", "race2"]
race:race1:config → { id, eventId, name, category, webScorerRaceId, ... }
race:race1:results → WebScorerレスポンス（TTL: 180秒）

# 主催者管理（将来拡張用）
organizers:list → Set["org1", "org2"]
organizer:org1:info → { id, name, contact, events, ... }
```

### WebScorer APIレスポンス例
```json
{
  "RaceInfo": {
    "RaceId": "371034",
    "Name": "小学生男子",
    "Date": "Oct 27, 2024"
  },
  "Results": [{
    "Grouping": { "Overall": true },
    "Racers": [{
      "Place": "1",
      "Bib": "612",
      "Name": "パーシー 悠人",
      "Time": "5:06.1"
    }]
  }]
}
```

## パッケージ依存関係

### 必須依存関係
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@vercel/kv": "^0.2.0",
    "swr": "^2.0.0",
    "jsonwebtoken": "^9.0.0",
    "redis": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.0.0",
    "@types/redis": "^4.0.0"
  }
}
```

## 開発の進め方

1. **Docker環境構築** - docker-compose.yml, Dockerfile作成
2. **基本設定** - package.json, tsconfig.json, tailwind.config.js
3. **型定義** - types/index.ts で全型定義
4. **ユーティリティ** - lib/配下の共通処理
5. **API Routes** - データアクセス層の実装
6. **コンポーネント** - 再利用可能なUI部品
7. **ページ** - 各画面の実装
8. **認証システム** - ログイン機能
9. **管理画面** - CRUD操作画面

## 動作確認項目

### ローカル開発
- `docker-compose up` でRedis含む環境起動
- http://localhost:3000 でフロントエンド表示
- http://localhost:3000/admin/login で管理画面ログイン

### 機能テスト
- オンデマンドキャッシュの動作確認
- 認証機能の動作確認
- レスポンシブデザインの確認

この指示に従って、完全に動作するトレイルランニング速報サイトを一括で作成してください。
.cursorrules のルールを厳密に守り、型安全性とエラーハンドリングを重視した実装を行ってください。

## Webscorer仕様
### ドキュメント
https://www.webscorer.com/blog/post/2021/09/28/how-to-access-race-data-via-json-api

### APIレスポンス例
docs/webscorer_api_response_sample.json
