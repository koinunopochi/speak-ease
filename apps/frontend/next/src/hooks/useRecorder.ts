import { useState, useRef } from 'react';

export interface TranscriptResult {
  transcript: string;
}

export interface ChatResult {
  response: string;
}

export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const currentStreamRef = useRef<MediaStream | null>(null);
  // AudioContext が必要な場合は追加で ref を用意
  // const audioContextRef = useRef<AudioContext | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      currentStreamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('録音開始エラー:', error);
      throw error;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Blob を取得するための Promise を返す仕組みにするなど、必要に応じて実装を拡張できます
  const getAudioBlob = (): Promise<Blob> =>
    new Promise((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          // ストリームの停止
          if (currentStreamRef.current) {
            currentStreamRef.current
              .getTracks()
              .forEach((track) => track.stop());
          }
          resolve(audioBlob);
        };
      }
    });

  return { isRecording, startRecording, stopRecording, getAudioBlob };
};
