'use client';

import React, { useState,useRef } from 'react';
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
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'claude-3', name: 'Claude 3' },
    { id: 'gemini', name: 'Gemini' },
  ],
  textToSpeech: [
    { id: 'elevenlabs', name: 'ElevenLabs' },
    { id: 'azure-tts', name: 'Azure TTS' },
  ],
  speechToText: [
    { id: 'whisper', name: 'Whisper' },
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

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // onstop イベント内
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

        // FormDataを作成してファイルを追加（キー名を "file" に変更）
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          const response = await fetch('/api/upload-audio', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();

          if (result.success) {
            console.log('Audio uploaded successfully:', result.filename);
          } else {
            console.error('Failed to upload audio:', result.error);
          }
        } catch (error) {
          console.error('Error uploading audio:', error);
        }

        // ストリームのトラックを停止
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('マイクへのアクセスが拒否されたか、エラーが発生しました。');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const generateMockResponse = (text) => {
    const selectedAI = AI_MODELS.thinking.find(
      (model) => model.id === selectedModels.thinking
    );
    return `${selectedAI.name}からの応答: ${text}への返答です。`;
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: inputText,
      sender: 'user',
    };

    const aiResponse = {
      id: Date.now() + 1,
      text: generateMockResponse(inputText),
      sender: 'ai',
    };

    setMessages([...messages, newMessage, aiResponse]);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
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
