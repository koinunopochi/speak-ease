import fs from 'fs';
import OpenAI from 'openai';
import { Readable } from 'stream';
import dotenv from 'dotenv';

// .env を読み込む
dotenv.config();

// 環境変数から APIキーを取得
const openai = new OpenAI({
  apiKey: process.env.MY_OPENAI_API_KEY, // .env から APIキーを取得
});

/**
 * 音声ファイルを Whisper API でテキストに変換する関数
 * @param fileBuffer 音声ファイルのバイナリデータ (Buffer)
 * @param model 使用するモデル名 (例: "whisper-1")
 * @returns 変換されたテキスト
 */
export async function transcribeAudio(
  fileBuffer: Buffer,
  model: string
): Promise<string> {
  // バッファを Readable Stream に変換
  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null); // Stream の終端を指定

  // 一時ファイルを作成 (Whisper API はファイルストリームを要求するため)
  const tempFilePath = 'temp_audio.mp3';
  fs.writeFileSync(tempFilePath, fileBuffer);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model,
    });

    return transcription.text;
  } catch (error) {
    console.error('Transcription Error:', error);
    throw new Error('Failed to transcribe audio');
  } finally {
    // 一時ファイルを削除
    fs.unlinkSync(tempFilePath);
  }
}
