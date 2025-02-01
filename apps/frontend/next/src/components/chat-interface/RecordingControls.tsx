import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
}

const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  onStart,
  onStop,
}) => {
  const handleClick = () => {
    if (isRecording) {
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <div className="border-t border-gray-300 p-4">
      <div className="flex flex-col items-center space-y-4">
        <Button
          variant={isRecording ? 'destructive' : 'default'}
          size="lg"
          className={`rounded-full w-16 h-16 transition-all duration-200 ${
            isRecording ? 'animate-pulse' : ''
          }`}
          onClick={handleClick}
        >
          {isRecording ? (
            <StopCircle className="h-8 w-8" />
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </Button>

        {isRecording && (
          <div className="mt-2 text-center text-sm text-gray-500">
            録音中...
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingControls;
