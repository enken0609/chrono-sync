import React, { useState } from 'react';

interface RaceExportButtonProps {
  raceId: string;
  raceName: string;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export const RaceExportButton: React.FC<RaceExportButtonProps> = ({
  raceId,
  raceName,
  className = '',
  variant = 'secondary'
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      const response = await fetch(`/api/races/${raceId}/export-excel`);
      
      if (!response.ok) {
        throw new Error('エクスポートに失敗しました');
      }

      // Blobとしてレスポンスを取得
      const blob = await response.blob();
      
      // ダウンロードリンクを作成
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${raceName}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // クリーンアップ
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('エクスポートに失敗しました。もう一度お試しください。');
    } finally {
      setIsExporting(false);
    }
  };

  const baseStyles = "inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantStyles = variant === 'primary'
    ? "text-white bg-blue-600 hover:bg-blue-700"
    : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50";

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`${baseStyles} ${variantStyles} ${className}`}
      title="レース結果をExcelファイルとしてダウンロード"
    >
      {isExporting ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          エクスポート中...
        </>
      ) : (
        <>
          <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          Excel出力
        </>
      )}
    </button>
  );
}; 