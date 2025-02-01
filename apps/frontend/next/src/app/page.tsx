'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mic, Send, StopCircle } from 'lucide-react';

const AI_MODELS = {
  thinking: [
    { id: 'gpt-4o-mini', name: 'GPT-4o-mini' },
    { id: 'claude-3', name: 'Claude 3' },
    { id: 'gemini', name: 'Gemini' },
  ],
  textToSpeech: [
    { id: 'tts-1', name: 'OpenAI-Text-to-Speech' },
    { id: 'azure-tts', name: 'Azure TTS' },
  ],
  speechToText: [
    { id: 'whisper-1', name: 'Whisper' },
    { id: 'azure-stt', name: 'Azure Speech to Text' },
  ],
};

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedModels, setSelectedModels] = useState({
    thinking: AI_MODELS.thinking[0].id,
    textToSpeech: AI_MODELS.textToSpeech[0].id,
    speechToText: AI_MODELS.speechToText[0].id,
  });

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      // 録音データがあるたびにチャンクを保持
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // 録音停止時に、各APIに順次問い合わせる
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

        // ■ 1. ファイルアップロード
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          const uploadResponse = await fetch('/api/upload-audio', {
            method: 'POST',
            body: formData,
          });
          const uploadResult = await uploadResponse.json();
          if (!uploadResult.success) {
            throw new Error(
              uploadResult.error || 'ファイルアップロードに失敗しました。'
            );
          }
          const filename = uploadResult.filename;

          // ■ 2. テキスト化の API に問い合わせ（speech-to-text）
          const sttResponse = await fetch('/api/speech-to-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename,
              model: selectedModels.speechToText,
            }),
          });
          const sttResult = await sttResponse.json();
          if (!sttResult.success) {
            throw new Error(
              sttResult.error || '音声の文字起こしに失敗しました。'
            );
          }
          const transcript = sttResult.transcript;
          // ユーザーのメッセージとして表示（自動文字起こし）
          setMessages((prev) => [
            ...prev,
            { id: Date.now(), text: transcript, sender: 'user' },
          ]);

          // ■ 3. Chat AI に問い合わせ
          const chatResponse = await fetch('/api/chat-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: transcript,
              model: selectedModels.thinking,
            }),
          });
          const chatResult = await chatResponse.json();
          if (!chatResult.success) {
            throw new Error(
              chatResult.error || 'チャットAIの問い合わせに失敗しました。'
            );
          }
          const aiText = chatResult.response;

          // ■ 4. 音声化（テキスト⇒音声）
          const ttsResponse = await fetch('/api/text-to-speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: aiText,
              model: selectedModels.textToSpeech,
            }),
          });
          const ttsResult = await ttsResponse.json();
          if (!ttsResult.success) {
            throw new Error(
              ttsResult.error || 'テキストの音声化に失敗しました。'
            );
          }
          const audioUrl = ttsResult.audioUrl;

          // AIからの応答メッセージを追加
          setMessages((prev) => [
            ...prev,
            { id: Date.now() + 1, text: aiText, sender: 'ai' },
          ]);

          // 生成された音声を再生（必要に応じて）
          const audioPlayer = new Audio(audioUrl);
          audioPlayer.play();
        } catch (error) {
          console.error('音声処理エラー:', error);
          alert('音声処理中にエラーが発生しました: ' + error.message);
        }

        // ストリームのトラックを停止し、録音状態をリセット
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('録音開始エラー:', error);
      alert('マイクへのアクセスが拒否されたか、エラーが発生しました。');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  // 手動入力の場合も、チャット AI と音声化を実行する例
  const handleSend = async () => {
    if (!inputText.trim()) return;

    const newMessage = { id: Date.now(), text: inputText, sender: 'user' };
    setMessages((prev) => [...prev, newMessage]);

    try {
      const chatResponse = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          model: selectedModels.thinking,
        }),
      });
      const chatResult = await chatResponse.json();
      if (!chatResult.success) {
        throw new Error(
          chatResult.error || 'チャットAIの問い合わせに失敗しました。'
        );
      }
      const aiText = chatResult.response;

      const ttsResponse = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiText,
          model: selectedModels.textToSpeech,
        }),
      });
      const ttsResult = await ttsResponse.json();
      if (!ttsResult.success) {
        throw new Error(ttsResult.error || 'テキストの音声化に失敗しました。');
      }
      const audioUrl = ttsResult.audioUrl;

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, text: aiText, sender: 'ai' },
      ]);

      const audioPlayer = new Audio(audioUrl);
      audioPlayer.play();
    } catch (error) {
      console.error('テキストメッセージ処理エラー:', error);
      alert('メッセージ処理中にエラーが発生しました: ' + error.message);
    }

    setInputText('');
  };

  const handleVoiceRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* AIモデル選択部分 */}
      <div className="p-4 border-b">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">思考AI</label>
            <Select
              value={selectedModels.thinking}
              onValueChange={(value) =>
                setSelectedModels((prev) => ({ ...prev, thinking: value }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="思考AIを選択" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.thinking.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">音声化AI</label>
            <Select
              value={selectedModels.textToSpeech}
              onValueChange={(value) =>
                setSelectedModels((prev) => ({ ...prev, textToSpeech: value }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="音声化AIを選択" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.textToSpeech.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              テキスト化AI
            </label>
            <Select
              value={selectedModels.speechToText}
              onValueChange={(value) =>
                setSelectedModels((prev) => ({ ...prev, speechToText: value }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="テキスト化AIを選択" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.speechToText.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* チャットメッセージ表示部分 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            } mb-4`}
          >
            <div
              className={`rounded-lg p-3 max-w-[80%] ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      {/* 入力とボタン */}
      <div className="border-t p-4 bg-white">
        <div className="flex gap-2">
          <Button
            variant={isRecording ? 'destructive' : 'secondary'}
            size="icon"
            onClick={handleVoiceRecording}
          >
            {isRecording ? (
              <StopCircle className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="メッセージを入力..."
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
