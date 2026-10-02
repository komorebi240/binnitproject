import type { PresenceStatus } from "@/features/auth/types";

export interface Conversation {
  otherUserId: number;
  otherUserName: string | null;
  otherUserAvatarUrl: string | null;
  otherUserPresenceStatus: PresenceStatus | null;
  lastMessageBody: string;
  lastMessageRecalled: boolean;
  lastMessageAttachmentName: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

export interface MessageAttachment {
  id: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  image: boolean;
}

export interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  /** Empty for a recalled message and for an attachment sent without a caption. */
  body: string;
  read: boolean;
  createdAt: string;
  recalled: boolean;
  attachment: MessageAttachment | null;
}

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
/** Mirrors the backend allowlist (ChatAttachmentStorageService) - the server re-validates the real bytes. */
export const ATTACHMENT_ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv";
