// pages/api/text-to-speech/route.js
import { NextResponse } from 'next/server';
import { textToSpeech } from '@/app/infrastructure/text-to-speech/open-ai/textToSpeech';
import { Client as MinioClient } from 'minio';

// 環境変数から MinIO の接続情報を取得（必須情報が不足している場合はエラー）
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_PORT = process.env.MINIO_PORT;
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
if (!MINIO_ENDPOINT || !MINIO_PORT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
  throw new Error(
    'MinIO configuration missing: please set MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY in your environment.'
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
const OBJECT_PREFIX = 'audio/dummy_conversation_id';

export async function POST(request) {
  try {
    // クライアントから送信された JSON を取得
    const { text, model, voice, responseFormat } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // デフォルトのパラメータ設定
    const ttsModel = model || 'tts-1';
    const ttsVoice = voice || 'alloy';
    const ttsFormat = responseFormat || 'opus';

    // テキストを音声に変換
    const audioBuffer = await textToSpeech({
      text,
      model: ttsModel,
      voice: ttsVoice,
      responseFormat: ttsFormat,
    });

    // アップロードするファイル名およびオブジェクトキーを生成
    const filename = `ai_response_${Date.now()}.ogg`;
    const objectName = `${OBJECT_PREFIX}/${filename}`;

    // バケットの存在確認（存在しない場合はエラー）
    const bucketExists = await minioClient
      .bucketExists(BUCKET_NAME)
      .catch(() => false);
    if (!bucketExists) {
      throw new Error(`Bucket "${BUCKET_NAME}" does not exist.`);
    }

    // MinIO にオーディオデータをアップロード
    await minioClient.putObject(BUCKET_NAME, objectName, audioBuffer);
    console.log(`File uploaded to MinIO: ${BUCKET_NAME}/${objectName}`);

    // アップロードしたオブジェクトにアクセスするための署名付き URL を生成
    const audioUrl = await new Promise((resolve, reject) => {
      minioClient.presignedGetObject(
        BUCKET_NAME,
        objectName,
        (err, presignedUrl) => {
          if (err) reject(err);
          else resolve(presignedUrl);
        }
      );
    });

    // クライアントへ署名付き URL を返す
    return NextResponse.json({ success: true, audioUrl }, { status: 200 });
  } catch (error) {
    console.error('Error in text-to-speech:', error);
    return NextResponse.json(
      { error: 'Failed to convert text to speech', details: error.message },
      { status: 500 }
    );
  }
}
