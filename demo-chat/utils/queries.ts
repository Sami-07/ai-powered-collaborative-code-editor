import { db } from "../db";
import { chatParticipants } from "../db/schema";
import { eq } from "drizzle-orm";

export const getChatParticipants = async (chatId: string) => {
  const participants = await db.select().from(chatParticipants).where(eq(chatParticipants.chatId, chatId));
  return participants;
};