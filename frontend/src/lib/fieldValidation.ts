import type { TranslationKey } from "@/lib/i18n/dictionary";
import type { Params } from "@/lib/i18n/translate";

/** Messages for the browser's built-in form validation, in the user's language (the native bubble follows the browser and cannot be styled). */

/** The translator of `useI18n()`. */
export type Translate = (key: TranslationKey, params?: Params) => string;

/** The slice of a form control this needs; a real <input>/<select> satisfies it, and tests can fake it. */
export interface FieldDescription {
  validity: {
    valueMissing: boolean;
    typeMismatch: boolean;
    patternMismatch: boolean;
    tooShort: boolean;
    tooLong: boolean;
    rangeUnderflow: boolean;
    rangeOverflow: boolean;
    stepMismatch: boolean;
    badInput: boolean;
  };
  type: string;
  /** "select-one" for a <select>. */
  isSelect: boolean;
  minLength: number;
  maxLength: number;
  min: string;
  max: string;
  /** The browser's own English text, used only when nothing here applies. */
  validationMessage: string;
}

/** "Tên đăng nhập" -> "tên đăng nhập"; a trailing hint such as " (vd: CEO)" is dropped so the sentence reads naturally. */
export function fieldNoun(label: string, t: Translate): string {
  const withoutHint = label.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (!withoutHint) return t("lib.fieldValidation.thisField");
  // An acronym such as "KPI" must not become "kPI".
  if (/^\p{Lu}{2}/u.test(withoutHint)) return withoutHint;
  return withoutHint.charAt(0).toLowerCase() + withoutHint.slice(1);
}

export function describeInvalidField(field: FieldDescription, label: string, t: Translate): string {
  const noun = fieldNoun(label, t);
  const { validity } = field;

  if (validity.valueMissing) {
    return t(field.isSelect ? "lib.fieldValidation.pleaseChooseNoun" : "lib.fieldValidation.pleaseEnterNoun", { noun });
  }
  if (validity.typeMismatch) {
    if (field.type === "email") return t("lib.fieldValidation.theEmailFormatIsWrongFor");
    if (field.type === "url") return t("lib.fieldValidation.theLinkFormatIsWrongIt");
    return t("lib.fieldValidation.theFormatOfNounIsWrong", { noun });
  }
  if (validity.tooShort) return t("lib.fieldValidation.enterAtLeastMinlengthCharactersFor", { minLength: field.minLength, noun });
  if (validity.tooLong) return t("lib.fieldValidation.useAtMostMaxlengthCharactersFor", { maxLength: field.maxLength, noun });
  if (validity.rangeUnderflow) return t("lib.fieldValidation.theSmallestValueForNounIs", { noun, min: field.min });
  if (validity.rangeOverflow) return t("lib.fieldValidation.theLargestValueForNounIs", { noun, max: field.max });
  if (validity.patternMismatch || validity.stepMismatch || validity.badInput) {
    return t("lib.fieldValidation.theValueOfNounIsNot", { noun });
  }
  return field.validationMessage || t("lib.fieldValidation.theValueOfNounIsNot", { noun });
}
