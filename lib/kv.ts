import { createClient } from 'redis';
import { kv as vercelKv } from '@vercel/kv';
import { ChronoSyncError } from '@/types';
import { ERROR_CODES } from '@/lib/constants';

/**
 * KV操作の統一インターフェース
 * ローカル開発（Redis）と本番環境（Vercel KV）を透過的に切り替え
 */

// Redis クライアント（ローカル開発用）
let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * ローカル開発用Redisクライアントの初期化
 */
async function initRedisClient(): Promise<ReturnType<typeof createClient>> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  try {
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
 * 環境に応じたKVクライアントの取得
 */
function isLocalDevelopment(): boolean {
  // REDIS_URLが設定されている場合は本番環境（Vercel KV）
  if (process.env.REDIS_URL) {
    return false;
  }
  
  // 開発環境の場合はローカル環境
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
        return await vercelKv.get(key);
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
        if (options?.ex) {
          await vercelKv.setex(key, options.ex, value);
        } else {
          await vercelKv.set(key, value);
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
        // Vercel KVでは一度に複数削除する場合、個別に削除
        await Promise.all(keys.map(key => vercelKv.del(key)));
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
        const result = await vercelKv.exists(key);
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
        await vercelKv.sadd(key, member);
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
        return await vercelKv.smembers(key);
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
        await vercelKv.srem(key, member);
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
        return await vercelKv.ttl(key);
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
   * パターンに一致するキーを取得
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      if (isLocalDevelopment()) {
        const client = await initRedisClient();
        return await client.keys(pattern);
      } else {
        // Vercel KVではkeysコマンドが制限されているため、代替手段を使用
        // 注意: 本番環境では大量のキーがある場合パフォーマンスに影響する可能性があります
        return await vercelKv.keys(pattern);
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
      const data = await kv.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`JSON get error for key ${key}:`, error);
      return null;
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