import { ApiRequestError } from "@/lib/api/client";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import type { I18n } from "@/lib/i18n/useI18n";

/** Message keys for the backend error codes users actually hit on the public onboarding forms. */
const MESSAGE_KEYS: Record<string, TranslationKey> = {
  INVALID_OTP: "onboarding.errors.theCodeIsWrongHasExpired",
  INVALID_VERIFICATION: "onboarding.errors.theEmailVerificationExpiredOrWas",
  EMAIL_ALREADY_REGISTERED: "onboarding.errors.thisEmailAlreadyBelongsToAn",
  USERNAME_TAKEN: "onboarding.errors.thisUsernameIsAlreadyTakenChoose",
  EMAIL_SERVICE_UNAVAILABLE: "onboarding.errors.theEmailServiceIsnTReady",
  TOO_MANY_REQUESTS: "onboarding.errors.youReGoingTooFastPlease",
  INVITATION_INVALID: "onboarding.acceptInvitationForm.thisInvitationIsInvalidOrHas",
  EMAIL_ALREADY_IN_USE: "onboarding.errors.emailAlreadyInUse",
  INVITATION_SCOPE_INVALID: "onboarding.errors.theDepartmentOrTeamOfThis",
};

export function onboardingErrorMessage(err: unknown, fallback: string, t: I18n["t"]): string {
  if (err instanceof ApiRequestError) {
    const key = MESSAGE_KEYS[err.code];
    return key ? t(key) : err.message;
  }
  return fallback;
}
