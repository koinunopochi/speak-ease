// pages/api/upload-audio/route.js
import { NextResponse } from 'next/server';
import FormData from 'form-data';
import { Client as MinioClient } from 'minio';

// 環境変数から Python API の URL を取得
const PYTHON_API_URL = process.env.PYTHON_API_URL;
if (!PYTHON_API_URL) {
  throw new Error('PYTHON_API_URL environment variable is not defined.');
}

// 環境変数から MinIO の接続情報を取得（デフォルト値は設けず、未定義の場合はエラー）
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_PORT = process.env.MINIO_PORT;
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
if (!MINIO_ENDPOINT || !MINIO_PORT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
  throw new Error(
    'One or more MinIO environment variables (MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY) are not defined.'
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

// MinIO 上のバケット名とオブジェクトのプレフィックスを設定
const BUCKET_NAME = 'speak-ease';
const OBJECT_PREFIX = 'audio/dummy_conversation_id';

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

    // Python API へ転送するための FormData を作成（Flask 側が要求するキー名 "file" で送信）
    const pythonFormData = new FormData();
    pythonFormData.append('file', buffer, {
      filename: 'user.webm',
      contentType: 'audio/webm',
    });

    // form-data の内容をバッファに変換して送信
    const formDataBuffer = pythonFormData.getBuffer();
    const headers = pythonFormData.getHeaders();
    headers['Content-Length'] = formDataBuffer.length;

    // Flask API へ POST リクエストを送信
    const pythonResponse = await fetch(`${PYTHON_API_URL}/process`, {
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

    // アップロード先のファイル名を決定（例: processed_<timestamp>.webm）
    const filename = `processed_${Date.now()}.webm`;
    // MinIO に配置する際のオブジェクトキー
    const objectName = `${OBJECT_PREFIX}/${filename}`;

    // バケットの存在確認（存在しなければエラーとする）
    const bucketExists = await minioClient
      .bucketExists(BUCKET_NAME)
      .catch(() => false);
    if (!bucketExists) {
      throw new Error(`Bucket "${BUCKET_NAME}" does not exist.`);
    }

    // MinIO にオブジェクトをアップロード
    await minioClient.putObject(BUCKET_NAME, objectName, processedData);
    console.log(`File uploaded to MinIO: ${BUCKET_NAME}/${objectName}`);

    // クライアントにはアップロードしたオブジェクトの情報を返す
    return NextResponse.json(
      { success: true, bucket: BUCKET_NAME, objectName },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in upload-audio:', error);
    return NextResponse.json(
      { error: 'Failed to process audio', details: error.message },
      { status: 500 }
    );
  }
}
