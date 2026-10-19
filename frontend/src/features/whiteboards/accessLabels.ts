import type { TranslationKey } from "@/lib/i18n/dictionary";
import type { WhiteboardAccess } from "./types";

export const ACCESS_KEYS: Record<WhiteboardAccess, TranslationKey> = {
  OWNER: "whiteboards.access.owner",
  EDITOR: "whiteboards.access.editor",
  VIEWER: "whiteboards.access.viewer",
};
