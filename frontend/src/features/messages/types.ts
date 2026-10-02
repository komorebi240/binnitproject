export interface Conversation {
  otherUserId: number;
  otherUserName: string | null;
  lastMessageBody: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  body: string;
  read: boolean;
  createdAt: string;
}
