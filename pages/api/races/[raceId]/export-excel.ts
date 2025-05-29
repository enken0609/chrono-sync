import type { NextApiRequest, NextApiResponse } from 'next';
import ExcelJS from 'exceljs';
import { kv } from '@/lib/kv';
import { WebScorerResponse, WebScorerRacer, WebScorerGrouping } from '@/types';

// 性別を日本語に変換する関数
function translateGender(gender: string | undefined): string {
  if (!gender) return '';
  return gender.toLowerCase() === 'male' ? '男性' : 
         gender.toLowerCase() === 'female' ? '女性' : 
         gender;
}

// ワークシートの作成と設定を行う関数
function createAndSetupWorksheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  timestamp: string
): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet(sheetName);

  // レースタイトルと入賞規定を追加（1行目と2行目）
  const titleRow = worksheet.addRow([title]);
  const rulesRow = worksheet.addRow(['入賞対象は総合5位以内、年代別3位以内']);
  worksheet.addRow([]); // 空行を追加（3行目）

  // タイトル行のスタイル設定
  titleRow.font = { bold: true, size: 14 };
  titleRow.alignment = { horizontal: 'left' };
  rulesRow.font = { size: 10 };
  rulesRow.alignment = { horizontal: 'left' };

  // ヘッダー行の追加（4行目）
  const headerRow = worksheet.addRow([
    '順位',
    'ゼッケン',
    '氏名',
    'チーム',
    '性別',
    '年齢',
    '年代',
    '年代別順位',
    'タイム',
    '差'
  ]);

  // ヘッダー行のスタイル設定
  headerRow.font = { bold: true };
  headerRow.border = {
    bottom: { style: 'double' }
  };
  // ヘッダー行の各セルを中央揃えに設定
  headerRow.eachCell((cell) => {
    cell.alignment = { horizontal: 'center' };
  });

  // 列幅の設定とデータ行の配置設定
  const columns: Partial<ExcelJS.Column>[] = [
    { width: 10, style: { alignment: { horizontal: 'center' } } },  // 順位
    { width: 12 },  // ゼッケン
    { width: 20 },  // 氏名
    { width: 25 },  // チーム
    { width: 10, style: { alignment: { horizontal: 'center' } } },  // 性別
    { width: 10, style: { alignment: { horizontal: 'center' } } },  // 年齢
    { width: 12, style: { alignment: { horizontal: 'center' } } },  // 年代
    { width: 12, style: { alignment: { horizontal: 'center' } } },  // 年代別順位
    { width: 15 },  // タイム
    { width: 15 }   // 差
  ];

  worksheet.columns = columns;

  return worksheet;
}

// データを追加してスタイルを適用する関数
function addDataAndStyle(worksheet: ExcelJS.Worksheet, results: WebScorerRacer[]) {
  const startRow = 5; // データの開始行

  // データの追加
  results.forEach((result: WebScorerRacer, index: number) => {
    const rowNumber = startRow + index;
    
    // 行を追加
    const dataRow = worksheet.addRow([
      result.Place,
      result.Bib,
      result.Name,
      result.TeamName || '',
      translateGender(result.Gender),
      result.Age || '',
      { formula: `IF(F${rowNumber}<=20,"20歳以下",IF(F${rowNumber}<=39,"30代",IF(F${rowNumber}<=49,"40代",IF(F${rowNumber}<=59,"50代",IF(F${rowNumber}<=69,"60代","70歳以上")))))` },
      { formula: `COUNTIFS($G$${startRow}:$G${rowNumber},$G${rowNumber},$E$${startRow}:$E${rowNumber},$E${rowNumber})` },
      result.Time,
      result.Difference || ''
    ]);

    // 各データ行のスタイル設定
    dataRow.border = {
      bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }
    };
    
    // 各セルを中央揃えに設定
    dataRow.eachCell((cell) => {
      cell.alignment = { horizontal: 'center' };
    });
  });

  // 出力日時を最終行の下に追加
  const lastRow = worksheet.lastRow?.number || startRow;
  worksheet.addRow([]); // 空行を追加
  const timestampRow = worksheet.addRow([`出力日時: ${new Date().toLocaleString('ja-JP')}`]);
  timestampRow.font = { size: 10 };
  timestampRow.alignment = { horizontal: 'left' };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'メソッドが許可されていません'
    });
  }

  try {
    const { raceId } = req.query;
    
    // KVからレース結果とレース情報を取得
    const raceResultsJson = await kv.get(`race:${raceId}:results`);
    const raceConfigJson = await kv.get(`race:${raceId}:config`);
    
    if (!raceResultsJson) {
      console.error(`レース結果が見つかりません。raceId: ${raceId}`);
      return res.status(404).json({
        success: false,
        error: 'レース結果が見つかりません'
      });
    }

    // 文字列をJSONとしてパース
    console.log('レース結果データ:', raceResultsJson);
    const raceResults = JSON.parse(raceResultsJson) as WebScorerResponse;
    const raceConfig = raceConfigJson ? JSON.parse(raceConfigJson) : null;
    const raceName = raceConfig ? raceConfig.name : raceResults.RaceInfo.Name;
    const timestamp = new Date().toLocaleString('ja-JP');

    // カテゴリー別結果の確認
    const categoryGroups = raceResults.Results.filter(group => 
      group.Grouping.Category && !group.Grouping.Overall
    );
    
    console.log(`カテゴリー数: ${categoryGroups.length}`);
    if (categoryGroups.length === 0) {
      console.error('カテゴリーが見つかりません');
      return res.status(400).json({
        success: false,
        error: 'カテゴリーデータが見つかりません'
      });
    }

    // Excelワークブックを作成
    const workbook = new ExcelJS.Workbook();

    // カテゴリー別結果のシートを作成
    categoryGroups.forEach((group: WebScorerGrouping) => {
      const categoryName = group.Grouping.Category || '不明';
      console.log(`シート作成: ${categoryName}, レーサー数: ${group.Racers?.length || 0}`);
      const sheetName = categoryName.length > 31 ? categoryName.substring(0, 28) + '...' : categoryName;
      const sheet = createAndSetupWorksheet(
        workbook,
        sheetName,
        `${raceName} - ${categoryName} 【速報】`,
        timestamp
      );
      addDataAndStyle(sheet, group.Racers);
    });

    // Excelファイルを生成
    const buffer = await workbook.xlsx.writeBuffer();

    // レスポンスヘッダーの設定
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=race-results-${raceId}-${new Date().toISOString().split('T')[0]}.xlsx`
    );

    res.status(200).send(buffer);

  } catch (error) {
    console.error('Excel出力エラー:', error);
    const err = error as Error;
    console.error('エラーの詳細:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({
      success: false,
      error: 'Excel出力中にエラーが発生しました'
    });
  }
} 