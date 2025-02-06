// src/app/infrastructure/mongo/MongoChatRepository.ts
import { ChatRepository } from '@/app/domain/repository/ChatRepository';
import { MongoClient } from 'mongodb';

export class MongoChatRepository implements ChatRepository {
  private client: MongoClient;
  private dbName: string;
  private collectionName: string;

  constructor(
    client: MongoClient,
    dbName: string = 'chatDb',
    collectionName: string = 'chatResponses'
  ) {
    this.client = client;
    this.dbName = dbName;
    this.collectionName = collectionName;
  }

  async saveChatResponse(conversationId: string, response: any): Promise<void> {
    const db = this.client.db(this.dbName);
    const collection = db.collection(this.collectionName);
    await collection.insertOne({
      conversationId,
      response, // AI の API レスポンス全体を保存
      createdAt: new Date(),
    });
  }
}
