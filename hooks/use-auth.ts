import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { AuthUser, AuthState } from '@/types';
import { fetcher } from '@/lib/api';

/**
 * 認証状態管理フック
 */
export function useAuth(): AuthState & {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
} {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 認証状態を取得
  const { data: user, mutate } = useSWR<AuthUser>('/api/auth/check', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    onError: () => {
      // 認証エラーは正常（未ログイン状態）
      setIsLoading(false);
    },
    onSuccess: () => {
      setIsLoading(false);
    },
  });

  useEffect(() => {
    // 初期ロード時のローディング状態管理
    if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user]);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'ログインに失敗しました');
      }

      // 認証状態を更新
      await mutate();
      
      // 管理画面にリダイレクト
      router.push('/admin/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'ログインに失敗しました');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      await fetch('/api/auth/logout', {
        method: 'POST',
      });

      // 認証状態をクリア
      await mutate(undefined);
      
      // ログインページにリダイレクト
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user: user || null,
    isLoading,
    error,
    login,
    logout,
  };
}

/**
 * 管理画面用の認証チェックフック
 */
export function useRequireAuth() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/admin/login');
    }
  }, [user, isLoading, router]);

  return { user, isLoading };
}

/**
 * ログイン済みユーザーのリダイレクトフック
 */
export function useRedirectIfAuthenticated() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/admin/dashboard');
    }
  }, [user, isLoading, router]);

  return { isLoading };
} 