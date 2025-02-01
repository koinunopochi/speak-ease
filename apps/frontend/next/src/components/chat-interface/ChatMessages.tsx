import React from 'react';

export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai' | 'system';
  loading?: boolean;
  error?: boolean;
}

interface ChatMessagesProps {
  messages: Message[];
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.sender === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`rounded-lg p-4 max-w-[80%] shadow-sm ${
              message.sender === 'user'
                ? 'bg-blue-500 text-white'
                : message.sender === 'system'
                ? 'bg-red-100 text-red-800 border border-red-300'
                : 'bg-gray-300 text-gray-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span>{message.text}</span>
              {message.loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatMessages;
