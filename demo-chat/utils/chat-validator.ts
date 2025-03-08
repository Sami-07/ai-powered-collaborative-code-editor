import { db } from "../db";
import { chats, chatParticipants } from "../db/schema";
import { and, eq } from "drizzle-orm";

export class ChatValidator {
    async validateChatAccess(chatId: string, userId: string): Promise<{
        isValid: boolean;
        chatType?: 'direct' | 'group';
        error?: string;
    }> {
     
        const chatDetails = await db.query.chats.findFirst({
            where: eq(chats.id, chatId),
            with: {
                participants: true
            }
        });

        if (!chatDetails) {
            return { isValid: false, error: 'Chat not found' };
        }

     
        const isParticipant = chatDetails.participants.some(p => p.userId === userId);
        if (!isParticipant) {
            return { isValid: false, error: 'User is not a participant of this chat' };
        }

        if (chatDetails.type === 'direct') {
           
            if (chatDetails.participants.length !== 2) {
                return { isValid: false, error: 'Invalid direct chat configuration' };
            }
        }

        return { 
            isValid: true, 
            chatType: chatDetails.type 
        };
    }
} 