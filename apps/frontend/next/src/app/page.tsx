'use client'; // クライアントサイドで動作させるために必要な場合

import React from 'react';
import ChatInterface from '@/components/chat-interface/ChatInterface';

const HomePage: React.FC = () => {
  return <ChatInterface />;
};

export default HomePage;
