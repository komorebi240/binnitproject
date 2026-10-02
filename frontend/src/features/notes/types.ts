export interface Note {
  id: number;
  title: string;
  content: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface SaveNoteInput {
  title: string;
  content?: string;
}
