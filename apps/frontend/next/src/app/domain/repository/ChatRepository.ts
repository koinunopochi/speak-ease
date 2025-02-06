// src/app/app/domain/repository/ChatRepository.ts
export interface ChatRepository {
  saveChatResponse(conversationId: string, response: any): Promise<void>;
}
