// pages/api/speech-to-text/route.js
import { NextResponse } from 'next/server';
import { transcribeAudio } from '@/app/infrastructure/speech-to-text/open-ai/transcribe';
import { Client as MinioClient } from 'minio';

/**
 * ストリームから Buffer を生成するヘルパー関数
 * @param {ReadableStream} stream
 * @returns {Promise<Buffer>}
 */
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err));
  });
}

// 環境変数から MinIO の接続情報を取得（未定義の場合はエラー）
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_PORT = process.env.MINIO_PORT;
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
if (!MINIO_ENDPOINT || !MINIO_PORT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
  throw new Error(
    'MinIO configuration (MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY) is not defined.'
  );
}

// MinIO クライアントの初期化
const minioClient = new MinioClient({
  endPoint: MINIO_ENDPOINT,
  port: parseInt(MINIO_PORT, 10),
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

// バケット名とオブジェクトのプレフィックスを設定
const BUCKET_NAME = 'speak-ease';

export async function POST(request) {
  try {
    // クライアントから送信された JSON を取得
    const { objectName, model } = await request.json();
    if (!objectName) {
      console.error('No objectName provided');
      return NextResponse.json(
        { error: 'No objectName provided' },
        { status: 400 }
      );
    }

    // MinIO からファイルのストリームを取得
    const fileStream = await new Promise((resolve, reject) => {
      minioClient.getObject(BUCKET_NAME, objectName, (err, stream) => {
        if (err) {
          return reject(err);
        }
        resolve(stream);
      });
    });

    // ストリームから Buffer を生成
    const fileBuffer = await streamToBuffer(fileStream);

    // Whisper API などを利用して音声認識（transcribe）を実行
    const transcript = await transcribeAudio(fileBuffer, model || 'whisper-1');

    return NextResponse.json({ success: true, transcript }, { status: 200 });
  } catch (error) {
    console.error('Error in speech-to-text:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio', details: error.message },
      { status: 500 }
    );
  }
}
