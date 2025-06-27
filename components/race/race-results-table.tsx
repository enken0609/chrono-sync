import React, { useState } from 'react';
import { WebScorerResponse, WebScorerGrouping } from '@/types';
import LoadingSpinner from '@/components/common/loading-spinner';

interface RaceResultsTableProps {
  results: WebScorerResponse['Results'];
  raceInfo: WebScorerResponse['RaceInfo'];
  loading?: boolean;
  className?: string;
}

/**
 * レース結果テーブルコンポーネント（スマホ対応・年齢表示対応）
 */
export default function RaceResultsTable({
  results,
  raceInfo,
  loading = false,
  className = '',
}: RaceResultsTableProps): JSX.Element {
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);

  if (loading) {
    return (
      <div className={`card ${className}`}>
        <div className="card-body">
          <LoadingSpinner text="結果を読み込み中..." />
        </div>
      </div>
    );
  }

  // カテゴリー別の結果のみを表示（Overallは除外）
  const filteredGroups = (results || []).filter(group => 
    group.Grouping.Category != null
  );

  const selectedGroup = filteredGroups[selectedGroupIndex];

  if (filteredGroups.length === 0) {
    return (
      <div className={`card ${className}`}>
        <div className="card-body text-center py-8">
          <p className="text-gray-500 text-sm">結果データがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* グループ選択（改善されたセレクトボックス） */}
      {filteredGroups.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            カテゴリーを選択
          </label>
          <select
            value={selectedGroupIndex}
            onChange={(e) => setSelectedGroupIndex(Number(e.target.value))}
            className="select-modern"
          >
            {filteredGroups.map((group, index) => {
              const groupName = getGroupDisplayName(group);
              return (
                <option key={index} value={index}>
                  {groupName} ({group.Racers.length}名)
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* 結果表示（年齢表示対応・コンパクトカード形式） */}
      <div className="space-y-2">
        {selectedGroup?.Racers.map((racer, index) => (
          <div key={`${racer.Bib}-${index}`} className="card">
            <div className="card-body p-3">
              <div className="flex items-center justify-between">
                {/* 左側：順位、ゼッケン、名前、年齢 */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                      racer.Place === '1' ? 'bg-yellow-100 text-yellow-800' :
                      racer.Place === '2' ? 'bg-gray-100 text-gray-800' :
                      racer.Place === '3' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-50 text-blue-800'
                    }`}>
                      {racer.Place === 'DNS' ? 'DNS' :
                       racer.Place === 'DNF' ? 'DNF' :
                       racer.Place === 'DSQ' ? 'DSQ' :
                       racer.Place}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500 mb-1">
                      #{racer.Bib}
                    </div>
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {racer.Name}
                      {racer.Age && (
                        <span className="text-gray-500 font-normal ml-1">
                          ({racer.Age})
                        </span>
                      )}
                    </div>
                    {racer.TeamName && (
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        {racer.TeamName}
                      </div>
                    )}
                  </div>
                </div>

                {/* 右側：タイムと差 */}
                <div className="text-right flex-shrink-0">
                  <div className="font-mono text-sm font-semibold text-gray-900">
                    {racer.Time}
                  </div>
                  {racer.Difference && racer.Difference !== '-' && (
                    <div className="text-xs text-gray-500 font-mono">
                      {racer.Difference}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* フッター情報（コンパクト化） */}
      <div className="card mt-4">
        <div className="card-body p-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-600">
            <div>
              参加者数: <span className="font-semibold">{selectedGroup?.Racers.length || 0}</span>名
              {raceInfo.CompletionState && (
                <span className="ml-3">状態: {raceInfo.CompletionState}</span>
              )}
            </div>
            {raceInfo.TimedWith && (
              <div className="mt-1 sm:mt-0">
                計測: {raceInfo.TimedWith}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * グループの表示名を生成（カテゴリー優先）
 */
function getGroupDisplayName(group: WebScorerGrouping): string {
  const { Grouping } = group;
  
  // カテゴリー名を優先表示
  if (Grouping.Category) {
    return Grouping.Category;
  }
  
  // 通常ここには到達しないはず（フィルタリングでカテゴリーのみに制限）
  return 'その他';
} 