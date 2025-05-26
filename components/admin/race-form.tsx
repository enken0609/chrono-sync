import React, { useState } from 'react';
import { Race, RaceFormData } from '@/types';
import Button from '@/components/common/button';

interface RaceFormProps {
  race?: Race;
  onSubmit: (data: RaceFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * レース設定フォーム
 */
export default function RaceForm({ 
  race, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: RaceFormProps): JSX.Element {
  const [formData, setFormData] = useState<RaceFormData>({
    name: race?.name || '',
    category: race?.category || '',
    webScorerRaceId: race?.webScorerRaceId || '',
  });

  const [errors, setErrors] = useState<Partial<RaceFormData>>({});

  /**
   * フォームバリデーション
   */
  const validateForm = (): boolean => {
    const newErrors: Partial<RaceFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'レース名は必須です';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'カテゴリーは必須です';
    }

    // WebScorer Race IDの形式チェック（数字のみ）
    if (formData.webScorerRaceId && !/^\d+$/.test(formData.webScorerRaceId)) {
      newErrors.webScorerRaceId = 'WebScorer Race IDは数字のみで入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * フォーム送信処理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  /**
   * 入力値変更処理
   */
  const handleChange = (
    field: keyof RaceFormData,
    value: string
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        {race ? 'レース編集' : '新規レース作成'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* レース名 */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            レース名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`form-input ${errors.name ? 'border-red-500' : ''}`}
            placeholder="例: 10kmコース"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* カテゴリー */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            カテゴリー <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="category"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className={`form-input ${errors.category ? 'border-red-500' : ''}`}
            placeholder="例: 一般男子、一般女子、高校生男子"
            disabled={isLoading}
          />
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category}</p>
          )}
        </div>

        {/* WebScorer Race ID */}
        <div>
          <label htmlFor="webScorerRaceId" className="block text-sm font-medium text-gray-700 mb-2">
            WebScorer Race ID
          </label>
          <input
            type="text"
            id="webScorerRaceId"
            value={formData.webScorerRaceId}
            onChange={(e) => handleChange('webScorerRaceId', e.target.value)}
            className={`form-input ${errors.webScorerRaceId ? 'border-red-500' : ''}`}
            placeholder="例: 371034"
            disabled={isLoading}
          />
          {errors.webScorerRaceId && (
            <p className="mt-1 text-sm text-red-600">{errors.webScorerRaceId}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            WebScorerでのレースIDを入力してください。リアルタイム結果取得に使用されます。
          </p>
        </div>

        {/* ボタン */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            className="w-full sm:w-auto"
          >
            {race ? '更新' : '作成'}
          </Button>
        </div>
      </form>
    </div>
  );
} 