import type { VI } from "./vi";

/** Every message of the product has a key; `t("tasks.createForm.title")` is checked against this at compile time. */
export type MessageKey = keyof typeof VI;

/** `projects.members_one` / `projects.members_other` are called with the shared base, `t("projects.members", { count })`. */
type PluralBase<Key> = Key extends `${infer Base}_other` ? Base : never;

export type TranslationKey = MessageKey | PluralBase<MessageKey>;

/** A whole language: the English dictionary must have exactly the keys of the Vietnamese one (the compiler checks). */
export type Dictionary = Record<MessageKey, string>;
