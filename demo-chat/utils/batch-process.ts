import { db } from "../db";
import { messages } from "../db/schema";
import { Job } from 'bullmq';

interface QueueMessage {
  chatKey: string;
  message: {
    chatId: string;
    senderId: string;
    content: string;
    timestamp: number;
    chatType: string;
  }
}

export const processBatch = async (jobs: Job<QueueMessage>[]) => {
  if (jobs.length === 0) return;

  await db.transaction(async (tx) => {
    await tx.insert(messages).values(jobs.map(job => ({
      chatId: job.data.message.chatId,
      senderId: job.data.message.senderId,
      content: job.data.message.content,
      createdAt: new Date(job.data.message.timestamp)
    })));
  });
};