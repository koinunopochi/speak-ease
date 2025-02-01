// pages/api/chat-ai/route.js
import { NextResponse } from 'next/server';
import { getChatResponse } from '@/app/infrastructure/chat/open-ai/chat';

export async function POST(request) {
  try {
    const { messages, model } = await request.json();

    // messages 配列が存在しない場合や空の場合はエラー
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    // 必要に応じてシステムメッセージを先頭に付与する
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

    return NextResponse.json(
      { success: true, response: chatResponse },
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
