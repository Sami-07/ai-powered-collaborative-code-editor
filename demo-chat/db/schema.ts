import { index, pgTable, serial, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';


export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
});



export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { enum: ['direct', 'group'] }).notNull(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const chatParticipants = pgTable('chat_participants', {
  chatId: uuid('chat_id').references(() => chats.id),
  userId: uuid('user_id').references(() => users.id),
  role: varchar('role', { enum: ['admin', 'member'] }).notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').references(() => chats.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  chatIdx: index('chat_idx').on(table.chatId),
  timeIdx: index('time_idx').on(table.createdAt),
}));

export const chatsRelations = relations(chats, ({ many }) => ({
    participants: many(chatParticipants)
}));

export const chatParticipantsRelations = relations(chatParticipants, ({ one }) => ({
    chat: one(chats, {
        fields: [chatParticipants.chatId],
        references: [chats.id],
    }),
    user: one(users, {
        fields: [chatParticipants.userId],
        references: [users.id],
    }),
}));

export const usersRelations = relations(users, ({ many }) => ({
    participatedChats: many(chatParticipants)
}));