// chat.js
import 'dotenv/config'; // .env の内容を読み込みます
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.MY_OPENAI_API_KEY,
});

/**
 * 指定したメッセージとモデルでチャットのレスポンスを取得する関数
 *
 * @param {Array} messages - OpenAI のチャット形式のメッセージ配列（例: [{ role: "system", content: "..." }, ...]）
 * @param {string} model - 使用するモデル名（例: "gpt-4o-mini"）
 * @returns {Promise<OpenAI.Chat.Completions.ChatCompletion>} - チャットのレスポンステキスト
 */
export async function getChatResponse(messages, model) {
  try {
    const completion = await openai.chat.completions.create({
      messages, // 外部から渡されたメッセージ配列
      model, // 外部から渡されたモデル名
    });
    // console.dir(completion);

    return completion;
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw error;
  }
}
