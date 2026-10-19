import { ApiRequestError } from "@/lib/api/client";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import type { I18n } from "@/lib/i18n/useI18n";

/** The backend's whiteboard error codes in the words of the interface. */
const MESSAGE_KEYS: Record<string, TranslationKey> = {
  WHITEBOARD_LIMIT: "whiteboards.error.limit",
  WHITEBOARD_MEMBER_LIMIT: "whiteboards.error.memberLimit",
  SCENE_TOO_LARGE: "whiteboards.error.full",
  INVALID_SCENE: "whiteboards.error.invalidScene",
  TOO_MANY_REQUESTS: "whiteboards.error.tooManyRequests",
};

export function whiteboardErrorMessage(err: unknown, fallback: string, t: I18n["t"]): string {
  if (err instanceof ApiRequestError) {
    const key = MESSAGE_KEYS[err.code];
    if (key) return t(key);
    if (err.status === 403) return t("whiteboards.error.noPermission");
    if (err.status === 404) return t("whiteboards.error.notFound");
  }
  return fallback;
}
