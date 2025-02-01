// pages/api/text-to-speech/route.js
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { textToSpeech } from '@/app/infrastructure/text-to-speech/textToSpeech';

export async function POST(request) {
  try {
    const { text, model, voice, responseFormat } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }
    // デフォルト値は必要に応じて設定
    const ttsModel = model || 'tts-1';
    const ttsVoice = voice || 'alloy';
    const ttsFormat = responseFormat || 'opus';

    const audioBuffer = await textToSpeech({
      text,
      model: ttsModel,
      voice: ttsVoice,
      responseFormat: ttsFormat,
    });

    // 生成された音声データをファイルに保存
    const filename = `ai_response_${Date.now()}.ogg`;
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
    await fs.writeFile(filePath, audioBuffer);

    // クライアントからアクセス可能な URL を返す（public 配下は静的に提供される前提）
    const audioUrl = `/uploads/${filename}`;
    return NextResponse.json({ success: true, audioUrl }, { status: 200 });
  } catch (error) {
    console.error('Error in text-to-speech:', error);
    return NextResponse.json(
      { error: 'Failed to convert text to speech' },
      { status: 500 }
    );
  }
}
