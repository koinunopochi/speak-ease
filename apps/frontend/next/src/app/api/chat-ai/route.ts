// /src/app/api/chat-ai/route.ts
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { getChatResponse } from '@/app/infrastructure/chat/open-ai/chat';
import { MongoChatRepository } from '@/app/infrastructure/mongo/MongoChatRepository';

// 環境変数から MongoDB の URI を取得
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined');
}

// 毎回新しい接続（シンプルな実装例）
const client = new MongoClient(MONGODB_URI);

export async function POST(request: Request) {
  try {
    const { messages, model } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    // 必要に応じてシステムメッセージを先頭に付与
    const conversation = [
      {
        role: 'system',
        content:
          'あなたは英語教師です。ユーザーの発言に対して、ユーザーのレベルに合わせた英語で返答してください。',
      },
      ...messages,
    ];

    const chatModel = model || 'gpt-4o-mini';
    const chatResponse = await getChatResponse(conversation, chatModel);

    // MongoDB に接続（v4.x 以降では毎回 connect() を呼んでも大丈夫です）
    await client.connect();

    // 依存性逆転の原則に基づいたリポジトリを利用してレスポンスを保存
    const chatRepository = new MongoChatRepository(client);
    // 会話識別子は仮の値を使用（実際は適切な ID を設定してください）
    await chatRepository.saveChatResponse(
      'dummy_conversation_id',
      chatResponse
    );

    // クライアントにレスポンスを返す（必要に応じて加工してください）
    return NextResponse.json(
      { success: true, response: chatResponse.choices[0].message.content },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in chat-ai:', error);
    return NextResponse.json(
      { error: 'Failed to get chat response' },
      { status: 500 }
    );
  }
}
