import React from 'react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * エラーメッセージコンポーネント
 */
export default function ErrorMessage({
  title = 'エラーが発生しました',
  message,
  details,
  onRetry,
  className = '',
}: ErrorMessageProps): JSX.Element {
  return (
    <div className={`alert-error ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message}</p>
            {details && (
              <p className="mt-1 text-xs text-red-600">{details}</p>
            )}
          </div>
          {onRetry && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onRetry}
                className="btn btn-sm bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500"
              >
                再試行
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 