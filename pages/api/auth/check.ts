import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { createSuccessResponse, handleApiError } from '@/lib/api';

/**
 * 認証状態確認API
 * GET /api/auth/check
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '認証が必要です',
      });
    }

    return res.status(200).json(
      createSuccessResponse(user)
    );

  } catch (error) {
    console.error('Auth check API error:', error);
    return res.status(500).json(handleApiError(error));
  }
} 