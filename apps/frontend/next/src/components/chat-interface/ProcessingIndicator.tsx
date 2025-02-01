import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ProcessingIndicatorProps {
  processingStep: string;
  progress: number;
  steps: { [key: string]: { text: string; percentage: number } };
}

const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  processingStep,
  progress,
  steps,
}) => {
  if (!processingStep || !steps[processingStep]) return null;
  return (
    <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm p-4 shadow-md">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {steps[processingStep].text}
          </span>
          <span className="text-sm text-gray-500">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
};

export default ProcessingIndicator;
