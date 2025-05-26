import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Button from '@/components/common/button';
import ErrorMessage from '@/components/common/error-message';
import { SITE_CONFIG } from '@/lib/constants';
import { useAuth } from '@/hooks/use-auth';

/**
 * 管理画面ログインページ
 */
const AdminLoginPage: NextPage = () => {
  const router = useRouter();
  const { login, isLoading, error, user } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  // 既にログイン済みの場合はダッシュボードにリダイレクト
  useEffect(() => {
    if (user) {
      router.push('/admin/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(formData.username, formData.password);
      // ログイン成功時はuseEffectでリダイレクト
    } catch (err) {
      // エラーはuseAuthで管理
      console.error('Login failed:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <>
      <Head>
        <title>管理画面ログイン - {SITE_CONFIG.name}</title>
        <meta name="description" content="ChronoSync管理画面へのログイン" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* ロゴ・ブランド */}
          <div className="text-center">
            <Image
              src="/images/logos/logo-chronosync.png"
              alt="ChronoSync"
              width={200}
              height={50}
              className="mx-auto h-12 w-auto"
            />
            <h2 className="mt-4 text-center text-3xl font-bold text-gray-900">
              管理画面ログイン
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {SITE_CONFIG.name} 管理システム
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {/* エラーメッセージ */}
            {error && (
              <div className="mb-6">
                <ErrorMessage
                  message={error}
                  title="ログインエラー"
                />
              </div>
            )}

            {/* ログインフォーム */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  ユーザー名
                </label>
                <div className="mt-1">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    className="form-input w-full"
                    placeholder="ユーザー名を入力"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="form-input w-full"
                    placeholder="パスワードを入力"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  className="w-full"
                  loading={isLoading}
                  disabled={!formData.username || !formData.password}
                >
                  ログイン
                </Button>
              </div>
            </form>

            {/* フッターリンク */}
            <div className="mt-6 text-center">
              <a
                href="/"
                className="text-sm text-brand-primary hover:text-brand-primary/80"
              >
                ← トップページに戻る
              </a>
            </div>
          </div>
        </div>

        {/* セキュリティ情報 */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center text-xs text-gray-500">
            <p>
              このページは管理者専用です。
              <br />
              不正アクセスは記録され、法的措置の対象となる場合があります。
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminLoginPage; 