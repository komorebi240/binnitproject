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
  /** Images and videos are shown in the conversation; anything else is a download card. */
  image: boolean;
  video: boolean;
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
  /** A copy someone forwarded, labelled as such. */
  forwarded: boolean;
  attachment: MessageAttachment | null;
}

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
/** Mirrors app.uploads.chat-max-video-mb on the server. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_FORWARD_RECIPIENTS = 10;
const VIDEO_EXTENSIONS = ["mp4", "m4v", "mov", "webm"];
/** Mirrors the backend allowlist (AttachmentStorage) - the server re-validates the real bytes. */
export const ATTACHMENT_ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/quicktime,video/webm,.mp4,.m4v,.mov,.webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv";

/** Decided by the extension, like the server does before it checks the file's signature. */
export function isVideoFile(fileName: string): boolean {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return fileName.includes(".") && VIDEO_EXTENSIONS.includes(extension);
}

/** The largest file the server accepts for this name: videos have their own, larger limit. */
export function maxBytesFor(fileName: string): number {
  return isVideoFile(fileName) ? MAX_VIDEO_BYTES : MAX_ATTACHMENT_BYTES;
}
