import { createClient } from 'redis';
import { Redis } from '@upstash/redis';
import { ChronoSyncError } from '@/types';
import { ERROR_CODES } from '@/lib/constants';

/**
 * KV操作の統一インターフェース
 * ローカル開発（Redis）と本番環境（Vercel KV）を透過的に切り替え
 */

// Redis クライアント（ローカル開発用）
let redisClient: ReturnType<typeof createClient> | null = null;

// Upstash Redis クライアント（本番環境用）
let upstashClient: Redis | null = null;
let upstashReadOnlyClient: Redis | null = null;

/**
 * ローカル開発用Redisクライアントの初期化
 */
async function initRedisClient(): Promise<ReturnType<typeof createClient>> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  try {
    // ローカル開発環境用のRedis接続URL
    // Docker環境では redis:6379、ローカル直接実行では localhost:6379
    const redisUrl = process.env.KV_URL || 'redis://redis:6379';
    
    redisClient = createClient({
      url: redisUrl,
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await redisClient.connect();
    console.log(`Redis client connected successfully to ${redisUrl}`);
    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw new ChronoSyncError(
      'データベースへの接続に失敗しました',
      ERROR_CODES.CACHE_ERROR,
      500
    );
  }
}

/**
 * Upstash Redis クライアントの初期化（読み書き用）
 */
function initUpstashClient(): Redis {
  if (upstashClient) {
    return upstashClient;
  }

  try {
    upstashClient = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });

    console.log('Upstash Redis client (read-write) initialized successfully');
    return upstashClient;
  } catch (error) {
    console.error('Failed to initialize Upstash Redis client:', error);
    throw new ChronoSyncError(
      'データベースへの接続に失敗しました',
      ERROR_CODES.CACHE_ERROR,
      500
    );
  }
}

/**
 * Upstash Redis 読み取り専用クライアントの初期化
 */
function initUpstashReadOnlyClient(): Redis {
  // 読み取り専用トークンが設定されていない場合は、通常のクライアントを使用
  if (!process.env.KV_REST_API_READ_ONLY_TOKEN) {
    return initUpstashClient();
  }

  if (upstashReadOnlyClient) {
    return upstashReadOnlyClient;
  }

  try {
    upstashReadOnlyClient = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_READ_ONLY_TOKEN!,
    });

    console.log('Upstash Redis read-only client initialized successfully');
    return upstashReadOnlyClient;
  } catch (error) {
    console.error('Failed to initialize Upstash Redis read-only client:', error);
    // 読み取り専用クライアントの初期化に失敗した場合は、通常のクライアントを使用
    return initUpstashClient();
  }
}

/**
 * 環境に応じたKVクライアントの取得
 */
function isLocalDevelopment(): boolean {
  // 本番環境（Vercel + Upstash Redis）の判定
  // KV_REST_API_URLとKV_REST_API_TOKENが両方設定されている場合は本番環境
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return false; // Vercel KV（@vercel/kv）を使用
  }
  
  // ローカル開発環境の判定
  // NODE_ENVがdevelopmentの場合はローカル環境
  return process.env.NODE_ENV === 'development';
}

/**
 * KV操作の統一インターフェース
 */
