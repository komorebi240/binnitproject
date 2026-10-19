export type WhiteboardAccess = "OWNER" | "EDITOR" | "VIEWER";
export type WhiteboardRole = "EDITOR" | "VIEWER";

export interface WhiteboardSummary {
  id: number;
  title: string;
  ownerId: number;
  ownerName: string | null;
  /** The current user's own relation to the board. */
  access: WhiteboardAccess;
  version: number;
  updatedAt: string;
}

export interface WhiteboardMember {
  userId: number;
  fullName: string | null;
  role: WhiteboardAccess;
}

/**
 * An Excalidraw element as stored. Only the fields this app reads itself are typed; the rest belong to Excalidraw and are
 * passed through untouched.
 */
export interface StoredElement {
  id: string;
  type: string;
  version: number;
  isDeleted?: boolean;
  /** Epoch milliseconds of the element's last change. */
  updated?: number;
  [field: string]: unknown;
}

export interface WhiteboardDetail extends WhiteboardSummary {
  updatedByName: string | null;
  members: WhiteboardMember[];
  scene: { elements: StoredElement[] };
}

export interface WhiteboardVersion {
  version: number;
  updatedAt: string;
  updatedByName: string | null;
}

export function canEdit(access: WhiteboardAccess): boolean {
  return access !== "VIEWER";
}
