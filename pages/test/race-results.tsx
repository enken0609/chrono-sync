import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import RaceResultsTable from '@/components/race/race-results-table';
import Button from '@/components/common/button';
import { WebScorerResponse } from '@/types';

// サンプルデータ（実際のWebScorerレスポンス）
const sampleRaceData: WebScorerResponse = {
  "RaceInfo": {
    "RaceId": 371034,
    "Name": "第3回 尾瀬戸倉尾瀬国立公園マウンテンマラソン 小学生男子",
    "DisplayURL": "https://www.webscorer.com/race?pid=1&raceid=371034",
    "Date": "Oct 27, 2024",
    "Sport": "Running - trail",
    "StartTime": "Sunday, October 27, 2024 10:36 (GMT+9)",
    "Country": "Japan",
    "City": "Katashina",
    "Latitude": 36.8510544475565,
    "Longitude": 139.23900604248,
    "StartType": "Mass",
    "CompletionState": "Final results",
    "ResultsOrder": "Fastest time",
    "TimedOn": "Xiaomi 23116PN5BC",
    "TimedWith": "Webscorer PRO 7.1",
    "Visibility": "Private",
    "UpdatedFrom": "App",
    "UpdatedTime": "Sunday, October 27, 2024 11:56 (GMT+9)",
    "ImageUrl": "https://s.ws-images.com/images/stocksmall/running-trail-64x48.jpg"
  },
  "Results": [
    {
      "Grouping": { "Overall": true },
      "Racers": [
        {
          "Place": "1",
          "Bib": "612",
          "Name": "パーシー 悠人",
          "TeamName": "川場小学校",
          "Category": "キッズコース(小学生男子5~6年）",
          "Age": 11,
          "Gender": "Male",
          "Time": "5:06.1",
          "Difference": "-",
          "PercentBack": "-",
          "PercentWinning": "100%",
          "PercentAverage": "24.48%",
          "PercentMedian": "19.38%",
          "StartTime": "10:36:52.6"
        },
        {
          "Place": "2",
          "Bib": "608",
          "Name": "香田 蒼",
          "TeamName": "ブルーレイ",
          "Category": "キッズコース(小学生男子3~4年）",
          "Age": 10,
          "Gender": "Male",
          "Time": "5:12.4",
          "Difference": "+0:06.3",
          "PercentBack": "+2.06%",
          "PercentWinning": "97.98%",
          "PercentAverage": "22.93%",
          "PercentMedian": "17.72%",
          "StartTime": "10:36:52.6"
        },
        {
          "Place": "3",
          "Bib": "610",
          "Name": "松井 晟",
          "TeamName": null,
          "Category": "キッズコース(小学生男子3~4年）",
          "Age": 10,
          "Gender": "Male",
          "Time": "5:17.1",
          "Difference": "+0:11.0",
          "PercentBack": "+3.59%",
          "PercentWinning": "96.53%",
          "PercentAverage": "21.77%",
          "PercentMedian": "16.49%",
          "StartTime": "10:36:52.6"
        }
      ]
    },
    {
      "Grouping": { "Category": "キッズコース(小学生男子1～2年）", "Gender": "Male" },
      "Racers": [
        {
          "Place": "1",
          "Bib": "617",
          "Name": "河部陽",
          "TeamName": null,
          "Category": "キッズコース(小学生男子1～2年）",
          "Age": 8,
          "Gender": "Male",
          "Time": "5:32.7",
          "Difference": "-",
          "PercentBack": "-",
          "PercentWinning": "100%",
          "PercentAverage": "26.15%",
          "PercentMedian": "18.44%",
          "StartTime": "10:36:52.6"
        },
        {
          "Place": "2",
          "Bib": "604",
          "Name": "辺田 優心",
          "TeamName": "amac",
          "Category": "キッズコース(小学生男子1～2年）",
          "Age": 8,
          "Gender": "Male",
          "Time": "5:57.3",
          "Difference": "+0:24.6",
          "PercentBack": "+7.39%",
          "PercentWinning": "93.12%",
          "PercentAverage": "20.69%",
          "PercentMedian": "12.41%",
          "StartTime": "10:36:52.6"
        }
      ]
    },
    {
      "Grouping": { "Category": "キッズコース(小学生男子3~4年）", "Gender": "Male" },
      "Racers": [
        {
          "Place": "1",
          "Bib": "608",
          "Name": "香田 蒼",
          "TeamName": "ブルーレイ",
          "Category": "キッズコース(小学生男子3~4年）",
          "Age": 10,
          "Gender": "Male",
          "Time": "5:12.4",
          "Difference": "-",
          "PercentBack": "-",
          "PercentWinning": "100%",
          "PercentAverage": "19.70%",
          "PercentMedian": "16.74%",
          "StartTime": "10:36:52.6"
        },
        {
          "Place": "2",
          "Bib": "610",
          "Name": "松井 晟",
          "TeamName": null,
          "Category": "キッズコース(小学生男子3~4年）",
          "Age": 10,
          "Gender": "Male",
          "Time": "5:17.1",
          "Difference": "+0:04.7",
          "PercentBack": "+1.50%",
          "PercentWinning": "98.52%",
          "PercentAverage": "18.49%",
          "PercentMedian": "15.49%",
          "StartTime": "10:36:52.6"
        }
      ]
    }
  ]
};

/**
 * レース結果テストページ
 */
const TestRaceResultsPage: NextPage = () => {
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  return (
    <>
      <Head>
        <title>レース結果テスト - ChronoSync</title>
        <meta name="description" content="WebScorerレース結果表示のテストページ" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        
        <main className="flex-1">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {/* ページヘッダー */}
            <div className="px-4 py-6 sm:px-0">
              <div className="border-4 border-dashed border-gray-200 rounded-lg p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      レース結果テスト
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                      WebScorerの実際のAPIレスポンスを使用したレース結果表示のテスト
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0">
                    <Button
                      onClick={handleRefresh}
                      loading={loading}
                      variant="primary"
                    >
                      結果を更新
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* レース結果表示 */}
            <div className="px-4 sm:px-0">
              <RaceResultsTable 
                results={sampleRaceData.Results}
                raceInfo={sampleRaceData.RaceInfo}
                loading={loading}
              />
            </div>

            {/* 技術情報 */}
            <div className="px-4 py-6 sm:px-0">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-blue-900 mb-4">
                  技術情報
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h3 className="font-medium text-blue-800">データソース</h3>
                    <p className="text-blue-700">WebScorer API (Race ID: 371034)</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-800">キャッシュ</h3>
                    <p className="text-blue-700">オンデマンドキャッシュ (TTL: 3分)</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-800">更新方式</h3>
                    <p className="text-blue-700">手動更新 + 自動期限切れ</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-800">レスポンシブ</h3>
                    <p className="text-blue-700">モバイルファーストデザイン</p>
                  </div>
                </div>
              </div>
            </div>

            {/* API情報 */}
            <div className="px-4 pb-6 sm:px-0">
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  WebScorer API情報
                </h2>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>エンドポイント:</strong> https://www.webscorer.com/json/race</p>
                  <p><strong>パラメータ:</strong> raceid=371034&apiid=YOUR_API_ID</p>
                  <p><strong>レスポンス形式:</strong> JSON</p>
                  <p><strong>認証:</strong> API ID (クエリパラメータ)</p>
                  <p><strong>制限:</strong> PRO Results subscription必須</p>
                </div>
                <div className="mt-4">
                  <a
                    href="https://www.webscorer.com/blog/post/2021/09/28/how-to-access-race-data-via-json-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    WebScorer JSON API Documentation →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default TestRaceResultsPage; 