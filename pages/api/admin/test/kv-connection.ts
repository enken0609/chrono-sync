import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createSuccessResponse, 
  handleApiError,
  createTimestamp
} from '@/lib/api';
import { requireAuthCheck } from '@/lib/auth';
import { kv, kvJson } from '@/lib/kv';
import { kv as vercelKv } from '@vercel/kv';

interface KvTestResult {
  environment: string;
  connectionStatus: 'success' | 'error';
  testResults: {
    basicSet: boolean;
    basicGet: boolean;
    jsonSet: boolean;
    jsonGet: boolean;
    setOperations: boolean;
    ttlOperations: boolean;
  };
  environmentVariables: {
    NODE_ENV: string;
    hasRedisUrl: boolean;
    hasKvUrl: boolean;
    hasKvRestApiUrl: boolean;
    hasKvRestApiToken: boolean;
    hasKvRestApiReadOnlyToken: boolean;
    redisUrlPrefix?: string;
    kvRestApiUrlPrefix?: string;
  };
  errorDetails?: string;
  timestamp: string;
}

/**
 * KV接続テストAPI（管理者のみ）
 * GET /api/admin/test/kv-connection - KV接続テスト
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // 認証チェック
  try {
    await requireAuthCheck(req, res);
  } catch (error) {
    return res.status(401).json(handleApiError(new Error('認証が必要です')));
  }

  try {
    if (req.method === 'GET') {
      return await handleKvConnectionTest(req, res);
    } else {
      return res.status(405).json(handleApiError(new Error('Method not allowed')));
    }
  } catch (error) {
    console.error('KV Connection Test API error:', error);
    return res.status(500).json(handleApiError(error));
  }
}

/**
 * KV接続テスト実行
 */
async function handleKvConnectionTest(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const testKey = `test:connection:${Date.now()}`;
  const testValue = 'test-value';
  const testJsonValue = { test: true, timestamp: Date.now() };
  
  const result: KvTestResult = {
    environment: process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ? 'vercel-kv-upstash' : 'local-redis',
    connectionStatus: 'error',
    testResults: {
      basicSet: false,
      basicGet: false,
      jsonSet: false,
      jsonGet: false,
      setOperations: false,
      ttlOperations: false,
    },
    environmentVariables: {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      hasRedisUrl: !!process.env.REDIS_URL,
      hasKvUrl: !!process.env.KV_URL,
      hasKvRestApiUrl: !!process.env.KV_REST_API_URL,
      hasKvRestApiToken: !!process.env.KV_REST_API_TOKEN,
      hasKvRestApiReadOnlyToken: !!process.env.KV_REST_API_READONLY_TOKEN,
      redisUrlPrefix: process.env.REDIS_URL ? process.env.REDIS_URL.split(':')[0] : undefined,
      kvRestApiUrlPrefix: process.env.KV_REST_API_URL ? process.env.KV_REST_API_URL.split('/')[2] : undefined,
    },
    timestamp: createTimestamp(),
  };

  try {
    // 1. 基本的なset/get操作テスト
    try {
      console.log('Testing basic set operation...');
      await kv.set(testKey, testValue);
      result.testResults.basicSet = true;
      console.log('Basic set operation successful');
      
      console.log('Testing basic get operation...');
      const getValue = await kv.get(testKey);
      result.testResults.basicGet = getValue === testValue;
      console.log('Basic get operation result:', getValue);
    } catch (error) {
      console.error('Basic set/get test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      result.errorDetails = `Basic operations failed: ${errorMessage}${errorStack ? ` | Stack: ${errorStack}` : ''}`;
      
      // Vercel KVの直接テストも試行
      try {
        console.log('Testing direct Vercel KV access...');
        await vercelKv.set(`direct_${testKey}`, testValue);
        const directValue = await vercelKv.get(`direct_${testKey}`);
        console.log('Direct Vercel KV test result:', directValue);
        result.errorDetails += ` | Direct Vercel KV test: ${directValue === testValue ? 'SUCCESS' : 'FAILED'}`;
        await vercelKv.del(`direct_${testKey}`);
      } catch (directError) {
        console.error('Direct Vercel KV test failed:', directError);
        const directErrorMessage = directError instanceof Error ? directError.message : 'Unknown error';
        result.errorDetails += ` | Direct Vercel KV error: ${directErrorMessage}`;
      }
    }

    // 2. JSON操作テスト
    try {
      await kvJson.set(`${testKey}:json`, testJsonValue);
      result.testResults.jsonSet = true;
      
      const getJsonValue = await kvJson.get<{ test: boolean; timestamp: number }>(`${testKey}:json`);
      result.testResults.jsonGet = getJsonValue?.test === true;
    } catch (error) {
      console.error('JSON set/get test failed:', error);
      if (!result.errorDetails) {
        result.errorDetails = `JSON operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    // 3. Set操作テスト
    try {
      await kv.sadd(`${testKey}:set`, 'member1');
      await kv.sadd(`${testKey}:set`, 'member2');
      const members = await kv.smembers(`${testKey}:set`);
      result.testResults.setOperations = members.length === 2;
    } catch (error) {
      console.error('Set operations test failed:', error);
      if (!result.errorDetails) {
        result.errorDetails = `Set operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    // 4. TTL操作テスト
    try {
      await kv.set(`${testKey}:ttl`, testValue, { ex: 60 });
      const ttl = await kv.ttl(`${testKey}:ttl`);
      result.testResults.ttlOperations = ttl > 0 && ttl <= 60;
    } catch (error) {
      console.error('TTL operations test failed:', error);
      if (!result.errorDetails) {
        result.errorDetails = `TTL operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    // 5. クリーンアップ
    try {
      await kv.del(testKey, `${testKey}:json`, `${testKey}:set`, `${testKey}:ttl`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }

    // 接続ステータス判定
    const allBasicTests = result.testResults.basicSet && result.testResults.basicGet;
    const allJsonTests = result.testResults.jsonSet && result.testResults.jsonGet;
    
    if (allBasicTests && allJsonTests) {
      result.connectionStatus = 'success';
    }

    return res.status(200).json(createSuccessResponse(result));
  } catch (error) {
    result.errorDetails = error instanceof Error ? error.message : 'Unknown error';
    result.connectionStatus = 'error';
    console.error('KV connection test error:', error);
    return res.status(200).json(createSuccessResponse(result));
  }
} 