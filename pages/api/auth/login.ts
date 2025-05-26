import { NextApiRequest, NextApiResponse } from 'next';
import { 
  validateCredentials, 
  generateToken, 
  setAuthCookie 
} from '@/lib/auth';
import { 
  createSuccessResponse, 
  handleApiError,
  validateRequired 
} from '@/lib/api';
import { LoginRequest, AuthUser } from '@/types';

/**
 * ログインAPI
 * POST /api/auth/login
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
    const { username, password }: LoginRequest = req.body;

    // バリデーション
    validateRequired(username, 'ユーザー名');
    validateRequired(password, 'パスワード');

    // 認証情報の検証
    if (!validateCredentials(username, password)) {
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが正しくありません',
      });
    }

    // ユーザー情報の作成
    const user: AuthUser = {
      username,
      role: 'admin',
    };

    // JWTトークンの生成
    const token = generateToken(user);

    // HttpOnly Cookieの設定
    setAuthCookie(res, token);

    console.log(`User ${username} logged in successfully`);

    return res.status(200).json(
      createSuccessResponse({
        user,
        message: 'ログインに成功しました',
      })
    );

  } catch (error) {
    console.error('Login API error:', error);
    return res.status(500).json(handleApiError(error));
  }
} 