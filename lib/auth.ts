import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { ChronoSyncError, AuthUser } from '@/types';
import { ERROR_CODES, JWT_CONFIG } from '@/lib/constants';

/**
 * 認証ユーティリティ
 * JWT生成・検証、ミドルウェア機能を提供
 */

/**
 * 認証情報を検証
 */
export function validateCredentials(username: string, password: string): boolean {
  const validUsername = process.env.ADMIN_USERNAME;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (!validUsername || !validPassword) {
    console.error('Admin credentials not configured');
    return false;
  }

  return username === validUsername && password === validPassword;
}

/**
 * JWTトークンを生成
 */
export function generateToken(user: AuthUser): string {
  try {
    return jwt.sign(
      {
        username: user.username,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
      },
      JWT_CONFIG.secret,
      {
        expiresIn: JWT_CONFIG.expiresIn,
        algorithm: JWT_CONFIG.algorithm,
      }
    );
  } catch (error) {
    console.error('JWT generation error:', error);
    throw new ChronoSyncError(
      'トークンの生成に失敗しました',
      ERROR_CODES.AUTH_FAILED,
      500
    );
  }
}

/**
 * JWTトークンを検証
 */
export function verifyToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.secret, {
      algorithms: [JWT_CONFIG.algorithm],
    }) as jwt.JwtPayload & AuthUser;

    return {
      username: decoded.username,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ChronoSyncError(
        'トークンの有効期限が切れています',
        ERROR_CODES.AUTH_FAILED,
        401
      );
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new ChronoSyncError(
        '無効なトークンです',
        ERROR_CODES.AUTH_FAILED,
        401
      );
    } else {
      console.error('Token verification error:', error);
      throw new ChronoSyncError(
        'トークンの検証に失敗しました',
        ERROR_CODES.AUTH_FAILED,
        401
      );
    }
  }
}

/**
 * Cookieからトークンを取得
 */
export function getTokenFromCookies(req: NextApiRequest): string | null {
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  const tokenCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('auth-token='));

  if (!tokenCookie) return null;

  return tokenCookie.split('=')[1];
}

/**
 * HttpOnly Cookieを設定
 */
export function setAuthCookie(res: NextApiResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.setHeader(
    'Set-Cookie',
    `auth-token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict${
      isProduction ? '; Secure' : ''
    }`
  );
}

/**
 * 認証Cookieを削除
 */
export function clearAuthCookie(res: NextApiResponse): void {
  res.setHeader(
    'Set-Cookie',
    'auth-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
  );
}

/**
 * 現在のユーザーを取得（トークンから）
 */
export function getCurrentUser(req: NextApiRequest): AuthUser | null {
  try {
    const token = getTokenFromCookies(req);
    if (!token) return null;

    return verifyToken(token);
  } catch (error) {
    // トークンが無効な場合はnullを返す（エラーを投げない）
    return null;
  }
}

/**
 * 認証が必要なAPI Routes用ミドルウェア
 */
export function requireAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, user: AuthUser) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    try {
      const user = getCurrentUser(req);
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: '認証が必要です',
          code: ERROR_CODES.AUTH_REQUIRED,
        });
        return;
      }

      // ユーザー情報を引数として渡してハンドラーを実行
      await handler(req, res, user);
    } catch (error) {
      console.error('Auth middleware error:', error);
      
      if (error instanceof ChronoSyncError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'サーバーエラーが発生しました',
          code: ERROR_CODES.INTERNAL_ERROR,
        });
      }
    }
  };
}

/**
 * 認証状態をチェック（エラーを投げずにboolean返却）
 */
export function checkAuth(req: NextApiRequest): boolean {
  try {
    const user = getCurrentUser(req);
    return user !== null;
  } catch (error) {
    return false;
  }
}

/**
 * 認証チェック（エラーを投げる版）
 */
export async function requireAuthCheck(req: NextApiRequest, res: NextApiResponse): Promise<AuthUser> {
  const user = getCurrentUser(req);
  
  if (!user) {
    res.status(401).json({
      success: false,
      error: '認証が必要です',
      code: ERROR_CODES.AUTH_REQUIRED,
    });
    throw new ChronoSyncError(
      '認証が必要です',
      ERROR_CODES.AUTH_REQUIRED,
      401
    );
  }

  return user;
}

/**
 * 管理者権限をチェック
 */
export function requireAdmin(
  handler: (req: NextApiRequest, res: NextApiResponse, user: AuthUser) => Promise<void>
) {
  return requireAuth(async (req, res, user) => {
    if (user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: '管理者権限が必要です',
        code: ERROR_CODES.AUTH_REQUIRED,
      });
      return;
    }

    await handler(req, res, user);
  });
}

/**
 * パスワード強度チェック（将来の拡張用）
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('パスワードは8文字以上である必要があります');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('パスワードには大文字を含める必要があります');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('パスワードには小文字を含める必要があります');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('パスワードには数字を含める必要があります');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
} 