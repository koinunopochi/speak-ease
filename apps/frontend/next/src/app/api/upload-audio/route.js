// pages/api/upload-audio/route.js
import { NextResponse } from 'next/server';
import FormData from 'form-data';
import fs from 'fs/promises';
import path from 'path';

// ※ Flask API（Python 側）の URL（必要に応じて変更）
const PYTHON_API_URL = 'http://localhost:5000/process';

export async function POST(request) {
  try {
    // クライアントから送信されたフォームデータを取得
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // audioFile（Blob）を ArrayBuffer 経由で Buffer に変換
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ▼▼▼ デバッグ用：オリジナルファイルを保存（必要に応じて） ▼▼▼
    // try {
    //   const debugOriginalPath = path.join(
    //     process.cwd(),
    //     'public',
    //     'debug',
    //     `original_${Date.now()}.webm`
    //   );
    //   await fs.writeFile(debugOriginalPath, buffer);
    //   console.log('Original file saved at:', debugOriginalPath);
    // } catch (err) {
    //   console.error('Error saving original file:', err);
    // }
    // ▲▲▲

    // Python API へ転送するための FormData を作成
    const pythonFormData = new FormData();
    // Flask 側が要求するキー名 "file" で送信
    pythonFormData.append('file', buffer, {
      filename: 'user.webm',
      contentType: 'audio/webm',
    });

    // form-data の内容をバッファに変換して送信
    const formDataBuffer = pythonFormData.getBuffer();
    const headers = pythonFormData.getHeaders();
    headers['Content-Length'] = formDataBuffer.length;

    // Flask API へ POST リクエストを送信
    const pythonResponse = await fetch(PYTHON_API_URL, {
      method: 'POST',
      body: formDataBuffer,
      headers,
    });

    if (!pythonResponse.ok) {
      const errorJson = await pythonResponse.json();
      return NextResponse.json(
        { error: 'Processing failed', details: errorJson },
        { status: 500 }
      );
    }

    // 処理済みの音声ファイルデータを取得
    const processedBuffer = await pythonResponse.arrayBuffer();
    const processedData = Buffer.from(processedBuffer);

    // ▼▼▼ デバッグ用：処理済みファイルを保存（必要に応じて） ▼▼▼
    // try {
    //   const debugProcessedPath = path.join(
    //     process.cwd(),
    //     'public',
    //     'debug',
    //     `processed_${Date.now()}.webm`
    //   );
    //   await fs.writeFile(debugProcessedPath, processedData);
    //   console.log('Processed file saved at:', debugProcessedPath);
    // } catch (err) {
    //   console.error('Error saving processed file:', err);
    // }
    // ▲▲▲

    // 保存先ディレクトリ（例：public/uploads）が存在することを確認してください
    const filename = `processed_${Date.now()}.webm`;
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', filename);
    await fs.writeFile(uploadPath, processedData);

    // クライアントには保存したファイル名を返す
    return NextResponse.json({ success: true, filename }, { status: 200 });
  } catch (error) {
    console.error('Error in upload-audio:', error);
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}
