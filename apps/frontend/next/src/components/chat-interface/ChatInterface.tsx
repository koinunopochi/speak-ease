'use client';

import React, { useState, useEffect } from 'react';
import ModelSelection from './ModelSelection';
import ChatMessages, { Message } from './ChatMessages';
import ProcessingIndicator from './ProcessingIndicator';
import RecordingControls from './RecordingControls';
import { useRecorder } from '@/hooks/useRecorder';

// 定数や型定義
interface AIModel {
  id: string;
  name: string;
}

const AI_MODELS: { [key: string]: AIModel[] } = {
  thinking: [{ id: 'gpt-4o-mini', name: 'GPT-4o-mini' }],
  speechToText: [{ id: 'whisper-1', name: 'Whisper' }],
  textToSpeech: [{ id: 'tts-1', name: 'OpenAI-Text-to-Speech' }],
};

interface ProcessingStep {
  text: string;
  percentage: number;
}

const PROCESSING_STEPS: { [key: string]: ProcessingStep } = {
  upload: { text: 'アップロード中', percentage: 25 },
  transcribe: { text: '文字起こし中', percentage: 50 },
  thinking: { text: 'AI分析中', percentage: 75 },
  synthesize: { text: '音声合成中', percentage: 90 },
};

interface SelectedModels {
  thinking: string;
  textToSpeech: string;
  speechToText: string;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [selectedModels, setSelectedModels] = useState<SelectedModels>({
    thinking: AI_MODELS.thinking[0].id,
    textToSpeech: AI_MODELS.textToSpeech[0].id,
    speechToText: AI_MODELS.speechToText[0].id,
  });

  const { isRecording, startRecording, stopRecording, getAudioBlob } =
    useRecorder();

  useEffect(() => {
    if (processingStep in PROCESSING_STEPS) {
      setProgress(PROCESSING_STEPS[processingStep].percentage);
    } else {
      setProgress(0);
    }
  }, [processingStep]);

  // 録音終了後の処理（API 呼び出しなど）をまとめた関数
  const handleRecordingComplete = async () => {
    try {
      const audioBlob = await getAudioBlob();
      const userPlaceholderId = Date.now();

      // ユーザーのメッセージを追加（初めは認識中のプレースホルダー）
      setMessages((prev) => [
        ...prev,
        {
          id: userPlaceholderId,
          text: '音声を認識しています...',
          sender: 'user',
          loading: true,
        },
      ]);

      // アップロード処理
      setProcessingStep('upload');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      const uploadResponse = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });
      const uploadResult = await uploadResponse.json();
      if (!uploadResult.success) {
        throw new Error(
          uploadResult.error || 'ファイルアップロードに失敗しました'
        );
      }

      // 音声認識処理
      setProcessingStep('transcribe');
      const sttResponse = await fetch('/api/speech-to-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadResult.filename,
          model: selectedModels.speechToText,
        }),
      });
      const sttResult = await sttResponse.json();
      if (!sttResult.success) {
        throw new Error(sttResult.error || '音声認識に失敗しました');
      }

      // ユーザーメッセージの更新（プレースホルダーを認識結果に置換）
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userPlaceholderId
            ? { ...m, text: sttResult.transcript, loading: false }
            : m
        )
      );

      // AI 応答処理
      setProcessingStep('thinking');
      const aiPlaceholderId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        {
          id: aiPlaceholderId,
          text: 'AIが考えています...',
          sender: 'ai',
          loading: true,
        },
      ]);

      // --- ここで会話履歴（直近6個分 + 最新のUser質問）を作成する ---
      // ここでは、loadingがfalseのUser/AIのメッセージのみを対象とします。
      const conversationMessages = messages
        .filter((m) => !m.loading && (m.sender === 'user' || m.sender === 'ai'))
        .slice(-6) // 直近6件
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      // ※ もし最新のUser質問がまだ conversationMessages に含まれていなければ、追加する
      // ここでは、上記の setMessages 更新後に state が即時反映されない可能性があるため、
      // 最新のUser質問は sttResult.transcript として明示的に追加する例です。
      const updatedConversation = [
        ...conversationMessages,
        { role: 'user', content: sttResult.transcript },
      ];

      // chat-ai API 呼び出し（会話履歴を含む）
      const chatResponse = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedConversation,
          model: selectedModels.thinking,
        }),
      });
      const chatResult = await chatResponse.json();
      if (!chatResult.success) {
        throw new Error(chatResult.error || 'AI処理に失敗しました');
      }

      // AI メッセージ更新（プレースホルダーを実際の応答に置換）
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiPlaceholderId
            ? { ...m, text: chatResult.response, loading: false }
            : m
        )
      );

      // 音声合成処理
      setProcessingStep('synthesize');
      const ttsResponse = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: chatResult.response,
          model: selectedModels.textToSpeech,
        }),
      });
      const ttsResult = await ttsResponse.json();
      if (!ttsResult.success) {
        throw new Error(ttsResult.error || '音声合成に失敗しました');
      }

      // 音声再生
      const audio = new Audio(ttsResult.audioUrl);
      await audio.play();

      // 完了
      setProcessingStep('');
      setProgress(0);
    } catch (error: any) {
      console.error('処理エラー:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: `エラーが発生しました: ${error.message}`,
          sender: 'system',
          error: true,
        },
      ]);
      setProcessingStep('');
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* モデル選択 */}
      <div className="p-4 border-spacing-1 border-gray-300 border-b">
        <div className="flex flex-wrap gap-4">
          <ModelSelection
            label="思考AI"
            models={AI_MODELS.thinking}
            value={selectedModels.thinking}
            onChange={(value) =>
              setSelectedModels((prev) => ({ ...prev, thinking: value }))
            }
          />
          <ModelSelection
            label="音声認識AI"
            models={AI_MODELS.speechToText}
            value={selectedModels.speechToText}
            onChange={(value) =>
              setSelectedModels((prev) => ({ ...prev, speechToText: value }))
            }
          />
          <ModelSelection
            label="音声合成AI"
            models={AI_MODELS.textToSpeech}
            value={selectedModels.textToSpeech}
            onChange={(value) =>
              setSelectedModels((prev) => ({ ...prev, textToSpeech: value }))
            }
          />
        </div>
      </div>

      {/* チャットメッセージ */}
      <ChatMessages messages={messages} />

      {/* 処理中インジケーター */}
      <ProcessingIndicator
        processingStep={processingStep}
        progress={progress}
        steps={PROCESSING_STEPS}
      />

      {/* 録音コントロール */}
      <RecordingControls
        isRecording={isRecording}
        onStart={async () => {
          await startRecording();
        }}
        onStop={async () => {
          stopRecording();
          await handleRecordingComplete();
        }}
      />
    </div>
  );
};

export default ChatInterface;
