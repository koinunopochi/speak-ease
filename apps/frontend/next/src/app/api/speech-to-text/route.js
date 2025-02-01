// pages/api/speech-to-text/route.js
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { transcribeAudio } from '@/app/infrastructure/speech-to-text/open-ai/transcribe';

export async function POST(request) {
  try {
    const { filename, model } = await request.json();
    if (!filename) {
      return NextResponse.json(
        { error: 'No filename provided' },
        { status: 400 }
      );
    }
    // 保存済みファイルのパスを構築
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
    const fileBuffer = await fs.readFile(filePath);

    // デフォルトモデルは 'whisper-1' とする（必要に応じて変更）
    const transcript = await transcribeAudio(fileBuffer, model || 'whisper-1');

    return NextResponse.json({ success: true, transcript }, { status: 200 });
  } catch (error) {
    console.error('Error in speech-to-text:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
