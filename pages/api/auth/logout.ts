import { NextApiRequest, NextApiResponse } from 'next';
import { clearAuthCookie } from '@/lib/auth';
import { createSuccessResponse, handleApiError } from '@/lib/api';

/**
 * ログアウトAPI
 * POST /api/auth/logout
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // 認証Cookieを削除
    clearAuthCookie(res);

    console.log('User logged out successfully');

    return res.status(200).json(
      createSuccessResponse({
        message: 'ログアウトしました',
      })
    );

  } catch (error) {
    console.error('Logout API error:', error);
    return res.status(500).json(handleApiError(error));
  }
} 