export const kv = {
  /**
   * データを取得
   */
  async get(key: string): Promise<string | null> {
    try {
      if (isLocalDevelopment()) {
        const client = await initRedisClient();
        return await client.get(key);
      } else {
        const client = initUpstashReadOnlyClient();
        return await client.get(key);
      }
    } catch (error) {
      console.error(`KV get error for key ${key}:`, error);
      throw new ChronoSyncError(
        'データの取得に失敗しました',
        ERROR_CODES.CACHE_ERROR,
        500
      );
    }
  },

  /**
   * データを保存
   */
  async set(key: string, value: string, options?: { ex?: number; px?: number }): Promise<void> {
    try {
      if (isLocalDevelopment()) {
        const client = await initRedisClient();
        if (options?.ex) {
          await client.setEx(key, options.ex, value);
        } else if (options?.px) {
          await client.pSetEx(key, options.px, value);
        } else {
          await client.set(key, value);
        }
      } else {
        const client = initUpstashClient();
        if (options?.ex) {
          await client.setex(key, options.ex, value);
        } else {
          await client.set(key, value);
        }
      }
    } catch (error) {
      console.error(`KV set error for key ${key}:`, error);
      throw new ChronoSyncError(
        'データの保存に失敗しました',
        ERROR_CODES.CACHE_ERROR,
        500
      );
    }
  },

  /**
   * データを削除（単一キーまたは複数キー対応）
   */
  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length === 0) return;
      
      if (isLocalDevelopment()) {
        const client = await initRedisClient();
        await client.del(keys);
      } else {
        const client = initUpstashClient();
        // Upstash Redisでは個別に削除
        await Promise.all(keys.map(key => client.del(key)));
      }
    } catch (error) {
      console.error(`KV del error for keys ${keys.join(', ')}:`, error);
      throw new ChronoSyncError(
        'データの削除に失敗しました',
        ERROR_CODES.CACHE_ERROR,
        500
      );
    }
  },

  /**
   * キーの存在確認
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (isLocalDevelopment()) {
        const client = await initRedisClient();
        const result = await client.exists(key);
        return result === 1;
      } else {
        const client = initUpstashReadOnlyClient();
        const result = await client.exists(key);
        return result === 1;
      }
    } catch (error) {
      console.error(`KV exists error for key ${key}:`, error);
      throw new ChronoSyncError(
        'データの確認に失敗しました',
        ERROR_CODES.CACHE_ERROR,
        500
      );
    }
  },

  /**
   * Set操作：メンバーを追加
   */
  async sadd(key: string, member: string): Promise<void> {
    try {
      if (isLocalDevelopment()) {
        const client = await initRedisClient();
        await client.sAdd(key, member);
      } else {
        const client = initUpstashClient();
        await client.sadd(key, member);
      }
    } catch (error) {
      console.error(`KV sadd error for key ${key}:`, error);
      throw new ChronoSyncError(
        'セットデータの追加に失敗しました',
        ERROR_CODES.CACHE_ERROR,
        500
      );
    }
  },

  /**
   * Set操作：全メンバーを取得
   */
  async smembers(key: string): Promise<string[]> {
    try {
      if (isLocalDevelopment()) {
        const client = await initRedisClient();
        return await client.sMembers(key);
      } else {
        const client = initUpstashReadOnlyClient();
        return await client.smembers(key);
      }
    } catch (error) {
      console.error(`KV smembers error for key ${key}:`, error);
      throw new ChronoSyncError(
        'セットデータの取得に失敗しました',
        ERROR_CODES.CACHE_ERROR,
        500
      );
    }
  },

  /**
   * Set操作：メンバーを削除
   */
  async srem(key: string, member: string): Promise<void> {
    try {
      if (isLocalDevelopment()) {
        const client = await initRedisClient();
        await client.sRem(key, member);
      } else {
        const client = initUpstashClient();
        await client.srem(key, member);
      }
    } catch (error) {
      console.error(`KV srem error for key ${key}:`, error);
      throw new ChronoSyncError(
        'セットデータの削除に失敗しました',
        ERROR_CODES.CACHE_ERROR,
        500
      );
    }
  },

  /**
   * TTL（Time To Live）を取得
   */
  async ttl(key: string): Promise<number> {
    try {
      if (isLocalDevelopment()) {
        const client = await initRedisClient();
        return await client.ttl(key);
      } else {
        const client = initUpstashReadOnlyClient();
        return await client.ttl(key);
      }
    } catch (error) {
      console.error(`KV ttl error for key ${key}:`, error);
      throw new ChronoSyncError(
        'TTLの取得に失敗しました',
        ERROR_CODES.CACHE_ERROR,
        500
      );
    }
  },

  /**
   * TTLを設定
   */
  async expire(key: string, seconds: number): Promise<void> {
    try {
      if (isLocalDevelopment()) {
        const client = await initRedisClient();
        await client.expire(key, seconds);
      } else {
        const client = initUpstashClient();
        await client.expire(key, seconds);
      }
    } catch (error) {
      console.error(`KV expire error for key ${key}:`, error);
      throw new ChronoSyncError(
        'TTLの設定に失敗しました',
        ERROR_CODES.CACHE_ERROR,
        500
      );
    }
  },

  /**
   * パターンマッチングでキーを検索
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      if (isLocalDevelopment()) {
        const client = await initRedisClient();
        return await client.keys(pattern);
      } else {
        const client = initUpstashReadOnlyClient();
        return await client.keys(pattern);
      }
    } catch (error) {
      console.error(`KV keys error for pattern ${pattern}:`, error);
      throw new ChronoSyncError(
        'キーの検索に失敗しました',
        ERROR_CODES.CACHE_ERROR,
        500
      );
    }
  },
};

/**
 * JSON データの便利な操作関数
 */
export const kvJson = {
  /**
   * JSONデータを取得
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      console.log(`kvJson.get: Getting data for key ${key}`);
      const data = await kv.get(key);
      console.log(`kvJson.get: Raw data for key ${key}:`, data);
      
      if (!data) {
        console.log(`kvJson.get: No data found for key ${key}`);
        return null;
      }
      
      const parsed = JSON.parse(data);
      console.log(`kvJson.get: Parsed data for key ${key}:`, parsed);
      return parsed;
    } catch (error) {
      console.error(`JSON get error for key ${key}:`, error);
      // エラーの詳細をログに出力
      if (error instanceof Error) {
        console.error(`JSON get error details: ${error.message}`);
        console.error(`JSON get error stack: ${error.stack}`);
      }
      // エラーを再スローして、呼び出し元でキャッチできるようにする
      throw new ChronoSyncError(
        `JSONデータの取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.CACHE_ERROR,
        500
      );
    }
  },

  /**
   * JSONデータを保存
   */
  async set<T>(key: string, value: T, options?: { ex?: number; px?: number }): Promise<void> {
    try {
      const data = JSON.stringify(value);
      await kv.set(key, data, options);
    } catch (error) {
      console.error(`JSON set error for key ${key}:`, error);
      throw new ChronoSyncError(
        'JSONデータの保存に失敗しました',
        ERROR_CODES.CACHE_ERROR,
        500
      );
    }
  },
};

/**
 * KV接続のクリーンアップ（プロセス終了時に呼び出し）
 */
export async function closeKvConnection(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}

// プロセス終了時にクリーンアップ
process.on('beforeExit', closeKvConnection);
process.on('SIGINT', closeKvConnection);
process.on('SIGTERM', closeKvConnection); 