import React, { useState } from 'react';
import { Event, EventFormData } from '@/types';
import Button from '@/components/common/button';

interface EventFormProps {
  event?: Event;
  onSubmit: (data: EventFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * 大会登録・編集フォーム
 */
export default function EventForm({ 
  event, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: EventFormProps): JSX.Element {
  const [formData, setFormData] = useState<EventFormData>({
    name: event?.name || '',
    date: event?.date || '',
    description: event?.description || '',
  });

  const [errors, setErrors] = useState<Partial<EventFormData>>({});

  /**
   * フォームバリデーション
   */
  const validateForm = (): boolean => {
    const newErrors: Partial<EventFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = '大会名は必須です';
    }

    if (!formData.date) {
      newErrors.date = '開催日は必須です';
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.date)) {
        newErrors.date = '日付の形式が正しくありません (YYYY-MM-DD)';
      }
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
    field: keyof EventFormData,
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
        {event ? '大会編集' : '新規大会作成'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 大会名 */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            大会名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`form-input ${errors.name ? 'border-red-500' : ''}`}
            placeholder="例: 第1回 ChronoSync トレイルランニング大会"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* 開催日 */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            開催日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className={`form-input ${errors.date ? 'border-red-500' : ''}`}
            disabled={isLoading}
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date}</p>
          )}
        </div>

        {/* 大会説明 */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            大会説明
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            className="form-input"
            placeholder="大会の詳細説明、コース情報、注意事項など..."
            disabled={isLoading}
          />
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
            {event ? '更新' : '作成'}
          </Button>
        </div>
      </form>
    </div>
  );
} 