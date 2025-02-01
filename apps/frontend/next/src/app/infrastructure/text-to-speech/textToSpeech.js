import OpenAI from 'openai';

// OpenAI クライアントを初期化
const openai = new OpenAI();

/**
 * テキストを音声に変換し、バイナリデータ（Buffer）として返す関数
 *
 * @param {Object} options - オプションパラメータ
 * @param {string} options.text - 変換するテキスト
 * @param {string} [options.model="tts-1"] - 使用する TTS モデル名
 * @param {string} [options.voice="alloy"] - 使用する音声（ボイス）名
 * @param {string} [options.responseFormat="opus"] - 出力する音声フォーマット (mp3, opus, aac, flac, wav, pcm など)
 * @returns {Promise<Buffer>} - 生成された音声データの Buffer
 */
export async function textToSpeech({
  text,
  model = 'tts-1',
  voice = 'alloy',
  responseFormat = 'opus',
}) {
  // APIリクエストにより音声データを生成
  const speechResponse = await openai.audio.speech.create({
    model,
    voice,
    input: text,
    response_format: responseFormat,
  });

  // レスポンスの ArrayBuffer を Buffer に変換して返す
  return Buffer.from(await speechResponse.arrayBuffer());
}
