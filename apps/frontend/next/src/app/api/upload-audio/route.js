// pages/api/upload-audio/route.js
import { NextResponse } from 'next/server';
import FormData from 'form-data';
import fs from 'fs/promises';
import path from 'path';
import { transcribeAudio } from '@/app/infrastructure/speech-to-text/open-ai/transcribe';
import { getChatResponse } from '@/app/infrastructure/chat/open-ai/chat';

// (Edge runtimeを使用している場合は)
// export const config = { runtime: 'nodejs' };

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

    // ▼▼▼ デバッグ用に元ファイルをサーバーに保存する ▼▼▼
    try {
      // 保存先を指定（例として Next.js プロジェクトの public/debug ディレクトリ）
      const originalFilePath = path.join(
        process.cwd(),
        'public',
        'debug',
        'original.webm'
      );
      await fs.writeFile(originalFilePath, buffer);
      console.log('Original file saved successfully at:', originalFilePath);
    } catch (saveError) {
      console.error('Error saving original file:', saveError);
    }
    // ▲▲▲ デバッグ用に元ファイルをサーバーに保存する ▲▲▲

    // Python API へ転送するための FormData を作成
    const pythonFormData = new FormData();
    // キー名は "file"（Flask側が要求）、ファイル名とコンテンツタイプも明示的に指定
    pythonFormData.append('file', buffer, {
      filename: 'user.webm',
      contentType: 'audio/webm',
    });

    // form-data の内容をバッファに変換して送信
    const formDataBuffer = pythonFormData.getBuffer();
    const headers = pythonFormData.getHeaders();
    headers['Content-Length'] = formDataBuffer.length;

    // Flask API の URL
    const pythonApiUrl = 'http://localhost:5000/process';

    // Flask API へ POST リクエストを送信
    const pythonResponse = await fetch(pythonApiUrl, {
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

    // 処理済みの音声ファイルデータを受け取る
    const processedBuffer = await pythonResponse.arrayBuffer();
    const processedData = Buffer.from(processedBuffer);

    // ▼▼▼ デバッグ用に処理済みファイルをサーバーに保存する ▼▼▼
    try {
      // 保存先を指定（例として Next.js プロジェクトの public/debug ディレクトリ）
      const processedFilePath = path.join(
        process.cwd(),
        'public',
        'debug',
        'processed.webm'
      );
      await fs.writeFile(processedFilePath, processedData);
      console.log('Processed file saved successfully at:', processedFilePath);
    } catch (saveError) {
      console.error('Error saving processed file:', saveError);
    }
    // ▲▲▲ デバッグ用に処理済みファイルをサーバーに保存する ▲▲▲

    // いったんWhisperを利用して音声ファイルをテキストに変換
    const fileBuffer = Buffer.from(processedBuffer);
    const model = 'whisper-1';
    const text = await transcribeAudio(fileBuffer, model);

    // いったんgpt4o-miniを利用して、chatする
    const messages = [
      {
        role: 'system',
        content:
          'あなた英語教師です。ユーザーの発言を英語で返答してください。ユーザーのレベルは差が大きいため、ユーザーのレベルに合わせて返答してください。',
      },
      { role: 'user', content: text },
    ];
    const chat_model = 'gpt-4o-mini';
    const chatResponse = await getChatResponse(messages, chat_model);
    console.log('chatResponse', chatResponse);

    // クライアントにテキストを返す
    return new NextResponse(JSON.stringify({ text }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}
