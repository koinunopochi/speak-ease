// pages/api/chat-ai/route.js
import { NextResponse } from 'next/server';
import { getChatResponse } from '@/app/infrastructure/chat/open-ai/chat';

export async function POST(request) {
  try {
    const { text, model } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }
    // システムメッセージなど、必要に応じたプロンプトを付与
    const messages = [
      {
        role: 'system',
        content:
          'あなたは英語教師です。ユーザーの発言に対して、ユーザーのレベルに合わせた英語で返答してください。',
      },
      { role: 'user', content: text },
    ];
    const chat_model = model || 'gpt-4o-mini';
    const chatResponse = await getChatResponse(messages, chat_model);

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
